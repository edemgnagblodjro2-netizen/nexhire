from __future__ import annotations

from fastapi import APIRouter, Depends, Query

from auth import CurrentUser
from db import get_db, rows
from rbac import require_min_role

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

    # Build dynamic WHERE clauses
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
    params.extend([limit, offset])

    with get_db() as cur:
        cur.execute(
            f"""
            SELECT id, action, query, connector, success, ip_address,
                   http_status, resource_ids, error_detail, user_id, created_at
            FROM audit_logs
            WHERE {where}
            ORDER BY created_at DESC
            LIMIT %s OFFSET %s
            """,
            params,
        )
        logs = rows(cur)

    return {
        "total": len(logs),
        "offset": offset,
        "limit": limit,
        "logs": logs,
    }
