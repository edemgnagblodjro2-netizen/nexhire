"""Initiatives — programmes stratégiques au-dessus des Playbooks.

Exemples : Certification ISO 27001 · Loi 25 · Migration M365 · Adoption IA

Routes :
  GET    /api/initiatives           Liste
  POST   /api/initiatives           Créer
  GET    /api/initiatives/{id}      Détail + objets liés
  PUT    /api/initiatives/{id}      Modifier
  POST   /api/initiatives/{id}/link  Lier des objets (décisions, playbooks, politiques)
  GET    /api/initiatives/summary   KPIs globaux
"""
import json

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from pydantic import BaseModel, Field

from audit import AuditEvent, client_ip, log_audit
from auth import CurrentUser, get_current_user
from db import get_db, row, rows
from rbac import require_min_role

router = APIRouter(prefix="/api/initiatives", tags=["initiatives"])

INITIATIVE_TEMPLATES = [
    {"id": "iso27001", "name": "Certification ISO 27001", "icon": "🏆",
     "category": "certification", "description": "Atteindre la certification ISO 27001",
     "typical_decisions": 25, "typical_playbooks": 18, "typical_duration_days": 90},
    {"id": "loi25", "name": "Conformité Loi 25", "icon": "⚖️",
     "category": "compliance", "description": "Conformité complète à la Loi 25 (Québec)",
     "typical_decisions": 12, "typical_playbooks": 8, "typical_duration_days": 60},
    {"id": "iso42001", "name": "Certification ISO 42001", "icon": "🤖",
     "category": "certification", "description": "Certification ISO 42001 — Management de l'IA",
     "typical_decisions": 15, "typical_playbooks": 10, "typical_duration_days": 120},
    {"id": "m365_migration", "name": "Migration Microsoft 365", "icon": "🔷",
     "category": "migration", "description": "Migration et optimisation de l'environnement M365",
     "typical_decisions": 8, "typical_playbooks": 6, "typical_duration_days": 45},
    {"id": "ai_adoption", "name": "Adoption IA", "icon": "✨",
     "category": "ai_adoption", "description": "Programme d'adoption de l'IA dans l'organisation",
     "typical_decisions": 10, "typical_playbooks": 5, "typical_duration_days": 90},
    {"id": "cost_reduction", "name": "Réduction coûts TI", "icon": "💰",
     "category": "cost_reduction", "description": "Optimisation et réduction des coûts informatiques",
     "typical_decisions": 15, "typical_playbooks": 7, "typical_duration_days": 60},
    {"id": "cybersecurity", "name": "Programme Cybersécurité", "icon": "🛡️",
     "category": "security", "description": "Renforcement complet de la posture de cybersécurité",
     "typical_decisions": 20, "typical_playbooks": 12, "typical_duration_days": 120},
    {"id": "merger", "name": "Fusion / Intégration", "icon": "🤝",
     "category": "transformation", "description": "Intégration SI lors d'une fusion ou acquisition",
     "typical_decisions": 30, "typical_playbooks": 20, "typical_duration_days": 180},
]


def _ser(d: dict) -> dict:
    return {
        k: str(v) if v is not None and not isinstance(v, (str, int, float, bool, list, dict)) else v
        for k, v in d.items()
    }


# ── Templates ──────────────────────────────────────────────────────────────────

@router.get("/templates")
def list_templates():
    return {"templates": INITIATIVE_TEMPLATES}


# ── Résumé ─────────────────────────────────────────────────────────────────────

@router.get("/summary")
def initiatives_summary(user: CurrentUser = Depends(get_current_user)):
    oid = str(user.organization_id)
    with get_db() as cur:
        cur.execute(
            """SELECT
               COUNT(*) AS total,
               COUNT(*) FILTER (WHERE status = 'active') AS active,
               COUNT(*) FILTER (WHERE status = 'completed') AS completed,
               COALESCE(SUM(budget_estimate), 0) AS total_budget
               FROM initiatives WHERE org_id = %s""",
            (oid,),
        )
        s = dict(row(cur) or {})
    return s


# ── Liste ──────────────────────────────────────────────────────────────────────

