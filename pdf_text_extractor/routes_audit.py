from __future__ import annotations

from fastapi import APIRouter, Depends, Query

from auth import CurrentUser
from rbac import require_min_role
from supabase_client import service_client

router = APIRouter(prefix="/api/audit", tags=["audit"])


@router.get("")
def list_audit_logs(
    action: str | None = Query(default=None, description="Filtrer par action"),
    connector: str | None = Query(default=None, description="Filtrer par connecteur"),
    success: bool | None = Query(default=None, description="true = succès, false = échecs"),
    limit: int = Query(default=50, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
    user: CurrentUser = Depends(require_min_role("admin")),
):
    """Logs d'audit de l'organisation — lecture seule, admin+.
    Retourne les entrées de la plus récente à la plus ancienne."""
    sb = service_client()

    q = (
        sb.table("audit_logs")
        .select(
            "id, action, query, connector, success, ip_address, "
            "http_status, resource_ids, error_detail, user_id, created_at"
        )
        .eq("organization_id", user.organization_id)
        .order("created_at", desc=True)
        .range(offset, offset + limit - 1)
    )

    if action is not None:
        q = q.eq("action", action)
    if connector is not None:
        q = q.eq("connector", connector)
    if success is not None:
        q = q.eq("success", success)

    res = q.execute()
    return {
        "total": len(res.data or []),
        "offset": offset,
        "limit": limit,
        "logs": res.data or [],
    }
