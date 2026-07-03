import csv
import io
import json
from datetime import UTC, datetime
from typing import Any

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query, Request, status
from pydantic import BaseModel, Field

from audit import AuditEvent, client_ip, log_audit
from auth import CurrentUser
from db import get_db, row, rows
from rbac import require_active_subscription, require_min_role
from fastapi.responses import StreamingResponse

try:
    from prometheus_client import Counter, Gauge, Histogram
    _PROM_OK = True
    _SI_PROSPECTS_CREATED = Counter("si_prospects_created_total", "Prospects SI créés", ["org_id", "source"])
    _SI_PROSPECTS_SCORED = Counter("si_prospects_scored_total", "Prospects scorés", ["org_id", "score_range"])
    _SI_CONVERSATIONS = Counter("si_ai_conversations_total", "Conversations IA", ["org_id", "agent_type", "status"])
    _SI_MEETINGS = Counter("si_meetings_booked_total", "Réunions planifiées", ["org_id"])
    _SI_PIPELINE = Gauge("si_pipeline_value", "Valeur pipeline SI", ["org_id", "currency"])
    _SI_SCORE_AVG = Gauge("si_lead_score_avg", "Score moyen prospects", ["org_id"])
    _SI_CAMPAIGN_SUCCESS = Gauge("si_campaign_success_rate", "Taux succès campagne", ["org_id", "campaign_id"])
    _SI_AGENT_DURATION = Histogram("si_agent_run_duration_ms", "Durée agents SI (ms)", ["agent_type", "status"],
                                   buckets=[100, 500, 1000, 3000, 10000, 30000])
except ImportError:
    _PROM_OK = False
    _SI_PROSPECTS_CREATED = _SI_PROSPECTS_SCORED = _SI_CONVERSATIONS = _SI_MEETINGS = None
    _SI_PIPELINE = _SI_SCORE_AVG = _SI_CAMPAIGN_SUCCESS = _SI_AGENT_DURATION = None

router = APIRouter(prefix="/api/si", tags=["sales-intelligence"])

_NOW = lambda: datetime.now(UTC).isoformat()


# ──────────────────────────────────────────────────────────────────────────
# Payloads Pydantic
# ──────────────────────────────────────────────────────────────────────────

class ProspectCreate(BaseModel):
    company_name: str = Field(..., min_length=1, max_length=200)
    website: str | None = None
    linkedin_url: str | None = None
    sector: str | None = None
    country: str | None = None
    city: str | None = None
    employee_count: int | None = Field(default=None, ge=1)
    contact_name: str | None = None
    contact_title: str | None = None
    contact_email: str | None = None
    contact_phone: str | None = None
    contact_linkedin: str | None = None
    estimated_budget: float | None = None
    tags: list[str] = []
    notes: str | None = None
    source: str = "manual"


class ProspectUpdate(BaseModel):
    status: str | None = Field(default=None, pattern="^(new|researched|contacted|replied|meeting_set|proposal_sent|won|lost|disqualified)$")
    tags: list[str] | None = None
    notes: str | None = None
    contact_email: str | None = None
    contact_name: str | None = None
    estimated_budget: float | None = None
    assigned_to: str | None = None


class CampaignCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    objective: str | None = None
    description: str | None = None
    target_criteria: dict[str, Any] = {}
    agent_config: dict[str, bool] = {"prospector": True, "research": True, "qualification": True, "sales": True, "followup": True}
    daily_limit: int = Field(default=20, ge=1, le=500)
    target_count: int | None = None


class CampaignUpdate(BaseModel):
    name: str | None = None
    objective: str | None = None
    target_criteria: dict[str, Any] | None = None
    agent_config: dict[str, bool] | None = None
    daily_limit: int | None = None


class ConversationReply(BaseModel):
    content: str = Field(..., min_length=1)
    subject: str | None = None


class MeetingCreate(BaseModel):
    prospect_id: str
    title: str = Field(..., min_length=1, max_length=200)
    description: str | None = None
    scheduled_at: str
    duration_minutes: int = Field(default=30, ge=15, le=480)
    location: str | None = None
    meeting_url: str | None = None
    assigned_to: str | None = None
    conversation_id: str | None = None


class MeetingUpdate(BaseModel):
    title: str | None = None
    scheduled_at: str | None = None
    duration_minutes: int | None = None
    status: str | None = Field(default=None, pattern="^(scheduled|confirmed|completed|cancelled|no_show)$")
    outcome: str | None = None
    outcome_notes: str | None = None
    next_steps: str | None = None


class TemplateCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    type: str = Field(..., pattern="^(outreach|followup|proposal|meeting_request|nurture)$")
    channel: str = Field(default="email", pattern="^(email|linkedin|chat)$")
    subject: str | None = None
    body: str = Field(..., min_length=1)
    variables: list[str] = []
    language: str = Field(default="fr", pattern="^(fr|en)$")


class TemplateUpdate(BaseModel):
    name: str | None = None
    subject: str | None = None
    body: str | None = None
    is_active: bool | None = None
    variables: list[str] | None = None


class SettingsUpdate(BaseModel):
    products: list[dict] | None = None
    target_sectors: list[str] | None = None
    target_countries: list[str] | None = None
    employee_min: int | None = None
    employee_max: int | None = None
    languages: list[str] | None = None
    icp_description: str | None = None
    value_proposition: str | None = None
    avg_deal_size: float | None = None
    sales_cycle_days: int | None = None


