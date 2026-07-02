"""Centre d'Orchestration — automatisations atomiques réutilisables.

Routes :
  GET    /api/orchestrations               Liste par connecteur / catégorie
  POST   /api/orchestrations               Créer
  GET    /api/orchestrations/{id}          Détail
  PUT    /api/orchestrations/{id}          Modifier
  POST   /api/orchestrations/{id}/run      Déclencher
  GET    /api/orchestrations/{id}/runs     Historique
  GET    /api/orchestrations/connectors    Liste des connecteurs disponibles
  GET    /api/orchestrations/summary       Stats globales
"""

import json

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from pydantic import BaseModel, Field

from audit import AuditEvent, client_ip, log_audit
from auth import CurrentUser, get_current_user
from db import get_db, row, rows
from rbac import require_min_role

router = APIRouter(prefix="/api/orchestrations", tags=["orchestrations"])

CONNECTOR_META = {
    "microsoft_graph": {"label": "Microsoft Graph", "icon": "🔷", "group": "Microsoft"},
    "exchange": {"label": "Exchange Online", "icon": "📧", "group": "Microsoft"},
    "sharepoint": {"label": "SharePoint", "icon": "📂", "group": "Microsoft"},
    "teams": {"label": "Microsoft Teams", "icon": "💬", "group": "Microsoft"},
    "power_automate": {"label": "Power Automate", "icon": "⚡", "group": "Microsoft"},
    "azure_automation": {"label": "Azure Automation", "icon": "🔵", "group": "Microsoft"},
    "entra_id": {"label": "Microsoft Entra ID", "icon": "🆔", "group": "Microsoft"},
    "intune": {"label": "Microsoft Intune", "icon": "📱", "group": "Microsoft"},
    "sentinel": {"label": "Microsoft Sentinel", "icon": "🛡️", "group": "Microsoft"},
    "powershell": {"label": "PowerShell", "icon": "🖥️", "group": "Scripts"},
    "python": {"label": "Script Python", "icon": "🐍", "group": "Scripts"},
    "bash": {"label": "Script Bash", "icon": "⚙️", "group": "Scripts"},
    "servicenow": {"label": "ServiceNow", "icon": "🎫", "group": "ITSM"},
    "jira": {"label": "Jira", "icon": "📌", "group": "ITSM"},
    "sap": {"label": "SAP", "icon": "🏭", "group": "ERP / SIRH"},
    "workday": {"label": "Workday", "icon": "👤", "group": "ERP / SIRH"},
    "email": {"label": "Email (SMTP / Graph)", "icon": "✉️", "group": "Communication"},
    "slack": {"label": "Slack", "icon": "💬", "group": "Communication"},
    "webhook": {"label": "Webhook sortant", "icon": "🔗", "group": "Communication"},
    "rest_api": {"label": "REST API générique", "icon": "🌐", "group": "Générique"},
    "graphql": {"label": "GraphQL", "icon": "◈", "group": "Générique"},
    "soap": {"label": "SOAP / XML", "icon": "📨", "group": "Générique"},
    "internal": {"label": "MyPortal interne", "icon": "🏠", "group": "Interne"},
}


def _ser(d: dict) -> dict:
    return {
        k: str(v) if v is not None and not isinstance(v, (str, int, float, bool, list, dict)) else v
        for k, v in d.items()
    }


# ── Connecteurs disponibles ────────────────────────────────────────────────────


@router.get("/connectors")
def list_connectors():
    return {"connectors": [{"type": t, **meta} for t, meta in CONNECTOR_META.items()]}


# ── Résumé ─────────────────────────────────────────────────────────────────────


@router.get("/summary")
def orchestrations_summary(user: CurrentUser = Depends(get_current_user)):
    oid = str(user.organization_id)
    with get_db() as cur:
        cur.execute(
            """SELECT
               COUNT(*) AS total,
               COUNT(*) FILTER (WHERE status = 'active') AS active,
               SUM(run_count)     AS total_runs,
               SUM(success_count) AS total_success
               FROM orchestrations WHERE org_id = %s""",
            (oid,),
        )
        s = dict(row(cur) or {})
    return {k: int(v) if v is not None else 0 for k, v in s.items()}


# ── Liste ──────────────────────────────────────────────────────────────────────


@router.get("")
def list_orchestrations(
    user: CurrentUser = Depends(get_current_user),
    connector_type: str | None = None,
    category: str | None = None,
    status: str | None = Query(default="active"),
    limit: int = Query(default=100, le=200),
    offset: int = Query(default=0, ge=0),
):
    oid = str(user.organization_id)
    sql = """
        SELECT o.*, u.full_name AS responsible_name
        FROM orchestrations o
        LEFT JOIN users u ON u.id = o.responsible_id
        WHERE o.org_id = %s
    """
    params: list = [oid]

    if connector_type:
        sql += " AND o.connector_type = %s"
        params.append(connector_type)
    if category:
        sql += " AND o.category = %s"
        params.append(category)
    if status:
        statuses = [s.strip() for s in status.split(",")]
        phs = ",".join(["%s"] * len(statuses))
        sql += f" AND o.status IN ({phs})"
        params.extend(statuses)

    sql += " ORDER BY o.run_count DESC, o.name LIMIT %s OFFSET %s"
    params.extend([limit, offset])

    with get_db() as cur:
        cur.execute(sql, params)
        items = [_ser(dict(r)) for r in rows(cur)]

    # Enrichir avec les métadonnées du connecteur
    for item in items:
        ct = item.get("connector_type", "")
        meta = CONNECTOR_META.get(ct, {"label": ct, "icon": "⚙️", "group": "Autre"})
        item["connector_label"] = meta["label"]
        item["connector_icon"] = meta["icon"]
        item["connector_group"] = meta["group"]

    return {"orchestrations": items, "total": len(items)}


