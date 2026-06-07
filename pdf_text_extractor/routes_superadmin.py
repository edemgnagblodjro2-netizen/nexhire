"""Super-admin panel — accès restreint aux emails dans SUPERADMIN_EMAILS."""
from __future__ import annotations

import os
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from auth import CurrentUser, get_current_user
from db import get_db, row, rows

router = APIRouter(prefix="/api/superadmin", tags=["superadmin"])

_SUPERADMIN_EMAILS: set[str] = {
    e.strip().lower()
    for e in os.environ.get("SUPERADMIN_EMAILS", "").split(",")
    if e.strip()
}


def _superadmin(user: CurrentUser = Depends(get_current_user)) -> CurrentUser:
    if not user.email or user.email.lower() not in _SUPERADMIN_EMAILS:
        raise HTTPException(status_code=403, detail="Accès superadmin requis.")
    return user


# ── GET /api/superadmin/orgs ──────────────────────────────────────────────────

@router.get("/orgs")
def list_all_orgs(user: CurrentUser = Depends(_superadmin)):
    """Liste toutes les organisations avec stats d'usage."""
    with get_db() as cur:
        cur.execute("""
            SELECT
                o.id, o.name, o.slug,
                o.created_at,
                o.subscription_status,
                o.subscription_plan,
                o.subscription_end,
                o.stripe_customer_id,
                (SELECT COUNT(*)
                 FROM users u
                 WHERE u.organization_id = o.id)                                         AS user_count,
                (SELECT COUNT(*)
                 FROM audit_logss al
                 WHERE al.organization_id = o.id
                   AND al.action = 'agent_query'
                   AND al.created_at >= date_trunc('month', now()))                      AS queries_month,
                (SELECT COUNT(*)
                 FROM connectors c
                 WHERE c.organization_id = o.id
                   AND c.status = 'connected')                                           AS connector_count
            FROM organizations o
            ORDER BY o.created_at DESC
        """)
        return rows(cur)


# ── GET /api/superadmin/metrics ───────────────────────────────────────────────

@router.get("/metrics")
def global_metrics(user: CurrentUser = Depends(_superadmin)):
    """Métriques globales NexHire."""
    with get_db() as cur:
        cur.execute("SELECT COUNT(*) AS n FROM organizations")
        total_orgs = (row(cur) or {}).get("n", 0)

        cur.execute("SELECT COUNT(*) AS n FROM organizations WHERE subscription_status = 'active'")
        active = (row(cur) or {}).get("n", 0)

        cur.execute("SELECT COUNT(*) AS n FROM organizations WHERE subscription_status = 'trialing'")
        trialing = (row(cur) or {}).get("n", 0)

        cur.execute("SELECT COUNT(*) AS n FROM users")
        total_users = (row(cur) or {}).get("n", 0)

        cur.execute("""
            SELECT COUNT(*) AS n FROM audit_logs
            WHERE action = 'agent_query'
              AND created_at >= date_trunc('month', now())
        """)
        queries_month = (row(cur) or {}).get("n", 0)

    return {
        "total_orgs":    total_orgs,
        "active":        active,
        "trialing":      trialing,
        "total_users":   total_users,
        "queries_month": queries_month,
    }


# ── PATCH /api/superadmin/orgs/{org_id}/status ───────────────────────────────

class StatusUpdate(BaseModel):
    status: str
    plan:   str = "monthly"


@router.patch("/orgs/{org_id}/status")
def set_org_status(
    org_id: str,
    payload: StatusUpdate,
    user: CurrentUser = Depends(_superadmin),
):
    """Force le statut d'abonnement d'une organisation."""
    allowed = {"active", "trialing", "cancelled", "suspended", "past_due"}
    if payload.status not in allowed:
        raise HTTPException(400, f"Statut invalide. Valeurs acceptées : {allowed}")

    with get_db() as cur:
        cur.execute("SELECT id FROM organizations WHERE id = %s LIMIT 1", (org_id,))
        if not row(cur):
            raise HTTPException(404, "Organisation introuvable.")

    end_date = None
    if payload.status == "active":
        end_date = (datetime.now(timezone.utc) + timedelta(days=365)).isoformat()

    with get_db() as cur:
        cur.execute(
            """UPDATE organizations
               SET subscription_status = %s,
                   subscription_plan   = %s,
                   subscription_end    = %s
               WHERE id = %s""",
            (payload.status, payload.plan, end_date, org_id),
        )
    return {"ok": True, "org_id": org_id, "status": payload.status}