# ──────────────────────────────────────────────────────────────────────────
# Helpers
# ──────────────────────────────────────────────────────────────────────────

def _check_prospect(prospect_id: str, org_id: str, cur) -> dict:
    cur.execute("SELECT * FROM si_prospects WHERE id = %s AND organization_id = %s", (prospect_id, org_id))
    p = row(cur)
    if not p:
        raise HTTPException(status_code=404, detail="Prospect introuvable")
    return p


def _score_range(score: int | None) -> str:
    if score is None:
        return "unscored"
    if score >= 80:
        return "high"
    if score >= 50:
        return "medium"
    return "low"


# ──────────────────────────────────────────────────────────────────────────
# DASHBOARD
# ──────────────────────────────────────────────────────────────────────────

@router.get("/dashboard")
def get_dashboard(user: CurrentUser = Depends(require_min_role("user"))):
    org = user.organization_id
    with get_db() as cur:
        cur.execute("""
            SELECT
              COUNT(*) FILTER (WHERE status != 'disqualified')     AS total_prospects,
              COUNT(*) FILTER (WHERE status = 'new')               AS new_prospects,
              COUNT(*) FILTER (WHERE status = 'contacted')         AS contacted,
              COUNT(*) FILTER (WHERE status = 'meeting_set')       AS meetings_set,
              COUNT(*) FILTER (WHERE status = 'won')               AS won,
              ROUND(AVG(ai_score))                                 AS avg_score,
              COALESCE(SUM(estimated_budget) FILTER (WHERE status NOT IN ('lost','disqualified')), 0) AS pipeline_value
            FROM si_prospects WHERE organization_id = %s
        """, (org,))
        kpis = row(cur)

        cur.execute("""
            SELECT COUNT(*) AS total, status
            FROM si_campaigns WHERE organization_id = %s
            GROUP BY status
        """, (org,))
        campaigns = rows(cur)

        cur.execute("""
            SELECT DATE_TRUNC('day', created_at) AS day, COUNT(*) AS count
            FROM si_prospects WHERE organization_id = %s
              AND created_at >= NOW() - INTERVAL '30 days'
            GROUP BY 1 ORDER BY 1
        """, (org,))
        daily_prospects = rows(cur)

        cur.execute("""
            SELECT agent_type,
                   COUNT(*) AS total_runs,
                   COUNT(*) FILTER (WHERE status = 'success') AS success_runs,
                   ROUND(AVG(duration_ms)) AS avg_duration_ms
            FROM si_agent_runs WHERE organization_id = %s
              AND started_at >= NOW() - INTERVAL '7 days'
            GROUP BY agent_type
        """, (org,))
        agent_stats = rows(cur)

        cur.execute("""
            SELECT COUNT(*) AS upcoming
            FROM si_meetings WHERE organization_id = %s AND status = 'scheduled'
              AND scheduled_at >= NOW()
        """, (org,))
        meetings = row(cur)

    if _PROM_OK and _SI_PIPELINE and kpis:
        _SI_PIPELINE.labels(org_id=org[:8], currency="CAD").set(float(kpis["pipeline_value"] or 0))
    if _PROM_OK and _SI_SCORE_AVG and kpis:
        _SI_SCORE_AVG.labels(org_id=org[:8]).set(float(kpis["avg_score"] or 0))

    return {
        "kpis": kpis,
        "campaigns_by_status": campaigns,
        "daily_prospects_30d": daily_prospects,
        "agent_stats_7d": agent_stats,
        "upcoming_meetings": meetings["upcoming"] if meetings else 0,
    }


# ──────────────────────────────────────────────────────────────────────────
# PROSPECTS
# ──────────────────────────────────────────────────────────────────────────

@router.get("/prospects")
def list_prospects(
    user: CurrentUser = Depends(require_min_role("user")),
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=25, ge=1, le=100),
    status: str | None = Query(default=None),
    sector: str | None = Query(default=None),
    country: str | None = Query(default=None),
    min_score: int | None = Query(default=None, ge=0, le=100),
    search: str | None = Query(default=None),
    sort: str = Query(default="created_at"),
    order: str = Query(default="desc", pattern="^(asc|desc)$"),
):
    org = user.organization_id
    allowed_sorts = {"created_at", "ai_score", "company_name", "status", "last_contacted_at"}
    if sort not in allowed_sorts:
        sort = "created_at"

    conditions = ["organization_id = %s"]
    params: list[Any] = [org]

    if status:
        conditions.append("status = %s")
        params.append(status)
    if sector:
        conditions.append("sector ILIKE %s")
        params.append(f"%{sector}%")
    if country:
        conditions.append("country = %s")
        params.append(country)
    if min_score is not None:
        conditions.append("ai_score >= %s")
        params.append(min_score)
    if search:
        conditions.append("(company_name ILIKE %s OR contact_name ILIKE %s OR contact_email ILIKE %s)")
        params.extend([f"%{search}%", f"%{search}%", f"%{search}%"])

    where = " AND ".join(conditions)
    offset = (page - 1) * limit

    with get_db() as cur:
        cur.execute(f"SELECT COUNT(*) AS total FROM si_prospects WHERE {where}", params)
        total = row(cur)["total"]

        cur.execute(
            f"SELECT * FROM si_prospects WHERE {where} ORDER BY {sort} {order.upper()} LIMIT %s OFFSET %s",
            [*params, limit, offset],
        )
        data = rows(cur)

    return {"total": total, "page": page, "limit": limit, "items": data}


