from __future__ import annotations

import json
import os
from datetime import date, timedelta

from fastapi import APIRouter, Depends, Query

from auth import CurrentUser
from rbac import require_min_role
from supabase_client import service_client

router = APIRouter(prefix="/api/optimization", tags=["optimization"])


# ── Public endpoints ──────────────────────────────────────────────────────────

@router.get("/overview")
def overview(user: CurrentUser = Depends(require_min_role("user"))):
    """Tableau de bord exécutif : toutes les opportunités d'économies identifiées."""
    org_id = user.organization_id
    unused   = _unused_licenses(org_id)
    dups     = _duplicate_tools(org_id)
    contracts = _contracts_at_risk(org_id)
    processes = _process_waste(org_id)
    score     = _efficiency_score(org_id)

    total_lics  = sum(l["annual_savings_potential"] for l in unused)
    total_sw    = sum(d["annual_savings_potential"] for d in dups)
    total_cont  = sum(c.get("potential_savings", 0) for c in contracts)
    total_proc  = sum(p.get("annual_savings_potential", 0) for p in processes)
    grand_total = total_lics + total_sw + total_cont + total_proc

    return {
        "efficiency_score":   score,
        "savings": {
            "licenses":   round(total_lics,  2),
            "software":   round(total_sw,    2),
            "contracts":  round(total_cont,  2),
            "processes":  round(total_proc,  2),
            "total":      round(grand_total, 2),
        },
        "top_opportunities":  _top_opps(unused, dups, contracts, processes),
        "unused_licenses":    unused[:5],
        "duplicate_tools":    dups[:5],
        "contracts_at_risk":  contracts[:5],
        "process_waste":      processes[:5],
    }


@router.get("/unused-licenses")
def get_unused_licenses(user: CurrentUser = Depends(require_min_role("user"))):
    return _unused_licenses(user.organization_id)


@router.get("/duplicate-tools")
def get_duplicate_tools(user: CurrentUser = Depends(require_min_role("user"))):
    return _duplicate_tools(user.organization_id)


@router.get("/efficiency-score")
def get_efficiency_score(user: CurrentUser = Depends(require_min_role("user"))):
    return _efficiency_score(user.organization_id)


@router.post("/analyze")
async def ai_analyze(
    question: str = Query(default="Comment réduire nos dépenses IT de 10% sans affecter les opérations ?"),
    language: str = Query(default="fr", pattern="^(fr|en)$"),
    org_type: str = Query(default="entreprise"),
    user: CurrentUser = Depends(require_min_role("user")),
):
    """Analyse IA : génère un plan d'économies personnalisé via OpenAI."""
    # Récupère le org_type depuis la DB si non fourni explicitement
    effective_type = org_type
    if effective_type == "entreprise":
        try:
            sb = service_client()
            res = sb.table("organizations").select("org_type").eq("id", user.organization_id).limit(1).execute()
            effective_type = ((res.data or [{}])[0].get("org_type") or "entreprise")
        except Exception:
            pass
    return await _ai_cost_analysis(user.organization_id, question, language, effective_type)


# ── Analysis helpers ──────────────────────────────────────────────────────────

def _unused_licenses(org_id: str) -> list[dict]:
    sb = service_client()
    lics = (
        sb.table("licenses")
        .select("*, departments(name)")
        .eq("organization_id", org_id)
        .execute()
        .data or []
    )
    result = []
    for l in lics:
        qty      = float(l.get("quantity") or 1)
        assigned = float(l.get("assigned_count") or 0)
        cost     = float(l.get("cost_per_unit") or 0)
        if qty == 0 or cost == 0:
            continue
        usage_pct = assigned / qty * 100
        if usage_pct >= 80:
            continue
        unused_units = qty - assigned
        multiplier   = 12 if l.get("billing_cycle") == "monthly" else 1
        savings      = unused_units * cost * multiplier
        result.append({
            "license_id":              l["id"],
            "product_name":            l["product_name"],
            "vendor":                  l.get("vendor"),
            "quantity":                int(qty),
            "assigned_count":          int(assigned),
            "usage_pct":               round(usage_pct, 1),
            "cost_per_unit":           cost,
            "billing_cycle":           l.get("billing_cycle"),
            "annual_savings_potential": round(savings, 2),
            "department":              (l.get("departments") or {}).get("name"),
            "confidence":              95 if usage_pct < 30 else 80 if usage_pct < 60 else 65,
        })
    return sorted(result, key=lambda x: -x["annual_savings_potential"])


