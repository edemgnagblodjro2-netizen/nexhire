from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field

from auth import CurrentUser
from rbac import ROLE_RANK, require_min_role
from supabase_client import service_client

router = APIRouter(prefix="/api/departments", tags=["departments"])

# ── Département templates par type d'organisation ────────────────────────────
DEPT_TEMPLATES: dict[str, list[dict]] = {
    "entreprise": [
        {"name": "Direction Générale",          "description": "PDG, planification stratégique, gouvernance, gestion du changement"},
        {"name": "Finances",                    "description": "Comptabilité, trésorerie, budgétisation, audit interne, gestion des risques"},
        {"name": "Ressources Humaines",         "description": "Recrutement, intégration, formation, performance, rémunération"},
        {"name": "Technologies de l'information", "description": "Support TI, infrastructure, cybersécurité, cloud, gestion des licences"},
        {"name": "Opérations",                  "description": "Gestion opérationnelle, qualité, amélioration continue, gestion documentaire"},
        {"name": "Approvisionnement",           "description": "Achats, contrats, gestion des fournisseurs, appels d'offres"},
        {"name": "Ventes",                      "description": "Développement des affaires, gestion des comptes, prévisions"},
        {"name": "Marketing",                   "description": "Marketing numérique, publicité, communication, réseaux sociaux"},
        {"name": "Service à la clientèle",      "description": "Centre d'appels, support client, gestion des plaintes"},
        {"name": "Juridique",                   "description": "Affaires juridiques, conformité, protection des données"},
        {"name": "Gestion de projet",           "description": "PMO, gestion de portefeuille, Agile"},
        {"name": "Logistique",                  "description": "Transport, distribution, chaîne d'approvisionnement"},
    ],
    "hopital": [
        {"name": "Administration hospitalière", "description": "Direction générale, gouvernance, planification stratégique"},
        {"name": "Direction médicale",          "description": "Médecine, gestion des actes, protocoles cliniques"},
        {"name": "Soins infirmiers",            "description": "Soins aux patients, gestion des équipes infirmières"},
        {"name": "Pharmacie",                   "description": "Gestion des médicaments, pharmacovigilance"},
        {"name": "Laboratoires",                "description": "Analyses biologiques, microbiologie, hématologie"},
        {"name": "Imagerie médicale",           "description": "Radiologie, scanner, IRM, échographie"},
        {"name": "Archives médicales",          "description": "Dossiers patients, gestion documentaire"},
        {"name": "Technologies de l'information", "description": "Systèmes cliniques, cybersécurité, infrastructure"},
        {"name": "Ressources Humaines",         "description": "Recrutement médical, formation, gestion des horaires"},
        {"name": "Finances",                    "description": "Budget hospitalier, facturation, approvisionnement"},
        {"name": "Approvisionnement médical",   "description": "Équipements, fournitures médicales, contrats"},
        {"name": "Service aux patients",        "description": "Accueil, admission, gestion des rendez-vous"},
    ],
    "municipalite": [
        {"name": "Direction générale",          "description": "Bureau du directeur général, gouvernance, gestion du changement"},
        {"name": "Finances municipales",        "description": "Budget municipal, taxes, comptes fournisseurs, trésorerie"},
        {"name": "Ressources Humaines",         "description": "Recrutement, rémunération, formation, relations de travail"},
        {"name": "Technologies de l'information", "description": "Infrastructure, cybersécurité, services numériques aux citoyens"},
        {"name": "Urbanisme et développement",  "description": "Permis, zonage, planification territoriale"},
        {"name": "Travaux publics",             "description": "Voirie, eau, égouts, parcs, gestion des actifs"},
        {"name": "Sécurité publique",           "description": "Police, pompiers, urgences, prévention"},
        {"name": "Service aux citoyens",        "description": "Guichet unique, communications, plaintes"},
        {"name": "Greffe municipal",            "description": "Conseil municipal, règlements, archives"},
        {"name": "Gestion des actifs",          "description": "Immobilier, flottes, équipements, maintenance"},
        {"name": "Environnement",               "description": "Collecte des déchets, développement durable, énergie"},
        {"name": "Culture et loisirs",          "description": "Bibliothèques, sports, événements, arts"},
    ],
    "universite": [
        {"name": "Rectorat",                    "description": "Recteur, vice-recteurs, planification institutionnelle"},
        {"name": "Affaires académiques",        "description": "Doyens, programmes, qualité académique"},
        {"name": "Admission et registraire",    "description": "Admissions, gestion des dossiers étudiants, diplomation"},
        {"name": "Finances",                    "description": "Budget, comptabilité, subventions, bourses"},
        {"name": "Ressources Humaines",         "description": "Recrutement professoral, conventions collectives"},
        {"name": "Technologies de l'information", "description": "Infrastructure, LMS, cybersécurité, licences logicielles"},
        {"name": "Bibliothèques et archives",   "description": "Collections, accès aux ressources, archives institutionnelles"},
        {"name": "Recherche et innovation",     "description": "Subventions, partenariats, propriété intellectuelle"},
        {"name": "Relations internationales",   "description": "Échanges étudiants, partenariats étrangers"},
        {"name": "Services aux étudiants",      "description": "Aide financière, counseling, vie étudiante"},
        {"name": "Développement institutionnel","description": "Philanthropie, relations avec les diplômés"},
        {"name": "Approvisionnement",           "description": "Achats, contrats, gestion des fournisseurs"},
    ],
}