@router.post("/prospects", status_code=201)
def create_prospect(
    payload: ProspectCreate,
    background: BackgroundTasks,
    request: Request,
    user: CurrentUser = Depends(require_min_role("user")),
):
    org = user.organization_id
    with get_db() as cur:
        cur.execute("""
            INSERT INTO si_prospects (organization_id, company_name, website, linkedin_url,
              sector, country, city, employee_count, contact_name, contact_title,
              contact_email, contact_phone, contact_linkedin, estimated_budget, tags, notes, source)
            VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
            RETURNING *
        """, (org, payload.company_name, payload.website, payload.linkedin_url,
              payload.sector, payload.country, payload.city, payload.employee_count,
              payload.contact_name, payload.contact_title, payload.contact_email,
              payload.contact_phone, payload.contact_linkedin, payload.estimated_budget,
              payload.tags, payload.notes, payload.source))
        prospect = row(cur)

    if _PROM_OK and _SI_PROSPECTS_CREATED:
        _SI_PROSPECTS_CREATED.labels(org_id=org[:8], source=payload.source).inc()
    background.add_task(log_audit, AuditEvent(
        action="si_prospect_created", organization_id=org,
        user_id=user.id, resource_type="si_prospect", resource_id=str(prospect["id"]),
        details={"company": payload.company_name}, ip=client_ip(request),
    ))
    return prospect


@router.get("/prospects/{prospect_id}")
def get_prospect(
    prospect_id: str,
    user: CurrentUser = Depends(require_min_role("user")),
):
    with get_db() as cur:
        prospect = _check_prospect(prospect_id, user.organization_id, cur)
        cur.execute("""
            SELECT c.*, p.company_name AS prospect_name
            FROM si_conversations c
            JOIN si_prospects p ON c.prospect_id = p.id
            WHERE c.prospect_id = %s AND c.organization_id = %s
            ORDER BY c.created_at DESC LIMIT 5
        """, (prospect_id, user.organization_id))
        conversations = rows(cur)

        cur.execute("""
            SELECT * FROM si_meetings
            WHERE prospect_id = %s AND organization_id = %s
            ORDER BY scheduled_at DESC LIMIT 10
        """, (prospect_id, user.organization_id))
        meetings = rows(cur)

        cur.execute("""
            SELECT agent_type, status, started_at, completed_at, duration_ms, error_message
            FROM si_agent_runs
            WHERE prospect_id = %s AND organization_id = %s
            ORDER BY started_at DESC LIMIT 20
        """, (prospect_id, user.organization_id))
        agent_history = rows(cur)

    return {**prospect, "conversations": conversations, "meetings": meetings, "agent_history": agent_history}


@router.patch("/prospects/{prospect_id}")
def update_prospect(
    prospect_id: str,
    payload: ProspectUpdate,
    background: BackgroundTasks,
    request: Request,
    user: CurrentUser = Depends(require_min_role("user")),
):
    org = user.organization_id
    with get_db() as cur:
        _check_prospect(prospect_id, org, cur)
        updates: list[str] = []
        params: list[Any] = []
        for field, val in payload.model_dump(exclude_none=True).items():
            updates.append(f"{field} = %s")
            params.append(val if not isinstance(val, list) else val)
        if not updates:
            raise HTTPException(status_code=400, detail="Aucun champ à mettre à jour")
        params.append(prospect_id)
        params.append(org)
        cur.execute(
            f"UPDATE si_prospects SET {', '.join(updates)} WHERE id = %s AND organization_id = %s RETURNING *",
            params,
        )
        updated = row(cur)

    background.add_task(log_audit, AuditEvent(
        action="si_prospect_updated", organization_id=org, user_id=user.id,
        resource_type="si_prospect", resource_id=prospect_id,
        details=payload.model_dump(exclude_none=True), ip=client_ip(request),
    ))
    return updated


@router.delete("/prospects/{prospect_id}", status_code=204)
def delete_prospect(
    prospect_id: str,
    background: BackgroundTasks,
    request: Request,
    user: CurrentUser = Depends(require_min_role("manager")),
):
    org = user.organization_id
    with get_db() as cur:
        _check_prospect(prospect_id, org, cur)
        cur.execute("DELETE FROM si_prospects WHERE id = %s AND organization_id = %s", (prospect_id, org))
    background.add_task(log_audit, AuditEvent(
        action="si_prospect_deleted", organization_id=org, user_id=user.id,
        resource_type="si_prospect", resource_id=prospect_id, ip=client_ip(request),
    ))


@router.post("/prospects/{prospect_id}/enrich")
async def enrich_prospect(
    prospect_id: str,
    background: BackgroundTasks,
    request: Request,
    user: CurrentUser = Depends(require_active_subscription),
):
    org = user.organization_id
    with get_db() as cur:
        prospect = _check_prospect(prospect_id, org, cur)

    from sales_intelligence_service import research_agent
    result = await research_agent(prospect, org, user.id)

    with get_db() as cur:
        cur.execute("""
            UPDATE si_prospects
            SET score_factors = score_factors || %s::jsonb,
                intent_signals = %s::jsonb,
                enriched_at = NOW()
            WHERE id = %s AND organization_id = %s
            RETURNING *
        """, (json.dumps(result.get("enrichment", {})),
              json.dumps(result.get("intent_signals", [])),
              prospect_id, org))
        updated = row(cur)

    background.add_task(log_audit, AuditEvent(
        action="si_prospect_enriched", organization_id=org, user_id=user.id,
        resource_type="si_prospect", resource_id=prospect_id, ip=client_ip(request),
    ))
    return {"prospect": updated, "enrichment_summary": result.get("summary", "")}