@router.get("")
def list_initiatives(
    user: CurrentUser = Depends(get_current_user),
    status: str | None = Query(default="active,draft"),
    limit: int = Query(default=50, le=100),
    offset: int = Query(default=0, ge=0),
):
    oid = str(user.organization_id)
    sql = """
        SELECT i.*, u.full_name AS responsible_name
        FROM initiatives i
        LEFT JOIN users u ON u.id = i.responsible_id
        WHERE i.org_id = %s
    """
    params: list = [oid]

    if status:
        statuses = [s.strip() for s in status.split(",")]
        phs = ",".join(["%s"] * len(statuses))
        sql += f" AND i.status IN ({phs})"; params.extend(statuses)

    sql += " ORDER BY i.status, i.created_at DESC LIMIT %s OFFSET %s"
    params.extend([limit, offset])

    with get_db() as cur:
        cur.execute(sql, params)
        items = [_ser(dict(r)) for r in rows(cur)]

    for item in items:
        total = item.get("total_decisions", 0) or 0
        done  = item.get("done_decisions", 0) or 0
        item["progress_pct"] = round((done / total * 100) if total > 0 else 0)

    return {"initiatives": items, "total": len(items)}


# ── Détail ─────────────────────────────────────────────────────────────────────

@router.get("/{initiative_id}")
def get_initiative(initiative_id: str, user: CurrentUser = Depends(get_current_user)):
    oid = str(user.organization_id)
    with get_db() as cur:
        cur.execute(
            """SELECT i.*, u.full_name AS responsible_name
               FROM initiatives i
               LEFT JOIN users u ON u.id = i.responsible_id
               WHERE i.id = %s AND i.org_id = %s""",
            (initiative_id, oid),
        )
        init = row(cur)
    if not init:
        raise HTTPException(status_code=404, detail="Initiative introuvable.")

    result = _ser(dict(init))

    # Charger les décisions liées
    decision_ids = result.get("decision_ids") or []
    linked_decisions = []
    if decision_ids:
        with get_db() as cur:
            phs = ",".join(["%s"] * len(decision_ids))
            cur.execute(
                f"SELECT id, title, priority, status, savings_annual, cost_of_inaction FROM ai_decisions WHERE id IN ({phs}) AND org_id = %s",
                decision_ids + [oid],
            )
            linked_decisions = [_ser(dict(r)) for r in rows(cur)]

    # Charger les playbooks liés
    playbook_ids = result.get("playbook_ids") or []
    linked_playbooks = []
    if playbook_ids:
        with get_db() as cur:
            phs = ",".join(["%s"] * len(playbook_ids))
            cur.execute(
                f"SELECT id, name, category, icon, status, run_count FROM playbooks WHERE id IN ({phs}) AND org_id = %s",
                playbook_ids + [oid],
            )
            linked_playbooks = [_ser(dict(r)) for r in rows(cur)]

    result["linked_decisions"] = linked_decisions
    result["linked_playbooks"] = linked_playbooks
    total = result.get("total_decisions", 0) or 0
    done  = result.get("done_decisions", 0) or 0
    result["progress_pct"] = round((done / total * 100) if total > 0 else 0)

    return result


# ── Créer ──────────────────────────────────────────────────────────────────────

class InitiativeCreate(BaseModel):
    name: str = Field(..., min_length=3, max_length=200)
    description: str | None = None
    category: str = "general"
    icon: str = "🎯"
    target_score: int | None = Field(None, ge=0, le=100)
    budget_estimate: float | None = None
    deadline: str | None = None
    responsible_dept: str | None = None
    template_id: str | None = None

