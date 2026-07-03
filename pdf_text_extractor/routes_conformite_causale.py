"""Conformité Causale — pilier 7 de l'architecture v3.

Chaîne causale : Score → Pourquoi → Preuves → Coût de l'inaction →
                 Plan d'action → Automatisation → Correction → Nouveau score.

GET  /api/conformite/summary                            → KPIs globaux
GET  /api/conformite/frameworks                         → liste frameworks avec scores
GET  /api/conformite/frameworks/{id}                    → détail + contrôles groupés par domaine
GET  /api/conformite/frameworks/{id}/nonconformites     → liste avec causes racines
GET  /api/conformite/controls/{id}                      → chaîne causale complète
POST /api/conformite/nonconformites/{id}/action-plan    → créer un plan d'action
POST /api/conformite/nonconformites/{id}/resolve        → marquer résolu
"""

import uuid
from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from auth import CurrentUser, get_current_user
from db import get_db, row, rows
from rbac import require_min_role

router = APIRouter(prefix="/api/conformite", tags=["conformite-causale"])


# ── Schemas ───────────────────────────────────────────────────────────────────


class ActionPlanCreate(BaseModel):
    title: str = Field(..., min_length=2, max_length=200)
    description: str | None = None
    owner: str | None = None
    due_date: str | None = None
    playbook_id: str | None = None
    orchestration_id: str | None = None


class ResolveBody(BaseModel):
    resolution_note: str | None = None
    evidence_url: str | None = None


# ── Helpers ───────────────────────────────────────────────────────────────────


def _fmt(r) -> dict:
    d = dict(r)
    for k in ("id", "org_id", "framework_id", "nonconformite_id", "playbook_id", "orchestration_id"):
        if k in d and d[k] is not None:
            d[k] = str(d[k])
    for k in ("created_at", "updated_at", "resolved_at", "due_date", "last_assessed_at"):
        if k in d and d[k] is not None:
            d[k] = d[k].isoformat() if hasattr(d[k], "isoformat") else d[k]
    return d


# ── Données de démonstration embarquées ───────────────────────────────────────

_DEMO_SUMMARY = {
    "overall_score": 72,
    "score_trend": +3,
    "frameworks_count": 3,
    "controls_total": 114,
    "controls_compliant": 82,
    "nonconformites_open": 14,
    "nonconformites_critical": 4,
    "cost_of_inaction_total": 187000,
}

_DEMO_FRAMEWORKS = [
    {
        "id": "fw-iso27001",
        "name": "ISO 27001:2022",
        "icon": "🔒",
        "score": 68,
        "score_trend": +2,
        "status": "in_progress",
        "controls_total": 93,
        "controls_compliant": 63,
        "nonconformites": 8,
        "last_assessed_at": "2026-06-15T00:00:00",
        "domains": [
            {"name": "Contrôle d'accès", "score": 55, "controls": 12, "gaps": 5},
            {"name": "Cryptographie", "score": 80, "controls": 6, "gaps": 1},
            {"name": "Sécurité physique", "score": 90, "controls": 8, "gaps": 1},
            {"name": "Gestion des opérations", "score": 65, "controls": 14, "gaps": 5},
            {"name": "Gestion des incidents", "score": 50, "controls": 7, "gaps": 4},
            {"name": "Conformité", "score": 75, "controls": 10, "gaps": 2},
        ],
    },
    {
        "id": "fw-loi25",
        "name": "Loi 25 (Québec)",
        "icon": "🇨🇦",
        "score": 81,
        "score_trend": +5,
        "status": "compliant",
        "controls_total": 18,
        "controls_compliant": 15,
        "nonconformites": 3,
        "last_assessed_at": "2026-06-20T00:00:00",
        "domains": [
            {"name": "Gouvernance des données", "score": 85, "controls": 5, "gaps": 1},
            {"name": "Droits des personnes", "score": 80, "controls": 6, "gaps": 1},
            {"name": "Sécurité des données", "score": 75, "controls": 7, "gaps": 1},
        ],
    },
    {
        "id": "fw-iso42001",
        "name": "ISO 42001 (IA)",
        "icon": "🤖",
        "score": 58,
        "score_trend": 0,
        "status": "in_progress",
        "controls_total": 38,
        "controls_compliant": 22,
        "nonconformites": 6,
        "last_assessed_at": "2026-06-01T00:00:00",
        "domains": [
            {"name": "Gouvernance IA", "score": 60, "controls": 10, "gaps": 4},
            {"name": "Transparence & Explicabilité", "score": 50, "controls": 8, "gaps": 4},
            {"name": "Gestion des risques IA", "score": 65, "controls": 10, "gaps": 3},
            {"name": "Droits & Équité", "score": 55, "controls": 10, "gaps": 5},
        ],
    },
]