@router.post("/prospects/{prospect_id}/score")
async def score_prospect(
    prospect_id: str,
    background: BackgroundTasks,
    request: Request,
    user: CurrentUser = Depends(require_active_subscription),
):
    org = user.organization_id
    with get_db() as cur:
        prospect = _check_prospect(prospect_id, org, cur)
        cur.execute("SELECT * FROM si_profiles WHERE organization_id = %s AND is_active = true LIMIT 1", (org,))
        icp = row(cur)

    from sales_intelligence_service import qualification_agent
    result = await qualification_agent(prospect, icp, org, user.id)

    score = result.get("score", 0)
    with get_db() as cur:
        cur.execute("""
            UPDATE si_prospects
            SET ai_score = %s, score_factors = %s::jsonb, scored_at = NOW()
            WHERE id = %s AND organization_id = %s
            RETURNING *
        """, (score, json.dumps(result.get("factors", {})), prospect_id, org))
        updated = row(cur)

    if _PROM_OK and _SI_PROSPECTS_SCORED:
        _SI_PROSPECTS_SCORED.labels(org_id=org[:8], score_range=_score_range(score)).inc()
    background.add_task(log_audit, AuditEvent(
        action="si_prospect_scored", organization_id=org, user_id=user.id,
        resource_type="si_prospect", resource_id=prospect_id,
        details={"score": score}, ip=client_ip(request),
    ))
    return {"prospect": updated, "score": score, "factors": result.get("factors", {}), "explanation": result.get("explanation", "")}


@router.post("/prospects/{prospect_id}/contact")
async def contact_prospect(
    prospect_id: str,
    background: BackgroundTasks,
    request: Request,
    user: CurrentUser = Depends(require_active_subscription),
):
    org = user.organization_id
    with get_db() as cur:
        prospect = _check_prospect(prospect_id, org, cur)
        cur.execute(
            "SELECT * FROM si_templates WHERE organization_id = %s AND type = 'outreach' AND is_active = true LIMIT 1",
            (org,),
        )
        template = row(cur)

    from sales_intelligence_service import sales_agent
    result = await sales_agent(prospect, template, org, user.id)

    with get_db() as cur:
        cur.execute("""
            INSERT INTO si_conversations (organization_id, prospect_id, channel, status, subject)
            VALUES (%s, %s, 'email', 'open', %s)
            RETURNING *
        """, (org, prospect_id, result.get("subject", f"Prise de contact — {prospect['company_name']}")))
        conversation = row(cur)

        cur.execute("""
            INSERT INTO si_messages (conversation_id, organization_id, role, content, subject, agent_type, tokens_used)
            VALUES (%s, %s, 'ai', %s, %s, 'sales', %s)
        """, (conversation["id"], org, result.get("message", ""), result.get("subject", ""),
              result.get("tokens_used", 0)))

        cur.execute("UPDATE si_prospects SET status = 'contacted', last_contacted_at = NOW() WHERE id = %s AND organization_id = %s",
                    (prospect_id, org))

    if _PROM_OK and _SI_CONVERSATIONS:
        _SI_CONVERSATIONS.labels(org_id=org[:8], agent_type="sales", status="sent").inc()
    background.add_task(log_audit, AuditEvent(
        action="si_prospect_contacted", organization_id=org, user_id=user.id,
        resource_type="si_prospect", resource_id=prospect_id, ip=client_ip(request),
    ))
    return {"conversation": conversation, "message_preview": result.get("message", "")[:200]}


@router.post("/prospects/import", status_code=201)
async def import_prospects(
    background: BackgroundTasks,
    request: Request,
    user: CurrentUser = Depends(require_min_role("manager")),
):
    body = await request.body()
    try:
        reader = csv.DictReader(io.StringIO(body.decode("utf-8")))
    except Exception:
        raise HTTPException(status_code=400, detail="CSV invalide")

    required = {"company_name"}
    created, skipped = 0, 0
    with get_db() as cur:
        for r_row in reader:
            if not required.issubset(set(r_row.keys())):
                skipped += 1
                continue
            try:
                cur.execute("""
                    INSERT INTO si_prospects (organization_id, company_name, website, contact_email, country, sector, source)
                    VALUES (%s, %s, %s, %s, %s, %s, 'import')
                    ON CONFLICT DO NOTHING
                """, (user.organization_id, r_row.get("company_name"), r_row.get("website"),
                      r_row.get("contact_email"), r_row.get("country"), r_row.get("sector")))
                created += 1
            except Exception:
                skipped += 1

    if _PROM_OK and _SI_PROSPECTS_CREATED:
        for _ in range(created):
            _SI_PROSPECTS_CREATED.labels(org_id=user.organization_id[:8], source="import").inc()
    background.add_task(log_audit, AuditEvent(
        action="si_prospects_imported", organization_id=user.organization_id, user_id=user.id,
        details={"created": created, "skipped": skipped}, ip=client_ip(request),
    ))
    return {"created": created, "skipped": skipped}


