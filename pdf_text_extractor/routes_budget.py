from __future__ import annotations

from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field

from auth import CurrentUser
from db import get_db, row, rows
from rbac import ROLE_RANK, require_min_role

router = APIRouter(prefix="/api/budget", tags=["budget"])


class BudgetPayload(BaseModel):
    department_id: str | None = None
    category: str = Field(..., min_length=1)
    label: str | None = None
    year: int
    month: int | None = Field(None, ge=1, le=12)
    allocated: float = 0
    actual: float = 0
    currency: str = "CAD"
    notes: str | None = None


def _allowed_dept_ids(user: CurrentUser) -> list[str] | None:
    """None = pas de filtre dept (admin/owner/service). Liste vide = aucun accès."""
    if ROLE_RANK.get(user.role, 0) >= 3 or user.is_service_account:
        return None
    with get_db() as cur:
        cur.execute(
            "SELECT department_id FROM department_members WHERE user_id = %s",
            (user.id,),
        )
        return [r["department_id"] for r in rows(cur)]


def _check_dept_access(user: CurrentUser, dept_id: str | None):
    if not dept_id:
        return
    if ROLE_RANK.get(user.role, 0) >= 3 or user.is_service_account:
        return
    with get_db() as cur:
        cur.execute(
            """
            SELECT user_id FROM department_members
            WHERE user_id = %s AND department_id = %s
            LIMIT 1
            """,
            (user.id, dept_id),
        )
        result = row(cur)
    if not result:
        raise HTTPException(status_code=403, detail="Accès au département refusé.")


def _entry_or_404(entry_id: str, organization_id: str) -> dict:
    with get_db() as cur:
        cur.execute(
            "SELECT * FROM budget_entries WHERE id = %s AND organization_id = %s LIMIT 1",
            (entry_id, organization_id),
        )
        result = row(cur)
    if not result:
        raise HTTPException(status_code=404, detail="Entrée budgétaire introuvable.")
    return result


@router.get("")
def list_budget_entries(
    dept_id: str | None = Query(None),
    year: int | None = Query(None),
    category: str | None = Query(None),
    user: CurrentUser = Depends(require_min_role("user")),
):
    allowed = _allowed_dept_ids(user)
    if allowed is not None and not allowed:
        return []

    conditions = ["b.organization_id = %s"]
    params: list = [user.organization_id]

    if allowed is not None:
        conditions.append("b.department_id = ANY(%s::uuid[])")
        params.append(allowed)
    if dept_id:
        conditions.append("b.department_id = %s")
        params.append(dept_id)
    if year:
        conditions.append("b.year = %s")
        params.append(year)
    if category:
        conditions.append("b.category = %s")
        params.append(category)

    where = " AND ".join(conditions)
    sql = f"""
        SELECT b.*, d.name AS department_name
        FROM budget_entries b
        LEFT JOIN departments d ON b.department_id = d.id
        WHERE {where}
        ORDER BY b.year DESC, b.month DESC
    """
    with get_db() as cur:
        cur.execute(sql, params)
        return rows(cur)


def _maybe_budget_alert(org_id: str, category: str, allocated: float, actual: float) -> None:
    if allocated <= 0:
        return
    pct = round(actual / allocated * 100, 1)
    if pct >= 80:
        try:
            from routes_webhooks import send_webhook_notification

            send_webhook_notification(
                org_id,
                "budget_alert",
                {
                    "category": category,
                    "pct": pct,
                },
            )
        except Exception:
            pass


@router.post("", status_code=201)
def create_budget_entry(
    payload: BudgetPayload,
    user: CurrentUser = Depends(require_min_role("manager")),
):
    _check_dept_access(user, payload.department_id)
    with get_db() as cur:
        cur.execute(
            """
            INSERT INTO budget_entries (
                organization_id, department_id, category, label,
                year, month, allocated, actual, currency, notes
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING *
            """,
            (
                user.organization_id,
                payload.department_id,
                payload.category,
                payload.label,
                payload.year,
                payload.month,
                payload.allocated,
                payload.actual,
                payload.currency,
                payload.notes,
            ),
        )
        result = row(cur)
    _maybe_budget_alert(user.organization_id, payload.category, payload.allocated, payload.actual)
    return result


@router.patch("/{entry_id}")
def update_budget_entry(
    entry_id: str,
    payload: BudgetPayload,
    user: CurrentUser = Depends(require_min_role("manager")),
):
    entry = _entry_or_404(entry_id, user.organization_id)
    _check_dept_access(user, entry.get("department_id"))
    with get_db() as cur:
        cur.execute(
            """
            UPDATE budget_entries SET
                department_id = %s, category = %s, label = %s,
                year = %s, month = %s, allocated = %s,
                actual = %s, currency = %s, notes = %s
            WHERE id = %s
            RETURNING *
            """,
            (
                payload.department_id,
                payload.category,
                payload.label,
                payload.year,
                payload.month,
                payload.allocated,
                payload.actual,
                payload.currency,
                payload.notes,
                entry_id,
            ),
        )
        result = row(cur)
    _maybe_budget_alert(user.organization_id, payload.category, payload.allocated, payload.actual)
    return result


@router.delete("/{entry_id}", status_code=204)
def delete_budget_entry(
    entry_id: str,
    user: CurrentUser = Depends(require_min_role("admin")),
):
    _entry_or_404(entry_id, user.organization_id)
    with get_db() as cur:
        cur.execute("DELETE FROM budget_entries WHERE id = %s", (entry_id,))


