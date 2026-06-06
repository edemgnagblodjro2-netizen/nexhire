from __future__ import annotations

from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field

from auth import CurrentUser
from rbac import ROLE_RANK, require_min_role
from supabase_client import service_client

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
    sb = service_client()
    res = sb.table("department_members").select("department_id").eq("user_id", user.id).execute()
    return [r["department_id"] for r in (res.data or [])]


def _check_dept_access(user: CurrentUser, dept_id: str | None):
    if not dept_id:
        return
    if ROLE_RANK.get(user.role, 0) >= 3 or user.is_service_account:
        return
    sb = service_client()
    res = (
        sb.table("department_members")
        .select("user_id")
        .eq("user_id", user.id)
        .eq("department_id", dept_id)
        .limit(1)
        .execute()
    )
    if not (res.data or []):
        raise HTTPException(status_code=403, detail="Accès au département refusé.")


@router.get("")
def list_budget_entries(
    dept_id: str | None = Query(None),
    year: int | None = Query(None),
    category: str | None = Query(None),
    user: CurrentUser = Depends(require_min_role("user")),
):
    sb = service_client()
    q = (
        sb.table("budget_entries")
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
    if year:
        q = q.eq("year", year)
    if category:
        q = q.eq("category", category)
    res = q.order("year", desc=True).order("month", desc=True).execute()
    return res.data or []


@router.post("", status_code=201)
def create_budget_entry(
    payload: BudgetPayload,
    user: CurrentUser = Depends(require_min_role("manager")),
):
    _check_dept_access(user, payload.department_id)
    sb = service_client()
    res = sb.table("budget_entries").insert({
        "organization_id": user.organization_id,
        "department_id": payload.department_id,
        "category": payload.category,
        "label": payload.label,
        "year": payload.year,
        "month": payload.month,
        "allocated": payload.allocated,
        "actual": payload.actual,
        "currency": payload.currency,
        "notes": payload.notes,
    }).execute()
    return res.data[0]


@router.patch("/{entry_id}")
def update_budget_entry(
    entry_id: str,
    payload: BudgetPayload,
    user: CurrentUser = Depends(require_min_role("manager")),
):
    sb = service_client()
    entry = _entry_or_404(sb, entry_id, user.organization_id)
    _check_dept_access(user, entry.get("department_id"))
    res = sb.table("budget_entries").update({
        "department_id": payload.department_id,
        "category": payload.category,
        "label": payload.label,
        "year": payload.year,
        "month": payload.month,
        "allocated": payload.allocated,
        "actual": payload.actual,
        "currency": payload.currency,
        "notes": payload.notes,
    }).eq("id", entry_id).execute()
    return res.data[0]


@router.delete("/{entry_id}", status_code=204)
def delete_budget_entry(
    entry_id: str,
    user: CurrentUser = Depends(require_min_role("admin")),
):
    sb = service_client()
    _entry_or_404(sb, entry_id, user.organization_id)
    sb.table("budget_entries").delete().eq("id", entry_id).execute()


@router.get("/summary")
def budget_summary(
    dept_id: str | None = Query(None),
    year: int | None = Query(None),
    user: CurrentUser = Depends(require_min_role("user")),
):
    """Budget alloué vs réel par catégorie + prévision linéaire 3 mois."""
    sb = service_client()
    current_year = year or datetime.now().year

    q = (
        sb.table("budget_entries")
        .select("category, year, month, allocated, actual, currency, department_id")
        .eq("organization_id", user.organization_id)
        .eq("year", current_year)
    )
    allowed = _allowed_dept_ids(user)
    if allowed is not None:
        if not allowed:
            return _empty_summary(current_year)
        q = q.in_("department_id", allowed)
    if dept_id:
        q = q.eq("department_id", dept_id)

    res = q.execute()
    entries = res.data or []

    by_cat: dict[str, dict] = {}
    monthly: dict[int, float] = {}

    for e in entries:
        cat = e["category"]
        if cat not in by_cat:
            by_cat[cat] = {"category": cat, "allocated": 0.0, "actual": 0.0, "currency": e.get("currency", "CAD")}
        by_cat[cat]["allocated"] += float(e.get("allocated") or 0)
        by_cat[cat]["actual"]    += float(e.get("actual")    or 0)
        m = e.get("month")
        if m:
            monthly[m] = monthly.get(m, 0.0) + float(e.get("actual") or 0)

    now_month = datetime.now().month
    series = [monthly.get(m, 0.0) for m in range(1, now_month + 1)]
    forecast_vals = _linear_forecast(series, 3)
    forecast = []
    for i, val in enumerate(forecast_vals):
        m = now_month + i + 1
        yr = current_year + (m - 1) // 12
        m  = ((m - 1) % 12) + 1
        forecast.append({"period": f"{yr}-{m:02d}", "predicted": round(val, 2)})

    total_alloc  = sum(v["allocated"] for v in by_cat.values())
    total_actual = sum(v["actual"]    for v in by_cat.values())

    return {
        "year": current_year,
        "by_category": list(by_cat.values()),
        "monthly_actual": [monthly.get(m, 0.0) for m in range(1, 13)],
        "total": {
            "allocated":       total_alloc,
            "actual":          total_actual,
            "variance":        total_alloc - total_actual,
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
    return {"year": year, "by_category": [], "monthly_actual": [0]*12, "total": {"allocated": 0, "actual": 0, "variance": 0, "utilization_pct": 0}, "forecast": []}


def _entry_or_404(sb, entry_id: str, organization_id: str) -> dict:
    res = sb.table("budget_entries").select("*").eq("id", entry_id).eq("organization_id", organization_id).limit(1).execute()
    if not (res.data or []):
        raise HTTPException(status_code=404, detail="Entrée budgétaire introuvable.")
    return res.data[0]