@router.get("/prospects/export/csv")
def export_prospects_csv(
    user: CurrentUser = Depends(require_min_role("user")),
    status: str | None = Query(default=None),
):
    org = user.organization_id
    with get_db() as cur:
        params = [org]
        where = "organization_id = %s"
        if status:
            where += " AND status = %s"
            params.append(status)
        cur.execute(f"SELECT company_name, sector, country, contact_email, ai_score, status, created_at FROM si_prospects WHERE {where} ORDER BY ai_score DESC NULLS LAST LIMIT 10000", params)
        data = rows(cur)

    output = io.StringIO()
    if data:
        writer = csv.DictWriter(output, fieldnames=list(data[0].keys()))
        writer.writeheader()
        writer.writerows(data)
    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=prospects.csv"},
    )


# ──────────────────────────────────────────────────────────────────────────
# CAMPAGNES
# ──────────────────────────────────────────────────────────────────────────

@router.get("/campaigns")
def list_campaigns(user: CurrentUser = Depends(require_min_role("user"))):
    with get_db() as cur:
        cur.execute("""
            SELECT c.*,
                   (SELECT COUNT(*) FROM si_campaign_prospects cp WHERE cp.campaign_id = c.id) AS prospect_count
            FROM si_campaigns c WHERE c.organization_id = %s ORDER BY c.created_at DESC
        """, (user.organization_id,))
        return rows(cur)


@router.post("/campaigns", status_code=201)
def create_campaign(
    payload: CampaignCreate,
    background: BackgroundTasks,
    request: Request,
    user: CurrentUser = Depends(require_min_role("manager")),
):
    org = user.organization_id
    with get_db() as cur:
        cur.execute("""
            INSERT INTO si_campaigns (organization_id, name, objective, description,
              target_criteria, agent_config, daily_limit, target_count, created_by)
            VALUES (%s,%s,%s,%s,%s::jsonb,%s::jsonb,%s,%s,%s)
            RETURNING *
        """, (org, payload.name, payload.objective, payload.description,
              json.dumps(payload.target_criteria), json.dumps(payload.agent_config),
              payload.daily_limit, payload.target_count, user.id))
        campaign = row(cur)
    background.add_task(log_audit, AuditEvent(
        action="si_campaign_created", organization_id=org, user_id=user.id,
        resource_type="si_campaign", resource_id=str(campaign["id"]),
        details={"name": payload.name}, ip=client_ip(request),
    ))
    return campaign


@router.patch("/campaigns/{campaign_id}")
def update_campaign(
    campaign_id: str,
    payload: CampaignUpdate,
    user: CurrentUser = Depends(require_min_role("manager")),
):
    org = user.organization_id
    with get_db() as cur:
        updates, params = [], []
        for field, val in payload.model_dump(exclude_none=True).items():
            updates.append(f"{field} = %s")
            params.append(json.dumps(val) if isinstance(val, dict) else val)
        if not updates:
            raise HTTPException(status_code=400, detail="Aucun champ")
        params.extend([campaign_id, org])
        cur.execute(
            f"UPDATE si_campaigns SET {', '.join(updates)} WHERE id = %s AND organization_id = %s RETURNING *",
            params,
        )
        return row(cur)


@router.post("/campaigns/{campaign_id}/launch")
def launch_campaign(
    campaign_id: str,
    background: BackgroundTasks,
    request: Request,
    user: CurrentUser = Depends(require_min_role("manager")),
):
    org = user.organization_id
    with get_db() as cur:
        cur.execute("SELECT * FROM si_campaigns WHERE id = %s AND organization_id = %s", (campaign_id, org))
        campaign = row(cur)
        if not campaign:
            raise HTTPException(status_code=404, detail="Campagne introuvable")
        if campaign["status"] not in ("draft", "paused"):
            raise HTTPException(status_code=409, detail=f"La campagne est déjà {campaign['status']}")
        cur.execute(
            "UPDATE si_campaigns SET status = 'active', started_at = NOW() WHERE id = %s AND organization_id = %s RETURNING *",
            (campaign_id, org),
        )
        updated = row(cur)
    background.add_task(log_audit, AuditEvent(
        action="si_campaign_launched", organization_id=org, user_id=user.id,
        resource_type="si_campaign", resource_id=campaign_id, ip=client_ip(request),
    ))
    return updated


@router.post("/campaigns/{campaign_id}/pause")
def pause_campaign(
    campaign_id: str,
    user: CurrentUser = Depends(require_min_role("manager")),
):
    org = user.organization_id
    with get_db() as cur:
        cur.execute(
            "UPDATE si_campaigns SET status = 'paused' WHERE id = %s AND organization_id = %s AND status = 'active' RETURNING *",
            (campaign_id, org),
        )
        updated = row(cur)
        if not updated:
            raise HTTPException(status_code=409, detail="La campagne n'est pas active")
    return updated


# ──────────────────────────────────────────────────────────────────────────
# AGENTS
# ──────────────────────────────────────────────────────────────────────────