def _duplicate_tools(org_id: str) -> list[dict]:
    sb = service_client()
    apps = (
        sb.table("it_applications")
        .select("id, name, category, vendor, monthly_cost, user_count, status")
        .eq("organization_id", org_id)
        .neq("status", "decommissioned")
        .execute()
        .data or []
    )
    by_cat: dict[str, list] = {}
    for a in apps:
        cat = (a.get("category") or "autre").lower()
        by_cat.setdefault(cat, []).append(a)

    result = []
    for cat, cat_apps in by_cat.items():
        if len(cat_apps) < 2:
            continue
        total_monthly = sum(float(a.get("monthly_cost") or 0) for a in cat_apps)
        if total_monthly == 0:
            continue
        savings = total_monthly * 0.6 * 12
        result.append({
            "category":                cat,
            "tools":                   [{"id": a["id"], "name": a["name"], "vendor": a.get("vendor"), "monthly_cost": float(a.get("monthly_cost") or 0)} for a in cat_apps],
            "tool_count":              len(cat_apps),
            "total_monthly_cost":      round(total_monthly, 2),
            "annual_savings_potential": round(savings, 2),
            "confidence":              75,
            "recommendation":          f"{len(cat_apps)} outils dans la catégorie «{cat}». Consolider sur une seule solution.",
        })
    return sorted(result, key=lambda x: -x["annual_savings_potential"])


def _contracts_at_risk(org_id: str) -> list[dict]:
    sb = service_client()
    today  = date.today()
    cutoff = (today + timedelta(days=180)).isoformat()
    try:
        res = (
            sb.table("contracts")
            .select("*, departments(name)")
            .eq("organization_id", org_id)
            .eq("status", "active")
            .lte("renewal_date", cutoff)
            .gte("renewal_date", today.isoformat())
            .order("renewal_date")
            .execute()
        )
    except Exception:
        return []
    result = []
    for c in (res.data or []):
        ren  = date.fromisoformat(c["renewal_date"])
        days = (ren - today).days
        pot  = float(c.get("annual_value") or 0) * float(c.get("negotiation_potential") or 0) / 100
        result.append({
            **{k: v for k, v in c.items() if k != "departments"},
            "department":       (c.get("departments") or {}).get("name"),
            "days_to_renewal":  days,
            "potential_savings": round(pot, 2),
            "confidence":       80,
        })
    return result


def _process_waste(org_id: str) -> list[dict]:
    sb = service_client()
    try:
        res = (
            sb.table("workforce_processes")
            .select("*, departments(name)")
            .eq("organization_id", org_id)
            .execute()
        )
    except Exception:
        return []
    result = []
    for p in (res.data or []):
        hours  = float(p.get("manual_hours_per_month") or 0)
        auto   = float(p.get("automation_potential") or 0) / 100
        hourly = float(p.get("hourly_cost") or 50)
        savings = hours * auto * hourly * 12
        result.append({
            **{k: v for k, v in p.items() if k != "departments"},
            "department":                  (p.get("departments") or {}).get("name"),
            "automatable_hours_monthly":   round(hours * auto, 1),
            "annual_savings_potential":    round(savings, 2),
            "confidence":                  70,
        })
    return sorted(result, key=lambda x: -x["annual_savings_potential"])


def _efficiency_score(org_id: str) -> dict:
    sb = service_client()

    # Software utilization
    apps = sb.table("it_applications").select("status, monthly_cost").eq("organization_id", org_id).execute().data or []
    tot_app    = sum(float(a.get("monthly_cost") or 0) for a in apps if a.get("status") != "decommissioned")
    unused_app = sum(float(a.get("monthly_cost") or 0) for a in apps if a.get("status") == "unused")
    sw_score   = max(0.0, min(100.0, 100 - (unused_app / tot_app * 100 if tot_app > 0 else 0)))

    # License utilization
    lics         = sb.table("licenses").select("quantity, assigned_count").eq("organization_id", org_id).execute().data or []
    tot_seats    = sum(int(l.get("quantity") or 0) for l in lics)
    used_seats   = sum(int(l.get("assigned_count") or 0) for l in lics)
    lic_score    = (used_seats / tot_seats * 100) if tot_seats > 0 else 80.0

    # Infrastructure
    srvs        = sb.table("servers").select("status").eq("organization_id", org_id).execute().data or []
    tot_srvs    = len(srvs)
    problem     = sum(1 for s in srvs if s.get("status") in ("idle", "to_decommission"))
    infra_score = max(0.0, min(100.0, 100 - (problem / tot_srvs * 100 if tot_srvs > 0 else 0)))

    # Process efficiency
    try:
        procs = sb.table("workforce_processes").select("automation_potential, status").eq("organization_id", org_id).execute().data or []
    except Exception:
        procs = []
    if procs:
        automated  = sum(1 for p in procs if p.get("status") == "automated")
        avg_auto   = sum(float(p.get("automation_potential") or 0) for p in procs) / len(procs)
        proc_score = (automated / len(procs) * 100 + avg_auto) / 2
    else:
        proc_score = 75.0

    overall = sw_score * 0.25 + lic_score * 0.30 + infra_score * 0.20 + proc_score * 0.25
    return {
        "overall":        round(overall, 1),
        "software":       round(sw_score, 1),
        "licenses":       round(lic_score, 1),
        "infrastructure": round(infra_score, 1),
        "process":        round(proc_score, 1),
    }


