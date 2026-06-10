from __future__ import annotations

from datetime import date, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field

from auth import CurrentUser
from db import get_db, row, rows
from rbac import ROLE_RANK, require_min_role

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
    with get_db() as cur:
        cur.execute(
            "SELECT department_id FROM department_members WHERE user_id = %s",
            (user.id,),
        )
        return [r["department_id"] for r in rows(cur)]


def _enrich_license(lic: dict) -> dict:
    """Calcule le statut et les jours restants à partir des dates."""
    today = date.today()
    exp = lic.get("expiration_date")
    ren = lic.get("renewal_date")

    if exp:
        try:
            exp_date = date.fromisoformat(str(exp))
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
            lic["days_to_renewal"] = (date.fromisoformat(str(ren)) - today).days
        except ValueError:
            lic["days_to_renewal"] = None

    return lic


def _lic_or_404(lic_id: str, organization_id: str) -> dict:
    with get_db() as cur:
        cur.execute(
            "SELECT id FROM licenses WHERE id = %s AND organization_id = %s LIMIT 1",
            (lic_id, organization_id),
        )
        result = row(cur)
    if not result:
        raise HTTPException(status_code=404, detail="Licence introuvable.")
    return result


@router.get("")
def list_licenses(
    dept_id: str | None = Query(None),
    expiring_days: int | None = Query(None, ge=1, le=365),
    user: CurrentUser = Depends(require_min_role("user")),
):
    allowed = _allowed_dept_ids(user)
    if allowed is not None and not allowed:
        return []

    conditions = ["l.organization_id = %s"]
    params: list = [user.organization_id]

    if allowed is not None:
        conditions.append("l.department_id = ANY(%s::uuid[])")
        params.append(allowed)
    if dept_id:
        conditions.append("l.department_id = %s")
        params.append(dept_id)
    if expiring_days is not None:
        cutoff = (date.today() + timedelta(days=expiring_days)).isoformat()
        today_iso = date.today().isoformat()
        conditions.append("l.expiration_date >= %s")
        params.append(today_iso)
        conditions.append("l.expiration_date <= %s")
        params.append(cutoff)

    where = " AND ".join(conditions)
    sql = f"""
        SELECT l.*, d.name AS department_name
        FROM licenses l
        LEFT JOIN departments d ON l.department_id = d.id
        WHERE {where}
        ORDER BY l.expiration_date
    """
    try:
        with get_db() as cur:
            cur.execute(sql, params)
            result = rows(cur)
        return [_enrich_license(r) for r in result]
    except Exception:
        return []


@router.post("", status_code=201)
def create_license(
    payload: LicensePayload,
    user: CurrentUser = Depends(require_min_role("manager")),
):
    with get_db() as cur:
        cur.execute(
            """
            INSERT INTO licenses (
                organization_id, department_id, application_id, product_name,
                vendor, license_type, quantity, assigned_count, cost_per_unit,
                billing_cycle, purchase_date, expiration_date, renewal_date,
                auto_renew, notes
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING *
            """,
            (
                user.organization_id,
                payload.department_id,
                payload.application_id,
                payload.product_name,
                payload.vendor,
                payload.license_type,
                payload.quantity,
                payload.assigned_count,
                payload.cost_per_unit,
                payload.billing_cycle,
                payload.purchase_date,
                payload.expiration_date,
                payload.renewal_date,
                payload.auto_renew,
                payload.notes,
            ),
        )
        result = row(cur)
    return _enrich_license(result)


@router.patch("/{lic_id}")
def update_license(
    lic_id: str,
    payload: LicensePayload,
    user: CurrentUser = Depends(require_min_role("manager")),
):
    _lic_or_404(lic_id, user.organization_id)
    with get_db() as cur:
        cur.execute(
            """
            UPDATE licenses SET
                department_id = %s, application_id = %s, product_name = %s,
                vendor = %s, license_type = %s, quantity = %s, assigned_count = %s,
                cost_per_unit = %s, billing_cycle = %s, purchase_date = %s,
                expiration_date = %s, renewal_date = %s, auto_renew = %s, notes = %s
            WHERE id = %s
            RETURNING *
            """,
            (
                payload.department_id,
                payload.application_id,
                payload.product_name,
                payload.vendor,
                payload.license_type,
                payload.quantity,
                payload.assigned_count,
                payload.cost_per_unit,
                payload.billing_cycle,
                payload.purchase_date,
                payload.expiration_date,
                payload.renewal_date,
                payload.auto_renew,
                payload.notes,
                lic_id,
            ),
        )
        result = row(cur)
    return _enrich_license(result)


@router.delete("/{lic_id}", status_code=204)
def delete_license(
    lic_id: str,
    user: CurrentUser = Depends(require_min_role("admin")),
):
    _lic_or_404(lic_id, user.organization_id)
    with get_db() as cur:
        cur.execute("DELETE FROM licenses WHERE id = %s", (lic_id,))
