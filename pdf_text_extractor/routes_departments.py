from __future__ import annotations

import json as _json

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field

from auth import CurrentUser
from rbac import ROLE_RANK, require_min_role
from db import get_db, rows, row

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
    "entrepreneur": [
        {"name": "Direction & Stratégie",       "description": "Vision, développement d'affaires, partenariats, gouvernance"},
        {"name": "Finances",                    "description": "Comptabilité, facturation, gestion de trésorerie, fiscalité"},
        {"name": "Ventes",                      "description": "Acquisition clients, pipeline, propositions commerciales"},
        {"name": "Marketing & Communications",  "description": "Présence en ligne, contenu, réseaux sociaux, réputation"},
        {"name": "Opérations",                  "description": "Livraison de services, gestion des mandats, qualité"},
        {"name": "Service client",              "description": "Satisfaction, fidélisation, suivi clients, renouvellements"},
    ],
    "pme": [
        {"name": "Direction Générale",          "description": "Stratégie, gouvernance, planification, gestion du changement"},
        {"name": "Finances & Comptabilité",     "description": "Comptabilité, trésorerie, paie, rapports financiers"},
        {"name": "Ressources Humaines",         "description": "Recrutement, formation, avantages sociaux, relations travail"},
        {"name": "Technologies de l'information", "description": "Support TI, cybersécurité, outils numériques, licences"},
        {"name": "Ventes & Développement",      "description": "Prospection, devis, comptes clients, prévisions"},
        {"name": "Marketing & Communications",  "description": "Publicité, réseaux sociaux, image de marque, campagnes"},
        {"name": "Service à la clientèle",      "description": "Support, satisfaction client, gestion des plaintes"},
        {"name": "Approvisionnement",           "description": "Fournisseurs, achats, contrats, appels d'offres"},
        {"name": "Juridique & Conformité",      "description": "Contrats, protection des données, conformité réglementaire"},
        {"name": "Gestion de projet",           "description": "Coordination des mandats, livrables, PMO"},
        {"name": "Logistique",                  "description": "Distribution, chaîne d'approvisionnement, expédition"},
        {"name": "Administration",              "description": "Gestion administrative, secrétariat, archivage"},
    ],
    "pmi": [
        {"name": "Direction Générale",          "description": "Stratégie industrielle, gouvernance, performance globale"},
        {"name": "Production",                  "description": "Planification, ordonnancement, rendement, capacité"},
        {"name": "Contrôle qualité",            "description": "Normes ISO, inspections, non-conformités, certifications"},
        {"name": "Maintenance",                 "description": "Équipements, entretien préventif, sécurité industrielle"},
        {"name": "Approvisionnement",           "description": "Matières premières, fournisseurs, gestion des stocks"},
        {"name": "Logistique & Distribution",   "description": "Expédition, transport, entrepôts, gestion des stocks finis"},
        {"name": "Ressources Humaines",         "description": "Main-d'œuvre, formation, conventions collectives"},
        {"name": "Finances",                    "description": "Coûts de production, budget, rentabilité, trésorerie"},
        {"name": "Technologies de l'information", "description": "Automatisation, ERP, systèmes industriels, cybersécurité"},
        {"name": "Ventes & Commerce",           "description": "Clients industriels, devis, contrats de fourniture"},
        {"name": "Recherche & Développement",   "description": "Innovation produit, prototypes, amélioration process"},
        {"name": "Environnement & Conformité",  "description": "Normes environnementales, sécurité, certifications réglementaires"},
    ],
}

ORG_TYPE_LABELS = {
    "entreprise":    "Entreprise privée",
    "hopital":       "Hôpital / Centre de santé",
    "municipalite":  "Municipalité",
    "universite":    "Université / Établissement d'enseignement",
    "entrepreneur":  "Entrepreneur / Micro-entreprise",
    "pme":           "PME — Petite et Moyenne Entreprise",
    "pmi":           "PMI — Petite et Moyenne Industrie",
}