_DEMO_NONCONFORMITES = {
    "fw-iso27001": [
        {
            "id": "nc-001",
            "framework_id": "fw-iso27001",
            "control_ref": "A.5.15",
            "control_name": "Contrôle d'accès",
            "title": "8 comptes sans MFA activé",
            "severity": "critical",
            "root_cause": "Absence de politique MFA obligatoire et aucun mécanisme d'enforcement automatique via Entra ID.",
            "evidence": [
                "8 utilisateurs actifs sans MFA dans Entra ID",
                "Audit du 2026-06-10",
                "Logs d'accès non protégés",
            ],
            "cost_of_inaction": 45000,
            "cost_label": "Exposition annuelle estimée : 45 000 $",
            "suggested_playbook": "Activation MFA global",
            "playbook_id": None,
            "status": "open",
            "created_at": "2026-06-10T00:00:00",
        },
        {
            "id": "nc-002",
            "framework_id": "fw-iso27001",
            "control_ref": "A.5.23",
            "control_name": "Sécurité des services cloud",
            "title": "2 politiques de sécurité expirées",
            "severity": "high",
            "root_cause": "Cycle de révision des politiques non automatisé. Dernière révision manuelle il y a 14 mois.",
            "evidence": ["Politique MDM expirée depuis 45 jours", "Politique BYOD non révisée depuis 14 mois"],
            "cost_of_inaction": 28000,
            "cost_label": "Risque d'audit externe : 28 000 $",
            "suggested_playbook": "Révision des politiques de sécurité",
            "playbook_id": None,
            "status": "open",
            "created_at": "2026-05-28T00:00:00",
        },
        {
            "id": "nc-003",
            "framework_id": "fw-iso27001",
            "control_ref": "A.5.26",
            "control_name": "Gestion des incidents",
            "title": "Absence de procédure de réponse aux incidents documentée",
            "severity": "high",
            "root_cause": "Le Playbook de réponse aux incidents n'a jamais été formalisé ni testé.",
            "evidence": ["Aucun runbook d'incident en place", "Dernier test de simulation : jamais"],
            "cost_of_inaction": 72000,
            "cost_label": "Coût moyen d'un incident non géré : 72 000 $",
            "suggested_playbook": "Incident Sécurité — Réponse",
            "playbook_id": None,
            "status": "open",
            "created_at": "2026-06-01T00:00:00",
        },
        {
            "id": "nc-004",
            "framework_id": "fw-iso27001",
            "control_ref": "A.8.8",
            "control_name": "Gestion des vulnérabilités",
            "title": "14 licences M365 non utilisées assignées",
            "severity": "medium",
            "root_cause": "Aucun processus de revue périodique des licences. Les comptes désactivés conservent leurs licences.",
            "evidence": ["14 licences E3 assignées à des comptes inactifs > 90 jours", "Coût mensuel : 560 $"],
            "cost_of_inaction": 6720,
            "cost_label": "Surcoût annuel : 6 720 $",
            "suggested_playbook": "Optimisation licences M365",
            "playbook_id": None,
            "status": "in_progress",
            "created_at": "2026-05-15T00:00:00",
        },
    ],
}


# ── Routes ───────────────────────────────────────────────────────────────────