@router.get("/agents")
def list_agents(user: CurrentUser = Depends(require_min_role("user"))):
    org = user.organization_id
    with get_db() as cur:
        cur.execute("""
            SELECT
              agent_type,
              COUNT(*) AS total_runs,
              COUNT(*) FILTER (WHERE status = 'success') AS successes,
              COUNT(*) FILTER (WHERE status = 'error') AS errors,
              ROUND(AVG(duration_ms)) AS avg_duration_ms,
              ROUND(AVG(tokens_used)) AS avg_tokens,
              MAX(started_at) AS last_run_at
            FROM si_agent_runs
            WHERE organization_id = %s
              AND started_at >= NOW() - INTERVAL '30 days'
            GROUP BY agent_type
        """, (org,))
        return rows(cur)


@router.get("/agents/{agent_type}/logs")
def get_agent_logs(
    agent_type: str,
    user: CurrentUser = Depends(require_min_role("user")),
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=50, ge=1, le=200),
):
    valid_types = {"prospector", "research", "qualification", "sales", "followup", "meeting", "proposal", "crm_sync"}
    if agent_type not in valid_types:
        raise HTTPException(status_code=400, detail=f"Type d'agent inconnu. Valeurs : {sorted(valid_types)}")
    org = user.organization_id
    offset = (page - 1) * limit
    with get_db() as cur:
        cur.execute("SELECT COUNT(*) AS total FROM si_agent_runs WHERE organization_id = %s AND agent_type = %s", (org, agent_type))
        total = row(cur)["total"]
        cur.execute("""
            SELECT ar.*, p.company_name AS prospect_name
            FROM si_agent_runs ar
            LEFT JOIN si_prospects p ON ar.prospect_id = p.id
            WHERE ar.organization_id = %s AND ar.agent_type = %s
            ORDER BY ar.started_at DESC LIMIT %s OFFSET %s
        """, (org, agent_type, limit, offset))
        return {"total": total, "page": page, "limit": limit, "items": rows(cur)}


# ──────────────────────────────────────────────────────────────────────────
# CONVERSATIONS
# ──────────────────────────────────────────────────────────────────────────

@router.get("/conversations")
def list_conversations(
    user: CurrentUser = Depends(require_min_role("user")),
    status: str | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=25, ge=1, le=100),
):
    org = user.organization_id
    where, params = ["c.organization_id = %s"], [org]
    if status:
        where.append("c.status = %s")
        params.append(status)
    offset = (page - 1) * limit
    with get_db() as cur:
        cur.execute(f"SELECT COUNT(*) AS total FROM si_conversations c WHERE {' AND '.join(where)}", params)
        total = row(cur)["total"]
        cur.execute(f"""
            SELECT c.*, p.company_name AS prospect_name, p.contact_email
            FROM si_conversations c
            JOIN si_prospects p ON c.prospect_id = p.id
            WHERE {' AND '.join(where)}
            ORDER BY c.updated_at DESC LIMIT %s OFFSET %s
        """, [*params, limit, offset])
        return {"total": total, "page": page, "limit": limit, "items": rows(cur)}


@router.get("/conversations/{conversation_id}")
def get_conversation(conversation_id: str, user: CurrentUser = Depends(require_min_role("user"))):
    org = user.organization_id
    with get_db() as cur:
        cur.execute("""
            SELECT c.*, p.company_name, p.contact_name, p.contact_email
            FROM si_conversations c JOIN si_prospects p ON c.prospect_id = p.id
            WHERE c.id = %s AND c.organization_id = %s
        """, (conversation_id, org))
        conversation = row(cur)
        if not conversation:
            raise HTTPException(status_code=404, detail="Conversation introuvable")
        cur.execute("SELECT * FROM si_messages WHERE conversation_id = %s ORDER BY sent_at ASC", (conversation_id,))
        messages = rows(cur)
    return {**conversation, "messages": messages}


@router.post("/conversations/{conversation_id}/reply")
def reply_conversation(
    conversation_id: str,
    payload: ConversationReply,
    background: BackgroundTasks,
    request: Request,
    user: CurrentUser = Depends(require_min_role("user")),
):
    org = user.organization_id
    with get_db() as cur:
        cur.execute("SELECT id FROM si_conversations WHERE id = %s AND organization_id = %s", (conversation_id, org))
        if not row(cur):
            raise HTTPException(status_code=404, detail="Conversation introuvable")
        cur.execute("""
            INSERT INTO si_messages (conversation_id, organization_id, role, content, subject)
            VALUES (%s, %s, 'human', %s, %s) RETURNING *
        """, (conversation_id, org, payload.content, payload.subject))
        message = row(cur)
        cur.execute("UPDATE si_conversations SET updated_at = NOW() WHERE id = %s", (conversation_id,))
    background.add_task(log_audit, AuditEvent(
        action="si_conversation_reply", organization_id=org, user_id=user.id,
        resource_type="si_conversation", resource_id=conversation_id, ip=client_ip(request),
    ))
    return message


# ──────────────────────────────────────────────────────────────────────────
# RÉUNIONS
# ──────────────────────────────────────────────────────────────────────────

@router.get("/meetings")
def list_meetings(
    user: CurrentUser = Depends(require_min_role("user")),
    upcoming: bool = Query(default=False),
):
    org = user.organization_id
    with get_db() as cur:
        sql = """
            SELECT m.*, p.company_name, p.contact_name
            FROM si_meetings m JOIN si_prospects p ON m.prospect_id = p.id
            WHERE m.organization_id = %s
        """
        params = [org]
        if upcoming:
            sql += " AND m.status = 'scheduled' AND m.scheduled_at >= NOW()"
        sql += " ORDER BY m.scheduled_at DESC LIMIT 200"
        cur.execute(sql, params)
        return rows(cur)