ORG_TYPE_LABELS = {
    "entreprise":    "Entreprise privée",
    "hopital":       "Hôpital / Centre de santé",
    "municipalite":  "Municipalité",
    "universite":    "Université / Établissement d'enseignement",
}

# ── Configuration des tableaux de bord par type de département ───────────────
DEPT_TYPE_CONFIG: dict[str, dict] = {
    "finance": {
        "label": "Finance / Comptabilité", "icon": "💰", "color": "#16a34a",
        "kpis": ["budget_used", "budget_forecast_gap", "contracts_expiring_60", "contracts_savings"],
        "primary_tab": "parc-it", "primary_subtab": "budget",
    },
    "hr": {
        "label": "Ressources Humaines", "icon": "👥", "color": "#7c3aed",
        "kpis": ["manual_hours", "automation_potential", "hr_savings", "processes_count"],
        "primary_tab": "optim", "primary_subtab": "processes",
    },
    "it": {
        "label": "Technologies de l'information", "icon": "💻", "color": "#2563eb",
        "kpis": ["unused_licenses_count", "idle_servers", "unused_apps", "license_savings"],
        "primary_tab": "parc-it", "primary_subtab": "licenses",
    },
    "legal": {
        "label": "Juridique / Conformité", "icon": "⚖️", "color": "#dc2626",
        "kpis": ["contracts_active", "contracts_expiring_30", "contracts_expiring_90", "negotiation_savings"],
        "primary_tab": "optim", "primary_subtab": "contracts",
    },
    "operations": {
        "label": "Opérations", "icon": "⚙️", "color": "#d97706",
        "kpis": ["processes_count", "automatable_hours", "operations_savings", "efficiency_score"],
        "primary_tab": "optim", "primary_subtab": "processes",
    },
    "marketing": {
        "label": "Marketing / Communications", "icon": "📣", "color": "#db2777",
        "kpis": ["apps_count", "duplicate_categories", "unused_apps", "monthly_app_cost"],
        "primary_tab": "parc-it", "primary_subtab": "apps",
    },
    "approvisionnement": {
        "label": "Approvisionnement / Achats", "icon": "🛒", "color": "#0891b2",
        "kpis": ["contracts_active", "contracts_expiring_60", "negotiation_savings", "contracts_savings"],
        "primary_tab": "optim", "primary_subtab": "contracts",
    },
    "direction": {
        "label": "Direction Générale", "icon": "🏛️", "color": "#1e293b",
        "kpis": ["efficiency_score", "total_savings", "top_opportunity_savings", "monthly_spend"],
        "primary_tab": "optim", "primary_subtab": "dashboard",
    },
    "general": {
        "label": "Général", "icon": "📊", "color": "#64748b",
        "kpis": ["efficiency_score", "total_savings", "unused_licenses_count", "contracts_expiring_60"],
        "primary_tab": "optim", "primary_subtab": "dashboard",
    },
}


