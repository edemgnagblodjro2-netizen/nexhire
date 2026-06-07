from __future__ import annotations

from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field

from auth import CurrentUser
from rbac import ROLE_RANK, require_min_role
from supabase_client import service_client

router = APIRouter(prefix="/api/servers", tags=["servers"])


class ServerPayload(BaseModel):
    department_id: str | None = None
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
    sb = service_client()
    res = sb.table("department_members").select("department_id").eq("user_id", user.id).execute()
    return [r["department_id"] for r in (res.data or [])]


def _enrich_server(srv: dict) -> dict:
    """Ajoute idle_days si le dernier ping est ancien."""
    ping = srv.get("last_ping_at")
    if ping:
        try:
            last = datetime.fromisoformat(ping.replace("Z", "+00:00"))
            srv["idle_days"] = (datetime.now(timezone.utc) - last).days
        except ValueError:
            srv["idle_days"] = None
    else:
        srv["idle_days"] = None
    return srv


@router.get("")
def list_servers(
    dept_id: str | None = Query(None),
    status: str | None = Query(None),
    user: CurrentUser = Depends(require_min_role("user")),
):
    sb = service_client()
    q = (
        sb.table("servers")
        .select("*, departments(name)")
        .eq("organization_id", user.organization_id)
    )
    allowed = _allowed_dept_ids(user)
    if allowed is not None:
        if not allowed:
            return []
        q = q.in_("department_id", allowed)
    if dept_id:
        q = q.eq("department_id", dept_id)
    if status:
        q = q.eq("status", status)
    try:
        res = q.order("hostname").execute()
        return [_enrich_server(s) for s in (res.data or [])]
    except Exception:
        return []


@router.post("", status_code=201)
def create_server(
    payload: ServerPayload,
    user: CurrentUser = Depends(require_min_role("admin")),
):
    sb = service_client()
    res = sb.table("servers").insert({
        "organization_id": user.organization_id,
        "department_id":   payload.department_id,
        "hostname":        payload.hostname,
        "ip_address":      payload.ip_address,
        "environment":     payload.environment,
        "os":              payload.os,
        "cpu_cores":       payload.cpu_cores,
        "ram_gb":          payload.ram_gb,
        "storage_gb":      payload.storage_gb,
        "location":        payload.location,
        "status":          payload.status,
        "last_ping_at":    payload.last_ping_at,
        "monthly_cost":    payload.monthly_cost,
        "notes":           payload.notes,
    }).execute()
    return _enrich_server(res.data[0])


@router.patch("/{server_id}")
def update_server(
    server_id: str,
    payload: ServerPayload,
    user: CurrentUser = Depends(require_min_role("admin")),
):
    sb = service_client()
    _srv_or_404(sb, server_id, user.organization_id)
    res = sb.table("servers").update({
        "department_id":   payload.department_id,
        "hostname":        payload.hostname,
        "ip_address":      payload.ip_address,
        "environment":     payload.environment,
        "os":              payload.os,
        "cpu_cores":       payload.cpu_cores,
        "ram_gb":          payload.ram_gb,
        "storage_gb":      payload.storage_gb,
        "location":        payload.location,
        "status":          payload.status,
        "last_ping_at":    payload.last_ping_at,
        "monthly_cost":    payload.monthly_cost,
        "notes":           payload.notes,
    }).eq("id", server_id).execute()
    return _enrich_server(res.data[0])


@router.patch("/{server_id}/ping")
def ping_server(
    server_id: str,
    user: CurrentUser = Depends(require_min_role("admin")),
):
    """Met à jour last_ping_at à maintenant."""
    sb = service_client()
    _srv_or_404(sb, server_id, user.organization_id)
    now = datetime.now(timezone.utc).isoformat()
    res = sb.table("servers").update({"last_ping_at": now}).eq("id", server_id).execute()
    return _enrich_server(res.data[0])


@router.delete("/{server_id}", status_code=204)
def delete_server(
    server_id: str,
    user: CurrentUser = Depends(require_min_role("admin")),
):
    sb = service_client()
    _srv_or_404(sb, server_id, user.organization_id)
    sb.table("servers").delete().eq("id", server_id).execute()


def _srv_or_404(sb, server_id: str, organization_id: str) -> dict:
    res = sb.table("servers").select("id").eq("id", server_id).eq("organization_id", organization_id).limit(1).execute()
    if not (res.data or []):
        raise HTTPException(status_code=404, detail="Serveur introuvable.")
    return res.data[0]
