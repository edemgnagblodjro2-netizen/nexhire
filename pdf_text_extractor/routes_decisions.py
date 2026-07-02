"""Décisions IA — dossiers exécutifs avec ROI, coût d'inaction et bouton d'action.

Routes :
  GET    /api/decisions             Liste paginée + filtres
  POST   /api/decisions             Créer
  GET    /api/decisions/{id}        Détail
  PUT    /api/decisions/{id}        Modifier
  POST   /api/decisions/{id}/accept Accepter + déclencher action
  POST   /api/decisions/{id}/delegate Déléguer
  POST   /api/decisions/{id}/ignore Ignorer
  POST   /api/decisions/{id}/apply  Marquer comme appliquée
  GET    /api/decisions/summary     Résumé exécutif (KPIs)
"""

from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from pydantic import BaseModel, Field

from audit import AuditEvent, client_ip, log_audit
from auth import CurrentUser, get_current_user
from db import get_db, row, rows
from rbac import require_min_role

router = APIRouter(prefix="/api/decisions", tags=["decisions"])


def _ser(d: dict) -> dict:
    return {
        k: str(v) if v is not None and not isinstance(v, (str, int, float, bool, list, dict)) else v
        for k, v in d.items()
    }


# ── Liste ──────────────────────────────────────────────────────────────────────


@router.get("")
def list_decisions(
    user: CurrentUser = Depends(get_current_user),
    category: str | None = None,
    priority: str | None = None,
    status: str | None = Query(default="new,reviewing,accepted"),
    limit: int = Query(default=50, le=200),
    offset: int = Query(default=0, ge=0),
):
    oid = str(user.organization_id)
    sql = """
        SELECT d.*,
               u.full_name  AS responsible_name,
               u.email      AS responsible_email
        FROM ai_decisions d
        LEFT JOIN users u ON u.id = d.responsible_id
        WHERE d.org_id = %s
    """
    params: list = [oid]

    if category:
        sql += " AND d.category = %s"
        params.append(category)
    if priority:
        sql += " AND d.priority = %s"
        params.append(priority)
    if status:
        statuses = [s.strip() for s in status.split(",")]
        placeholders = ",".join(["%s"] * len(statuses))
        sql += f" AND d.status IN ({placeholders})"
        params.extend(statuses)

    sql += " ORDER BY CASE d.priority WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 ELSE 4 END, d.created_at DESC LIMIT %s OFFSET %s"
    params.extend([limit, offset])

    with get_db() as cur:
        cur.execute(sql, params)
        items = [_ser(dict(r)) for r in rows(cur)]

    return {"decisions": items, "total": len(items), "offset": offset}


# ── Résumé exécutif ────────────────────────────────────────────────────────────


@router.get("/summary")
def decisions_summary(user: CurrentUser = Depends(get_current_user)):
    oid = str(user.organization_id)
    with get_db() as cur:
        cur.execute(
            """SELECT
               COUNT(*) FILTER (WHERE status IN ('new','reviewing')) AS pending,
               COUNT(*) FILTER (WHERE priority = 'critical' AND status IN ('new','reviewing')) AS critical,
               COUNT(*) FILTER (WHERE status = 'applied') AS applied,
               COALESCE(SUM(savings_annual) FILTER (WHERE status = 'applied'), 0) AS savings_realized,
               COALESCE(SUM(cost_of_inaction) FILTER (WHERE status IN ('new','reviewing','accepted')), 0) AS total_exposure
               FROM ai_decisions
               WHERE org_id = %s""",
            (oid,),
        )
        s = dict(row(cur) or {})
    return {k: float(v) if isinstance(v, type(None).__class__) else v for k, v in s.items()}


# ── Détail ─────────────────────────────────────────────────────────────────────


@router.get("/{decision_id}")
def get_decision(decision_id: str, user: CurrentUser = Depends(get_current_user)):
    oid = str(user.organization_id)
    with get_db() as cur:
        cur.execute(
            """SELECT d.*, u.full_name AS responsible_name
               FROM ai_decisions d
               LEFT JOIN users u ON u.id = d.responsible_id
               WHERE d.id = %s AND d.org_id = %s""",
            (decision_id, oid),
        )
        d = row(cur)
    if not d:
        raise HTTPException(status_code=404, detail="Décision introuvable.")
    return _ser(dict(d))


# ── Créer ──────────────────────────────────────────────────────────────────────


class DecisionCreate(BaseModel):
    title: str = Field(..., min_length=3, max_length=300)
    category: str = "general"
    priority: str = "medium"
    problem_statement: str | None = None
    why_now: str | None = None
    evidence: list = []
    cost_of_inaction: float | None = None
    savings_annual: float | None = None
    roi_label: str = "neutral"
    risk_label: str = "medium"
    time_label: str | None = None
    time_to_apply_min: int | None = None
    responsible_dept: str | None = None
    due_date: str | None = None