@router.post("/meetings", status_code=201)
def create_meeting(
    payload: MeetingCreate,
    background: BackgroundTasks,
    request: Request,
    user: CurrentUser = Depends(require_min_role("user")),
):
    org = user.organization_id
    with get_db() as cur:
        _check_prospect(payload.prospect_id, org, cur)
        cur.execute("""
            INSERT INTO si_meetings (organization_id, prospect_id, conversation_id, title, description,
              scheduled_at, duration_minutes, location, meeting_url, assigned_to)
            VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
            RETURNING *
        """, (org, payload.prospect_id, payload.conversation_id, payload.title, payload.description,
              payload.scheduled_at, payload.duration_minutes, payload.location,
              payload.meeting_url, payload.assigned_to or user.id))
        meeting = row(cur)
        cur.execute("UPDATE si_prospects SET status = 'meeting_set' WHERE id = %s AND organization_id = %s",
                    (payload.prospect_id, org))

    if _PROM_OK and _SI_MEETINGS:
        _SI_MEETINGS.labels(org_id=org[:8]).inc()
    background.add_task(log_audit, AuditEvent(
        action="si_meeting_created", organization_id=org, user_id=user.id,
        resource_type="si_meeting", resource_id=str(meeting["id"]), ip=client_ip(request),
    ))
    return meeting


@router.patch("/meetings/{meeting_id}")
def update_meeting(
    meeting_id: str,
    payload: MeetingUpdate,
    user: CurrentUser = Depends(require_min_role("user")),
):
    org = user.organization_id
    with get_db() as cur:
        updates, params = [], []
        for field, val in payload.model_dump(exclude_none=True).items():
            updates.append(f"{field} = %s")
            params.append(val)
        if not updates:
            raise HTTPException(status_code=400, detail="Aucun champ")
        params.extend([meeting_id, org])
        cur.execute(
            f"UPDATE si_meetings SET {', '.join(updates)} WHERE id = %s AND organization_id = %s RETURNING *",
            params,
        )
        updated = row(cur)
        if not updated:
            raise HTTPException(status_code=404, detail="Réunion introuvable")
    return updated


# ──────────────────────────────────────────────────────────────────────────
# ANALYTICS
# ──────────────────────────────────────────────────────────────────────────

@router.get("/analytics")
def get_analytics(
    user: CurrentUser = Depends(require_min_role("user")),
    period: int = Query(default=30, ge=7, le=365),
):
    org = user.organization_id
    with get_db() as cur:
        cur.execute("""
            SELECT status, COUNT(*) AS count
            FROM si_prospects WHERE organization_id = %s GROUP BY status
        """, (org,))
        funnel = rows(cur)

        cur.execute("""
            SELECT DATE_TRUNC('week', created_at) AS week,
                   COUNT(*) FILTER (WHERE status = 'won') AS conversions,
                   COUNT(*) AS total
            FROM si_prospects WHERE organization_id = %s
              AND created_at >= NOW() - INTERVAL '%s days'
            GROUP BY 1 ORDER BY 1
        """ , (org, period))
        weekly = rows(cur)

        cur.execute("""
            SELECT sector, COUNT(*) AS count, ROUND(AVG(ai_score)) AS avg_score
            FROM si_prospects WHERE organization_id = %s AND sector IS NOT NULL
            GROUP BY sector ORDER BY count DESC LIMIT 10
        """, (org,))
        by_sector = rows(cur)

        cur.execute("""
            SELECT agent_type,
                   COUNT(*) AS runs,
                   ROUND(AVG(cost_usd)::numeric, 6) AS avg_cost_usd,
                   SUM(tokens_used) AS total_tokens
            FROM si_agent_runs WHERE organization_id = %s
              AND started_at >= NOW() - INTERVAL '%s days'
            GROUP BY agent_type
        """, (org, period))
        agent_costs = rows(cur)

    return {
        "period_days": period,
        "funnel": funnel,
        "weekly_conversions": weekly,
        "top_sectors": by_sector,
        "agent_costs": agent_costs,
    }


# ──────────────────────────────────────────────────────────────────────────
# TEMPLATES
# ──────────────────────────────────────────────────────────────────────────

@router.get("/templates")
def list_templates(
    user: CurrentUser = Depends(require_min_role("user")),
    type: str | None = Query(default=None),
):
    with get_db() as cur:
        params = [user.organization_id]
        sql = "SELECT * FROM si_templates WHERE organization_id = %s AND is_active = true"
        if type:
            sql += " AND type = %s"
            params.append(type)
        sql += " ORDER BY usage_count DESC, name ASC"
        cur.execute(sql, params)
        return rows(cur)


@router.post("/templates", status_code=201)
def create_template(
    payload: TemplateCreate,
    user: CurrentUser = Depends(require_min_role("manager")),
):
    with get_db() as cur:
        cur.execute("""
            INSERT INTO si_templates (organization_id, name, type, channel, subject, body, variables, language, created_by)
            VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s) RETURNING *
        """, (user.organization_id, payload.name, payload.type, payload.channel,
              payload.subject, payload.body, payload.variables, payload.language, user.id))
        return row(cur)


