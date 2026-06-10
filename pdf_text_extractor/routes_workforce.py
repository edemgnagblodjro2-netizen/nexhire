from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field

from auth import CurrentUser
from db import get_db, rows, row
from rbac import ROLE_RANK, require_min_role

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
    with get_db() as cur:
        cur.execute(
            "SELECT department_id FROM department_members WHERE user_id = %s",
            (user.id,),
        )
        return [r["department_id"] for r in rows(cur)]


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
    allowed = _allowed_dept_ids(user)
    if allowed is not None and not allowed:
        return []

    conditions = ["wp.organization_id = %s"]
    params: list = [user.organization_id]

    if allowed is not None:
        conditions.append("wp.department_id = ANY(%s::uuid[])")
        params.append(allowed)

    if dept_id:
        conditions.append("wp.department_id = %s")
        params.append(dept_id)

    if status:
        conditions.append("wp.status = %s")
        params.append(status)

    where_clause = " AND ".join(conditions)
    sql = f"""
        SELECT wp.*, d.name AS department_name
        FROM workforce_processes wp
        LEFT JOIN departments d ON d.id = wp.department_id
        WHERE {where_clause}
        ORDER BY wp.name
    """

    try:
        with get_db() as cur:
            cur.execute(sql, params)
            result = rows(cur)
    except Exception as exc:
        from fastapi import HTTPException
        raise HTTPException(status_code=500, detail=f"Erreur base de données processus : {exc}") from exc

    return [_enrich(p) for p in result]


@router.post("", status_code=201)
def create_process(payload: ProcessPayload, user: CurrentUser = Depends(require_min_role("manager"))):
    with get_db() as cur:
        cur.execute(
            """
            INSERT INTO workforce_processes (
                organization_id, department_id, name, description,
                team_size, manual_hours_per_month, automation_potential,
                hourly_cost, status, notes
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING *
            """,
            (
                user.organization_id,
                payload.department_id,
                payload.name,
                payload.description,
                payload.team_size,
                payload.manual_hours_per_month,
                payload.automation_potential,
                payload.hourly_cost,
                payload.status,
                payload.notes,
            ),
        )
        result = row(cur)
    return _enrich(result)


@router.patch("/{proc_id}")
def update_process(
    proc_id: str,
    payload: ProcessPayload,
    user: CurrentUser = Depends(require_min_role("manager")),
):
    _or_404(proc_id, user.organization_id)
    with get_db() as cur:
        cur.execute(
            """
            UPDATE workforce_processes SET
                department_id = %s, name = %s, description = %s,
                team_size = %s, manual_hours_per_month = %s,
                automation_potential = %s, hourly_cost = %s,
                status = %s, notes = %s
            WHERE id = %s
            RETURNING *
            """,
            (
                payload.department_id,
                payload.name,
                payload.description,
                payload.team_size,
                payload.manual_hours_per_month,
                payload.automation_potential,
                payload.hourly_cost,
                payload.status,
                payload.notes,
                proc_id,
            ),
        )
        result = row(cur)
    return _enrich(result)


@router.delete("/{proc_id}", status_code=204)
def delete_process(proc_id: str, user: CurrentUser = Depends(require_min_role("admin"))):
    _or_404(proc_id, user.organization_id)
    with get_db() as cur:
        cur.execute("DELETE FROM workforce_processes WHERE id = %s", (proc_id,))


def _or_404(proc_id: str, org_id: str) -> dict:
    with get_db() as cur:
        cur.execute(
            "SELECT id FROM workforce_processes WHERE id = %s AND organization_id = %s LIMIT 1",
            (proc_id, org_id),
        )
        result = row(cur)
    if not result:
        raise HTTPException(status_code=404, detail="Processus introuvable.")
    return result