# ── Détail ─────────────────────────────────────────────────────────────────────


@router.get("/{orch_id}")
def get_orchestration(orch_id: str, user: CurrentUser = Depends(get_current_user)):
    oid = str(user.organization_id)
    with get_db() as cur:
        cur.execute(
            """SELECT o.*, u.full_name AS responsible_name
               FROM orchestrations o
               LEFT JOIN users u ON u.id = o.responsible_id
               WHERE o.id = %s AND o.org_id = %s""",
            (orch_id, oid),
        )
        o = row(cur)
    if not o:
        raise HTTPException(status_code=404, detail="Orchestration introuvable.")
    result = _ser(dict(o))
    ct = result.get("connector_type", "")
    meta = CONNECTOR_META.get(ct, {"label": ct, "icon": "⚙️", "group": "Autre"})
    result.update({"connector_label": meta["label"], "connector_icon": meta["icon"]})
    return result


# ── Créer ──────────────────────────────────────────────────────────────────────


class OrchCreate(BaseModel):
    name: str = Field(..., min_length=3, max_length=200)
    description: str | None = None
    connector_type: str
    category: str | None = None
    steps: list = Field(default_factory=list)
    input_schema: dict = Field(default_factory=dict)
    timeout_seconds: int = 300
    credential_ref: str | None = None
    responsible_dept: str | None = None


@router.post("", status_code=201)
def create_orchestration(
    request: Request,
    payload: OrchCreate,
    user: CurrentUser = Depends(require_min_role("admin")),
):
    if payload.connector_type not in CONNECTOR_META:
        raise HTTPException(status_code=400, detail=f"Connecteur '{payload.connector_type}' non reconnu.")
    oid = str(user.organization_id)
    with get_db() as cur:
        cur.execute(
            """INSERT INTO orchestrations
               (org_id, name, description, connector_type, category, steps, input_schema,
                timeout_seconds, credential_ref, responsible_dept, created_by)
               VALUES (%s,%s,%s,%s,%s,%s::jsonb,%s::jsonb,%s,%s,%s,%s)
               RETURNING id""",
            (
                oid,
                payload.name,
                payload.description,
                payload.connector_type,
                payload.category,
                json.dumps(payload.steps),
                json.dumps(payload.input_schema),
                payload.timeout_seconds,
                payload.credential_ref,
                payload.responsible_dept,
                str(user.id),
            ),
        )
        created = row(cur)
    log_audit(
        AuditEvent(
            action="orchestration_created",
            user_id=str(user.id),
            organization_id=oid,
            ip_address=client_ip(request),
            success=True,
            http_status=201,
        )
    )
    return {"ok": True, "id": str(created["id"])}


# ── Déclencher ────────────────────────────────────────────────────────────────


class OrchRunPayload(BaseModel):
    input: dict = Field(default_factory=dict)
    trigger_type: str = "manual"


@router.post("/{orch_id}/run", status_code=201)
def run_orchestration(
    orch_id: str,
    request: Request,
    payload: OrchRunPayload,
    user: CurrentUser = Depends(get_current_user),
):
    oid = str(user.organization_id)
    with get_db() as cur:
        cur.execute(
            "SELECT id FROM orchestrations WHERE id = %s AND org_id = %s AND status = 'active'",
            (orch_id, oid),
        )
        if not row(cur):
            raise HTTPException(status_code=404, detail="Orchestration introuvable ou inactive.")
        cur.execute(
            """INSERT INTO orchestration_runs
               (orchestration_id, org_id, status, trigger_type, triggered_by, input, started_at)
               VALUES (%s,%s,'running',%s,%s,%s::jsonb,now())
               RETURNING id""",
            (orch_id, oid, payload.trigger_type, str(user.id), json.dumps(payload.input)),
        )
        run = row(cur)
        cur.execute(
            "UPDATE orchestrations SET run_count = run_count + 1, last_run_at = now() WHERE id = %s",
            (orch_id,),
        )
    log_audit(
        AuditEvent(
            action="orchestration_triggered",
            user_id=str(user.id),
            organization_id=oid,
            ip_address=client_ip(request),
            success=True,
            http_status=201,
            resource_ids=[orch_id],
        )
    )
    return {"ok": True, "run_id": str(run["id"])}


# ── Historique ─────────────────────────────────────────────────────────────────


@router.get("/{orch_id}/runs")
def list_orch_runs(
    orch_id: str,
    user: CurrentUser = Depends(get_current_user),
    limit: int = Query(default=20, le=100),
):
    oid = str(user.organization_id)
    with get_db() as cur:
        cur.execute(
            """SELECT r.*, u.full_name AS triggered_by_name
               FROM orchestration_runs r
               LEFT JOIN users u ON u.id = r.triggered_by
               WHERE r.orchestration_id = %s AND r.org_id = %s
               ORDER BY r.created_at DESC LIMIT %s""",
            (orch_id, oid, limit),
        )
        items = [_ser(dict(r)) for r in rows(cur)]
    return {"runs": items}
