"""Route d'onboarding — statut d'avancement pour le wizard initial."""
from __future__ import annotations

from fastapi import APIRouter, Depends

from auth import CurrentUser
from db import get_db, row as db_row
from rbac import require_min_role

router = APIRouter(prefix="/api/onboarding", tags=["onboarding"])


@router.get("/status")
def onboarding_status(user: CurrentUser = Depends(require_min_role("manager"))):
    """Retourne l'état d'avancement de la configuration initiale de l'organisation."""
    org = user.organization_id

    with get_db() as cur:
        cur.execute(
            "SELECT COUNT(*) AS cnt FROM public.departments WHERE organization_id = %s",
            (org,),
        )
        has_departments = (cur.fetchone()["cnt"] or 0) > 0

        cur.execute(
            "SELECT COUNT(*) AS cnt FROM public.connectors WHERE organization_id = %s AND status = 'connected'",
            (org,),
        )
        has_connector = (cur.fetchone()["cnt"] or 0) > 0

        cur.execute(
            "SELECT COUNT(*) AS cnt FROM public.users WHERE organization_id = %s AND role != 'owner'",
            (org,),
        )
        has_team_member = (cur.fetchone()["cnt"] or 0) > 0

        cur.execute(
            "SELECT name, org_type FROM public.organizations WHERE id = %s",
            (org,),
        )
        org_row = db_row(cur)

    return {
        "has_departments":  has_departments,
        "has_connector":    has_connector,
        "has_team_member":  has_team_member,
        "org_type":         org_row["org_type"] if org_row else "entreprise",
        "org_name":         org_row["name"] if org_row else "",
        "should_show":      not has_departments and not has_connector,
    }
