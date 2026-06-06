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
]


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


# ── Dispatch des outils ───────────────────────────────────────────────────────

def _call_tool(name: str, arguments: dict[str, Any], org_id: str | None = None) -> Any:
    # Microsoft 365 : vrais appels Graph API si l'org a des tokens OAuth stockés.
    if name == "search_microsoft_365" and org_id:
        try:
            from m365_service import search_microsoft_365 as _real_m365
            return _real_m365(
                query=arguments.get("query", ""),
                org_id=org_id,
                limit=arguments.get("limit", 5),
            )
        except Exception:
            pass  # fallback simulé en cas d'erreur inattendue

    handlers = {
        "search_servicenow": lambda a: _mock_servicenow(**a),
        "search_jira": lambda a: _mock_jira(**a),
        "query_sap": lambda a: _mock_sap(**a),
        "search_microsoft_365": lambda a: _mock_microsoft_365(**a),
        "search_salesforce": lambda a: _mock_salesforce(**a),
        "query_workday": lambda a: _mock_workday(**a),
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
        "salesforce": "search_salesforce",
        "servicenow": "search_servicenow",
        "jira": "search_jira",
        "sap": "query_sap",
        "workday": "query_workday",
    }
    if connected_connectors is not None:
        active_tools = {connector_tool_map[c] for c in connected_connectors if c in connector_tool_map}
        tools = [t for t in TOOL_DEFINITIONS if t["function"]["name"] in active_tools]
    else:
        tools = TOOL_DEFINITIONS

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

            # Identifier la source (connecteur)
            source = next(
                (c for c, t in connector_tool_map.items() if t == fn_name),
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
