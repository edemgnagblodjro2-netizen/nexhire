"""Tableau de bord Sécurité NexHire — Niveau 1-5.

GET /api/security/dashboard → métriques consolidées pour l'admin.
"""
from __future__ import annotations

from fastapi import APIRouter, Depends

from auth import CurrentUser
from db import get_db, row, rows
from rbac import require_min_role

router = APIRouter(prefix="/api/security", tags=["security"])


@router.get("/dashboard")
def security_dashboard(user: CurrentUser = Depends(require_min_role("admin"))):
    org_id = str(user.organization_id)

    # ── MFA ────────────────────────────────────────────────────────────────────
    try:
        with get_db() as cur:
            cur.execute(
                "SELECT COUNT(*) AS total FROM users WHERE organization_id = %s", (org_id,)
            )
            total_users = (row(cur) or {}).get("total", 0)

            cur.execute(
                "SELECT COUNT(DISTINCT user_id) AS mfa_count FROM mfa_factors "
                "WHERE organization_id = %s AND is_verified = TRUE", (org_id,)
            )
            mfa_enabled = (row(cur) or {}).get("mfa_count", 0)

            cur.execute(
                "SELECT require_mfa FROM organizations WHERE id = %s LIMIT 1", (org_id,)
            )
            org_row = row(cur) or {}
    except Exception:
        total_users = mfa_enabled = 0
        org_row = {}

    # ── Alertes sécurité non acquittées ────────────────────────────────────────
    try:
        with get_db() as cur:
            cur.execute(
                """SELECT alert_type, severity, COUNT(*) AS cnt
                   FROM security_alerts
                   WHERE organization_id = %s AND NOT is_acknowledged
                   GROUP BY alert_type, severity
                   ORDER BY CASE severity
                     WHEN 'critical' THEN 1
                     WHEN 'high'     THEN 2
                     WHEN 'medium'   THEN 3
                     ELSE 4 END""",
                (org_id,),
            )
            alert_summary = [dict(r) for r in rows(cur)]

            cur.execute(
                """SELECT id, alert_type, severity, details, ip_address,
                          user_id, created_at
                   FROM security_alerts
                   WHERE organization_id = %s AND NOT is_acknowledged
                   ORDER BY created_at DESC LIMIT 10""",
                (org_id,),
            )
            recent_alerts = [
                {**dict(r), "id": str(r["id"]), "created_at": str(r["created_at"])}
                for r in rows(cur)
            ]
    except Exception:
        alert_summary = []
        recent_alerts = []

    # ── Activité login 7 derniers jours ────────────────────────────────────────
    try:
        with get_db() as cur:
            cur.execute(
                """SELECT
                     DATE(created_at) AS jour,
                     SUM(CASE WHEN success THEN 1 ELSE 0 END) AS succes,
                     SUM(CASE WHEN NOT success THEN 1 ELSE 0 END) AS echecs
                   FROM audit_logs
                   WHERE organization_id = %s
                     AND action = 'auth_login'
                     AND created_at > NOW() - INTERVAL '7 days'
                   GROUP BY DATE(created_at)
                   ORDER BY jour DESC""",
                (org_id,),
            )
            login_activity = [
                {"jour": str(r["jour"]), "succes": r["succes"], "echecs": r["echecs"]}
                for r in rows(cur)
            ]
    except Exception:
        login_activity = []

    # ── IPs de connexion distinctes (7j) ─────────────────────────────────────
    try:
        with get_db() as cur:
            cur.execute(
                """SELECT DISTINCT ip_address, MAX(created_at) AS derniere_vue,
                          COUNT(*) AS nb_connexions
                   FROM audit_logs
                   WHERE organization_id = %s
                     AND action = 'auth_login'
                     AND success = TRUE
                     AND ip_address IS NOT NULL
                     AND created_at > NOW() - INTERVAL '7 days'
                   GROUP BY ip_address
                   ORDER BY derniere_vue DESC
                   LIMIT 10""",
                (org_id,),
            )
            recent_ips = [
                {"ip": r["ip_address"], "connexions": r["nb_connexions"],
                 "derniere_vue": str(r["derniere_vue"])}
                for r in rows(cur)
            ]
    except Exception:
        recent_ips = []

    # ── Demandes suppression en attente ────────────────────────────────────────
    try:
        with get_db() as cur:
            cur.execute(
                "SELECT COUNT(*) AS cnt FROM data_deletion_requests "
                "WHERE organization_id = %s AND status = 'pending'", (org_id,)
            )
            pending_deletions = (row(cur) or {}).get("cnt", 0)
    except Exception:
        pending_deletions = 0

    # ── Score de sécurité ────────────────────────────────────────────────────
    unacked_critical = sum(
        r["cnt"] for r in alert_summary if r["severity"] in ("critical", "high")
    )
    mfa_pct = round((mfa_enabled / total_users * 100) if total_users else 0)

    checklist = {
        "mfa_partiel":        mfa_enabled > 0,
        "mfa_complet":        mfa_pct >= 80,
        "mfa_requis_org":     bool(org_row.get("require_mfa")),
        "alertes_critiques":  unacked_critical == 0,
        "conformite_loi25":   pending_deletions == 0,
    }
    score = round(sum(checklist.values()) / len(checklist) * 100)

    return {
        "score_securite":      score,
        "checklist":           checklist,
        "mfa": {
            "utilisateurs_total":  total_users,
            "mfa_actif":           mfa_enabled,
            "pourcentage":         mfa_pct,
            "requis_organisation": bool(org_row.get("require_mfa")),
        },
        "alertes": {
            "non_acquittees_total": sum(r["cnt"] for r in alert_summary),
            "critiques_hautes":     unacked_critical,
            "par_type":             alert_summary,
            "recentes":             recent_alerts,
        },
        "activite_login": login_activity,
        "ips_recentes":   recent_ips,
        "conformite": {
            "suppressions_en_attente": pending_deletions,
            "lois_couvertes":          ["Loi 25 (Québec)", "PIPEDA (Canada)"],
        },
    }
