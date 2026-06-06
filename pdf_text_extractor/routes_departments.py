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


class DeptPayload(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    description: str | None = None
    annual_budget: float = 0
    currency: str = "CAD"


class AddMemberPayload(BaseModel):
    user_id: str
    role: str = Field("member", pattern="^(member|manager)$")


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

    # Mise à jour du type d'org
    sb.table("organizations").update({"org_type": org_type}).eq("id", user.organization_id).execute()

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
    res = sb.table("departments").insert({
        "organization_id": user.organization_id,
        "name": payload.name,
        "description": payload.description,
        "annual_budget": payload.annual_budget,
        "currency": payload.currency,
    }).execute()
    return res.data[0]


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