def _top_opps(lics, dups, contracts, procs) -> list[dict]:
    opps = []
    for l in lics[:3]:
        opps.append({"type": "license",  "title": f"Licences sous-utilisées : {l['product_name']}",       "savings": l["annual_savings_potential"],         "confidence": l["confidence"]})
    for d in dups[:2]:
        opps.append({"type": "duplicate","title": f"Outils en doublon ({d['tool_count']}) : {d['category']}", "savings": d["annual_savings_potential"],     "confidence": d["confidence"]})
    for c in contracts[:2]:
        opps.append({"type": "contract", "title": f"Contrat à renégocier : {c['vendor']} ({c['days_to_renewal']}j)", "savings": c.get("potential_savings", 0), "confidence": c.get("confidence", 80)})
    for p in procs[:2]:
        opps.append({"type": "process",  "title": f"Automatisation : {p['name']}",                         "savings": p["annual_savings_potential"],         "confidence": p["confidence"]})
    return sorted(opps, key=lambda x: -x["savings"])[:10]


# ── Règles sectorielles ───────────────────────────────────────────────────────
SECTOR_INSIGHTS: dict[str, list[str]] = {
    "hopital": [
        "Les hôpitaux perdent en moyenne 15-20% du budget en rendez-vous non honorés non optimisés.",
        "L'automatisation des tâches administratives infirmières peut libérer 2-3h/infirmier/jour.",
        "L'imagerie médicale sous-utilisée (< 70% taux d'occupation) génère des coûts fixes évitables.",
        "La consolidation des systèmes cliniques (DPI, RIS, LIS) réduit les coûts d'intégration de 25-40%.",
    ],
    "municipalite": [
        "Les municipalités ont en moyenne 30-45% de leurs contrats fournisseurs renégociables à la baisse.",
        "La numérisation des services citoyens réduit les coûts de traitement de 60-70% par transaction.",
        "Les actifs municipaux (véhicules, équipements) génèrent 20-30% de coûts de maintenance évitables.",
        "La consolidation des fournisseurs de services TI peut générer 15-25% d'économies annuelles.",
    ],
    "universite": [
        "Les universités utilisent en moyenne 45% de leurs licences logicielles académiques.",
        "L'automatisation des processus d'admission réduit les coûts administratifs de 35-50%.",
        "La rationalisation des plateformes LMS évite la duplication de contenu et réduit les licences.",
        "Les espaces d'enseignement sous-utilisés (< 60% taux d'occupation) peuvent être optimisés.",
    ],
    "entreprise": [
        "Les entreprises dépensent en moyenne 30% de leur budget TI en licences sous-utilisées.",
        "La consolidation des outils SaaS dans les mêmes catégories réduit les coûts de 40-60%.",
        "L'automatisation des processus manuels récurrents génère un ROI positif en moins de 12 mois.",
        "La renégociation proactive des contrats (90 jours avant) économise en moyenne 15-20%.",
    ],
}

