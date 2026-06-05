from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class ConnectorDefinition:
    id: str
    name: str
    phase: int
    priority_label: str
    description: str


CONNECTORS = [
    ConnectorDefinition(
        id="microsoft_365",
        name="Microsoft 365",
        phase=1,
        priority_label="Phase 1",
        description="Courriels Outlook, SharePoint, Teams, calendriers et fichiers.",
    ),
    ConnectorDefinition(
        id="servicenow",
        name="ServiceNow",
        phase=2,
        priority_label="Phase 2",
        description="Tickets TI, incidents critiques, SLA et demandes de support.",
    ),
    ConnectorDefinition(
        id="jira",
        name="Jira",
        phase=3,
        priority_label="Phase 3",
        description="Projets, epics, sprints, tickets en retard et priorites produit.",
    ),
    ConnectorDefinition(
        id="salesforce",
        name="Salesforce",
        phase=4,
        priority_label="Phase 4",
        description="Comptes, opportunites, pipeline commercial et interactions clients.",
    ),
    ConnectorDefinition(
        id="workday",
        name="Workday",
        phase=5,
        priority_label="Phase 5",
        description="Donnees RH, postes, profils employes et processus talent.",
    ),
    ConnectorDefinition(
        id="sap",
        name="SAP",
        phase=6,
        priority_label="Phase 6",
        description="Finances, achats, contrats, factures et donnees ERP complexes.",
    ),
]


CONNECTORS_BY_ID = {connector.id: connector for connector in CONNECTORS}


def connector_payload(connector: ConnectorDefinition, *, status: str = "planned") -> dict:
    return {
        "id": connector.id,
        "name": connector.name,
        "phase": connector.phase,
        "priority_label": connector.priority_label,
        "status": status,
        "description": connector.description,
    }
