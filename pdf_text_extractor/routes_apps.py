from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field

from auth import CurrentUser
from db import get_db, row, rows
from rbac import ROLE_RANK, require_min_role

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
    with get_db() as cur:
        cur.execute(
            "SELECT department_id FROM department_members WHERE user_id = %s",
            (user.id,),
        )
        return [r["department_id"] for r in rows(cur)]


def _enrich_app(app: dict) -> dict:
    """Calcule les jours depuis la dernière utilisation."""
    last = app.get("last_used_at")
    if last:
        try:
            last_dt = datetime.fromisoformat(str(last).replace("Z", "+00:00"))
            app["days_unused"] = (datetime.now(timezone.utc) - last_dt).days
        except ValueError:
            app["days_unused"] = None
    else:
        app["days_unused"] = None
    return app


def _app_or_404(app_id: str, organization_id: str) -> dict:
    with get_db() as cur:
        cur.execute(
            "SELECT id FROM it_applications WHERE id = %s AND organization_id = %s LIMIT 1",
            (app_id, organization_id),
        )
        result = row(cur)
    if not result:
        raise HTTPException(status_code=404, detail="Application introuvable.")
    return result


@router.get("")
def list_apps(
    dept_id: str | None = Query(None),
    status: str | None = Query(None),
    user: CurrentUser = Depends(require_min_role("user")),
):
    allowed = _allowed_dept_ids(user)
    if allowed is not None and not allowed:
        return []

    conditions = ["a.organization_id = %s"]
    params: list = [user.organization_id]

    if allowed is not None:
        conditions.append("a.department_id = ANY(%s)")
        params.append(allowed)
    if dept_id:
        conditions.append("a.department_id = %s")
        params.append(dept_id)
    if status:
        conditions.append("a.status = %s")
        params.append(status)

    where = " AND ".join(conditions)
    sql = f"""
        SELECT a.*, d.name AS department_name
        FROM it_applications a
        LEFT JOIN departments d ON a.department_id = d.id
        WHERE {where}
        ORDER BY a.name
    """
    try:
        with get_db() as cur:
            cur.execute(sql, params)
            result = rows(cur)
        return [_enrich_app(a) for a in result]
    except Exception:
        return []


@router.post("", status_code=201)
def create_app(
    payload: AppPayload,
    user: CurrentUser = Depends(require_min_role("manager")),
):
    with get_db() as cur:
        cur.execute(
            """
            INSERT INTO it_applications (
                organization_id, department_id, name, category,
                vendor, status, monthly_cost, last_used_at,
                user_count, url, notes
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING *
            """,
            (
                user.organization_id,
                payload.department_id,
                payload.name,
                payload.category,
                payload.vendor,
                payload.status,
                payload.monthly_cost,
                payload.last_used_at,
                payload.user_count,
                payload.url,
                payload.notes,
            ),
        )
        result = row(cur)
    return _enrich_app(result)


@router.patch("/{app_id}")
def update_app(
    app_id: str,
    payload: AppPayload,
    user: CurrentUser = Depends(require_min_role("manager")),
):
    _app_or_404(app_id, user.organization_id)
    with get_db() as cur:
        cur.execute(
            """
            UPDATE it_applications SET
                department_id = %s, name = %s, category = %s,
                vendor = %s, status = %s, monthly_cost = %s,
                last_used_at = %s, user_count = %s, url = %s, notes = %s
            WHERE id = %s
            RETURNING *
            """,
            (
                payload.department_id,
                payload.name,
                payload.category,
                payload.vendor,
                payload.status,
                payload.monthly_cost,
                payload.last_used_at,
                payload.user_count,
                payload.url,
                payload.notes,
                app_id,
            ),
        )
        result = row(cur)
    return _enrich_app(result)


@router.delete("/{app_id}", status_code=204)
def delete_app(
    app_id: str,
    user: CurrentUser = Depends(require_min_role("admin")),
):
    _app_or_404(app_id, user.organization_id)
    with get_db() as cur:
        cur.execute("DELETE FROM it_applications WHERE id = %s", (app_id,))
