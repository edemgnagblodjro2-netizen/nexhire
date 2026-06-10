from __future__ import annotations

from datetime import date, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field

from auth import CurrentUser
from db import get_db, rows, row
from rbac import ROLE_RANK, require_min_role

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
    with get_db() as cur:
        cur.execute(
            "SELECT department_id FROM department_members WHERE user_id = %s",
            (user.id,),
        )
        return [r["department_id"] for r in rows(cur)]


def _enrich(c: dict) -> dict:
    ren = c.get("renewal_date")
    if ren:
        try:
            days = (date.fromisoformat(str(ren)) - date.today()).days
            c["days_to_renewal"] = days
            c["urgency"] = "critical" if days <= 30 else "warning" if days <= 90 else "ok"
        except ValueError:
            c["days_to_renewal"] = None
            c["urgency"] = "ok"
    else:
        c["days_to_renewal"] = None
        c["urgency"] = "ok"
    c["potential_savings"] = round(
        float(c.get("annual_value") or 0) * float(c.get("negotiation_potential") or 0) / 100, 2
    )
    return c


@router.get("")
def list_contracts(
    dept_id:  str | None = Query(None),
    status:   str | None = Query(None),
    renewing: int | None = Query(None, description="Filtre : renouvellement dans N jours"),
    user:     CurrentUser = Depends(require_min_role("user")),
):
    allowed = _allowed_dept_ids(user)
    if allowed is not None and not allowed:
        return []

    # Construction de la requête avec filtres dynamiques
    conditions = ["c.organization_id = %s"]
    params: list = [user.organization_id]

    if allowed is not None:
        conditions.append("c.department_id = ANY(%s::uuid[])")
        params.append(allowed)

    if dept_id:
        conditions.append("c.department_id = %s")
        params.append(dept_id)

    if status:
        conditions.append("c.status = %s")
        params.append(status)

    if renewing is not None:
        cutoff = (date.today() + timedelta(days=renewing)).isoformat()
        today_iso = date.today().isoformat()
        conditions.append("c.renewal_date <= %s")
        params.append(cutoff)
        conditions.append("c.renewal_date >= %s")
        params.append(today_iso)

    where_clause = " AND ".join(conditions)
    sql = f"""
        SELECT c.*, d.name AS department_name
        FROM contracts c
        LEFT JOIN departments d ON d.id = c.department_id
        WHERE {where_clause}
        ORDER BY c.renewal_date
    """

    try:
        with get_db() as cur:
            cur.execute(sql, params)
            result = rows(cur)
    except Exception as exc:
        raise HTTPException(status_code=500, detail="Erreur serveur interne.") from exc

    return [_enrich(c) for c in result]


@router.post("", status_code=201)
def create_contract(payload: ContractPayload, user: CurrentUser = Depends(require_min_role("manager"))):
    with get_db() as cur:
        cur.execute(
            """
            INSERT INTO contracts (
                organization_id, department_id, vendor, description, category,
                annual_value, currency, start_date, end_date, renewal_date,
                auto_renew, negotiation_potential, status, notes
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING *
            """,
            (
                user.organization_id,
                payload.department_id,
                payload.vendor,
                payload.description,
                payload.category,
                payload.annual_value,
                payload.currency,
                payload.start_date,
                payload.end_date,
                payload.renewal_date,
                payload.auto_renew,
                payload.negotiation_potential,
                payload.status,
                payload.notes,
            ),
        )
        result = row(cur)
    return _enrich(result)


@router.patch("/{contract_id}")
def update_contract(
    contract_id: str,
    payload: ContractPayload,
    user: CurrentUser = Depends(require_min_role("manager")),
):
    _or_404("contracts", contract_id, user.organization_id)
    with get_db() as cur:
        cur.execute(
            """
            UPDATE contracts SET
                department_id = %s, vendor = %s, description = %s, category = %s,
                annual_value = %s, currency = %s, start_date = %s, end_date = %s,
                renewal_date = %s, auto_renew = %s, negotiation_potential = %s,
                status = %s, notes = %s
            WHERE id = %s
            RETURNING *
            """,
            (
                payload.department_id,
                payload.vendor,
                payload.description,
                payload.category,
                payload.annual_value,
                payload.currency,
                payload.start_date,
                payload.end_date,
                payload.renewal_date,
                payload.auto_renew,
                payload.negotiation_potential,
                payload.status,
                payload.notes,
                contract_id,
            ),
        )
        result = row(cur)
    return _enrich(result)


@router.delete("/{contract_id}", status_code=204)
def delete_contract(contract_id: str, user: CurrentUser = Depends(require_min_role("admin"))):
    _or_404("contracts", contract_id, user.organization_id)
    with get_db() as cur:
        cur.execute("DELETE FROM contracts WHERE id = %s", (contract_id,))


def _or_404(table: str, row_id: str, org_id: str) -> dict:
    with get_db() as cur:
        cur.execute(
            f"SELECT id FROM {table} WHERE id = %s AND organization_id = %s LIMIT 1",
            (row_id, org_id),
        )
        result = row(cur)
    if not result:
        raise HTTPException(status_code=404, detail="Enregistrement introuvable.")
    return result