@router.get("/summary")
def get_summary(user: CurrentUser = Depends(get_current_user)):
    oid = str(user.organization_id)
    with get_db() as cur:
        cur.execute("SELECT COUNT(*) FROM compliance_frameworks WHERE org_id = %s", (oid,))
        fw_row = row(cur)
        fw_count = fw_row["count"] if fw_row else 0

    if fw_count == 0:
        return {**_DEMO_SUMMARY, "is_demo": True}

    with get_db() as cur:
        cur.execute(
            """
            SELECT
              COUNT(*) AS controls_total,
              COUNT(*) FILTER (WHERE status = 'compliant') AS controls_compliant
            FROM compliance_controls cc
            JOIN compliance_frameworks cf ON cf.id = cc.framework_id
            WHERE cf.org_id = %s
        """,
            (oid,),
        )
        ctl = dict(row(cur) or {})

    with get_db() as cur:
        cur.execute(
            """
            SELECT
              COUNT(*) AS total,
              COUNT(*) FILTER (WHERE severity = 'critical' AND status != 'resolved') AS critical
            FROM compliance_nonconformities cn
            JOIN compliance_frameworks cf ON cf.id = cn.framework_id
            WHERE cf.org_id = %s AND cn.status != 'resolved'
        """,
            (oid,),
        )
        nc = dict(row(cur) or {})

    total = ctl.get("controls_total", 0) or 0
    compliant = ctl.get("controls_compliant", 0) or 0
    score = round((compliant / total) * 100) if total else 0

    return {
        "overall_score": score,
        "score_trend": 0,
        "frameworks_count": fw_count,
        "controls_total": total,
        "controls_compliant": compliant,
        "nonconformites_open": nc.get("total", 0),
        "nonconformites_critical": nc.get("critical", 0),
        "cost_of_inaction_total": 0,
    }


@router.get("/frameworks")
def list_frameworks(user: CurrentUser = Depends(get_current_user)):
    oid = str(user.organization_id)
    with get_db() as cur:
        cur.execute("SELECT COUNT(*) FROM compliance_frameworks WHERE org_id = %s", (oid,))
        count_row = row(cur)
        if not count_row or count_row["count"] == 0:
            return {"frameworks": _DEMO_FRAMEWORKS, "is_demo": True}

    with get_db() as cur:
        cur.execute(
            "SELECT * FROM compliance_frameworks WHERE org_id = %s ORDER BY name",
            (oid,),
        )
        return {"frameworks": [_fmt(r) for r in rows(cur)]}


@router.get("/frameworks/{framework_id}/nonconformites")
def list_nonconformites(
    framework_id: str,
    user: CurrentUser = Depends(get_current_user),
):
    oid = str(user.organization_id)

    if framework_id in _DEMO_NONCONFORMITES:
        with get_db() as cur:
            cur.execute(
                "SELECT id FROM compliance_frameworks WHERE id = %s AND org_id = %s LIMIT 1",
                (framework_id, oid),
            )
            if not row(cur):
                return {"nonconformites": _DEMO_NONCONFORMITES[framework_id]}

    with get_db() as cur:
        cur.execute(
            "SELECT id FROM compliance_frameworks WHERE id = %s AND org_id = %s LIMIT 1",
            (framework_id, oid),
        )
        if not row(cur):
            raise HTTPException(404, "Framework introuvable")

    with get_db() as cur:
        cur.execute(
            """
            SELECT cn.*, cc.control_ref, cc.name AS control_name
            FROM compliance_nonconformities cn
            JOIN compliance_controls cc ON cc.id = cn.control_id
            WHERE cn.framework_id = %s AND cn.status != 'resolved'
            ORDER BY
              CASE cn.severity WHEN 'critical' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END,
              cn.created_at DESC
        """,
            (framework_id,),
        )
        return {"nonconformites": [_fmt(r) for r in rows(cur)]}


