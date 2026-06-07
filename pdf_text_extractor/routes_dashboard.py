"""Dashboard exécutif — vue DG / owner : santé de l'organisation par département."""
from __future__ import annotations

from datetime import date, timedelta

from fastapi import APIRouter, Depends

from auth import CurrentUser
from rbac import require_min_role
from supabase_client import service_client

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])

# Seuils pour le score de santé
_GREEN  = 70   # score >= 70 → 🟢
_YELLOW = 40   # score >= 40 → 🟡 sinon 🔴


def _health_badge(score: float) -> str:
    if score >= _GREEN:  return "green"
    if score >= _YELLOW: return "yellow"
    return "red"


def _safe(sb, table: str, org_id: str, dept_id: str | None = None):
    """Requête sécurisée — retourne [] si la table n'existe pas encore."""
    try:
        q = sb.table(table).select("*").eq("organization_id", org_id)
        if dept_id:
            q = q.eq("department_id", dept_id)
        return q.execute().data or []
    except Exception:
        return []


def _dept_health(sb, org_id: str, dept_id: str) -> dict:
    """Calcule un score de santé (0-100) pour un département."""
    scores: list[float] = []

    # 1. Budget (colonnes réelles : allocated / actual)
    budgets = _safe(sb, "budget_entries", org_id, dept_id)
    if budgets:
        total_budget = sum(float(b.get("allocated", 0)) for b in budgets)
        total_spent  = sum(float(b.get("actual", 0))    for b in budgets)
        pct = (total_spent / total_budget * 100) if total_budget > 0 else 0
        budget_score = 100 if pct <= 75 else (80 if pct <= 90 else (50 if pct <= 100 else 20))
        scores.append(budget_score)
    else:
        scores.append(75.0)  # neutre si pas de données

    # 2. Licences
    licenses = _safe(sb, "licenses", org_id, dept_id)
    if licenses:
        total_qty = sum(int(l.get("quantity", 0)) for l in licenses)
        used_qty  = sum(int(l.get("assigned_count", 0)) for l in licenses)
        usage_pct = (used_qty / total_qty * 100) if total_qty > 0 else 100
        lic_score = 100 if usage_pct >= 80 else (70 if usage_pct >= 60 else 40)
        scores.append(lic_score)

    # 3. Contrats à risque
    today  = date.today()
    cutoff = (today + timedelta(days=60)).isoformat()
    try:
        contracts_risk = (
            sb.table("contracts")
            .select("id")
            .eq("organization_id", org_id)
            .eq("department_id", dept_id)
            .eq("status", "active")
            .lte("renewal_date", cutoff)
            .gte("renewal_date", today.isoformat())
            .execute().data or []
        )
        cont_score = 100 if len(contracts_risk) == 0 else (70 if len(contracts_risk) <= 2 else 40)
        scores.append(cont_score)
    except Exception:
        pass

    # 4. Processus manuels
    processes = _safe(sb, "workforce_processes", org_id, dept_id)
    if processes:
        manual = [p for p in processes if p.get("status") == "manual"]
        proc_score = 100 if len(manual) == 0 else (70 if len(manual) <= 2 else 50)
        scores.append(proc_score)

    overall = sum(scores) / len(scores) if scores else 75.0
    return round(overall, 1)


