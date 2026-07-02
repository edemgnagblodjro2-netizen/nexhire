from __future__ import annotations

from datetime import date
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field

from auth import CurrentUser
from db import get_db, row, rows
from rbac import require_min_role

router = APIRouter(prefix="/api/external-contractors", tags=["external"])

CONTRACTOR_TYPES = Literal["consultant", "vendor", "provider", "contractor"]
SCOPE_TYPES = Literal["department", "organization"]

TYPE_LABELS = {
    "consultant": "Consultant",
    "vendor": "Fournisseur",
    "provider": "Prestataire de services",
    "contractor": "Sous-traitant",
}


class ContractorPayload(BaseModel):
    full_name: str = Field(..., min_length=1, max_length=120)
    email: str | None = None
    company_name: str | None = None
    contractor_type: str = Field("consultant")
    job_title: str | None = None
    mission: str | None = None
    contract_start: date
    contract_end: date
    contract_value: float = Field(0, ge=0)
    currency: str = "CAD"
    scope: str = Field("department")
    department_ids: list[str] = Field(default_factory=list)


def _validate_payload(payload: ContractorPayload) -> None:
    if payload.contract_end <= payload.contract_start:
        raise HTTPException(status_code=400, detail="La date de fin doit être postérieure à la date de début.")
    if payload.scope == "department" and not payload.department_ids:
        raise HTTPException(
            status_code=400, detail="Sélectionnez au moins un département ou choisissez 'Toute l’organisation'."
        )


def _computed_status(end_date: date | str | None) -> str:
    if not end_date:
        return "active"
    if isinstance(end_date, str):
        end_date = date.fromisoformat(end_date)
    today = date.today()
    if end_date < today:
        return "expired"
    if (end_date - today).days <= 30:
        return "expiring_soon"
    return "active"


def _enrich(c: dict) -> dict:
    """Adds computed_status, days_remaining, type_label."""
    end = c.get("contract_end")
    if end and isinstance(end, str):
        end = date.fromisoformat(end)
    elif hasattr(end, 'isoformat'):
        pass  # already a date object
    c["computed_status"] = _computed_status(end)
    c["days_remaining"] = (end - date.today()).days if end else None
    c["type_label"] = TYPE_LABELS.get(c.get("contractor_type", ""), "Externe")
    return c


@router.get("")
def list_contractors(
    scope: str | None = Query(None),
    dept_id: str | None = Query(None),
    user: CurrentUser = Depends(require_min_role("user")),
):
    """Liste tous les collaborateurs externes de l'organisation."""
    org_id = user.organization_id
    try:
        with get_db() as cur:
            cur.execute(
                """SELECT c.*,
                      ARRAY(
                        SELECT ecd.department_id::text
                        FROM external_contractor_departments ecd
                        WHERE ecd.contractor_id = c.id
                      ) AS department_ids,
                      ARRAY(
                        SELECT d.name
                        FROM external_contractor_departments ecd
                        JOIN departments d ON d.id = ecd.department_id
                        WHERE ecd.contractor_id = c.id
                      ) AS department_names
                   FROM external_contractors c
                   WHERE c.organization_id = %s
                   ORDER BY c.contract_end ASC""",
                (org_id,),
            )
            items = rows(cur)

        # Filter by department if requested
        if dept_id:
            items = [c for c in items if c.get("scope") == "organization" or dept_id in (c.get("department_ids") or [])]

        return [_enrich(c) for c in items]
    except Exception:
        raise HTTPException(status_code=500, detail="Erreur serveur interne.")