@router.get("/frameworks/{framework_id}")
def get_framework(
    framework_id: str,
    user: CurrentUser = Depends(get_current_user),
):
    oid = str(user.organization_id)

    demo_fw = next((f for f in _DEMO_FRAMEWORKS if f["id"] == framework_id), None)
    if demo_fw:
        with get_db() as cur:
            cur.execute(
                "SELECT id FROM compliance_frameworks WHERE id = %s AND org_id = %s LIMIT 1",
                (framework_id, oid),
            )
            if not row(cur):
                return {**demo_fw, "nonconformites": _DEMO_NONCONFORMITES.get(framework_id, [])}

    with get_db() as cur:
        cur.execute(
            "SELECT * FROM compliance_frameworks WHERE id = %s AND org_id = %s LIMIT 1",
            (framework_id, oid),
        )
        fw = row(cur)
        if not fw:
            raise HTTPException(404, "Framework introuvable")

    with get_db() as cur:
        cur.execute(
            "SELECT * FROM compliance_controls WHERE framework_id = %s ORDER BY domain, control_ref",
            (framework_id,),
        )
        controls = [_fmt(r) for r in rows(cur)]

    result = _fmt(fw)
    result["controls"] = controls
    return result


@router.get("/controls/{control_id}")
def get_control_causal_chain(
    control_id: str,
    user: CurrentUser = Depends(get_current_user),
):
    """Retourne la chaîne causale complète pour un contrôle : preuves, non-conformités, plans d'action."""
    oid = str(user.organization_id)
    with get_db() as cur:
        cur.execute(
            """
            SELECT cc.*, cf.name AS framework_name, cf.org_id
            FROM compliance_controls cc
            JOIN compliance_frameworks cf ON cf.id = cc.framework_id
            WHERE cc.id = %s LIMIT 1
        """,
            (control_id,),
        )
        ctrl = row(cur)
        if not ctrl or str(ctrl["org_id"]) != oid:
            raise HTTPException(404, "Contrôle introuvable")

    with get_db() as cur:
        cur.execute(
            "SELECT * FROM compliance_nonconformities WHERE control_id = %s ORDER BY severity DESC",
            (control_id,),
        )
        nc_list = [_fmt(r) for r in rows(cur)]

    result = _fmt(ctrl)
    result["nonconformites"] = nc_list
    return result


@router.post("/nonconformites/{nc_id}/action-plan")
def create_action_plan(
    nc_id: str,
    body: ActionPlanCreate,
    user: CurrentUser = Depends(get_current_user),
):
    require_min_role(user, "admin")
    oid = str(user.organization_id)
    ap_id = str(uuid.uuid4())
    now = datetime.now(UTC)

    with get_db() as cur:
        cur.execute(
            """
            SELECT cn.id FROM compliance_nonconformities cn
            JOIN compliance_frameworks cf ON cf.id = cn.framework_id
            WHERE cn.id = %s AND cf.org_id = %s LIMIT 1
        """,
            (nc_id, oid),
        )
        if not row(cur):
            raise HTTPException(404, "Non-conformité introuvable")

    with get_db() as cur:
        cur.execute(
            """
            INSERT INTO compliance_action_plans
              (id, nonconformite_id, title, description, owner, due_date,
               playbook_id, orchestration_id, status, created_at)
            VALUES (%s,%s,%s,%s,%s,%s,%s,%s,'open',%s)
        """,
            (
                ap_id,
                nc_id,
                body.title,
                body.description,
                body.owner,
                body.due_date,
                body.playbook_id,
                body.orchestration_id,
                now,
            ),
        )

    return {"id": ap_id, "status": "open"}


@router.post("/nonconformites/{nc_id}/resolve")
def resolve_nonconformite(
    nc_id: str,
    body: ResolveBody,
    user: CurrentUser = Depends(get_current_user),
):
    require_min_role(user, "admin")
    oid = str(user.organization_id)
    now = datetime.now(UTC)

    with get_db() as cur:
        cur.execute(
            """
            SELECT cn.id FROM compliance_nonconformities cn
            JOIN compliance_frameworks cf ON cf.id = cn.framework_id
            WHERE cn.id = %s AND cf.org_id = %s LIMIT 1
        """,
            (nc_id, oid),
        )
        if not row(cur):
            raise HTTPException(404, "Non-conformité introuvable")

    with get_db() as cur:
        cur.execute(
            """
            UPDATE compliance_nonconformities
            SET status = 'resolved', resolved_at = %s,
                resolution_note = %s, evidence_url = %s
            WHERE id = %s
        """,
            (now, body.resolution_note, body.evidence_url, nc_id),
        )

    return {"resolved": True, "resolved_at": now.isoformat()}
