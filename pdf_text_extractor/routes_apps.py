from __future__ import annotations

from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field

from auth import CurrentUser
from rbac import ROLE_RANK, require_min_role
from supabase_client import service_client

router = APIRouter(prefix="/api/apps", tags=["apps"])


class AppPayload(BaseModel):
    department_id: str | None = None
    name: str = Field(..., min_length=1)
    category: str | None = None
    vendor: str | None = None
    status: str = "active"
    monthly_cost: float = 0
    last_used_at: str | None = None
    user_count: int = 0
    url: str | None = None
    notes: str | None = None


def _allowed_dept_ids(user: CurrentUser) -> list[str] | None:
    if ROLE_RANK.get(user.role, 0) >= 3 or user.is_service_account:
        return None
    sb = service_client()
    res = sb.table("department_members").select("department_id").eq("user_id", user.id).execute()
    return [r["department_id"] for r in (res.data or [])]


def _enrich_app(app: dict) -> dict:
    """Calcule les jours depuis la dernière utilisation."""
    last = app.get("last_used_at")
    if last:
        try:
            last_dt = datetime.fromisoformat(last.replace("Z", "+00:00"))
            app["days_unused"] = (datetime.now(timezone.utc) - last_dt).days
        except ValueError:
            app["days_unused"] = None
    else:
        app["days_unused"] = None
    return app


@router.get("")
def list_apps(
    dept_id: str | None = Query(None),
    status: str | None = Query(None),
    user: CurrentUser = Depends(require_min_role("user")),
):
    sb = service_client()
    q = (
        sb.table("it_applications")
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
    res = q.order("name").execute()
    return [_enrich_app(a) for a in (res.data or [])]


@router.post("", status_code=201)
def create_app(
    payload: AppPayload,
    user: CurrentUser = Depends(require_min_role("manager")),
):
    sb = service_client()
    res = sb.table("it_applications").insert({
        "organization_id": user.organization_id,
        "department_id":   payload.department_id,
        "name":            payload.name,
        "category":        payload.category,
        "vendor":          payload.vendor,
        "status":          payload.status,
        "monthly_cost":    payload.monthly_cost,
        "last_used_at":    payload.last_used_at,
        "user_count":      payload.user_count,
        "url":             payload.url,
        "notes":           payload.notes,
    }).execute()
    return _enrich_app(res.data[0])


@router.patch("/{app_id}")
def update_app(
    app_id: str,
    payload: AppPayload,
    user: CurrentUser = Depends(require_min_role("manager")),
):
    sb = service_client()
    _app_or_404(sb, app_id, user.organization_id)
    res = sb.table("it_applications").update({
        "department_id":   payload.department_id,
        "name":            payload.name,
        "category":        payload.category,
        "vendor":          payload.vendor,
        "status":          payload.status,
        "monthly_cost":    payload.monthly_cost,
        "last_used_at":    payload.last_used_at,
        "user_count":      payload.user_count,
        "url":             payload.url,
        "notes":           payload.notes,
    }).eq("id", app_id).execute()
    return _enrich_app(res.data[0])


@router.delete("/{app_id}", status_code=204)
def delete_app(
    app_id: str,
    user: CurrentUser = Depends(require_min_role("admin")),
):
    sb = service_client()
    _app_or_404(sb, app_id, user.organization_id)
    sb.table("it_applications").delete().eq("id", app_id).execute()


def _app_or_404(sb, app_id: str, organization_id: str) -> dict:
    res = sb.table("it_applications").select("id").eq("id", app_id).eq("organization_id", organization_id).limit(1).execute()
    if not (res.data or []):
        raise HTTPException(status_code=404, detail="Application introuvable.")
    return res.data[0]
