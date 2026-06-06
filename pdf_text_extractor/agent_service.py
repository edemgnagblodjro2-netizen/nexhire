from __future__ import annotations

# Agent orchestrateur — Phase 4
# Boucle : 1) LLM choisit les outils  2) outils s'exécutent (simulés en V1)
# 3) LLM synthétise une réponse structurée.
# Pour passer en V2 (vrais connecteurs OAuth) : remplacer uniquement les
# fonctions _mock_* par de vrais appels API — la boucle et les outils restent.

import json
import os
from dataclasses import dataclass, field
from typing import Any


# ── Définitions des outils (function calling OpenAI) ─────────────────────────

TOOL_DEFINITIONS: list[dict] = [
    {
        "type": "function",
        "function": {
            "name": "search_servicenow",
            "description": (
                "Recherche des incidents, demandes de service ou changements dans ServiceNow. "
                "Utile pour : incidents critiques, tickets ouverts, statuts d'incidents."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {"type": "string", "description": "Mots-clés ou description de la recherche"},
                    "status": {
                        "type": "string",
                        "enum": ["open", "in_progress", "resolved", "all"],
                        "default": "all",
                        "description": "Filtrer par statut",
                    },
                    "priority": {
                        "type": "string",
                        "enum": ["critical", "high", "medium", "low", "all"],
                        "default": "all",
                        "description": "Filtrer par priorité",
                    },
                    "limit": {"type": "integer", "default": 5, "description": "Nombre maximum de résultats"},
                },
                "required": ["query"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "search_jira",
            "description": (
                "Recherche des issues, epics ou projets dans Jira. "
                "Utile pour : projets en retard, sprints actifs, tâches assignées."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {"type": "string", "description": "Termes de recherche JQL ou description"},
                    "status": {
                        "type": "string",
                        "enum": ["todo", "in_progress", "done", "blocked", "all"],
                        "default": "all",
                    },
                    "project": {"type": "string", "description": "Clé ou nom du projet (optionnel)"},
                    "limit": {"type": "integer", "default": 5},
                },
                "required": ["query"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "query_sap",
            "description": (
                "Interroge SAP pour des données financières, budgétaires ou RH. "
                "Utile pour : dépenses du mois, budget consommé, factures en attente."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "category": {
                        "type": "string",
                        "enum": ["expenses", "budget", "invoices", "payroll", "procurement"],
                        "description": "Catégorie de données SAP",
                    },
                    "period": {
                        "type": "string",
                        "description": "Période ex. 'current_month', 'last_quarter', '2026-Q1'",
                        "default": "current_month",
                    },
                    "department": {"type": "string", "description": "Département ou centre de coût (optionnel)"},
                },
                "required": ["category"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "search_microsoft_365",
            "description": (
                "Recherche dans les emails, fichiers SharePoint ou Teams. "
                "Utile pour : emails non lus, documents partagés, conversations Teams."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {"type": "string", "description": "Termes de recherche"},
                    "source": {
                        "type": "string",
                        "enum": ["email", "sharepoint", "teams", "all"],
                        "default": "all",
                    },
                    "limit": {"type": "integer", "default": 5},
                },
                "required": ["query"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "search_salesforce",
            "description": (
                "Recherche dans le CRM Salesforce : opportunités, comptes, contacts, contrats. "
                "Utile pour : contrats à renouveler, pipeline commercial, clients actifs."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {"type": "string", "description": "Recherche SOQL ou description"},
                    "object_type": {
                        "type": "string",
                        "enum": ["opportunity", "account", "contact", "contract", "case", "all"],
                        "default": "all",
                    },
                    "limit": {"type": "integer", "default": 5},
                },
                "required": ["query"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "query_workday",
            "description": (
                "Interroge Workday pour des données RH : effectifs, congés, performance. "
                "Utile pour : postes vacants, absences du jour, évaluations en attente."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "category": {
                        "type": "string",
                        "enum": ["headcount", "leave", "performance", "recruiting", "payroll"],
                    },
                    "department": {"type": "string", "description": "Département (optionnel)"},
                    "period": {"type": "string", "default": "current"},
                },
                "required": ["category"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "search_zendesk",
            "description": (
                "Recherche des tickets de support client dans Zendesk. "
                "Utile pour : tickets ouverts, demandes clients, escalades, satisfaction client."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {"type": "string", "description": "Mots-clés ou description du problème"},
                    "status": {
                        "type": "string",
                        "enum": ["open", "pending", "solved", "all"],
                        "default": "all",
                    },
                    "priority": {
                        "type": "string",
                        "enum": ["urgent", "high", "normal", "low", "all"],
                        "default": "all",
                    },
                    "limit": {"type": "integer", "default": 5},
                },
                "required": ["query"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "search_autotask",
            "description": (
                "Interroge Autotask PSA pour des tickets IT, projets et contrats de service. "
                "Utile pour : tickets IT en cours, projets MSP, SLA, temps facturable."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {"type": "string", "description": "Description ou numéro de ticket"},
                    "type": {
                        "type": "string",
                        "enum": ["ticket", "project", "contract", "time_entry", "all"],
                        "default": "all",
                    },
                    "status": {
                        "type": "string",
                        "enum": ["new", "in_progress", "waiting", "completed", "all"],
                        "default": "all",
                    },
                    "limit": {"type": "integer", "default": 5},
                },
                "required": ["query"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "search_hubspot",
            "description": (
                "Recherche dans HubSpot CRM : contacts, entreprises, transactions, campagnes. "
                "Utile pour : pipeline commercial, leads récents, opportunités à relancer."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {"type": "string", "description": "Nom, email ou description"},
                    "object_type": {
                        "type": "string",
                        "enum": ["contact", "company", "deal", "ticket", "all"],
                        "default": "all",
                    },
                    "limit": {"type": "integer", "default": 5},
                },
                "required": ["query"],
            },
        },
    },
]


# ── Outils internes NexHire (lisent directement la DB) ───────────────────────

_INTERNAL_TOOL_NAMES = {
    "query_licenses_usage",
    "query_contracts",
    "query_workforce_processes",
    "query_optimization_summary",
}

INTERNAL_TOOL_DEFINITIONS: list[dict] = [
    {
        "type": "function",
        "function": {
            "name": "query_licenses_usage",
            "description": (
                "Analyse l'utilisation des licences logicielles et applications IT de l'organisation. "
                "Utile pour : logiciels peu utilisés, licences surnuméraires, coûts par application, "
                "doublons d'outils dans une même catégorie, économies potentielles sur les licences."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "filter": {
                        "type": "string",
                        "enum": ["all", "unused", "duplicates", "expensive"],
                        "default": "all",
                        "description": "unused=peu utilisés, duplicates=doublons par catégorie, expensive=plus coûteux",
                    },
                    "limit": {"type": "integer", "default": 10},
                },
                "required": [],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "query_contracts",
            "description": (
                "Consulte les contrats fournisseurs de l'organisation : valeurs, renouvellements, "
                "potentiel de négociation et économies. "
                "Utile pour : contrats trop chers, contrats à renouveler bientôt, économies négociables, "
                "budget contrats par catégorie."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "filter": {
                        "type": "string",
                        "enum": ["all", "expiring_soon", "high_value", "negotiable"],
                        "default": "all",
                        "description": "expiring_soon=renouvellement <90j, high_value=plus coûteux, negotiable=potentiel économie >0",
                    },
                    "category": {
                        "type": "string",
                        "description": "Filtrer par catégorie : telecom, software, hardware, services, cloud, facilities",
                    },
                    "limit": {"type": "integer", "default": 10},
                },
                "required": [],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "query_workforce_processes",
            "description": (
                "Analyse les processus RH et opérationnels manuels de l'organisation. "
                "Utile pour : processus qui coûtent le plus en heures, potentiel d'automatisation, "
                "ROI estimé par processus, tâches à automatiser en priorité."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "filter": {
                        "type": "string",
                        "enum": ["all", "high_cost", "automatable", "already_automated"],
                        "default": "all",
                        "description": "high_cost=plus coûteux en heures, automatable=potentiel >50%",
                    },
                    "limit": {"type": "integer", "default": 10},
                },
                "required": [],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "query_optimization_summary",
            "description": (
                "Tableau de bord global des opportunités d'économies identifiées par NexHire : "
                "score d'efficacité, total des économies potentielles par catégorie, "
                "meilleures opportunités classées par ROI. "
                "Utile pour : vue d'ensemble, où est l'argent, priorités d'action."
            ),
            "parameters": {
                "type": "object",
                "properties": {},
                "required": [],
            },
        },
    },
]


def _internal_licenses(org_id: str, filter: str = "all", limit: int = 10) -> dict:
    try:
        from routes_optimization import _unused_licenses, _duplicate_tools
        unused = _unused_licenses(org_id)
        dups   = _duplicate_tools(org_id)
        if filter == "unused":
            return {"licences_peu_utilisees": unused[:limit]}
        if filter == "duplicates":
            return {"doublons_par_categorie": dups[:limit]}
        if filter == "expensive":
            from supabase_client import service_client
            apps = (service_client().table("it_applications")
                    .select("name, vendor, category, monthly_cost, user_count, status")
                    .eq("organization_id", org_id)
                    .neq("status", "decommissioned")
                    .order("monthly_cost", desc=True)
                    .limit(limit).execute().data or [])
            return {"applications_plus_couteuses": apps}
        return {
            "licences_peu_utilisees":  unused[:limit // 2],
            "doublons_par_categorie":  dups[:limit // 2],
        }
    except Exception as exc:
        return {"error": str(exc)}


def _internal_contracts(org_id: str, filter: str = "all", category: str | None = None, limit: int = 10) -> dict:
    try:
        from datetime import date, timedelta
        from supabase_client import service_client
        sb    = service_client()
        today = date.today()
        q = (sb.table("contracts")
             .select("vendor, description, category, annual_value, currency, renewal_date, negotiation_potential, status, departments(name)")
             .eq("organization_id", org_id))
        if category:
            q = q.eq("category", category)
        if filter == "expiring_soon":
            q = (q.eq("status", "active")
                   .lte("renewal_date", (today + timedelta(days=90)).isoformat())
                   .gte("renewal_date", today.isoformat()))
        elif filter == "high_value":
            q = q.order("annual_value", desc=True)
        elif filter == "negotiable":
            q = q.gt("negotiation_potential", 0).order("negotiation_potential", desc=True)
        rows = (q.limit(limit).execute().data or [])
        total = sum(float(r.get("annual_value") or 0) for r in rows)
        result = []
        for r in rows:
            val = float(r.get("annual_value") or 0)
            pot = float(r.get("negotiation_potential") or 0)
            result.append({
                "fournisseur":        r.get("vendor"),
                "description":        r.get("description"),
                "categorie":          r.get("category"),
                "valeur_annuelle":    f"{val:,.0f} {r.get('currency','CAD')}",
                "renouvellement":     r.get("renewal_date"),
                "potentiel_negoce_%": pot,
                "economie_possible":  f"{val * pot / 100:,.0f} {r.get('currency','CAD')}" if pot else None,
                "departement":        (r.get("departments") or {}).get("name"),
            })
        return {"contrats": result, "total_annuel": f"{total:,.0f} CAD", "nombre": len(result)}
    except Exception as exc:
        return {"error": str(exc)}


def _internal_processes(org_id: str, filter: str = "all", limit: int = 10) -> dict:
    try:
        from supabase_client import service_client
        rows = (service_client().table("workforce_processes")
                .select("name, description, team_size, manual_hours_per_month, automation_potential, hourly_cost, status, departments(name)")
                .eq("organization_id", org_id)
                .execute().data or [])
        result = []
        for p in rows:
            hours  = float(p.get("manual_hours_per_month") or 0)
            auto   = float(p.get("automation_potential") or 0)
            hourly = float(p.get("hourly_cost") or 50)
            roi_ann = hours * (auto / 100) * hourly * 12
            item = {
                "processus":             p.get("name"),
                "equipe":                p.get("team_size"),
                "heures_manuelles_mois": hours,
                "potentiel_auto_%":      auto,
                "cout_horaire":          hourly,
                "roi_annuel_estimé":     f"{roi_ann:,.0f} CAD",
                "statut":                p.get("status"),
                "departement":           (p.get("departments") or {}).get("name"),
            }
            result.append(item)
        if filter == "high_cost":
            result.sort(key=lambda x: -float(x["heures_manuelles_mois"]))
        elif filter == "automatable":
            result = [r for r in result if float(r["potentiel_auto_%"]) >= 50]
            result.sort(key=lambda x: -float(x["roi_annuel_estimé"].replace(",", "").replace(" CAD", "")))
        elif filter == "already_automated":
            result = [r for r in result if r["statut"] == "automated"]
        else:
            result.sort(key=lambda x: -float(x["roi_annuel_estimé"].replace(",", "").replace(" CAD", "")))
        return {"processus": result[:limit], "nombre": len(result)}
    except Exception as exc:
        return {"error": str(exc)}


def _internal_optimization_summary(org_id: str) -> dict:
    try:
        from routes_optimization import (
            _efficiency_score, _unused_licenses, _duplicate_tools,
            _contracts_at_risk, _process_waste, _top_opps,
        )
        unused    = _unused_licenses(org_id)
        dups      = _duplicate_tools(org_id)
        contracts = _contracts_at_risk(org_id)
        procs     = _process_waste(org_id)
        score     = _efficiency_score(org_id)
        top       = _top_opps(unused, dups, contracts, procs)
        total = (sum(l["annual_savings_potential"] for l in unused)
               + sum(d["annual_savings_potential"] for d in dups)
               + sum(c.get("potential_savings", 0) for c in contracts)
               + sum(p.get("annual_savings_potential", 0) for p in procs))
        return {
            "score_efficacite_global": f"{score.get('overall', 0):.1f}/100",
            "economies_totales_annuelles": f"{total:,.0f} CAD",
            "par_categorie": {
                "licences":  f"{sum(l['annual_savings_potential'] for l in unused):,.0f} CAD",
                "logiciels": f"{sum(d['annual_savings_potential'] for d in dups):,.0f} CAD",
                "contrats":  f"{sum(c.get('potential_savings',0) for c in contracts):,.0f} CAD",
                "processus": f"{sum(p.get('annual_savings_potential',0) for p in procs):,.0f} CAD",
            },
            "top_opportunites": top[:5],
        }
    except Exception as exc:
        return {"error": str(exc)}


# ── Implémentations simulées (V1) — remplacer par vrais appels API en V2 ──────

def _mock_servicenow(query: str, status: str = "all", priority: str = "all", limit: int = 5) -> list[dict]:
    data = [
        {"id": "INC0012847", "titre": "Panne serveur de production DB-01", "priorité": "Critique", "statut": "Ouvert", "assigné": "Jean Tremblay", "créé": "2026-06-04T08:15:00Z"},
        {"id": "INC0012851", "titre": "VPN lent — utilisateurs distants Montréal", "priorité": "Haute", "statut": "En cours", "assigné": "Marie Côté", "créé": "2026-06-04T10:30:00Z"},
        {"id": "INC0012839", "titre": "Certificat SSL expiré — portail RH", "priorité": "Critique", "statut": "Ouvert", "assigné": "Non assigné", "créé": "2026-06-03T14:00:00Z"},
        {"id": "INC0012820", "titre": "Imprimante hors ligne — Salle 204", "priorité": "Basse", "statut": "Ouvert", "assigné": "Support L1", "créé": "2026-06-02T09:00:00Z"},
    ]
    if priority != "all":
        data = [d for d in data if d["priorité"].lower().startswith(priority[:4])]
    if status != "all":
        mapping = {"open": "Ouvert", "in_progress": "En cours", "resolved": "Résolu"}
        data = [d for d in data if d["statut"] == mapping.get(status, status)]
    return data[:limit]


def _mock_jira(query: str, status: str = "all", project: str | None = None, limit: int = 5) -> list[dict]:
    data = [
        {"id": "NEXH-847", "titre": "Intégration API Salesforce — phase 2", "statut": "En retard", "sprint": "Sprint 23", "assigné": "Dev Team", "échéance": "2026-05-30", "retard_jours": 6},
        {"id": "NEXH-831", "titre": "Refactoring module paiement", "statut": "Bloqué", "sprint": "Sprint 23", "assigné": "Fatima Diallo", "échéance": "2026-06-01", "retard_jours": 4},
        {"id": "NEXH-862", "titre": "Tests de charge — endpoint /api/agent", "statut": "À faire", "sprint": "Sprint 24", "assigné": "QA Team", "échéance": "2026-06-10"},
        {"id": "NEXH-855", "titre": "Dashboard analytique — composant graphe", "statut": "En cours", "sprint": "Sprint 24", "assigné": "Sophie Martin", "échéance": "2026-06-08"},
    ]
    if status == "blocked":
        data = [d for d in data if d["statut"] == "Bloqué"]
    return data[:limit]


def _mock_sap(category: str, period: str = "current_month", department: str | None = None) -> dict:
    mocks = {
        "expenses": {
            "période": "Juin 2026",
            "total_dépenses": "487 230 $",
            "budget_alloué": "520 000 $",
            "consommé_pct": "93,7 %",
            "postes_principaux": [
                {"poste": "Licences logicielles", "montant": "182 400 $"},
                {"poste": "Infrastructure cloud", "montant": "143 800 $"},
                {"poste": "Services professionnels", "montant": "98 500 $"},
                {"poste": "Frais de déplacement", "montant": "62 530 $"},
            ],
        },
        "invoices": {
            "en_attente": 14,
            "montant_total": "312 450 $",
            "en_retard": 3,
            "montant_retard": "87 200 $",
        },
        "budget": {
            "exercice": "2026",
            "budget_annuel": "6 240 000 $",
            "consommé_ytd": "2 874 500 $",
            "projection_fin_année": "6 180 000 $",
        },
    }
    return mocks.get(category, {"message": f"Données SAP '{category}' non disponibles en mode simulé."})


def _mock_microsoft_365(query: str, source: str = "all", limit: int = 5) -> list[dict]:
    data = [
        {"type": "email", "de": "pdg@client.ca", "objet": "Re: Renouvellement contrat Q3", "date": "2026-06-05T07:42:00Z", "lu": False},
        {"type": "email", "de": "finance@fournisseur.com", "objet": "Facture #INV-2026-0847 — échéance 15 juin", "date": "2026-06-04T16:10:00Z", "lu": False},
        {"type": "sharepoint", "titre": "Politique achats v4.2.pdf", "modifié_par": "DG Admin", "date": "2026-06-01T10:00:00Z"},
        {"type": "teams", "canal": "Direction Générale", "message": "Rappel : réunion budget vendredi 10h", "date": "2026-06-04T09:15:00Z"},
    ]
    if source != "all":
        data = [d for d in data if d["type"] == source]
    return data[:limit]


def _mock_salesforce(query: str, object_type: str = "all", limit: int = 5) -> list[dict]:
    data = [
        {"type": "contract", "nom": "Ville de Laval — Contrat services TI", "valeur": "240 000 $", "échéance": "2026-08-31", "jours_restants": 87, "statut": "Actif"},
        {"type": "contract", "nom": "CHU Sainte-Justine — Licences SaaS", "valeur": "185 000 $", "échéance": "2026-09-15", "jours_restants": 102, "statut": "Actif"},
        {"type": "opportunity", "nom": "Commission scolaire CSDM", "valeur": "320 000 $", "probabilité": "65 %", "étape": "Proposition envoyée"},
        {"type": "account", "nom": "Desjardins Groupe", "statut": "Client actif", "arr": "1 200 000 $"},
    ]
    if object_type != "all":
        data = [d for d in data if d["type"] == object_type]
    return data[:limit]


def _mock_workday(category: str, department: str | None = None, period: str = "current") -> dict:
    mocks = {
        "headcount": {"effectif_total": 342, "postes_vacants": 8, "nouvelles_embauches_mois": 4, "départs_mois": 2},
        "leave": {"absences_aujourd_hui": 12, "congés_approuvés_semaine": 28, "demandes_en_attente": 5},
        "performance": {"évaluations_en_attente": 23, "évaluations_complétées": 287, "taux_completion": "92,6 %"},
    }
    return mocks.get(category, {"message": f"Données Workday '{category}' non disponibles en mode simulé."})


def _mock_zendesk(query: str, status: str = "all", priority: str = "all", limit: int = 5) -> list[dict]:
    data = [
        {"id": "ZD-4821", "sujet": "Impossible de se connecter au portail client", "priorité": "urgent", "statut": "open", "client": "CIBC", "créé": "2026-06-05T09:10:00Z", "assigné": "Sophie Bilodeau"},
        {"id": "ZD-4815", "sujet": "Lenteurs sur l'application mobile — version iOS 17", "priorité": "high", "statut": "pending", "client": "Desjardins", "créé": "2026-06-04T14:30:00Z", "assigné": "Marc Ouellet"},
        {"id": "ZD-4802", "sujet": "Erreur 500 sur la page de facturation", "priorité": "urgent", "statut": "open", "client": "Banque Nationale", "créé": "2026-06-03T11:00:00Z", "assigné": "Non assigné"},
        {"id": "ZD-4798", "sujet": "Demande d'exportation des données RGPD", "priorité": "normal", "statut": "open", "client": "Client Interne", "créé": "2026-06-02T10:45:00Z", "assigné": "Équipe Conformité"},
        {"id": "ZD-4790", "sujet": "Intégration Slack — notifications manquantes", "priorité": "low", "statut": "open", "client": "TechMontréal Inc.", "créé": "2026-06-01T08:20:00Z", "assigné": "Support L2"},
    ]
    if priority != "all":
        data = [d for d in data if d["priorité"] == priority]
    if status != "all":
        data = [d for d in data if d["statut"] == status]
    return data[:limit]


def _mock_autotask(query: str, type: str = "all", status: str = "all", limit: int = 5) -> list[dict]:
    data = [
        {"id": "AT-12047", "type": "ticket", "titre": "Mise à jour firmware — switches Cisco Laval", "statut": "in_progress", "sla": "4h", "temps_restant": "1h30", "technicien": "Jean-François Roy", "client": "Ville de Laval"},
        {"id": "AT-12039", "type": "ticket", "titre": "Déploiement antivirus — 45 postes", "statut": "new", "sla": "8h", "priorité": "high", "client": "CHU Sainte-Justine"},
        {"id": "AT-P-087", "type": "project", "titre": "Migration Exchange → Microsoft 365", "statut": "in_progress", "avancement": "67 %", "échéance": "2026-07-15", "client": "Commission scolaire CSDM"},
        {"id": "AT-C-023", "type": "contract", "titre": "Contrat support annuel — niveau Gold", "statut": "active", "renouvellement": "2026-12-31", "valeur": "48 000 $", "client": "Desjardins"},
        {"id": "AT-12031", "type": "ticket", "titre": "VPN Cisco AnyConnect — erreur certificat", "statut": "waiting", "sla": "2h", "en_attente": "Approbation client", "technicien": "Marie Côté"},
    ]
    if type != "all":
        data = [d for d in data if d["type"] == type]
    if status != "all":
        data = [d for d in data if d["statut"] == status]
    return data[:limit]


def _mock_hubspot(query: str, object_type: str = "all", limit: int = 5) -> list[dict]:
    data = [
        {"type": "deal", "nom": "Ville de Québec — Expansion licences", "valeur": "180 000 $", "étape": "Proposition envoyée", "probabilité": "70 %", "contact": "Directeur TI", "fermeture_prévue": "2026-07-31"},
        {"type": "deal", "nom": "CSSDM — Renouvellement annuel", "valeur": "95 000 $", "étape": "Négociation", "probabilité": "85 %", "contact": "DG Achat", "fermeture_prévue": "2026-06-30"},
        {"type": "contact", "nom": "André Bergeron", "entreprise": "Intact Assurances", "email": "a.bergeron@intact.net", "dernier_contact": "2026-05-28", "statut": "Lead qualifié"},
        {"type": "company", "nom": "Bell Canada", "statut": "Prospect", "industrie": "Télécommunications", "taille": "50 000+ employés", "arr_potentiel": "500 000 $"},
        {"type": "deal", "nom": "CGI Montréal — Pilote IA", "valeur": "45 000 $", "étape": "Démo planifiée", "probabilité": "45 %", "contact": "VP Innovation", "fermeture_prévue": "2026-08-15"},
    ]
    if object_type != "all":
        data = [d for d in data if d["type"] == object_type]
    return data[:limit]


# ── Dispatch des outils ───────────────────────────────────────────────────────

def _call_tool(name: str, arguments: dict[str, Any], org_id: str | None = None) -> Any:
    """Essaie d'abord le vrai service (si connecté), puis retombe sur le mock."""

    # Outils internes NexHire — toujours réels, pas de mock
    if name in _INTERNAL_TOOL_NAMES and org_id:
        if name == "query_licenses_usage":
            return _internal_licenses(org_id, arguments.get("filter", "all"), arguments.get("limit", 10))
        if name == "query_contracts":
            return _internal_contracts(org_id, arguments.get("filter", "all"), arguments.get("category"), arguments.get("limit", 10))
        if name == "query_workforce_processes":
            return _internal_processes(org_id, arguments.get("filter", "all"), arguments.get("limit", 10))
        if name == "query_optimization_summary":
            return _internal_optimization_summary(org_id)

    if org_id:
        try:
            if name == "search_microsoft_365":
                from m365_service import search_microsoft_365 as _fn
                return _fn(query=arguments.get("query", ""), org_id=org_id,
                           limit=arguments.get("limit", 5))
            if name == "search_salesforce":
                from salesforce_service import search_salesforce as _fn
                return _fn(query=arguments.get("query", ""), org_id=org_id,
                           object_type=arguments.get("object_type", "all"),
                           limit=arguments.get("limit", 5))
            if name == "search_servicenow":
                from servicenow_service import search_servicenow as _fn
                return _fn(query=arguments.get("query", ""), org_id=org_id,
                           status=arguments.get("status", "all"),
                           priority=arguments.get("priority", "all"),
                           limit=arguments.get("limit", 5))
            if name == "search_jira":
                from jira_service import search_jira as _fn
                return _fn(query=arguments.get("query", ""), org_id=org_id,
                           status=arguments.get("status", "all"),
                           project=arguments.get("project"),
                           limit=arguments.get("limit", 5))
            if name == "search_zendesk":
                from zendesk_service import search_zendesk as _fn
                return _fn(query=arguments.get("query", ""), org_id=org_id,
                           status=arguments.get("status", "all"),
                           priority=arguments.get("priority", "all"),
                           limit=arguments.get("limit", 5))
            if name == "search_hubspot":
                from hubspot_service import search_hubspot as _fn
                return _fn(query=arguments.get("query", ""), org_id=org_id,
                           object_type=arguments.get("object_type", "all"),
                           limit=arguments.get("limit", 5))
        except Exception:
            pass  # fallback vers mock

    # Mocks (démo / connecteur non configuré)
    handlers = {
        "search_servicenow":    lambda a: _mock_servicenow(**a),
        "search_jira":          lambda a: _mock_jira(**a),
        "query_sap":            lambda a: _mock_sap(**a),
        "search_microsoft_365": lambda a: _mock_microsoft_365(**a),
        "search_salesforce":    lambda a: _mock_salesforce(**a),
        "query_workday":        lambda a: _mock_workday(**a),
        "search_zendesk":       lambda a: _mock_zendesk(**a),
        "search_autotask":      lambda a: _mock_autotask(**a),
        "search_hubspot":       lambda a: _mock_hubspot(**a),
    }
    handler = handlers.get(name)
    if not handler:
        return {"error": f"Outil inconnu : {name}"}
    try:
        return handler(arguments)
    except Exception as exc:
        return {"error": str(exc)}


# ── Résultat structuré ────────────────────────────────────────────────────────

@dataclass
class AgentResponse:
    answer: str
    sources: list[str] = field(default_factory=list)
    tools_called: list[dict[str, Any]] = field(default_factory=list)


# ── Boucle agent ──────────────────────────────────────────────────────────────

def run_agent(
    question: str,
    *,
    assistant_mode: str = "enterprise",
    language: str = "fr",
    connected_connectors: list[str] | None = None,
    org_id: str | None = None,
) -> AgentResponse:
    """Boucle agent en deux passes :
    1. LLM choisit quels outils appeler (function calling).
    2. Outils s'exécutent, LLM synthétise une réponse finale.

    connected_connectors : liste des types de connecteurs actifs pour l'org.
    Si None, tous les outils sont disponibles (utile pour démo/test).
    """
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise RuntimeError("OPENAI_API_KEY requis pour l'agent.")

    from openai import OpenAI
    client = OpenAI(api_key=api_key)
    model = os.getenv("OPENAI_MODEL", "gpt-4o-mini")

    # Filtrer les outils selon les connecteurs actifs
    connector_tool_map = {
        "microsoft_365": "search_microsoft_365",
        "salesforce":    "search_salesforce",
        "servicenow":    "search_servicenow",
        "jira":          "search_jira",
        "sap":           "query_sap",
        "workday":       "query_workday",
        "zendesk":       "search_zendesk",
        "autotask":      "search_autotask",
        "hubspot":       "search_hubspot",
    }
    if connected_connectors is not None:
        active_tools = {connector_tool_map[c] for c in connected_connectors if c in connector_tool_map}
        tools = [t for t in TOOL_DEFINITIONS if t["function"]["name"] in active_tools]
    else:
        tools = list(TOOL_DEFINITIONS)

    # Outils internes toujours disponibles si org_id connu (pas de connecteur requis)
    if org_id:
        tools = tools + INTERNAL_TOOL_DEFINITIONS

    lang_name = "français" if language == "fr" else "English"
    system_prompt = (
        f"Tu es NexHire Enterprise Assistant, un employé virtuel intelligent. "
        f"Réponds toujours en {lang_name}. "
        "Tu as accès à des outils connectés aux systèmes de l'organisation. "
        "Appelle les outils nécessaires pour répondre à la question, puis synthétise "
        "une réponse claire et structurée. Si plusieurs systèmes sont pertinents, "
        "consulte-les tous. Indique toujours les sources utilisées."
    )

    messages: list[dict] = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": question},
    ]

    # ── Passe 1 : LLM choisit les outils ─────────────────────────────────────
    response = client.chat.completions.create(
        model=model,
        messages=messages,
        tools=tools or None,
        tool_choice="auto" if tools else "none",
    )

    choice = response.choices[0]
    messages.append(choice.message.model_dump(exclude_none=True))

    tools_called: list[dict[str, Any]] = []
    sources: list[str] = []

    if choice.finish_reason == "tool_calls" and choice.message.tool_calls:
        for tool_call in choice.message.tool_calls:
            fn_name = tool_call.function.name
            arguments = json.loads(tool_call.function.arguments)
            result = _call_tool(fn_name, arguments, org_id=org_id)

            tools_called.append({"tool": fn_name, "arguments": arguments, "result": result})

            # Ajouter le résultat de l'outil dans les messages
            messages.append({
                "role": "tool",
                "tool_call_id": tool_call.id,
                "content": json.dumps(result, ensure_ascii=False),
            })

            # Identifier la source (connecteur ou nexhire interne)
            if fn_name in _INTERNAL_TOOL_NAMES:
                source = "nexhire"
            else:
                source = next(
                    (c for c, t in connector_tool_map.items()
                     if t == fn_name and c not in _INTERNAL_TOOL_NAMES),
                    fn_name,
                )
            if source not in sources:
                sources.append(source)

    # ── Passe 2 : LLM synthétise la réponse finale ────────────────────────────
    final = client.chat.completions.create(
        model=model,
        messages=messages,
    )

    return AgentResponse(
        answer=final.choices[0].message.content.strip(),
        sources=sources,
        tools_called=tools_called,
    )