@router.post("", status_code=201)
def create_decision(
    request: Request,
    payload: DecisionCreate,
    user: CurrentUser = Depends(require_min_role("admin")),
):
    oid = str(user.organization_id)
    with get_db() as cur:
        cur.execute(
            """INSERT INTO ai_decisions
               (org_id, title, category, priority, problem_statement, why_now,
                evidence, cost_of_inaction, savings_annual, roi_label, risk_label,
                time_label, time_to_apply_min, responsible_dept, due_date)
               VALUES (%s,%s,%s,%s,%s,%s,%s::jsonb,%s,%s,%s,%s,%s,%s,%s,%s)
               RETURNING id""",
            (
                oid,
                payload.title,
                payload.category,
                payload.priority,
                payload.problem_statement,
                payload.why_now,
                str(payload.evidence),
                payload.cost_of_inaction,
                payload.savings_annual,
                payload.roi_label,
                payload.risk_label,
                payload.time_label,
                payload.time_to_apply_min,
                payload.responsible_dept,
                payload.due_date,
            ),
        )
        created = row(cur)
    log_audit(
        AuditEvent(
            action="decision_created",
            user_id=str(user.id),
            organization_id=oid,
            ip_address=client_ip(request),
            success=True,
            http_status=201,
        )
    )
    return {"ok": True, "id": str(created["id"])}


# ── Actions ────────────────────────────────────────────────────────────────────


class AcceptPayload(BaseModel):
    trigger_playbook: bool = False


@router.post("/{decision_id}/accept")
def accept_decision(
    decision_id: str,
    request: Request,
    payload: AcceptPayload,
    user: CurrentUser = Depends(get_current_user),
):
    oid = str(user.organization_id)
    with get_db() as cur:
        cur.execute(
            """UPDATE ai_decisions
               SET status = 'accepted', accepted_by = %s, accepted_at = now()
               WHERE id = %s AND org_id = %s AND status IN ('new','reviewing')
               RETURNING id, playbook_id""",
            (str(user.id), decision_id, oid),
        )
        updated = row(cur)
    if not updated:
        raise HTTPException(status_code=404, detail="Décision introuvable ou non modifiable.")

    result: dict = {"ok": True, "status": "accepted"}

    if payload.trigger_playbook and updated.get("playbook_id"):
        with get_db() as cur:
            cur.execute(
                """INSERT INTO playbook_runs (playbook_id, org_id, status, trigger_type, trigger_ref, triggered_by, total_steps)
                   SELECT id, org_id, 'pending', 'decision', %s::uuid, %s, jsonb_array_length(steps)
                   FROM playbooks WHERE id = %s AND org_id = %s
                   RETURNING id""",
                (decision_id, str(user.id), str(updated["playbook_id"]), oid),
            )
            run = row(cur)
        if run:
            result["playbook_run_id"] = str(run["id"])

    log_audit(
        AuditEvent(
            action="decision_accepted",
            user_id=str(user.id),
            organization_id=oid,
            ip_address=client_ip(request),
            success=True,
            http_status=200,
            resource_ids=[decision_id],
        )
    )
    return result


class DelegatePayload(BaseModel):
    delegate_to_id: str
    message: str | None = Field(None, max_length=500)


@router.post("/{decision_id}/delegate")
def delegate_decision(
    decision_id: str,
    request: Request,
    payload: DelegatePayload,
    user: CurrentUser = Depends(get_current_user),
):
    oid = str(user.organization_id)
    with get_db() as cur:
        cur.execute(
            """UPDATE ai_decisions
               SET status = 'delegated', delegated_to = %s, updated_at = now()
               WHERE id = %s AND org_id = %s
               RETURNING id""",
            (payload.delegate_to_id, decision_id, oid),
        )
        if not row(cur):
            raise HTTPException(status_code=404, detail="Décision introuvable.")
    return {"ok": True, "status": "delegated"}


class IgnorePayload(BaseModel):
    reason: str | None = Field(None, max_length=500)


@router.post("/{decision_id}/ignore")
def ignore_decision(
    decision_id: str,
    request: Request,
    payload: IgnorePayload,
    user: CurrentUser = Depends(get_current_user),
):
    oid = str(user.organization_id)
    with get_db() as cur:
        cur.execute(
            """UPDATE ai_decisions
               SET status = 'ignored', ignored_reason = %s, updated_at = now()
               WHERE id = %s AND org_id = %s
               RETURNING id""",
            (payload.reason, decision_id, oid),
        )
        if not row(cur):
            raise HTTPException(status_code=404, detail="Décision introuvable.")
    return {"ok": True, "status": "ignored"}


@router.post("/{decision_id}/apply")
def mark_applied(
    decision_id: str,
    request: Request,
    user: CurrentUser = Depends(get_current_user),
):
    oid = str(user.organization_id)
    with get_db() as cur:
        cur.execute(
            """UPDATE ai_decisions
               SET status = 'applied', applied_at = now(), updated_at = now()
               WHERE id = %s AND org_id = %s
               RETURNING id""",
            (decision_id, oid),
        )
        if not row(cur):
            raise HTTPException(status_code=404, detail="Décision introuvable.")
    log_audit(
        AuditEvent(
            action="decision_applied",
            user_id=str(user.id),
            organization_id=oid,
            ip_address=client_ip(request),
            success=True,
            http_status=200,
            resource_ids=[decision_id],
        )
    )
    return {"ok": True, "status": "applied"}
