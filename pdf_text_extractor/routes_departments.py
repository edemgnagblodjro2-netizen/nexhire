from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from auth import CurrentUser
from rbac import ROLE_RANK, require_min_role
from supabase_client import service_client

router = APIRouter(prefix="/api/departments", tags=["departments"])


class DeptPayload(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    description: str | None = None
    annual_budget: float = 0
    currency: str = "CAD"


class AddMemberPayload(BaseModel):
    user_id: str
    role: str = Field("member", pattern="^(member|manager)$")


@router.get("")
def list_departments(user: CurrentUser = Depends(require_min_role("user"))):
    sb = service_client()
    q = (
        sb.table("departments")
        .select("*")
        .eq("organization_id", user.organization_id)
        .order("name")
    )

    is_admin = ROLE_RANK.get(user.role, 0) >= 3 or user.is_service_account
    if not is_admin:
        dm = sb.table("department_members").select("department_id").eq("user_id", user.id).execute()
        ids = [r["department_id"] for r in (dm.data or [])]
        if not ids:
            return []
        q = q.in_("id", ids)

    res = q.execute()
    depts = res.data or []

    for d in depts:
        cnt = sb.table("department_members").select("user_id", count="exact").eq("department_id", d["id"]).execute()
        d["member_count"] = cnt.count or 0

    return depts


@router.post("", status_code=201)
def create_department(
    payload: DeptPayload,
    user: CurrentUser = Depends(require_min_role("admin")),
):
    sb = service_client()
    res = sb.table("departments").insert({
        "organization_id": user.organization_id,
        "name": payload.name,
        "description": payload.description,
        "annual_budget": payload.annual_budget,
        "currency": payload.currency,
    }).execute()
    return res.data[0]


@router.patch("/{dept_id}")
def update_department(
    dept_id: str,
    payload: DeptPayload,
    user: CurrentUser = Depends(require_min_role("admin")),
):
    sb = service_client()
    _dept_or_404(sb, dept_id, user.organization_id)
    res = sb.table("departments").update({
        "name": payload.name,
        "description": payload.description,
        "annual_budget": payload.annual_budget,
        "currency": payload.currency,
    }).eq("id", dept_id).execute()
    return res.data[0]


@router.delete("/{dept_id}", status_code=204)
def delete_department(
    dept_id: str,
    user: CurrentUser = Depends(require_min_role("owner")),
):
    sb = service_client()
    _dept_or_404(sb, dept_id, user.organization_id)
    sb.table("departments").delete().eq("id", dept_id).execute()


@router.get("/{dept_id}/members")
def list_dept_members(
    dept_id: str,
    user: CurrentUser = Depends(require_min_role("admin")),
):
    sb = service_client()
    _dept_or_404(sb, dept_id, user.organization_id)
    res = (
        sb.table("department_members")
        .select("*, users(id, full_name, email, role)")
        .eq("department_id", dept_id)
        .execute()
    )
    return res.data or []


@router.post("/{dept_id}/members", status_code=201)
def add_dept_member(
    dept_id: str,
    payload: AddMemberPayload,
    user: CurrentUser = Depends(require_min_role("admin")),
):
    sb = service_client()
    _dept_or_404(sb, dept_id, user.organization_id)

    check = sb.table("users").select("organization_id").eq("id", payload.user_id).limit(1).execute()
    rows = check.data or []
    if not rows or rows[0].get("organization_id") != user.organization_id:
        raise HTTPException(status_code=400, detail="Utilisateur introuvable dans cette organisation.")

    res = sb.table("department_members").upsert({
        "user_id": payload.user_id,
        "department_id": dept_id,
        "role": payload.role,
    }).execute()
    return res.data[0]


@router.delete("/{dept_id}/members/{member_id}", status_code=204)
def remove_dept_member(
    dept_id: str,
    member_id: str,
    user: CurrentUser = Depends(require_min_role("admin")),
):
    sb = service_client()
    _dept_or_404(sb, dept_id, user.organization_id)
    sb.table("department_members").delete().eq("department_id", dept_id).eq("user_id", member_id).execute()


def _dept_or_404(sb, dept_id: str, organization_id: str) -> dict:
    res = (
        sb.table("departments")
        .select("id")
        .eq("id", dept_id)
        .eq("organization_id", organization_id)
        .limit(1)
        .execute()
    )
    if not (res.data or []):
        raise HTTPException(status_code=404, detail="Département introuvable.")
    return res.data[0]