@router.post("", status_code=201)
def create_initiative(
    request: Request,
    payload: InitiativeCreate,
    user: CurrentUser = Depends(require_min_role("admin")),
):
    oid = str(user.organization_id)

    # Enrichir depuis le template si fourni
    tpl_counts = {"total_decisions": 0, "total_playbooks": 0}
    if payload.template_id:
        tpl = next((t for t in INITIATIVE_TEMPLATES if t["id"] == payload.template_id), None)
        if tpl:
            tpl_counts = {
                "total_decisions": tpl["typical_decisions"],
                "total_playbooks": tpl["typical_playbooks"],
            }

    with get_db() as cur:
        cur.execute(
            """INSERT INTO initiatives
               (org_id, name, description, category, icon, target_score, budget_estimate,
                deadline, responsible_dept, total_decisions, total_playbooks, created_by)
               VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
               RETURNING id""",
            (oid, payload.name, payload.description, payload.category, payload.icon,
             payload.target_score, payload.budget_estimate, payload.deadline,
             payload.responsible_dept,
             tpl_counts["total_decisions"], tpl_counts["total_playbooks"],
             str(user.id)),
        )
        created = row(cur)
    log_audit(AuditEvent(action="initiative_created", user_id=str(user.id), organization_id=oid,
                         ip_address=client_ip(request), success=True, http_status=201))
    return {"ok": True, "id": str(created["id"])}


# ── Lier des objets ────────────────────────────────────────────────────────────

class LinkPayload(BaseModel):
    decision_ids:  list[str] | None = None
    playbook_ids:  list[str] | None = None
    policy_ids:    list[str] | None = None
    framework_ids: list[str] | None = None

@router.post("/{initiative_id}/link")
def link_objects(
    initiative_id: str,
    request: Request,
    payload: LinkPayload,
    user: CurrentUser = Depends(require_min_role("admin")),
):
    oid = str(user.organization_id)
    sets, params = [], []

    if payload.decision_ids is not None:
        sets.append("decision_ids = %s::uuid[]"); params.append(payload.decision_ids)
        sets.append("total_decisions = %s"); params.append(len(payload.decision_ids))
    if payload.playbook_ids is not None:
        sets.append("playbook_ids = %s::uuid[]"); params.append(payload.playbook_ids)
        sets.append("total_playbooks = %s"); params.append(len(payload.playbook_ids))
    if payload.policy_ids is not None:
        sets.append("policy_ids = %s::uuid[]"); params.append(payload.policy_ids)
    if payload.framework_ids is not None:
        sets.append("framework_ids = %s::uuid[]"); params.append(payload.framework_ids)

    if not sets:
        raise HTTPException(status_code=400, detail="Aucun objet à lier.")

    params.extend([initiative_id, oid])
    with get_db() as cur:
        cur.execute(
            f"UPDATE initiatives SET {', '.join(sets)}, updated_at=now() WHERE id = %s AND org_id = %s RETURNING id",
            params,
        )
        if not row(cur):
            raise HTTPException(status_code=404, detail="Initiative introuvable.")
    return {"ok": True}


# ── Modifier ───────────────────────────────────────────────────────────────────

class InitiativeUpdate(BaseModel):
    name: str | None = Field(None, min_length=3, max_length=200)
    description: str | None = None
    status: str | None = None
    current_score: int | None = Field(None, ge=0, le=100)
    done_decisions: int | None = None
    done_playbooks: int | None = None

@router.put("/{initiative_id}")
def update_initiative(
    initiative_id: str,
    request: Request,
    payload: InitiativeUpdate,
    user: CurrentUser = Depends(require_min_role("admin")),
):
    oid = str(user.organization_id)
    fields, params = [], []
    if payload.name is not None:          fields.append("name = %s"); params.append(payload.name)
    if payload.description is not None:   fields.append("description = %s"); params.append(payload.description)
    if payload.status is not None:        fields.append("status = %s"); params.append(payload.status)
    if payload.current_score is not None: fields.append("current_score = %s"); params.append(payload.current_score)
    if payload.done_decisions is not None:fields.append("done_decisions = %s"); params.append(payload.done_decisions)
    if payload.done_playbooks is not None:fields.append("done_playbooks = %s"); params.append(payload.done_playbooks)
    if not fields:
        raise HTTPException(status_code=400, detail="Aucun champ à modifier.")
    params.extend([initiative_id, oid])
    with get_db() as cur:
        cur.execute(
            f"UPDATE initiatives SET {', '.join(fields)}, updated_at=now() WHERE id = %s AND org_id = %s RETURNING id",
            params,
        )
        if not row(cur):
            raise HTTPException(status_code=404, detail="Initiative introuvable.")
    return {"ok": True}