SECTOR_OPPORTUNITIES: dict[str, list[dict]] = {
    "hopital": [
        {"action": "Optimiser la gestion des rendez-vous médicaux avec rappels automatiques", "impact": "high",   "timeline": "1-3 mois",  "savings_pct": 0.08},
        {"action": "Automatiser la saisie administrative des dossiers infirmiers",           "impact": "high",   "timeline": "3-6 mois",  "savings_pct": 0.12},
        {"action": "Renégocier les contrats de fournitures médicales (appels d'offres)",      "impact": "medium", "timeline": "3-6 mois",  "savings_pct": 0.15},
        {"action": "Consolider les systèmes informatiques cliniques (DPI unique)",            "impact": "high",   "timeline": "6-18 mois", "savings_pct": 0.20},
        {"action": "Réduire les licences logicielles inutilisées (hors systèmes cliniques)", "impact": "medium", "timeline": "1-2 mois",  "savings_pct": 0.05},
    ],
    "municipalite": [
        {"action": "Numériser les services citoyens (permis, paiements, demandes en ligne)",  "impact": "high",   "timeline": "3-6 mois",  "savings_pct": 0.18},
        {"action": "Renégocier les contrats de services publics et fournisseurs",              "impact": "high",   "timeline": "3-6 mois",  "savings_pct": 0.15},
        {"action": "Optimiser la maintenance préventive des actifs (véhicules, bâtiments)",   "impact": "medium", "timeline": "6-12 mois", "savings_pct": 0.12},
        {"action": "Consolider les fournisseurs TI municipaux",                               "impact": "medium", "timeline": "3-6 mois",  "savings_pct": 0.10},
        {"action": "Automatiser la facturation et le recouvrement des taxes",                  "impact": "medium", "timeline": "2-4 mois",  "savings_pct": 0.08},
    ],
    "universite": [
        {"action": "Auditer et réduire les licences logicielles académiques sous-utilisées",  "impact": "high",   "timeline": "1-2 mois",  "savings_pct": 0.20},
        {"action": "Automatiser les processus d'admission et de gestion des dossiers",        "impact": "high",   "timeline": "3-6 mois",  "savings_pct": 0.15},
        {"action": "Consolider les plateformes d'enseignement en ligne (LMS unique)",         "impact": "medium", "timeline": "6-12 mois", "savings_pct": 0.12},
        {"action": "Renégocier les contrats de bases de données et ressources académiques",   "impact": "medium", "timeline": "3-6 mois",  "savings_pct": 0.10},
        {"action": "Optimiser l'utilisation des espaces et salles de cours",                   "impact": "low",    "timeline": "1-3 mois",  "savings_pct": 0.06},
    ],
    "entreprise": [],
}


async def _ai_cost_analysis(org_id: str, question: str, language: str, org_type: str = "entreprise") -> dict:
    """Plan d'économies via OpenAI — fallback règles si indisponible."""
    try:
        from openai import OpenAI
        client = OpenAI(api_key=os.environ.get("OPENAI_API_KEY", ""))
        sb = service_client()

        apps   = sb.table("it_applications").select("name,category,vendor,status,monthly_cost,user_count").eq("organization_id", org_id).execute().data or []
        lics   = sb.table("licenses").select("product_name,vendor,quantity,assigned_count,cost_per_unit,billing_cycle").eq("organization_id", org_id).execute().data or []
        budget = sb.table("budget_entries").select("category,allocated,actual,year").eq("organization_id", org_id).execute().data or []

        context = _build_context(apps, lics, budget, org_type)
        lang_str = "French" if language == "fr" else "English"
        sector_labels = {"entreprise": "private enterprise", "hopital": "hospital/healthcare", "municipalite": "municipality", "universite": "university"}
        sector_label = sector_labels.get(org_type, "organization")

        resp = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": (
                    f"You are an IT cost optimization expert specializing in {sector_label} organizations in Canada. "
                    f"Respond strictly in {lang_str}. "
                    "Return a valid JSON object with this exact structure:\n"
                    '{"summary":"...","total_potential_savings":0,"confidence":0,'
                    '"steps":[{"step":1,"action":"...","savings":0,"impact":"low|medium|high","timeline":"..."}],'
                    '"insights":["..."]}'
                )},
                {"role": "user", "content": f"{question}\n\nOrganization data:\n{context}"},
            ],
            response_format={"type": "json_object"},
            max_tokens=1500,
        )
        analysis = json.loads(resp.choices[0].message.content)
        return {"success": True, "question": question, "analysis": analysis}

    except Exception as exc:
        return {
            "success":  False,
            "question": question,
            "analysis": _rule_based_analysis(org_id, org_type),
            "error":    type(exc).__name__,
        }


