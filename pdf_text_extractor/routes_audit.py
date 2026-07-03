from __future__ import annotations

from fastapi import APIRouter, Depends, Query

from auth import CurrentUser
from db import get_db, rows
from pagination import PageParams, paginated
from rbac import require_min_role

router = APIRouter(prefix="/api/audit", tags=["audit"])


@router.get("")
def list_audit_logs(
    action: str | None = Query(default=None, description="Filtrer par action"),
    connector: str | None = Query(default=None, description="Filtrer par connecteur"),
    success: bool | None = Query(default=None, description="true = succès, false = échecs"),
    page: PageParams = Depends(),
    user: CurrentUser = Depends(require_min_role("admin")),
):
    """Logs d'audit de l'organisation — lecture seule, admin+.
    Retourne les entrées de la plus récente à la plus ancienne.
    Pagination : ?limit=50&offset=0 (max 200 par page)."""

    conditions = ["organization_id = %s"]
    params: list = [user.organization_id]

    if action is not None:
        conditions.append("action = %s")
        params.append(action)
    if connector is not None:
        conditions.append("connector = %s")
        params.append(connector)
    if success is not None:
        conditions.append("success = %s")
        params.append(success)

    where = " AND ".join(conditions)
    params.extend([page.limit, page.offset])

    base = f"""
        SELECT id, action, query, connector, success, ip_address,
               http_status, resource_ids, error_detail, user_id, created_at
        FROM audit_logs
        WHERE {where}
    """
    with get_db() as cur:
        cur.execute(paginated(base, order_by="created_at DESC"), params)
        result = page.response(rows(cur))

    # Rétrocompatibilité : expose aussi "logs" en plus de "items"
    result["logs"] = result["items"]
    return result