@router.patch("/templates/{template_id}")
def update_template(
    template_id: str,
    payload: TemplateUpdate,
    user: CurrentUser = Depends(require_min_role("manager")),
):
    org = user.organization_id
    with get_db() as cur:
        updates, params = [], []
        for field, val in payload.model_dump(exclude_none=True).items():
            updates.append(f"{field} = %s")
            params.append(val)
        if not updates:
            raise HTTPException(status_code=400, detail="Aucun champ")
        params.extend([template_id, org])
        cur.execute(
            f"UPDATE si_templates SET {', '.join(updates)} WHERE id = %s AND organization_id = %s RETURNING *",
            params,
        )
        updated = row(cur)
        if not updated:
            raise HTTPException(status_code=404, detail="Template introuvable")
    return updated


# ──────────────────────────────────────────────────────────────────────────
# SETTINGS (ICP)
# ──────────────────────────────────────────────────────────────────────────

@router.get("/settings")
def get_settings(user: CurrentUser = Depends(require_min_role("user"))):
    with get_db() as cur:
        cur.execute("SELECT * FROM si_profiles WHERE organization_id = %s AND is_active = true LIMIT 1", (user.organization_id,))
        profile = row(cur)
    return profile or {}


@router.patch("/settings")
def update_settings(
    payload: SettingsUpdate,
    background: BackgroundTasks,
    request: Request,
    user: CurrentUser = Depends(require_min_role("admin")),
):
    org = user.organization_id
    data = payload.model_dump(exclude_none=True)
    with get_db() as cur:
        cur.execute("SELECT id FROM si_profiles WHERE organization_id = %s AND is_active = true LIMIT 1", (org,))
        existing = row(cur)

        if existing:
            updates = ", ".join(
                f"{k} = %s::{('jsonb' if k == 'products' else 'text[]') if isinstance(v, list) else 'text'}"
                if k in ("products",) else f"{k} = %s"
                for k, v in data.items()
            )
            params = [json.dumps(v) if isinstance(v, (list, dict)) else v for v in data.values()]
            params.append(org)
            cur.execute(f"UPDATE si_profiles SET {updates} WHERE organization_id = %s AND is_active = true RETURNING *", params)
            profile = row(cur)
        else:
            cur.execute("""
                INSERT INTO si_profiles (organization_id, products, target_sectors, target_countries,
                  employee_min, employee_max, languages, icp_description, value_proposition, avg_deal_size, sales_cycle_days)
                VALUES (%s, %s::jsonb, %s, %s, %s, %s, %s, %s, %s, %s, %s) RETURNING *
            """, (org,
                  json.dumps(data.get("products", [])),
                  data.get("target_sectors", []),
                  data.get("target_countries", ["CA"]),
                  data.get("employee_min", 10),
                  data.get("employee_max", 5000),
                  data.get("languages", ["fr"]),
                  data.get("icp_description"),
                  data.get("value_proposition"),
                  data.get("avg_deal_size"),
                  data.get("sales_cycle_days", 30)))
            profile = row(cur)

    background.add_task(log_audit, AuditEvent(
        action="si_settings_updated", organization_id=org, user_id=user.id,
        details={"fields": list(data.keys())}, ip=client_ip(request),
    ))
    return profile


# ──────────────────────────────────────────────────────────────────────────
# CRM
# ──────────────────────────────────────────────────────────────────────────

@router.get("/crm/status")
def crm_status(user: CurrentUser = Depends(require_min_role("user"))):
    with get_db() as cur:
        cur.execute("""
            SELECT crm_type,
                   COUNT(*) AS total,
                   COUNT(*) FILTER (WHERE status = 'synced') AS synced,
                   COUNT(*) FILTER (WHERE status = 'failed') AS failed,
                   MAX(last_sync_at) AS last_sync_at
            FROM si_crm_syncs WHERE organization_id = %s
            GROUP BY crm_type
        """, (user.organization_id,))
        return rows(cur)


@router.post("/crm/sync/{prospect_id}")
async def crm_sync_prospect(
    prospect_id: str,
    background: BackgroundTasks,
    request: Request,
    user: CurrentUser = Depends(require_min_role("manager")),
):
    org = user.organization_id
    with get_db() as cur:
        prospect = _check_prospect(prospect_id, org, cur)

    from sales_intelligence_service import crm_sync_agent
    result = await crm_sync_agent(prospect, org, user.id)

    with get_db() as cur:
        cur.execute("""
            INSERT INTO si_crm_syncs (organization_id, prospect_id, crm_type, crm_record_id, status, last_sync_at, sync_data)
            VALUES (%s, %s, %s, %s, %s, NOW(), %s::jsonb)
            ON CONFLICT (prospect_id, crm_type) DO UPDATE
              SET crm_record_id = EXCLUDED.crm_record_id,
                  status = EXCLUDED.status,
                  last_sync_at = NOW(),
                  sync_data = EXCLUDED.sync_data
            RETURNING *
        """, (org, prospect_id, result.get("crm_type", "hubspot"),
              result.get("crm_record_id"), result.get("status", "synced"),
              json.dumps(result.get("data", {}))))
        sync = row(cur)

    background.add_task(log_audit, AuditEvent(
        action="si_crm_synced", organization_id=org, user_id=user.id,
        resource_type="si_prospect", resource_id=prospect_id, ip=client_ip(request),
    ))
    return sync
