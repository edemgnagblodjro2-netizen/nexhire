from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field

from auth import CurrentUser
from rbac import ROLE_RANK, require_min_role
from supabase_client import service_client

router = APIRouter(prefix="/api/workforce", tags=["workforce"])


class ProcessPayload(BaseModel):
    department_id:          str | None = None
    name:                   str = Field(..., min_length=1)
    description:            str | None = None
    team_size:              int = Field(1, ge=1)
    manual_hours_per_month: float = Field(0, ge=0)
    automation_potential:   float = Field(0, ge=0, le=100)
    hourly_cost:            float = Field(50, ge=0)
    status:                 str = "manual"
    notes:                  str | None = None


def _allowed_dept_ids(user: CurrentUser) -> list[str] | None:
    if ROLE_RANK.get(user.role, 0) >= 3 or user.is_service_account:
        return None
    sb = service_client()
    res = sb.table("department_members").select("department_id").eq("user_id", user.id).execute()
    return [r["department_id"] for r in (res.data or [])]


def _enrich(p: dict) -> dict:
    hours   = float(p.get("manual_hours_per_month") or 0)
    auto    = float(p.get("automation_potential") or 0) / 100
    hourly  = float(p.get("hourly_cost") or 50)
    p["automatable_hours_monthly"]  = round(hours * auto, 1)
    p["annual_savings_potential"]   = round(hours * auto * hourly * 12, 2)
    p["manual_time_pct"]            = round(auto * 100, 1)
    return p


@router.get("")
def list_processes(
    dept_id: str | None = Query(None),
    status:  str | None = Query(None),
    user:    CurrentUser = Depends(require_min_role("user")),
):
    sb = service_client()
    q = (
        sb.table("workforce_processes")
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
    return [_enrich(p) for p in (res.data or [])]


@router.post("", status_code=201)
def create_process(payload: ProcessPayload, user: CurrentUser = Depends(require_min_role("manager"))):
    sb = service_client()
    res = sb.table("workforce_processes").insert({
        "organization_id":        user.organization_id,
        "department_id":          payload.department_id,
        "name":                   payload.name,
        "description":            payload.description,
        "team_size":              payload.team_size,
        "manual_hours_per_month": payload.manual_hours_per_month,
        "automation_potential":   payload.automation_potential,
        "hourly_cost":            payload.hourly_cost,
        "status":                 payload.status,
        "notes":                  payload.notes,
    }).execute()
    return _enrich(res.data[0])


@router.patch("/{proc_id}")
def update_process(proc_id: str, payload: ProcessPayload, user: CurrentUser = Depends(require_min_role("manager"))):
    sb = service_client()
    _or_404(sb, proc_id, user.organization_id)
    res = sb.table("workforce_processes").update({
        "department_id":          payload.department_id,
        "name":                   payload.name,
        "description":            payload.description,
        "team_size":              payload.team_size,
        "manual_hours_per_month": payload.manual_hours_per_month,
        "automation_potential":   payload.automation_potential,
        "hourly_cost":            payload.hourly_cost,
        "status":                 payload.status,
        "notes":                  payload.notes,
    }).eq("id", proc_id).execute()
    return _enrich(res.data[0])


@router.delete("/{proc_id}", status_code=204)
def delete_process(proc_id: str, user: CurrentUser = Depends(require_min_role("admin"))):
    sb = service_client()
    _or_404(sb, proc_id, user.organization_id)
    sb.table("workforce_processes").delete().eq("id", proc_id).execute()


def _or_404(sb, proc_id: str, org_id: str) -> dict:
    res = sb.table("workforce_processes").select("id").eq("id", proc_id).eq("organization_id", org_id).limit(1).execute()
    if not (res.data or []):
        raise HTTPException(status_code=404, detail="Processus introuvable.")
    return res.data[0]