class DeptPayload(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    description: str | None = None
    annual_budget: float = 0
    currency: str = "CAD"
    dept_type: str = "general"


class AddMemberPayload(BaseModel):
    user_id: str
    role: str = Field("member", pattern="^(member|manager)$")


@router.get("/dashboard")
def dept_dashboard(user: CurrentUser = Depends(require_min_role("user"))):
    """Tableau de bord personnalisé selon le type de département de l'utilisateur."""
    try:
        sb = service_client()
        org_id = user.organization_id

        # Trouve le département principal de l'utilisateur
        dept_type, dept_name, dept_id = "general", None, None
        if not user.is_service_account:
            try:
                dm = sb.table("department_members").select("department_id").eq("user_id", user.id).limit(1).execute()
                if dm.data:
                    dept_id = dm.data[0]["department_id"]
                    row = sb.table("departments").select("name, dept_type").eq("id", dept_id).limit(1).execute()
                    if row.data:
                        dept_name = row.data[0].get("name")
                        dept_type = row.data[0].get("dept_type") or "general"
            except Exception:
                pass  # tables pas encore créées → vue générale

        # Admins/owners sans département → vue direction
        is_admin = ROLE_RANK.get(user.role, 0) >= 3 or user.is_service_account
        if is_admin and not dept_id:
            dept_type = "direction"

        cfg  = DEPT_TYPE_CONFIG.get(dept_type, DEPT_TYPE_CONFIG["general"])
        kpis = _build_kpis(sb, org_id, dept_id, cfg["kpis"])

        return {
            "dept_type":    dept_type,
            "dept_name":    dept_name,
            "icon":         cfg["icon"],
            "label":        cfg["label"],
            "color":        cfg["color"],
            "primary_tab":     cfg["primary_tab"],
            "primary_subtab":  cfg["primary_subtab"],
            "kpis": kpis,
        }
    except Exception:
        # Si les tables n'existent pas encore, retourner un dashboard vide
        return {"dept_type": "general", "dept_name": None, "icon": "📊",
                "label": "Tableau de bord", "color": "#818CF8",
                "primary_tab": "optim", "primary_subtab": "dashboard", "kpis": []}


def _q(sb, table: str, org_id: str, dept_id: str | None):
    """Retourne un query builder filtré par org et optionnellement par département."""
    q = sb.table(table).select("*").eq("organization_id", org_id)
    if dept_id:
        q = q.eq("department_id", dept_id)
    return q


def _build_kpis(sb, org_id: str, dept_id: str | None, kpi_keys: list[str]) -> list[dict]:
    from datetime import date, timedelta

    today   = date.today()
    result  = []
    cache: dict = {}

    def _apps():
        if "apps" not in cache:
            cache["apps"] = _q(sb, "it_applications", org_id, dept_id).execute().data or []
        return cache["apps"]

    def _lics():
        if "lics" not in cache:
            cache["lics"] = _q(sb, "licenses", org_id, dept_id).execute().data or []
        return cache["lics"]

    def _srvs():
        if "srvs" not in cache:
            cache["srvs"] = _q(sb, "servers", org_id, dept_id).execute().data or []
        return cache["srvs"]

    def _procs():
        if "procs" not in cache:
            try: cache["procs"] = _q(sb, "workforce_processes", org_id, dept_id).execute().data or []
            except Exception: cache["procs"] = []
        return cache["procs"]

    def _contracts():
        if "contracts" not in cache:
            try: cache["contracts"] = _q(sb, "contracts", org_id, dept_id).execute().data or []
            except Exception: cache["contracts"] = []
        return cache["contracts"]

    def _budget():
        if "budget" not in cache:
            cache["budget"] = _q(sb, "budget_entries", org_id, dept_id).eq("year", today.year).execute().data or []
        return cache["budget"]

    for key in kpi_keys:
        try:
            if key == "budget_used":
                b = _budget()
                alloc = sum(float(x.get("allocated") or 0) for x in b)
                actual = sum(float(x.get("actual") or 0) for x in b)
                pct = round(actual / alloc * 100) if alloc > 0 else 0
                result.append({"key": key, "label": "Budget utilisé", "value": f"{pct}%",
                    "sub": f"{actual:,.0f} / {alloc:,.0f} $", "icon": "📊", "color": "#16a34a" if pct < 85 else "#dc2626"})

            elif key == "budget_forecast_gap":
                b = _budget()
                alloc = sum(float(x.get("allocated") or 0) for x in b)
                actual = sum(float(x.get("actual") or 0) for x in b)
                gap = alloc - actual
                result.append({"key": key, "label": "Marge budgétaire", "value": f"{gap:,.0f} $",
                    "sub": "restant sur l'année", "icon": "📈", "color": "#16a34a" if gap >= 0 else "#dc2626"})

            elif key == "contracts_expiring_60":
                c60 = [c for c in _contracts() if c.get("renewal_date") and
                       today <= date.fromisoformat(c["renewal_date"]) <= today + timedelta(days=60)]
                result.append({"key": key, "label": "Contrats (<60j)", "value": str(len(c60)),
                    "sub": "à renouveler bientôt", "icon": "📄", "color": "#dc2626" if c60 else "#16a34a"})

            elif key == "contracts_expiring_30":
                c30 = [c for c in _contracts() if c.get("renewal_date") and
                       today <= date.fromisoformat(c["renewal_date"]) <= today + timedelta(days=30)]
                result.append({"key": key, "label": "Contrats critiques (<30j)", "value": str(len(c30)),
                    "sub": "renouvellement urgent", "icon": "⚠️", "color": "#dc2626" if c30 else "#16a34a"})

            elif key == "contracts_expiring_90":
                c90 = [c for c in _contracts() if c.get("renewal_date") and
                       today <= date.fromisoformat(c["renewal_date"]) <= today + timedelta(days=90)]
                result.append({"key": key, "label": "Contrats (<90j)", "value": str(len(c90)),
                    "sub": "à planifier", "icon": "📋", "color": "#d97706" if c90 else "#16a34a"})

            elif key == "contracts_active":
                active = [c for c in _contracts() if c.get("status") == "active"]
                result.append({"key": key, "label": "Contrats actifs", "value": str(len(active)),
                    "sub": "en cours", "icon": "✅", "color": "#2563eb"})

            elif key == "contracts_savings":
                savings = sum(float(c.get("annual_value") or 0) * float(c.get("negotiation_potential") or 0) / 100
                              for c in _contracts())
                result.append({"key": key, "label": "Économies contrats", "value": f"{savings:,.0f} $",
                    "sub": "potentiel / an", "icon": "💡", "color": "#16a34a"})

            elif key == "negotiation_savings":
                savings = sum(float(c.get("annual_value") or 0) * float(c.get("negotiation_potential") or 0) / 100
                              for c in _contracts() if c.get("status") == "active")
                result.append({"key": key, "label": "Potentiel négociation", "value": f"{savings:,.0f} $",
                    "sub": "sur contrats actifs", "icon": "🤝", "color": "#16a34a"})

            elif key == "unused_licenses_count":
                under = [l for l in _lics()
                         if (int(l.get("quantity") or 0)) > 0 and
                            (int(l.get("assigned_count") or 0) / int(l.get("quantity") or 1)) < 0.8]
                result.append({"key": key, "label": "Licences sous-utilisées", "value": str(len(under)),
                    "sub": "< 80% utilisation", "icon": "🔑", "color": "#dc2626" if under else "#16a34a"})

            elif key == "license_savings":
                savings = 0.0
                for l in _lics():
                    qty = int(l.get("quantity") or 0); asgn = int(l.get("assigned_count") or 0)
                    cost = float(l.get("cost_per_unit") or 0)
                    if qty > 0 and cost > 0 and asgn / qty < 0.8:
                        mul = 12 if l.get("billing_cycle") == "monthly" else 1
                        savings += (qty - asgn) * cost * mul
                result.append({"key": key, "label": "Économies licences", "value": f"{savings:,.0f} $",
                    "sub": "potentiel annuel", "icon": "💰", "color": "#16a34a"})

            elif key == "idle_servers":
                idle = [s for s in _srvs() if s.get("status") in ("idle", "to_decommission")]
                result.append({"key": key, "label": "Serveurs inactifs", "value": str(len(idle)),
                    "sub": "à décommissionner", "icon": "🖥️", "color": "#dc2626" if idle else "#16a34a"})

            elif key == "unused_apps":
                unused = [a for a in _apps() if a.get("status") == "unused"]
                result.append({"key": key, "label": "Applications inutilisées", "value": str(len(unused)),
                    "sub": "à analyser", "icon": "📱", "color": "#d97706" if unused else "#16a34a"})

            elif key == "apps_count":
                active = [a for a in _apps() if a.get("status") != "decommissioned"]
                result.append({"key": key, "label": "Applications actives", "value": str(len(active)),
                    "sub": "en production", "icon": "🖥️", "color": "#2563eb"})

            elif key == "monthly_app_cost":
                cost = sum(float(a.get("monthly_cost") or 0) for a in _apps() if a.get("status") != "decommissioned")
                result.append({"key": key, "label": "Coût apps/mois", "value": f"{cost:,.0f} $",
                    "sub": "coût mensuel total", "icon": "💳", "color": "#2563eb"})

            elif key == "duplicate_categories":
                from collections import Counter
                cats = Counter((a.get("category") or "autre").lower()
                                for a in _apps() if a.get("status") != "decommissioned")
                dups = sum(1 for c in cats.values() if c >= 2)
                result.append({"key": key, "label": "Catégories en doublon", "value": str(dups),
                    "sub": "outils redondants", "icon": "🔄", "color": "#dc2626" if dups else "#16a34a"})

            elif key == "manual_hours":
                hours = sum(float(p.get("manual_hours_per_month") or 0) for p in _procs())
                result.append({"key": key, "label": "Heures manuelles/mois", "value": f"{hours:,.0f}h",
                    "sub": "travail répétitif", "icon": "⏱️", "color": "#d97706" if hours > 100 else "#16a34a"})

            elif key == "automation_potential":
                procs = _procs()
                avg = (sum(float(p.get("automation_potential") or 0) for p in procs) / len(procs)) if procs else 0
                result.append({"key": key, "label": "Potentiel automation", "value": f"{avg:.0f}%",
                    "sub": "des processus RH", "icon": "🤖", "color": "#16a34a" if avg >= 50 else "#d97706"})

            elif key == "hr_savings":
                savings = sum(float(p.get("manual_hours_per_month") or 0) *
                              float(p.get("automation_potential") or 0) / 100 *
                              float(p.get("hourly_cost") or 50) * 12
                              for p in _procs())
                result.append({"key": key, "label": "Économies RH/an", "value": f"{savings:,.0f} $",
                    "sub": "via automatisation", "icon": "💰", "color": "#16a34a"})

            elif key == "operations_savings":
                savings = sum(float(p.get("manual_hours_per_month") or 0) *
                              float(p.get("automation_potential") or 0) / 100 *
                              float(p.get("hourly_cost") or 50) * 12
                              for p in _procs())
                result.append({"key": key, "label": "Économies opérations", "value": f"{savings:,.0f} $",
                    "sub": "potentiel annuel", "icon": "⚡", "color": "#16a34a"})

            elif key == "processes_count":
                manual = [p for p in _procs() if p.get("status") != "automated"]
                result.append({"key": key, "label": "Processus manuels", "value": str(len(manual)),
                    "sub": "à optimiser", "icon": "📋", "color": "#d97706" if manual else "#16a34a"})

            elif key == "automatable_hours":
                hours = sum(float(p.get("manual_hours_per_month") or 0) *
                            float(p.get("automation_potential") or 0) / 100
                            for p in _procs())
                result.append({"key": key, "label": "H. automatisables/mois", "value": f"{hours:.0f}h",
                    "sub": "libérables", "icon": "🔓", "color": "#16a34a"})

            elif key == "efficiency_score":
                apps = sb.table("it_applications").select("status, monthly_cost").eq("organization_id", org_id).execute().data or []
                lics = sb.table("licenses").select("quantity, assigned_count").eq("organization_id", org_id).execute().data or []
                tot_app = sum(float(a.get("monthly_cost") or 0) for a in apps if a.get("status") != "decommissioned")
                usd_app = sum(float(a.get("monthly_cost") or 0) for a in apps if a.get("status") == "unused")
                sw = max(0, 100 - (usd_app / tot_app * 100 if tot_app > 0 else 0))
                tot_s = sum(int(l.get("quantity") or 0) for l in lics)
                usd_s = sum(int(l.get("assigned_count") or 0) for l in lics)
                lic = (usd_s / tot_s * 100) if tot_s > 0 else 80
                score = round((sw * 0.5 + lic * 0.5), 1)
                color = "#16a34a" if score >= 80 else "#d97706" if score >= 60 else "#dc2626"
                result.append({"key": key, "label": "Score d'efficacité", "value": f"{score:.0f}%",
                    "sub": "santé organisationnelle", "icon": "🎯", "color": color})

            elif key == "total_savings":
                # Somme rapide de toutes les opportunités
                lic_s = sum(
                    (int(l.get("quantity") or 0) - int(l.get("assigned_count") or 0)) *
                    float(l.get("cost_per_unit") or 0) *
                    (12 if l.get("billing_cycle") == "monthly" else 1)
                    for l in _lics()
                    if int(l.get("quantity") or 0) > 0 and
                       int(l.get("assigned_count") or 0) / int(l.get("quantity") or 1) < 0.8
                )
                proc_s = sum(
                    float(p.get("manual_hours_per_month") or 0) *
                    float(p.get("automation_potential") or 0) / 100 *
                    float(p.get("hourly_cost") or 50) * 12
                    for p in _procs()
                )
                cont_s = sum(
                    float(c.get("annual_value") or 0) * float(c.get("negotiation_potential") or 0) / 100
                    for c in _contracts()
                )
                total = lic_s + proc_s + cont_s
                result.append({"key": key, "label": "Économies totales", "value": f"{total:,.0f} $",
                    "sub": "potentiel identifié / an", "icon": "💎", "color": "#16a34a"})

            elif key == "top_opportunity_savings":
                opps = []
                for l in _lics():
                    qty = int(l.get("quantity") or 0); asgn = int(l.get("assigned_count") or 0)
                    cost = float(l.get("cost_per_unit") or 0)
                    if qty > 0 and cost > 0 and asgn / qty < 0.8:
                        mul = 12 if l.get("billing_cycle") == "monthly" else 1
                        opps.append((qty - asgn) * cost * mul)
                for p in _procs():
                    opps.append(float(p.get("manual_hours_per_month") or 0) *
                                float(p.get("automation_potential") or 0) / 100 *
                                float(p.get("hourly_cost") or 50) * 12)
                top = max(opps, default=0)
                result.append({"key": key, "label": "Meilleure opportunité", "value": f"{top:,.0f} $",
                    "sub": "économie unitaire max / an", "icon": "🏆", "color": "#16a34a"})

            elif key == "monthly_spend":
                apps = _apps()
                spend = sum(float(a.get("monthly_cost") or 0) for a in apps if a.get("status") != "decommissioned")
                result.append({"key": key, "label": "Dépenses IT/mois", "value": f"{spend:,.0f} $",
                    "sub": "coût applicatif mensuel", "icon": "📉", "color": "#2563eb"})

        except Exception:
            pass  # KPI individuel indisponible — on continue

    return result


@router.get("/templates")
def get_templates(
    org_type: str = Query(default="entreprise"),
    _user: CurrentUser = Depends(require_min_role("user")),
):
    """Retourne la liste des départements prédéfinis pour un type d'organisation."""
    tmpl = DEPT_TEMPLATES.get(org_type, DEPT_TEMPLATES["entreprise"])
    return {"org_type": org_type, "label": ORG_TYPE_LABELS.get(org_type, org_type), "departments": tmpl}


@router.post("/initialize", status_code=201)
def initialize_departments(
    org_type: str = Query(default="entreprise"),
    user: CurrentUser = Depends(require_min_role("admin")),
):
    """Crée en masse les départements prédéfinis pour le type d'organisation sélectionné."""
    tmpl = DEPT_TEMPLATES.get(org_type, DEPT_TEMPLATES["entreprise"])
    sb = service_client()

    # Mise à jour du type d'org (colonne optionnelle — phase11)
    try:
        sb.table("organizations").update({"org_type": org_type}).eq("id", user.organization_id).execute()
    except Exception:
        pass

    # Évite les doublons : noms déjà existants
    existing = sb.table("departments").select("name").eq("organization_id", user.organization_id).execute()
    existing_names = {r["name"].lower() for r in (existing.data or [])}

    created = []
    for dept in tmpl:
        if dept["name"].lower() in existing_names:
            continue
        res = sb.table("departments").insert({
            "organization_id": user.organization_id,
            "name":            dept["name"],
            "description":     dept.get("description"),
            "annual_budget":   0,
            "currency":        "CAD",
        }).execute()
        created.append(res.data[0])

    return {"created": len(created), "skipped": len(tmpl) - len(created), "departments": created}


@router.get("")
def list_departments(user: CurrentUser = Depends(require_min_role("user"))):
    sb = service_client()
    q = (
        sb.table("departments")
        .select("*")
        .eq("organization_id", user.organization_id)
        .order("name")
    )

    is_admin = ROLE_RANK.get(user.role, 0) >= 3 or user.is_service_account
    if not is_admin:
        dm = sb.table("department_members").select("department_id").eq("user_id", user.id).execute()
        ids = [r["department_id"] for r in (dm.data or [])]
        if not ids:
            return []
        q = q.in_("id", ids)

    res = q.execute()
    depts = res.data or []

    for d in depts:
        cnt = sb.table("department_members").select("user_id", count="exact").eq("department_id", d["id"]).execute()
        d["member_count"] = cnt.count or 0

    return depts


@router.post("", status_code=201)
def create_department(
    payload: DeptPayload,
    user: CurrentUser = Depends(require_min_role("admin")),
):
    sb = service_client()
    try:
        res = sb.table("departments").insert({
            "organization_id": user.organization_id,
            "name": payload.name,
            "description": payload.description,
            "annual_budget": payload.annual_budget,
            "currency": payload.currency,
            "dept_type": payload.dept_type,
        }).execute()
        return res.data[0]
    except Exception as ex:
        msg = str(ex)
        if "does not exist" in msg or "relation" in msg:
            raise HTTPException(422, "Tables manquantes — exécutez phase9_enterprise.sql dans Supabase SQL Editor.")
        raise HTTPException(500, msg)


@router.patch("/{dept_id}")
def update_department(
    dept_id: str,
    payload: DeptPayload,
    user: CurrentUser = Depends(require_min_role("admin")),
):
    sb = service_client()
    _dept_or_404(sb, dept_id, user.organization_id)
    res = sb.table("departments").update({
        "name": payload.name,
        "description": payload.description,
        "annual_budget": payload.annual_budget,
        "currency": payload.currency,
        "dept_type": payload.dept_type,
    }).eq("id", dept_id).execute()
    return res.data[0]


@router.delete("/{dept_id}", status_code=204)
def delete_department(
    dept_id: str,
    user: CurrentUser = Depends(require_min_role("owner")),
):
    sb = service_client()
    _dept_or_404(sb, dept_id, user.organization_id)
    sb.table("departments").delete().eq("id", dept_id).execute()


@router.get("/{dept_id}/members")
def list_dept_members(
    dept_id: str,
    user: CurrentUser = Depends(require_min_role("admin")),
):
    sb = service_client()
    _dept_or_404(sb, dept_id, user.organization_id)
    res = (
        sb.table("department_members")
        .select("*, users(id, full_name, email, role)")
        .eq("department_id", dept_id)
        .execute()
    )
    return res.data or []


@router.post("/{dept_id}/members", status_code=201)
def add_dept_member(
    dept_id: str,
    payload: AddMemberPayload,
    user: CurrentUser = Depends(require_min_role("admin")),
):
    sb = service_client()
    _dept_or_404(sb, dept_id, user.organization_id)

    check = sb.table("users").select("organization_id").eq("id", payload.user_id).limit(1).execute()
    rows = check.data or []
    if not rows or rows[0].get("organization_id") != user.organization_id:
        raise HTTPException(status_code=400, detail="Utilisateur introuvable dans cette organisation.")

    res = sb.table("department_members").upsert({
        "user_id": payload.user_id,
        "department_id": dept_id,
        "role": payload.role,
    }).execute()
    return res.data[0]


@router.delete("/{dept_id}/members/{member_id}", status_code=204)
def remove_dept_member(
    dept_id: str,
    member_id: str,
    user: CurrentUser = Depends(require_min_role("admin")),
):
    sb = service_client()
    _dept_or_404(sb, dept_id, user.organization_id)
    sb.table("department_members").delete().eq("department_id", dept_id).eq("user_id", member_id).execute()


def _dept_or_404(sb, dept_id: str, organization_id: str) -> dict:
    res = (
        sb.table("departments")
        .select("id")
        .eq("id", dept_id)
        .eq("organization_id", organization_id)
        .limit(1)
        .execute()
    )
    if not (res.data or []):
        raise HTTPException(status_code=404, detail="Département introuvable.")
    return res.data[0]