@router.get("/executive")
def executive_dashboard(user: CurrentUser = Depends(require_min_role("admin"))):
    """Tableau de bord exécutif — réservé aux admins et owners."""
    sb     = service_client()
    org_id = user.organization_id
    today  = date.today()

    # ── KPIs globaux ──────────────────────────────────────────────────────────
    try:
        all_budgets = _safe(sb, "budget_entries", org_id)
        total_budget = sum(float(b.get("allocated", 0)) for b in all_budgets)
        total_spent  = sum(float(b.get("actual", 0))    for b in all_budgets)
    except Exception:
        total_budget = total_spent = 0.0

    # Économies potentielles — calcul rapide sans appeler l'optimisation (évite timeout)
    total_savings = 0.0
    try:
        lics = _safe(sb, "licenses", org_id)
        for l in lics:
            qty  = int(l.get("quantity") or 0)
            asgn = int(l.get("assigned_count") or 0)
            cost = float(l.get("cost_per_unit") or 0)
            if qty > 0 and asgn / qty < 0.8:
                mul = 12 if l.get("billing_cycle") == "monthly" else 1
                total_savings += (qty - asgn) * cost * mul
        procs = _safe(sb, "workforce_processes", org_id)
        for p in procs:
            total_savings += (float(p.get("manual_hours_per_month") or 0)
                              * float(p.get("automation_potential") or 0) / 100
                              * float(p.get("hourly_cost") or 50) * 12)
        total_savings = round(total_savings, 0)
    except Exception:
        pass

    # Contrats à renouveler dans 90 jours
    contracts_due = 0
    try:
        res = (
            sb.table("contracts")
            .select("id", count="exact")
            .eq("organization_id", org_id)
            .eq("status", "active")
            .lte("renewal_date", (today + timedelta(days=90)).isoformat())
            .gte("renewal_date", today.isoformat())
            .execute()
        )
        contracts_due = res.count or 0
    except Exception:
        pass

    # ── Départements ──────────────────────────────────────────────────────────
    try:
        depts_raw = (
            sb.table("departments")
            .select("*")
            .eq("organization_id", org_id)
            .order("name")
            .execute().data or []
        )
    except Exception:
        depts_raw = []

    dept_type_icons = {
        "finance": "💰", "hr": "👥", "it": "💻", "legal": "⚖️",
        "operations": "⚙️", "marketing": "📣", "direction": "🏛️",
        "approvisionnement": "📦", "general": "📊",
    }

    departments = []
    at_risk_count = 0

    for d in depts_raw:
        dept_id   = d["id"]
        dept_type = d.get("dept_type") or "general"
        score     = _dept_health(sb, org_id, dept_id)
        badge     = _health_badge(score)
        if badge in ("red", "yellow"):
            at_risk_count += 1

        # Métriques clés du département
        members_count = 0
        try:
            mr = sb.table("department_members").select("id", count="exact").eq("department_id", dept_id).execute()
            members_count = mr.count or 0
        except Exception:
            pass

        apps_count = 0
        try:
            ar = sb.table("it_applications").select("id", count="exact").eq("department_id", dept_id).neq("status", "decommissioned").execute()
            apps_count = ar.count or 0
        except Exception:
            pass

        budget_pct = None
        dept_budgets = _safe(sb, "budget_entries", org_id, dept_id)
        if dept_budgets:
            db = sum(float(b.get("allocated", 0)) for b in dept_budgets)
            ds = sum(float(b.get("actual", 0))    for b in dept_budgets)
            budget_pct = round(ds / db * 100, 1) if db > 0 else None

        departments.append({
            "id":          dept_id,
            "name":        d["name"],
            "dept_type":   dept_type,
            "icon":        dept_type_icons.get(dept_type, "📊"),
            "score":       score,
            "badge":       badge,
            "members":     members_count,
            "apps":        apps_count,
            "budget_pct":  budget_pct,
        })

    # Trier : 🔴 d'abord, puis 🟡, puis 🟢
    order = {"red": 0, "yellow": 1, "green": 2}
    departments.sort(key=lambda d: (order[d["badge"]], d["name"]))

    return {
        "kpis": {
            "budget_total":    round(total_budget, 0),
            "budget_spent":    round(total_spent, 0),
            "budget_pct":      round(total_spent / total_budget * 100, 1) if total_budget > 0 else 0,
            "savings_potential": total_savings,
            "contracts_due":   contracts_due,
            "depts_total":     len(departments),
            "depts_at_risk":   at_risk_count,
        },
        "departments": departments,
    }


@router.get("/department/{dept_id}")
def department_detail(
    dept_id: str,
    user: CurrentUser = Depends(require_min_role("user")),
):
    """Détail d'un département — accessible au membre du dept ou admin."""
    sb     = service_client()
    org_id = user.organization_id

    # Vérifier accès
    is_admin = user.role in ("admin", "owner")
    if not is_admin:
        try:
            membership = (
                sb.table("department_members")
                .select("id")
                .eq("department_id", dept_id)
                .eq("user_id", user.id)
                .limit(1)
                .execute()
            )
            if not membership.data:
                from fastapi import HTTPException
                raise HTTPException(403, "Accès refusé à ce département.")
        except Exception:
            pass

    try:
        dept = sb.table("departments").select("id, name, dept_type").eq("id", dept_id).limit(1).execute().data
        if not dept:
            from fastapi import HTTPException
            raise HTTPException(404, "Département introuvable.")
        dept = dept[0]
    except Exception:
        from fastapi import HTTPException
        raise HTTPException(404, "Département introuvable.")

    licenses   = _safe(sb, "licenses",            org_id, dept_id)
    processes  = _safe(sb, "workforce_processes",  org_id, dept_id)
    budgets    = _safe(sb, "budget_entries",       org_id, dept_id)
    apps       = _safe(sb, "it_applications",      org_id, dept_id)
    servers    = _safe(sb, "servers",              org_id, dept_id)

    budget_total = sum(float(b.get("allocated", 0)) for b in budgets)
    budget_spent = sum(float(b.get("actual", 0))    for b in budgets)

    total_lic   = sum(int(l.get("quantity", 0)) for l in licenses)
    used_lic    = sum(int(l.get("assigned_count", 0)) for l in licenses)
    unused_lic  = total_lic - used_lic

    manual_hrs  = sum(float(p.get("manual_hours_per_month", 0)) for p in processes if p.get("status") == "manual")
    auto_pot    = sum(float(p.get("automation_potential", 0)) for p in processes) / len(processes) if processes else 0

    active_apps = [a for a in apps if a.get("status") != "decommissioned"]
    app_cost    = sum(float(a.get("monthly_cost", 0)) for a in active_apps)

    return {
        "dept":     dept,
        "score":    _dept_health(sb, org_id, dept_id),
        "budget":   {"total": budget_total, "spent": budget_spent,
                     "pct": round(budget_spent / budget_total * 100, 1) if budget_total > 0 else 0},
        "licenses": {"total": total_lic, "used": used_lic, "unused": unused_lic},
        "processes":{"count": len(processes), "manual_hrs_month": round(manual_hrs, 1),
                     "automation_potential_avg": round(auto_pot, 1)},
        "apps":     {"count": len(active_apps), "monthly_cost": round(app_cost, 2)},
        "servers":  {"count": len(servers),
                     "idle": sum(1 for s in servers if s.get("status") == "idle")},
    }