# ── Configuration des tableaux de bord par type de département ───────────────
DEPT_TYPE_CONFIG: dict[str, dict] = {
    "finance": {
        "label": "Finance / Comptabilité", "icon": "💰", "color": "#16a34a",
        "kpis": ["budget_used", "budget_forecast_gap", "contracts_expiring_60", "contracts_savings"],
        "primary_tab": "optim", "primary_subtab": "licenses",
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
    # ── Types supplémentaires ────────────────────────────────────────────────
    "comptabilite": {
        "label": "Comptabilité", "icon": "🧾", "color": "#0f766e",
        "kpis": ["budget_used", "budget_forecast_gap", "contracts_expiring_60", "contracts_savings"],
        "primary_tab": "optim", "primary_subtab": "licenses",
    },
    "sales": {
        "label": "Ventes / Commerciaux", "icon": "💼", "color": "#ea580c",
        "kpis": ["contracts_active", "negotiation_savings", "contracts_expiring_90", "efficiency_score"],
        "primary_tab": "optim", "primary_subtab": "contracts",
    },
    "support": {
        "label": "Support client", "icon": "🎧", "color": "#0891b2",
        "kpis": ["processes_count", "automatable_hours", "efficiency_score", "unused_apps"],
        "primary_tab": "optim", "primary_subtab": "processes",
    },
    "rd": {
        "label": "R&D", "icon": "🔬", "color": "#7c3aed",
        "kpis": ["apps_count", "monthly_app_cost", "unused_licenses_count", "contracts_active"],
        "primary_tab": "optim", "primary_subtab": "licenses",
    },
    "qualite": {
        "label": "Assurance qualité", "icon": "✅", "color": "#16a34a",
        "kpis": ["processes_count", "automatable_hours", "contracts_active", "efficiency_score"],
        "primary_tab": "optim", "primary_subtab": "processes",
    },
    "digitalisation": {
        "label": "Digitalisation", "icon": "⚡", "color": "#818CF8",
        "kpis": ["apps_count", "unused_apps", "monthly_app_cost", "license_savings"],
        "primary_tab": "optim", "primary_subtab": "licenses",
    },
    "logistique": {
        "label": "Logistique", "icon": "🚚", "color": "#92400e",
        "kpis": ["contracts_active", "contracts_expiring_60", "negotiation_savings", "efficiency_score"],
        "primary_tab": "optim", "primary_subtab": "contracts",
    },
    "audit": {
        "label": "Audit & Forensique TI", "icon": "🔍", "color": "#1e293b",
        "kpis": ["contracts_active", "contracts_expiring_90", "efficiency_score", "unused_licenses_count"],
        "primary_tab": "optim", "primary_subtab": "dashboard",
    },
    "compliance": {
        "label": "Conformité", "icon": "🛡️", "color": "#0369a1",
        "kpis": ["contracts_active", "contracts_expiring_30", "contracts_expiring_60", "contracts_savings"],
        "primary_tab": "optim", "primary_subtab": "contracts",
    },
    "communication": {
        "label": "Communication", "icon": "📢", "color": "#db2777",
        "kpis": ["apps_count", "monthly_app_cost", "duplicate_categories", "unused_apps"],
        "primary_tab": "optim", "primary_subtab": "licenses",
    },
    "manufacturing": {
        "label": "Fabrication / Production", "icon": "🏭", "color": "#c8102e",
        "kpis": ["processes_count", "automatable_hours", "contracts_active", "efficiency_score"],
        "primary_tab": "optim", "primary_subtab": "processes",
    },
    # ── Santé ────────────────────────────────────────────────────────────────
    "admin_hospitalier": {
        "label": "Administration hospitalière", "icon": "🏥", "color": "#9333ea",
        "kpis": ["budget_used", "budget_forecast_gap", "contracts_active", "contracts_expiring_60"],
        "primary_tab": "optim", "primary_subtab": "dashboard",
    },
    "direction_medicale": {
        "label": "Direction médicale", "icon": "🩺", "color": "#0891b2",
        "kpis": ["processes_count", "automatable_hours", "efficiency_score", "budget_used"],
        "primary_tab": "optim", "primary_subtab": "processes",
    },
    "soins_infirmiers": {
        "label": "Soins infirmiers", "icon": "💊", "color": "#16a34a",
        "kpis": ["processes_count", "automatable_hours", "hr_savings", "efficiency_score"],
        "primary_tab": "optim", "primary_subtab": "processes",
    },
    "pharmacie": {
        "label": "Pharmacie", "icon": "💉", "color": "#7c3aed",
        "kpis": ["apps_count", "contracts_active", "contracts_expiring_60", "budget_used"],
        "primary_tab": "optim", "primary_subtab": "licenses",
    },
    "laboratoires": {
        "label": "Laboratoires", "icon": "🔬", "color": "#2563eb",
        "kpis": ["apps_count", "unused_licenses_count", "contracts_active", "budget_used"],
        "primary_tab": "optim", "primary_subtab": "licenses",
    },
    "imagerie": {
        "label": "Imagerie médicale", "icon": "🖥️", "color": "#d97706",
        "kpis": ["apps_count", "monthly_app_cost", "contracts_active", "budget_used"],
        "primary_tab": "optim", "primary_subtab": "licenses",
    },
    "service_patients": {
        "label": "Service aux patients", "icon": "🛏️", "color": "#0891b2",
        "kpis": ["processes_count", "automatable_hours", "efficiency_score", "contracts_active"],
        "primary_tab": "optim", "primary_subtab": "processes",
    },
    "appro_medical": {
        "label": "Approvisionnement médical", "icon": "📦", "color": "#dc2626",
        "kpis": ["contracts_active", "contracts_expiring_60", "negotiation_savings", "contracts_savings"],
        "primary_tab": "optim", "primary_subtab": "contracts",
    },
    "archives_medicales": {
        "label": "Archives médicales", "icon": "📁", "color": "#92400e",
        "kpis": ["processes_count", "automatable_hours", "contracts_active", "efficiency_score"],
        "primary_tab": "optim", "primary_subtab": "processes",
    },
}


# ── Contrôle d'accès par niveau hiérarchique ─────────────────────────────────
# Niveau 1 : Direction Générale  → accès total
# Niveau 2 : VP / Directeur Exécutif → accès total
# Niveau 3 : Directeur de Département → tout le département
# Niveau 4 : Gestionnaire / Chef d'équipe → opérationnel + budget consommé
# Niveau 5 : Superviseur → opérationnel uniquement
# Niveau 6 : Employé → opérationnel uniquement

# KPIs masqués pour niveau 4 (Gestionnaire) : pas de projections ni savings $
_LEVEL4_HIDDEN: frozenset[str] = frozenset({
    "contracts_savings", "negotiation_savings", "license_savings",
    "total_savings", "top_opportunity_savings", "hr_savings",
    "operations_savings", "budget_forecast_gap", "monthly_spend", "monthly_app_cost",
})

# KPIs masqués pour niveaux 5-6 : tout ce qui contient des montants $
_LEVEL56_HIDDEN: frozenset[str] = _LEVEL4_HIDDEN | frozenset({"budget_used"})


def _member_level(user_id: str, dept_id: str) -> int:
    """Retourne le hierarchy_level du membre dans le département (1-6). 6 si absent."""
    try:
        with get_db() as cur:
            cur.execute(
                "SELECT hierarchy_level FROM department_members WHERE user_id = %s AND department_id = %s LIMIT 1",
                (user_id, dept_id),
            )
            r = row(cur)
        lvl = r.get("hierarchy_level") if r else None
        return int(lvl) if lvl and 1 <= int(lvl) <= 6 else 6
    except Exception:
        return 6


def _cross_org_level(user_id: str, org_id: str) -> int | None:
    """Retourne le niveau hiérarchique si l'utilisateur est dans un dept cross-org ET niveau <= 3.
    Niveaux 4-6 = opérationnel → pas de visibilité cross-org, retourne None."""
    try:
        with get_db() as cur:
            cur.execute(
                """SELECT dm.hierarchy_level
                   FROM department_members dm
                   JOIN departments d ON d.id = dm.department_id
                   WHERE dm.user_id = %s AND d.organization_id = %s
                     AND d.dept_type = ANY(%s)
                   ORDER BY dm.hierarchy_level ASC
                   LIMIT 1""",
                (user_id, org_id, list(_CROSS_ORG_DEPT_TYPES)),
            )
            r = row(cur)
        if not r:
            return None
        lvl = r.get("hierarchy_level")
        lvl = int(lvl) if lvl and 1 <= int(lvl) <= 6 else 6
        return lvl if lvl <= 3 else None  # niveaux 4-6 = opérationnel → pas de cross-org
    except Exception:
        return None


def _visible_kpis(kpi_keys: list[str], access_level: int) -> list[str]:
    """Filtre les KPIs selon le niveau hiérarchique effectif."""
    if access_level <= 3:
        return kpi_keys          # Direction / VP / Directeur : tout
    elif access_level == 4:
        return [k for k in kpi_keys if k not in _LEVEL4_HIDDEN]   # Gestionnaire
    else:
        return [k for k in kpi_keys if k not in _LEVEL56_HIDDEN]  # Superviseur / Employé


class DeptPayload(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    description: str | None = None
    annual_budget: float = 0
    currency: str = "CAD"
    dept_type: str = "general"


HIERARCHY_TITLES = [
    "Direction Générale",
    "Vice-président / Directeur Exécutif",
    "Directeur de Département",
    "Gestionnaire / Chef d'équipe",
    "Superviseur",
    "Employé",
]
TITLE_LEVEL: dict[str, int] = {t: i + 1 for i, t in enumerate(HIERARCHY_TITLES)}


class AddMemberPayload(BaseModel):
    user_id: str
    role: str = Field("member", pattern="^(member|manager)$")
    title: str | None = None
    hierarchy_level: int | None = Field(None, ge=1, le=6)


class TitlePayload(BaseModel):
    title: str | None = None
    hierarchy_level: int | None = Field(None, ge=1, le=6)


@router.get("/aggregate")
def dept_aggregate(user: CurrentUser = Depends(require_min_role("user"))):
    """Vue agrégée Direction Générale : résumé des 3 KPIs principaux de chaque département."""
    org_id = user.organization_id
    is_org_admin = ROLE_RANK.get(user.role, 0) >= 3 or user.is_service_account

    access_level = 1 if is_org_admin else (_cross_org_level(user.id, org_id) or 6)
    if access_level > 3:
        raise HTTPException(status_code=403, detail="Accès réservé à la Direction, RH et IT (niveaux 1-3).")

    try:
        with get_db() as cur:
            cur.execute(
                "SELECT * FROM departments WHERE organization_id = %s ORDER BY name",
                (org_id,),
            )
            depts = rows(cur)
    except Exception:
        return []

    result = []
    for dept in depts:
        dept_id   = dept["id"]
        dept_type = dept.get("dept_type") or "general"
        cfg       = DEPT_TYPE_CONFIG.get(dept_type, DEPT_TYPE_CONFIG["general"])

        # Limite à 3 KPIs visibles selon le niveau
        summary_keys = _visible_kpis(cfg["kpis"][:5], access_level)[:3]
        kpis = _build_kpis(org_id, dept_id, summary_keys)

        # Nombre de membres
        try:
            with get_db() as cur:
                cur.execute(
                    "SELECT COUNT(*) AS cnt FROM department_members WHERE department_id = %s",
                    (dept_id,),
                )
                cnt_row = row(cur)
            member_count = cnt_row["cnt"] if cnt_row else 0
        except Exception:
            member_count = 0

        result.append({
            "dept_id":      dept_id,
            "dept_type":    dept_type,
            "dept_name":    dept.get("name"),
            "icon":         cfg["icon"],
            "color":        cfg["color"],
            "label":        cfg["label"],
            "kpis":         kpis,
            "member_count": member_count,
        })

    return result


@router.get("/dashboard")
def dept_dashboard(
    dept_id: str | None = Query(None),
    user: CurrentUser = Depends(require_min_role("user")),
):
    """Tableau de bord personnalisé selon le type de département.

    Si dept_id est fourni (admin visualisant un workspace), retourne le dashboard
    de ce département spécifique. Sinon, retourne le dashboard du département
    principal de l'utilisateur connecté.
    """
    try:
        org_id = user.organization_id

        # Niveau d'accès : admin/owner voit tout — manager dept voit tout — member voit seulement l'opérationnel
        is_org_admin = ROLE_RANK.get(user.role, 0) >= 3 or user.is_service_account

        # Admin visualisant un workspace spécifique depuis la workspace bar
        if dept_id:
            with get_db() as cur:
                cur.execute(
                    "SELECT name, dept_type FROM departments WHERE id = %s AND organization_id = %s LIMIT 1",
                    (dept_id, org_id),
                )
                dept_row = row(cur)
            if not dept_row:
                return {"dept_type": "general", "dept_name": None, "icon": "📊",
                        "label": "Tableau de bord", "color": "#818CF8",
                        "primary_tab": "optim", "primary_subtab": "dashboard", "kpis": []}
            resolved_type = dept_row.get("dept_type") or "general"
            cfg = DEPT_TYPE_CONFIG.get(resolved_type, DEPT_TYPE_CONFIG["general"])
            # Niveau effectif : admin/owner=1 | membre direct=son niveau | cross-org (Direction/RH/IT)=niveau dans leur dept | sinon=6
            if is_org_admin:
                access_level = 1
            else:
                direct_level = _member_level(user.id, dept_id)
                if direct_level < 6:
                    access_level = direct_level          # membre direct de ce dept
                else:
                    cross = _cross_org_level(user.id, org_id)
                    access_level = cross if cross is not None else 6
            kpi_keys = _visible_kpis(cfg["kpis"], access_level)
            kpis = _build_kpis(org_id, dept_id, kpi_keys)
            return {
                "dept_id":        dept_id,
                "dept_type":      resolved_type,
                "dept_name":      dept_row.get("name"),
                "icon":           cfg["icon"],
                "label":          cfg["label"],
                "color":          cfg["color"],
                "primary_tab":    cfg["primary_tab"],
                "primary_subtab": cfg["primary_subtab"],
                "kpis":           kpis,
                "access_level":   access_level,
            }

        # Vue par défaut — département de l'utilisateur connecté
        resolved_type, dept_name, user_dept_id = "general", None, None
        if not user.is_service_account:
            try:
                with get_db() as cur:
                    cur.execute(
                        "SELECT department_id FROM department_members WHERE user_id = %s LIMIT 1",
                        (user.id,),
                    )
                    dm = row(cur)
                if dm:
                    user_dept_id = dm["department_id"]
                    with get_db() as cur:
                        cur.execute(
                            "SELECT name, dept_type FROM departments WHERE id = %s LIMIT 1",
                            (user_dept_id,),
                        )
                        dept_row = row(cur)
                    if dept_row:
                        dept_name = dept_row.get("name")
                        resolved_type = dept_row.get("dept_type") or "general"
            except Exception:
                pass  # tables pas encore créées → vue générale

        # Admins/owners sans département → vue Direction Générale (agrégé)
        if is_org_admin and not user_dept_id:
            resolved_type = "direction"

        cfg = DEPT_TYPE_CONFIG.get(resolved_type, DEPT_TYPE_CONFIG["general"])
        # Niveau effectif : admin/owner=1 | membre de son dept=son niveau | cross-org=niveau dans leur dept
        if is_org_admin:
            access_level = 1
        else:
            direct_level = _member_level(user.id, user_dept_id or "")
            if direct_level < 6:
                access_level = direct_level
            else:
                cross = _cross_org_level(user.id, org_id)
                access_level = cross if cross is not None else 6
        kpi_keys = _visible_kpis(cfg["kpis"], access_level)
        kpis = _build_kpis(org_id, user_dept_id, kpi_keys)

        return {
            "dept_id":        user_dept_id,
            "dept_type":      resolved_type,
            "dept_name":      dept_name,
            "icon":           cfg["icon"],
            "label":          cfg["label"],
            "color":          cfg["color"],
            "primary_tab":    cfg["primary_tab"],
            "primary_subtab": cfg["primary_subtab"],
            "kpis":           kpis,
            "access_level":   access_level,
        }
    except Exception:
        # Si les tables n'existent pas encore, retourner un dashboard vide
        return {"dept_type": "general", "dept_name": None, "icon": "📊",
                "label": "Tableau de bord", "color": "#818CF8",
                "primary_tab": "optim", "primary_subtab": "dashboard", "kpis": []}


def _q_fetch(table: str, org_id: str, dept_id: str | None) -> list[dict]:
    """Exécute un SELECT * filtré par org et optionnellement par département."""
    with get_db() as cur:
        if dept_id:
            cur.execute(
                f"SELECT * FROM {table} WHERE organization_id = %s AND department_id = %s",
                (org_id, dept_id),
            )
        else:
            cur.execute(
                f"SELECT * FROM {table} WHERE organization_id = %s",
                (org_id,),
            )
        return rows(cur)


def _build_kpis(org_id: str, dept_id: str | None, kpi_keys: list[str]) -> list[dict]:
    from datetime import date, timedelta

    today   = date.today()
    result  = []
    cache: dict = {}

    def _apps():
        if "apps" not in cache:
            try:
                cache["apps"] = _q_fetch("it_applications", org_id, dept_id)
            except Exception:
                cache["apps"] = []
        return cache["apps"]

    def _lics():
        if "lics" not in cache:
            try:
                cache["lics"] = _q_fetch("licenses", org_id, dept_id)
            except Exception:
                cache["lics"] = []
        return cache["lics"]

    def _srvs():
        if "srvs" not in cache:
            try:
                cache["srvs"] = _q_fetch("servers", org_id, dept_id)
            except Exception:
                cache["srvs"] = []
        return cache["srvs"]

    def _procs():
        if "procs" not in cache:
            try:
                cache["procs"] = _q_fetch("workforce_processes", org_id, dept_id)
            except Exception:
                cache["procs"] = []
        return cache["procs"]

    def _contracts():
        if "contracts" not in cache:
            try:
                cache["contracts"] = _q_fetch("contracts", org_id, dept_id)
            except Exception:
                cache["contracts"] = []
        return cache["contracts"]

    def _budget():
        if "budget" not in cache:
            try:
                with get_db() as cur:
                    if dept_id:
                        cur.execute(
                            "SELECT * FROM budget_entries WHERE organization_id = %s AND department_id = %s AND year = %s",
                            (org_id, dept_id, today.year),
                        )
                    else:
                        cur.execute(
                            "SELECT * FROM budget_entries WHERE organization_id = %s AND year = %s",
                            (org_id, today.year),
                        )
                    cache["budget"] = rows(cur)
            except Exception:
                cache["budget"] = []
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
                with get_db() as cur:
                    cur.execute(
                        "SELECT status, monthly_cost FROM it_applications WHERE organization_id = %s",
                        (org_id,),
                    )
                    apps = rows(cur)
                with get_db() as cur:
                    cur.execute(
                        "SELECT quantity, assigned_count FROM licenses WHERE organization_id = %s",
                        (org_id,),
                    )
                    lics = rows(cur)
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
                for c in _contracts():
                    pot = float(c.get("annual_value") or 0) * float(c.get("negotiation_potential") or 0) / 100
                    if pot > 0:
                        opps.append(pot)
                top = max(opps, default=0)
                result.append({"key": key, "label": "Meilleure opportunité", "value": f"{top:,.0f} $",
                    "sub": "économie unitaire max / an", "icon": "🏆", "color": "#16a34a"})

            elif key == "monthly_spend":
                apps = _apps()
                spend = sum(float(a.get("monthly_cost") or 0) for a in apps if a.get("status") != "decommissioned")
                _IT_CATS = {"software","logiciels","licences","telecom","internet","securite","cloud","hardware","maintenance"}
                for c in _contracts():
                    cat = (c.get("category") or "").lower()
                    if c.get("status") == "active" and cat in _IT_CATS:
                        spend += float(c.get("annual_value") or 0) / 12
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

    # Mise à jour du type d'org (colonne optionnelle — phase11)
    try:
        with get_db() as cur:
            cur.execute(
                "UPDATE organizations SET org_type = %s WHERE id = %s",
                (org_type, user.organization_id),
            )
    except Exception:
        pass

    # Évite les doublons : noms déjà existants
    with get_db() as cur:
        cur.execute(
            "SELECT name FROM departments WHERE organization_id = %s",
            (user.organization_id,),
        )
        existing_names = {r["name"].lower() for r in rows(cur)}

    created = []
    for dept in tmpl:
        if dept["name"].lower() in existing_names:
            continue
        with get_db() as cur:
            cur.execute(
                """INSERT INTO departments (organization_id, name, description, annual_budget, currency)
                   VALUES (%s, %s, %s, %s, %s) RETURNING *""",
                (
                    user.organization_id,
                    dept["name"],
                    dept.get("description"),
                    0,
                    "CAD",
                ),
            )
            created.append(row(cur))

    return {"created": len(created), "skipped": len(tmpl) - len(created), "departments": created}


# Dept types with cross-organization workspace visibility (see all chips)
_CROSS_ORG_DEPT_TYPES: frozenset[str] = frozenset({"direction", "rh", "it", "digital", "digitalisation"})


@router.get("")
def list_departments(user: CurrentUser = Depends(require_min_role("user"))):
    is_admin = ROLE_RANK.get(user.role, 0) >= 3 or user.is_service_account

    # Visibilité cross-org : dept Direction/RH/IT ET niveau <= 3 uniquement
    has_cross_org = False
    if not is_admin:
        has_cross_org = _cross_org_level(user.id, user.organization_id) is not None

    if is_admin or has_cross_org:
        with get_db() as cur:
            cur.execute(
                "SELECT * FROM departments WHERE organization_id = %s ORDER BY name",
                (user.organization_id,),
            )
            depts = rows(cur)
    else:
        with get_db() as cur:
            cur.execute(
                "SELECT department_id FROM department_members WHERE user_id = %s",
                (user.id,),
            )
            ids = [r["department_id"] for r in rows(cur)]
        if not ids:
            return []
        placeholders = ",".join(["%s"] * len(ids))
        with get_db() as cur:
            cur.execute(
                f"SELECT * FROM departments WHERE organization_id = %s AND id IN ({placeholders}) ORDER BY name",
                (user.organization_id, *ids),
            )
            depts = rows(cur)

    for d in depts:
        with get_db() as cur:
            cur.execute(
                "SELECT COUNT(*) AS cnt FROM department_members WHERE department_id = %s",
                (d["id"],),
            )
            cnt_row = row(cur)
        d["member_count"] = cnt_row["cnt"] if cnt_row else 0

    return depts


@router.post("", status_code=201)
def create_department(
    payload: DeptPayload,
    user: CurrentUser = Depends(require_min_role("admin")),
):
    # Vérifie l'unicité du nom et du type dans l'organisation
    with get_db() as cur:
        cur.execute(
            "SELECT id FROM departments WHERE organization_id = %s AND LOWER(name) = LOWER(%s) LIMIT 1",
            (user.organization_id, payload.name.strip()),
        )
        if row(cur):
            raise HTTPException(409, f"Un département « {payload.name} » existe déjà dans cette organisation.")
        if payload.dept_type and payload.dept_type != "general":
            cur.execute(
                "SELECT name FROM departments WHERE organization_id = %s AND dept_type = %s LIMIT 1",
                (user.organization_id, payload.dept_type),
            )
            existing = row(cur)
            if existing:
                raise HTTPException(409, f"Un département de type « {payload.dept_type} » existe déjà : « {existing['name']} ». Chaque type est unique par organisation.")

    try:
        with get_db() as cur:
            cur.execute(
                """INSERT INTO departments (organization_id, name, description, annual_budget, currency, dept_type)
                   VALUES (%s, %s, %s, %s, %s, %s) RETURNING *""",
                (
                    user.organization_id,
                    payload.name.strip(),
                    payload.description,
                    payload.annual_budget,
                    payload.currency,
                    payload.dept_type,
                ),
            )
            return row(cur)
    except HTTPException:
        raise
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
    _dept_or_404(dept_id, user.organization_id)
    with get_db() as cur:
        cur.execute(
            """UPDATE departments
               SET name = %s, description = %s, annual_budget = %s, currency = %s, dept_type = %s
               WHERE id = %s RETURNING *""",
            (
                payload.name,
                payload.description,
                payload.annual_budget,
                payload.currency,
                payload.dept_type,
                dept_id,
            ),
        )
        return row(cur)


@router.delete("/reset-all", status_code=200)
def reset_all_departments(
    user: CurrentUser = Depends(require_min_role("owner")),
):
    """Supprime tous les départements de l'organisation (owner uniquement)."""
    with get_db() as cur:
        cur.execute(
            "DELETE FROM departments WHERE organization_id = %s RETURNING id",
            (user.organization_id,),
        )
        deleted = len(cur.fetchall() or [])
    return {"deleted": deleted}


@router.delete("/{dept_id}", status_code=204)
def delete_department(
    dept_id: str,
    user: CurrentUser = Depends(require_min_role("owner")),
):
    _dept_or_404(dept_id, user.organization_id)
    with get_db() as cur:
        cur.execute("DELETE FROM departments WHERE id = %s", (dept_id,))


@router.get("/{dept_id}/members")
def list_dept_members(
    dept_id: str,
    user: CurrentUser = Depends(require_min_role("admin")),
):
    _dept_or_404(dept_id, user.organization_id)
    with get_db() as cur:
        cur.execute(
            """SELECT dm.user_id, dm.role, dm.title, dm.hierarchy_level,
                      u.id AS u_id, u.full_name, u.email, u.role AS org_role, u.is_active
               FROM department_members dm
               JOIN users u ON u.id = dm.user_id
               WHERE dm.department_id = %s
               ORDER BY COALESCE(dm.hierarchy_level, 6), u.full_name""",
            (dept_id,),
        )
        return rows(cur)


@router.patch("/{dept_id}/members/{member_id}/title")
def update_member_title(
    dept_id: str,
    member_id: str,
    payload: TitlePayload,
    user: CurrentUser = Depends(require_min_role("admin")),
):
    """Met à jour le titre et/ou le niveau hiérarchique d'un membre dans un département."""
    _dept_or_404(dept_id, user.organization_id)
    level = payload.hierarchy_level or TITLE_LEVEL.get(payload.title or "", 6)
    with get_db() as cur:
        cur.execute(
            """UPDATE department_members
               SET title = %s, hierarchy_level = %s
               WHERE department_id = %s AND user_id = %s
               RETURNING *""",
            (payload.title, level, dept_id, member_id),
        )
        result = row(cur)
    if not result:
        raise HTTPException(status_code=404, detail="Membre introuvable dans ce département.")
    return result


@router.post("/{dept_id}/members", status_code=201)
def add_dept_member(
    dept_id: str,
    payload: AddMemberPayload,
    user: CurrentUser = Depends(require_min_role("admin")),
):
    _dept_or_404(dept_id, user.organization_id)

    with get_db() as cur:
        cur.execute(
            "SELECT organization_id FROM users WHERE id = %s LIMIT 1",
            (payload.user_id,),
        )
        check = rows(cur)
    if not check or check[0].get("organization_id") != user.organization_id:
        raise HTTPException(status_code=400, detail="Utilisateur introuvable dans cette organisation.")

    level = payload.hierarchy_level or TITLE_LEVEL.get(payload.title or "", 6)
    title = payload.title or (HIERARCHY_TITLES[level - 1] if 1 <= level <= 6 else HIERARCHY_TITLES[-1])

    with get_db() as cur:
        cur.execute(
            """INSERT INTO department_members (user_id, department_id, role, title, hierarchy_level)
               VALUES (%s, %s, %s, %s, %s)
               ON CONFLICT (user_id, department_id) DO UPDATE
               SET role = EXCLUDED.role, title = EXCLUDED.title, hierarchy_level = EXCLUDED.hierarchy_level
               RETURNING *""",
            (payload.user_id, dept_id, payload.role, title, level),
        )
        return row(cur)


@router.delete("/{dept_id}/members/{member_id}", status_code=204)
def remove_dept_member(
    dept_id: str,
    member_id: str,
    user: CurrentUser = Depends(require_min_role("admin")),
):
    _dept_or_404(dept_id, user.organization_id)
    with get_db() as cur:
        cur.execute(
            "DELETE FROM department_members WHERE department_id = %s AND user_id = %s",
            (dept_id, member_id),
        )


# ── KPI Snapshots ─────────────────────────────────────────────────────────────

class KpiSnapshotPayload(BaseModel):
    kpis: list[dict] = Field(default_factory=list)
    health_score: int | None = None
    dept_type: str | None = None
    dept_name: str | None = None


@router.post("/{dept_id}/snapshot", status_code=200)
def save_kpi_snapshot(
    dept_id: str,
    payload: KpiSnapshotPayload,
    user: CurrentUser = Depends(require_min_role("user")),
):
    with get_db() as cur:
        cur.execute("SELECT id FROM departments WHERE id = %s AND organization_id = %s LIMIT 1",
                    (dept_id, user.organization_id))
        if not row(cur):
            raise HTTPException(404, "Département introuvable.")
        cur.execute(
            """INSERT INTO kpi_snapshots (org_id, dept_id, dept_type, dept_name, snapshot_date, kpis, health_score)
               VALUES (%s, %s, %s, %s, CURRENT_DATE, %s, %s)
               ON CONFLICT (dept_id, snapshot_date) DO UPDATE
               SET kpis = EXCLUDED.kpis, health_score = EXCLUDED.health_score""",
            (user.organization_id, dept_id, payload.dept_type, payload.dept_name,
             _json.dumps(payload.kpis), payload.health_score),
        )
    return {"ok": True}


@router.get("/{dept_id}/history")
def get_kpi_history(
    dept_id: str,
    days: int = Query(default=90, ge=7, le=365),
    user: CurrentUser = Depends(require_min_role("user")),
):
    with get_db() as cur:
        cur.execute("SELECT id FROM departments WHERE id = %s AND organization_id = %s LIMIT 1",
                    (dept_id, user.organization_id))
        if not row(cur):
            raise HTTPException(404, "Département introuvable.")
        cur.execute(
            """SELECT snapshot_date::text AS date, health_score, kpis
               FROM kpi_snapshots
               WHERE dept_id = %s AND snapshot_date >= CURRENT_DATE - (%s * INTERVAL '1 day')
               ORDER BY snapshot_date ASC""",
            (dept_id, days),
        )
        return [{"date": r["date"], "health_score": r["health_score"], "kpis": r["kpis"]}
                for r in rows(cur)]


def _dept_or_404(dept_id: str, organization_id: str) -> dict:
    with get_db() as cur:
        cur.execute(
            "SELECT id FROM departments WHERE id = %s AND organization_id = %s LIMIT 1",
            (dept_id, organization_id),
        )
        result = row(cur)
    if not result:
        raise HTTPException(status_code=404, detail="Département introuvable.")
    return result