@router.get("/summary")
def budget_summary(
    dept_id: str | None = Query(None),
    year: int | None = Query(None),
    user: CurrentUser = Depends(require_min_role("user")),
):
    """Budget alloué vs réel par catégorie + prévision linéaire 3 mois."""
    current_year = year or datetime.now().year

    allowed = _allowed_dept_ids(user)
    if allowed is not None and not allowed:
        return _empty_summary(current_year)

    conditions = ["b.organization_id = %s", "b.year = %s"]
    params: list = [user.organization_id, current_year]

    if allowed is not None:
        conditions.append("b.department_id = ANY(%s::uuid[])")
        params.append(allowed)
    if dept_id:
        conditions.append("b.department_id = %s")
        params.append(dept_id)

    where = " AND ".join(conditions)
    sql = f"""
        SELECT b.category, b.year, b.month, b.allocated, b.actual, b.currency, b.department_id,
               d.name AS department_name
        FROM budget_entries b
        LEFT JOIN departments d ON d.id = b.department_id
        WHERE {where}
    """
    with get_db() as cur:
        cur.execute(sql, params)
        entries = rows(cur)

    by_cat: dict[str, dict] = {}
    by_dept: dict[str, dict] = {}
    monthly: dict[int, float] = {}

    for e in entries:
        cat = e["category"]
        if cat not in by_cat:
            by_cat[cat] = {"category": cat, "allocated": 0.0, "actual": 0.0, "currency": e.get("currency", "CAD")}
        by_cat[cat]["allocated"] += float(e.get("allocated") or 0)
        by_cat[cat]["actual"] += float(e.get("actual") or 0)

        dept_key = str(e.get("department_id") or "__none__")
        dept_name = e.get("department_name") or "Sans département"
        if dept_key not in by_dept:
            by_dept[dept_key] = {
                "department_id": dept_key if dept_key != "__none__" else None,
                "department_name": dept_name,
                "allocated": 0.0,
                "actual": 0.0,
            }
        by_dept[dept_key]["allocated"] += float(e.get("allocated") or 0)
        by_dept[dept_key]["actual"] += float(e.get("actual") or 0)

        m = e.get("month")
        if m:
            monthly[m] = monthly.get(m, 0.0) + float(e.get("actual") or 0)

    # Si aucune donnée mensuelle dans budget_entries, utiliser les transactions réelles groupées par mois
    if not any(v > 0 for v in monthly.values()):
        txn_conditions = ["organization_id = %s", "status = 'paid'", "EXTRACT(YEAR FROM transaction_date) = %s"]
        txn_params: list = [user.organization_id, current_year]
        if allowed is not None:
            # transactions liées aux départements autorisés (via department_id s'il existe)
            pass
        if dept_id:
            txn_conditions.append("department_id = %s")
            txn_params.append(dept_id)
        txn_where = " AND ".join(txn_conditions)
        try:
            with get_db() as cur:
                cur.execute(
                    f"""SELECT EXTRACT(MONTH FROM transaction_date)::int AS m,
                               SUM(amount) AS total
                          FROM financial_transactions
                         WHERE {txn_where}
                         GROUP BY m""",
                    txn_params,
                )
                for r in rows(cur):
                    monthly[r["m"]] = float(r["total"] or 0)
        except Exception:
            pass

    now_month = datetime.now().month
    series = [monthly.get(m, 0.0) for m in range(1, now_month + 1)]
    forecast_vals = _linear_forecast(series, 3)
    forecast = []
    for i, val in enumerate(forecast_vals):
        m = now_month + i + 1
        yr = current_year + (m - 1) // 12
        m = ((m - 1) % 12) + 1
        forecast.append({"period": f"{yr}-{m:02d}", "predicted": round(val, 2)})

    total_alloc = sum(v["allocated"] for v in by_cat.values())
    total_actual = sum(v["actual"] for v in by_cat.values())

    return {
        "year": current_year,
        "by_category": list(by_cat.values()),
        "by_department": sorted(by_dept.values(), key=lambda d: -(d["allocated"] + d["actual"])),
        "monthly_actual": [monthly.get(m, 0.0) for m in range(1, 13)],
        "total": {
            "allocated": total_alloc,
            "actual": total_actual,
            "variance": total_alloc - total_actual,
            "utilization_pct": round(total_actual / total_alloc * 100, 1) if total_alloc > 0 else 0,
        },
        "forecast": forecast,
    }


def _linear_forecast(values: list[float], periods: int = 3) -> list[float]:
    n = len(values)
    if n == 0:
        return [0.0] * periods
    if n == 1:
        return [values[0]] * periods
    x_vals = list(range(n))
    x_mean = sum(x_vals) / n
    y_mean = sum(values) / n
    num = sum((x_vals[i] - x_mean) * (values[i] - y_mean) for i in range(n))
    den = sum((xi - x_mean) ** 2 for xi in x_vals)
    slope = num / den if den else 0
    intercept = y_mean - slope * x_mean
    return [max(0.0, intercept + slope * (n + i)) for i in range(periods)]


def _empty_summary(year: int) -> dict:
    return {
        "year": year,
        "by_category": [],
        "monthly_actual": [0] * 12,
        "total": {"allocated": 0, "actual": 0, "variance": 0, "utilization_pct": 0},
        "forecast": [],
    }