def _build_context(apps: list, lics: list, budget: list, org_type: str = "entreprise") -> str:
    total_monthly   = sum(float(a.get("monthly_cost") or 0) for a in apps)
    unused_apps     = [a for a in apps if a.get("status") == "unused"]
    annual_budget   = sum(float(b.get("allocated") or 0) for b in budget if b.get("year") == date.today().year)
    sector_labels = {"entreprise": "private enterprise", "hopital": "hospital", "municipalite": "municipality", "universite": "university"}
    lines = [
        f"Organization type: {sector_labels.get(org_type, org_type)}",
        f"Monthly IT spend: ${total_monthly:,.0f}",
        f"Annual IT budget: ${annual_budget:,.0f}",
        f"Applications: {len(apps)} total, {len(unused_apps)} unused",
        f"License products: {len(lics)}",
        "",
        "Top applications by cost:",
    ]
    for a in sorted(apps, key=lambda x: -float(x.get("monthly_cost") or 0))[:10]:
        lines.append(f"  {a['name']} ({a.get('category','?')}): ${a.get('monthly_cost',0)}/mo · {a.get('user_count',0)} users · {a.get('status','?')}")
    lines.append("\nLicenses:")
    for l in lics[:10]:
        qty, asgn = int(l.get("quantity") or 0), int(l.get("assigned_count") or 0)
        pct = f"{asgn/qty*100:.0f}%" if qty > 0 else "?"
        lines.append(f"  {l['product_name']}: {asgn}/{qty} assigned ({pct}) · ${l.get('cost_per_unit',0)}/{l.get('billing_cycle','?')}")
    return "\n".join(lines)


def _rule_based_analysis(org_id: str, org_type: str = "entreprise") -> dict:
    unused    = _unused_licenses(org_id)
    dups      = _duplicate_tools(org_id)
    procs     = _process_waste(org_id)
    contracts = _contracts_at_risk(org_id)

    data_total = (
        sum(l["annual_savings_potential"] for l in unused)
        + sum(d["annual_savings_potential"] for d in dups)
        + sum(p["annual_savings_potential"] for p in procs)
        + sum(c.get("potential_savings", 0) for c in contracts)
    )

    steps: list[dict] = []
    for i, l in enumerate(unused[:3], 1):
        steps.append({"step": i, "action": f"Réduire licences {l['product_name']} ({l['quantity']} → {l['assigned_count']})", "savings": l["annual_savings_potential"], "impact": "medium", "timeline": "1-3 mois"})
    for d in dups[:2]:
        steps.append({"step": len(steps)+1, "action": f"Consolider outils {d['category']} ({d['tool_count']} en doublon)", "savings": d["annual_savings_potential"], "impact": "high", "timeline": "3-6 mois"})
    for p in procs[:2]:
        steps.append({"step": len(steps)+1, "action": f"Automatiser processus : {p['name']} ({p['automatable_hours_monthly']}h/mois)", "savings": p["annual_savings_potential"], "impact": "high", "timeline": "6-12 mois"})
    for c in contracts[:2]:
        steps.append({"step": len(steps)+1, "action": f"Renégocier contrat {c['vendor']} avant expiration ({c['days_to_renewal']}j)", "savings": c.get("potential_savings", 0), "impact": "medium", "timeline": "1-3 mois"})

    # Ajoute les opportunités sectorielles si peu de données internes
    sector_opps = SECTOR_OPPORTUNITIES.get(org_type, [])
    if len(steps) < 4 and sector_opps:
        budget_ref = 500_000
        for opp in sector_opps[:max(0, 5 - len(steps))]:
            est_savings = round(budget_ref * opp["savings_pct"], 2)
            if data_total > 0:
                est_savings = round(data_total * opp["savings_pct"] / 0.10, 2)
            steps.append({"step": len(steps)+1, "action": opp["action"], "savings": est_savings, "impact": opp["impact"], "timeline": opp["timeline"]})
            data_total += est_savings

    # Insights : données réelles + sectoriels
    base_insights = [
        f"{len(unused)} produits licenciés ont un taux d'utilisation inférieur à 80%.",
        f"{len(dups)} catégories d'outils présentent des doublons potentiels.",
        f"{sum(p['automatable_hours_monthly'] for p in procs):.0f} heures/mois pourraient être automatisées.",
        f"{len(contracts)} contrats arrivent à renouvellement dans les 180 prochains jours.",
    ]
    sector_insights = SECTOR_INSIGHTS.get(org_type, [])
    all_insights = [i for i in base_insights if not i.startswith("0 ")] + sector_insights[:2]

    sector_labels = {"entreprise": "entreprise privée", "hopital": "hôpital", "municipalite": "municipalité", "universite": "université"}
    return {
        "summary": (
            f"Analyse ({sector_labels.get(org_type, org_type)}) : "
            f"{len(unused)} licences sous-utilisées, {len(dups)} catégories avec doublons, "
            f"{len(procs)} processus automatisables, {len(contracts)} contrats à renégocier."
        ),
        "total_potential_savings": round(data_total, 2),
        "confidence":             82,
        "steps":                  steps,
        "insights":               all_insights,
        "org_type":               org_type,
    }
