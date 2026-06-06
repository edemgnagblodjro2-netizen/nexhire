from __future__ import annotations

from datetime import date, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field

from auth import CurrentUser
from rbac import ROLE_RANK, require_min_role
from supabase_client import service_client

router = APIRouter(prefix="/api/licenses", tags=["licenses"])


class LicensePayload(BaseModel):
    department_id: str | None = None
    application_id: str | None = None
    product_name: str = Field(..., min_length=1)
    vendor: str | None = None
    license_type: str = "subscription"
    quantity: int = Field(1, ge=1)
    assigned_count: int = Field(0, ge=0)
    cost_per_unit: float = 0
    billing_cycle: str = "annual"
    purchase_date: str | None = None
    expiration_date: str | None = None
    renewal_date: str | None = None
    auto_renew: bool = False
    notes: str | None = None


def _allowed_dept_ids(user: CurrentUser) -> list[str] | None:
    if ROLE_RANK.get(user.role, 0) >= 3 or user.is_service_account:
        return None
    sb = service_client()
    res = sb.table("department_members").select("department_id").eq("user_id", user.id).execute()
    return [r["department_id"] for r in (res.data or [])]


def _enrich_license(lic: dict) -> dict:
    """Calcule le statut et les jours restants à partir des dates."""
    today = date.today()
    exp = lic.get("expiration_date")
    ren = lic.get("renewal_date")

    if exp:
        try:
            exp_date = date.fromisoformat(exp)
            days = (exp_date - today).days
            lic["days_to_expiry"] = days
            if days < 0:
                lic["computed_status"] = "expired"
            elif days <= 30:
                lic["computed_status"] = "expiring_soon"
            elif days <= 90:
                lic["computed_status"] = "expiring_medium"
            else:
                lic["computed_status"] = "active"
        except ValueError:
            lic["computed_status"] = "active"
            lic["days_to_expiry"] = None
    else:
        lic["computed_status"] = "active"
        lic["days_to_expiry"] = None

    if ren:
        try:
            lic["days_to_renewal"] = (date.fromisoformat(ren) - today).days
        except ValueError:
            lic["days_to_renewal"] = None

    return lic


@router.get("")
def list_licenses(
    dept_id: str | None = Query(None),
    expiring_days: int | None = Query(None, ge=1, le=365),
    user: CurrentUser = Depends(require_min_role("user")),
):
    sb = service_client()
    q = (
        sb.table("licenses")
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
    if expiring_days is not None:
        cutoff = (date.today() + timedelta(days=expiring_days)).isoformat()
        today_iso = date.today().isoformat()
        q = q.gte("expiration_date", today_iso).lte("expiration_date", cutoff)

    res = q.order("expiration_date").execute()
    return [_enrich_license(r) for r in (res.data or [])]


@router.post("", status_code=201)
def create_license(
    payload: LicensePayload,
    user: CurrentUser = Depends(require_min_role("manager")),
):
    sb = service_client()
    res = sb.table("licenses").insert({
        "organization_id":  user.organization_id,
        "department_id":    payload.department_id,
        "application_id":   payload.application_id,
        "product_name":     payload.product_name,
        "vendor":           payload.vendor,
        "license_type":     payload.license_type,
        "quantity":         payload.quantity,
        "assigned_count":   payload.assigned_count,
        "cost_per_unit":    payload.cost_per_unit,
        "billing_cycle":    payload.billing_cycle,
        "purchase_date":    payload.purchase_date,
        "expiration_date":  payload.expiration_date,
        "renewal_date":     payload.renewal_date,
        "auto_renew":       payload.auto_renew,
        "notes":            payload.notes,
    }).execute()
    return _enrich_license(res.data[0])


@router.patch("/{lic_id}")
def update_license(
    lic_id: str,
    payload: LicensePayload,
    user: CurrentUser = Depends(require_min_role("manager")),
):
    sb = service_client()
    _lic_or_404(sb, lic_id, user.organization_id)
    res = sb.table("licenses").update({
        "department_id":    payload.department_id,
        "application_id":   payload.application_id,
        "product_name":     payload.product_name,
        "vendor":           payload.vendor,
        "license_type":     payload.license_type,
        "quantity":         payload.quantity,
        "assigned_count":   payload.assigned_count,
        "cost_per_unit":    payload.cost_per_unit,
        "billing_cycle":    payload.billing_cycle,
        "purchase_date":    payload.purchase_date,
        "expiration_date":  payload.expiration_date,
        "renewal_date":     payload.renewal_date,
        "auto_renew":       payload.auto_renew,
        "notes":            payload.notes,
    }).eq("id", lic_id).execute()
    return _enrich_license(res.data[0])


@router.delete("/{lic_id}", status_code=204)
def delete_license(
    lic_id: str,
    user: CurrentUser = Depends(require_min_role("admin")),
):
    sb = service_client()
    _lic_or_404(sb, lic_id, user.organization_id)
    sb.table("licenses").delete().eq("id", lic_id).execute()


def _lic_or_404(sb, lic_id: str, organization_id: str) -> dict:
    res = sb.table("licenses").select("id").eq("id", lic_id).eq("organization_id", organization_id).limit(1).execute()
    if not (res.data or []):
        raise HTTPException(status_code=404, detail="Licence introuvable.")
    return res.data[0]
