from __future__ import annotations

from dataclasses import dataclass
import os
from urllib.parse import urlencode


@dataclass(frozen=True)
class ConnectorDefinition:
    id: str
    name: str
    phase: int
    priority_label: str
    description: str
    oauth_authorize_url: str
    scopes: list[str]
    actions: list[dict[str, str]]


CONNECTORS = [
    ConnectorDefinition(
        id="microsoft_365",
        name="Microsoft 365",
        phase=1,
        priority_label="Phase 1",
        description="Courriels Outlook, SharePoint, Teams, calendriers et fichiers.",
        oauth_authorize_url="https://login.microsoftonline.com/common/oauth2/v2.0/authorize",
        scopes=["openid", "offline_access", "Mail.Read", "Files.Read.All", "Calendars.Read"],
        actions=[
            {"id": "read_email", "label": "Lire courriel"},
            {"id": "send_email", "label": "Envoyer courriel"},
            {"id": "read_sharepoint", "label": "Lire SharePoint"},
            {"id": "create_meeting", "label": "Creer reunion"},
        ],
    ),
    ConnectorDefinition(
        id="servicenow",
        name="ServiceNow",
        phase=2,
        priority_label="Phase 2",
        description="Tickets TI, incidents critiques, SLA et demandes de support.",
        oauth_authorize_url="https://instance.service-now.com/oauth_auth.do",
        scopes=["incident.read", "incident.write"],
        actions=[
            {"id": "create_incident", "label": "Creer incident"},
            {"id": "read_incident", "label": "Lire incident"},
            {"id": "update_incident", "label": "Mettre a jour incident"},
        ],
    ),
    ConnectorDefinition(
        id="jira",
        name="Jira",
        phase=3,
        priority_label="Phase 3",
        description="Projets, epics, sprints, tickets en retard et priorites produit.",
        oauth_authorize_url="https://auth.atlassian.com/authorize",
        scopes=["read:jira-work", "write:jira-work"],
        actions=[
            {"id": "create_ticket", "label": "Creer ticket"},
            {"id": "read_sprint", "label": "Lire sprint"},
            {"id": "close_ticket", "label": "Fermer ticket"},
        ],
    ),
    ConnectorDefinition(
        id="salesforce",
        name="Salesforce",
        phase=4,
        priority_label="Phase 4",
        description="Comptes, opportunites, pipeline commercial et interactions clients.",
        oauth_authorize_url="https://login.salesforce.com/services/oauth2/authorize",
        scopes=["api", "refresh_token"],
        actions=[
            {"id": "read_accounts", "label": "Lire comptes"},
            {"id": "read_opportunities", "label": "Lire opportunites"},
            {"id": "create_task", "label": "Creer tache commerciale"},
        ],
    ),
    ConnectorDefinition(
        id="workday",
        name="Workday",
        phase=5,
        priority_label="Phase 5",
        description="Donnees RH, postes, profils employes et processus talent.",
        oauth_authorize_url="https://impl.workday.com/oauth2/authorize",
        scopes=["workers.read", "jobs.read"],
        actions=[
            {"id": "read_worker", "label": "Lire profil employe"},
            {"id": "read_jobs", "label": "Lire postes"},
            {"id": "read_org_chart", "label": "Lire organigramme"},
        ],
    ),
    ConnectorDefinition(
        id="sap",
        name="SAP",
        phase=6,
        priority_label="Phase 6",
        description="Finances, achats, contrats, factures et donnees ERP complexes.",
        oauth_authorize_url="https://sap.example.com/oauth/authorize",
        scopes=["finance.read", "procurement.read"],
        actions=[
            {"id": "read_contracts", "label": "Lire contrats"},
            {"id": "read_purchase_orders", "label": "Lire achats"},
            {"id": "read_invoices", "label": "Lire factures"},
        ],
    ),
]


CONNECTORS_BY_ID = {connector.id: connector for connector in CONNECTORS}

ROLE_SOURCE_ACCESS = {
    "admin": {"microsoft_365", "servicenow", "jira", "salesforce", "workday", "sap"},
    "it": {"microsoft_365", "servicenow", "jira"},
    "hr": {"microsoft_365", "workday"},
    "finance": {"microsoft_365", "sap", "salesforce"},
    "employee": {"microsoft_365"},
}


def connector_payload(connector: ConnectorDefinition, *, status: str = "planned") -> dict:
    return {
        "id": connector.id,
        "name": connector.name,
        "phase": connector.phase,
        "priority_label": connector.priority_label,
        "status": status,
        "description": connector.description,
        "scopes": connector.scopes,
        "actions": connector.actions,
    }


def build_oauth_url(
    connector: ConnectorDefinition,
    *,
    state: str,
    redirect_uri: str,
    client_id: str | None = None,
) -> str:
    resolved_client_id = client_id or _oauth_client_id(connector.id)
    query = urlencode(
        {
            "client_id": resolved_client_id,
            "redirect_uri": redirect_uri,
            "response_type": "code",
            "scope": " ".join(connector.scopes),
            "state": state,
        }
    )
    return f"{connector.oauth_authorize_url}?{query}"


def can_access_source(*, role: str, source: str) -> bool:
    return source in ROLE_SOURCE_ACCESS.get(role, ROLE_SOURCE_ACCESS["employee"])


def microsoft_oauth_ready() -> bool:
    return all(
        os.getenv(name)
        for name in (
            "MICROSOFT_CLIENT_ID",
            "MICROSOFT_CLIENT_SECRET",
            "MICROSOFT_TENANT_ID",
            "MICROSOFT_REDIRECT_URI",
        )
    )


def search_data(
    *,
    source: str,
    query: str,
    organization_id: str,
    user_id: str | None = None,
) -> dict:
    connector = CONNECTORS_BY_ID[source]
    return {
        "source": connector.id,
        "source_name": connector.name,
        "query": query,
        "organization_id": organization_id,
        "user_id": user_id,
        "results": [
            {
                "title": f"{connector.name}: resultat de demonstration",
                "snippet": (
                    "Le connecteur est abstrait via search_data(). "
                    "En production, cette couche appelle l'API du fournisseur."
                ),
            }
        ],
    }


def _oauth_client_id(connector_id: str) -> str:
    if connector_id == "microsoft_365":
        return os.getenv("MICROSOFT_CLIENT_ID", "civicai-demo-client")
    return "civicai-demo-client"
