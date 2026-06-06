from __future__ import annotations

from datetime import date, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field

from auth import CurrentUser
from rbac import ROLE_RANK, require_min_role
from supabase_client import service_client

router = APIRouter(prefix="/api/contracts", tags=["contracts"])


class ContractPayload(BaseModel):
    department_id:          str | None = None
    vendor:                 str = Field(..., min_length=1)
    description:            str | None = None
    category:               str = "other"
    annual_value:           float = 0
    currency:               str = "CAD"
    start_date:             str | None = None
    end_date:               str | None = None
    renewal_date:           str | None = None
    auto_renew:             bool = False
    negotiation_potential:  float = Field(0, ge=0, le=100)
    status:                 str = "active"
    notes:                  str | None = None


def _allowed_dept_ids(user: CurrentUser) -> list[str] | None:
    if ROLE_RANK.get(user.role, 0) >= 3 or user.is_service_account:
        return None
    sb = service_client()
    res = sb.table("department_members").select("department_id").eq("user_id", user.id).execute()
    return [r["department_id"] for r in (res.data or [])]


def _enrich(c: dict) -> dict:
    ren = c.get("renewal_date")
    if ren:
        try:
            days = (date.fromisoformat(ren) - date.today()).days
            c["days_to_renewal"] = days
            c["urgency"] = "critical" if days <= 30 else "warning" if days <= 90 else "ok"
        except ValueError:
            c["days_to_renewal"] = None
            c["urgency"] = "ok"
    else:
        c["days_to_renewal"] = None
        c["urgency"] = "ok"
    c["potential_savings"] = round(float(c.get("annual_value") or 0) * float(c.get("negotiation_potential") or 0) / 100, 2)
    return c


@router.get("")
def list_contracts(
    dept_id:  str | None = Query(None),
    status:   str | None = Query(None),
    renewing: int | None = Query(None, description="Filtre : renouvellement dans N jours"),
    user:     CurrentUser = Depends(require_min_role("user")),
):
    sb = service_client()
    q = (
        sb.table("contracts")
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
    if renewing is not None:
        cutoff = (date.today() + timedelta(days=renewing)).isoformat()
        q = q.lte("renewal_date", cutoff).gte("renewal_date", date.today().isoformat())
    res = q.order("renewal_date").execute()
    return [_enrich(c) for c in (res.data or [])]


@router.post("", status_code=201)
def create_contract(payload: ContractPayload, user: CurrentUser = Depends(require_min_role("manager"))):
    sb = service_client()
    res = sb.table("contracts").insert({
        "organization_id":       user.organization_id,
        "department_id":         payload.department_id,
        "vendor":                payload.vendor,
        "description":           payload.description,
        "category":              payload.category,
        "annual_value":          payload.annual_value,
        "currency":              payload.currency,
        "start_date":            payload.start_date,
        "end_date":              payload.end_date,
        "renewal_date":          payload.renewal_date,
        "auto_renew":            payload.auto_renew,
        "negotiation_potential": payload.negotiation_potential,
        "status":                payload.status,
        "notes":                 payload.notes,
    }).execute()
    return _enrich(res.data[0])


@router.patch("/{contract_id}")
def update_contract(contract_id: str, payload: ContractPayload, user: CurrentUser = Depends(require_min_role("manager"))):
    sb = service_client()
    _or_404(sb, "contracts", contract_id, user.organization_id)
    res = sb.table("contracts").update({
        "department_id":         payload.department_id,
        "vendor":                payload.vendor,
        "description":           payload.description,
        "category":              payload.category,
        "annual_value":          payload.annual_value,
        "currency":              payload.currency,
        "start_date":            payload.start_date,
        "end_date":              payload.end_date,
        "renewal_date":          payload.renewal_date,
        "auto_renew":            payload.auto_renew,
        "negotiation_potential": payload.negotiation_potential,
        "status":                payload.status,
        "notes":                 payload.notes,
    }).eq("id", contract_id).execute()
    return _enrich(res.data[0])


@router.delete("/{contract_id}", status_code=204)
def delete_contract(contract_id: str, user: CurrentUser = Depends(require_min_role("admin"))):
    sb = service_client()
    _or_404(sb, "contracts", contract_id, user.organization_id)
    sb.table("contracts").delete().eq("id", contract_id).execute()


def _or_404(sb, table: str, row_id: str, org_id: str) -> dict:
    res = sb.table(table).select("id").eq("id", row_id).eq("organization_id", org_id).limit(1).execute()
    if not (res.data or []):
        raise HTTPException(status_code=404, detail="Enregistrement introuvable.")
    return res.data[0]