@router.post("", status_code=201)
def create_contractor(
    payload: ContractorPayload,
    user: CurrentUser = Depends(require_min_role("admin")),
):
    _validate_payload(payload)
    org_id = user.organization_id

    try:
        with get_db() as cur:
            cur.execute(
                """INSERT INTO external_contractors
                   (organization_id, full_name, email, company_name, contractor_type,
                    job_title, mission, contract_start, contract_end, contract_value,
                    currency, scope, created_by)
                   VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
                   RETURNING *""",
                (
                    org_id,
                    payload.full_name,
                    payload.email,
                    payload.company_name,
                    payload.contractor_type,
                    payload.job_title,
                    payload.mission,
                    payload.contract_start,
                    payload.contract_end,
                    payload.contract_value,
                    payload.currency,
                    payload.scope,
                    user.id,
                ),
            )
            created = row(cur)

        if created and payload.scope == "department" and payload.department_ids:
            with get_db() as cur:
                for dept_id in payload.department_ids:
                    cur.execute(
                        """INSERT INTO external_contractor_departments (contractor_id, department_id)
                           VALUES (%s,%s) ON CONFLICT DO NOTHING""",
                        (created["id"], dept_id),
                    )

        return _enrich({**created, "department_ids": payload.department_ids, "department_names": []})
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=500, detail="Erreur serveur interne.")


@router.patch("/{contractor_id}")
def update_contractor(
    contractor_id: str,
    payload: ContractorPayload,
    user: CurrentUser = Depends(require_min_role("admin")),
):
    _validate_payload(payload)
    org_id = user.organization_id

    with get_db() as cur:
        cur.execute(
            "SELECT id FROM external_contractors WHERE id = %s AND organization_id = %s",
            (contractor_id, org_id),
        )
        if not row(cur):
            raise HTTPException(status_code=404, detail="Collaborateur introuvable.")

    try:
        with get_db() as cur:
            cur.execute(
                """UPDATE external_contractors SET
                   full_name=%s, email=%s, company_name=%s, contractor_type=%s,
                   job_title=%s, mission=%s, contract_start=%s, contract_end=%s,
                   contract_value=%s, currency=%s, scope=%s
                   WHERE id=%s AND organization_id=%s RETURNING *""",
                (
                    payload.full_name,
                    payload.email,
                    payload.company_name,
                    payload.contractor_type,
                    payload.job_title,
                    payload.mission,
                    payload.contract_start,
                    payload.contract_end,
                    payload.contract_value,
                    payload.currency,
                    payload.scope,
                    contractor_id,
                    org_id,
                ),
            )
            updated = row(cur)

        # Refresh department links
        with get_db() as cur:
            cur.execute(
                "DELETE FROM external_contractor_departments WHERE contractor_id = %s",
                (contractor_id,),
            )
        if payload.scope == "department" and payload.department_ids:
            with get_db() as cur:
                for dept_id in payload.department_ids:
                    cur.execute(
                        """INSERT INTO external_contractor_departments (contractor_id, department_id)
                           VALUES (%s,%s) ON CONFLICT DO NOTHING""",
                        (contractor_id, dept_id),
                    )

        return _enrich({**updated, "department_ids": payload.department_ids})
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=500, detail="Erreur serveur interne.")


@router.patch("/{contractor_id}/status")
def update_contractor_status(
    contractor_id: str,
    status: str = Query(..., pattern="^(active|suspended|expired)$"),
    user: CurrentUser = Depends(require_min_role("admin")),
):
    with get_db() as cur:
        cur.execute(
            "UPDATE external_contractors SET status=%s WHERE id=%s AND organization_id=%s RETURNING id",
            (status, contractor_id, user.organization_id),
        )
        if not row(cur):
            raise HTTPException(status_code=404, detail="Collaborateur introuvable.")
    return {"status": status}


@router.delete("/{contractor_id}", status_code=204)
def delete_contractor(
    contractor_id: str,
    user: CurrentUser = Depends(require_min_role("admin")),
):
    with get_db() as cur:
        cur.execute(
            "DELETE FROM external_contractors WHERE id=%s AND organization_id=%s RETURNING id",
            (contractor_id, user.organization_id),
        )
        if not row(cur):
            raise HTTPException(status_code=404, detail="Collaborateur introuvable.")
