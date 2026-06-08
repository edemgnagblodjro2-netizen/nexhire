from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field

from auth import CurrentUser
from db import get_db, row, rows
from rbac import ROLE_RANK, require_min_role

router = APIRouter(prefix="/api/servers", tags=["servers"])


class ServerPayload(BaseModel):
    department_id: str | None = None
    device_type: str = "server"
    hostname: str = Field(..., min_length=1)
    ip_address: str | None = None
    environment: str = "production"
    os: str | None = None
    cpu_cores: int | None = None
    ram_gb: int | None = None
    storage_gb: int | None = None
    location: str | None = None
    status: str = "active"
    last_ping_at: str | None = None
    monthly_cost: float = 0
    notes: str | None = None


def _allowed_dept_ids(user: CurrentUser) -> list[str] | None:
    if ROLE_RANK.get(user.role, 0) >= 3 or user.is_service_account:
        return None
    with get_db() as cur:
        cur.execute(
            "SELECT department_id FROM department_members WHERE user_id = %s",
            (user.id,),
        )
        return [r["department_id"] for r in rows(cur)]


def _enrich_server(srv: dict) -> dict:
    """Ajoute idle_days si le dernier ping est ancien."""
    ping = srv.get("last_ping_at")
    if ping:
        try:
            last = datetime.fromisoformat(str(ping).replace("Z", "+00:00"))
            srv["idle_days"] = (datetime.now(timezone.utc) - last).days
        except ValueError:
            srv["idle_days"] = None
    else:
        srv["idle_days"] = None
    return srv


def _srv_or_404(server_id: str, organization_id: str) -> dict:
    with get_db() as cur:
        cur.execute(
            "SELECT id FROM servers WHERE id = %s AND organization_id = %s LIMIT 1",
            (server_id, organization_id),
        )
        result = row(cur)
    if not result:
        raise HTTPException(status_code=404, detail="Serveur introuvable.")
    return result


@router.get("")
def list_servers(
    dept_id: str | None = Query(None),
    status: str | None = Query(None),
    user: CurrentUser = Depends(require_min_role("user")),
):
    allowed = _allowed_dept_ids(user)
    if allowed is not None and not allowed:
        return []

    conditions = ["s.organization_id = %s"]
    params: list = [user.organization_id]

    if allowed is not None:
        conditions.append("s.department_id = ANY(%s)")
        params.append(allowed)
    if dept_id:
        conditions.append("s.department_id = %s")
        params.append(dept_id)
    if status:
        conditions.append("s.status = %s")
        params.append(status)

    where = " AND ".join(conditions)
    sql = f"""
        SELECT s.*, d.name AS department_name
        FROM servers s
        LEFT JOIN departments d ON s.department_id = d.id
        WHERE {where}
        ORDER BY s.hostname
    """
    try:
        with get_db() as cur:
            cur.execute(sql, params)
            result = rows(cur)
        return [_enrich_server(s) for s in result]
    except Exception:
        return []


@router.post("", status_code=201)
def create_server(
    payload: ServerPayload,
    user: CurrentUser = Depends(require_min_role("admin")),
):
    with get_db() as cur:
        cur.execute(
            """
            INSERT INTO servers (
                organization_id, department_id, device_type, hostname, ip_address,
                environment, os, cpu_cores, ram_gb, storage_gb,
                location, status, last_ping_at, monthly_cost, notes
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING *
            """,
            (
                user.organization_id,
                payload.department_id,
                payload.device_type,
                payload.hostname,
                payload.ip_address,
                payload.environment,
                payload.os,
                payload.cpu_cores,
                payload.ram_gb,
                payload.storage_gb,
                payload.location,
                payload.status,
                payload.last_ping_at,
                payload.monthly_cost,
                payload.notes,
            ),
        )
        result = row(cur)
    return _enrich_server(result)


@router.patch("/{server_id}")
def update_server(
    server_id: str,
    payload: ServerPayload,
    user: CurrentUser = Depends(require_min_role("admin")),
):
    _srv_or_404(server_id, user.organization_id)
    with get_db() as cur:
        cur.execute(
            """
            UPDATE servers SET
                department_id = %s, device_type = %s, hostname = %s, ip_address = %s,
                environment = %s, os = %s, cpu_cores = %s, ram_gb = %s,
                storage_gb = %s, location = %s, status = %s,
                last_ping_at = %s, monthly_cost = %s, notes = %s
            WHERE id = %s
            RETURNING *
            """,
            (
                payload.department_id,
                payload.device_type,
                payload.hostname,
                payload.ip_address,
                payload.environment,
                payload.os,
                payload.cpu_cores,
                payload.ram_gb,
                payload.storage_gb,
                payload.location,
                payload.status,
                payload.last_ping_at,
                payload.monthly_cost,
                payload.notes,
                server_id,
            ),
        )
        result = row(cur)
    return _enrich_server(result)


@router.patch("/{server_id}/ping")
def ping_server(
    server_id: str,
    user: CurrentUser = Depends(require_min_role("admin")),
):
    """Met à jour last_ping_at à maintenant."""
    _srv_or_404(server_id, user.organization_id)
    now = datetime.now(timezone.utc).isoformat()
    with get_db() as cur:
        cur.execute(
            "UPDATE servers SET last_ping_at = %s WHERE id = %s RETURNING *",
            (now, server_id),
        )
        result = row(cur)
    return _enrich_server(result)


@router.delete("/{server_id}", status_code=204)
def delete_server(
    server_id: str,
    user: CurrentUser = Depends(require_min_role("admin")),
):
    _srv_or_404(server_id, user.organization_id)
    with get_db() as cur:
        cur.execute("DELETE FROM servers WHERE id = %s", (server_id,))
