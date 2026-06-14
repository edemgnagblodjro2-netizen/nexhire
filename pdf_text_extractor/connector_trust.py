"""
Manifeste de confiance des connecteurs AgentHub.

Niveaux :
  1 = Code uniquement (jamais testé)
  2 = Auth validée
  3 = Données réelles collectées
  4 = Dashboard alimenté
  5 = Validé chez un client réel

trust_level  : niveau actuel du connecteur
can_sandbox  : peut être validé sans client réel (sandbox/dev account gratuit)
validated_at : date ISO de la dernière validation (None = jamais)
notes        : contexte ou prérequis
"""
from __future__ import annotations

CONNECTOR_TRUST: dict[str, dict] = {
    "microsoft_365": {
        "trust_level": 5,
        "can_sandbox": True,
        "validated_at": "2026-06-12",
        "notes": "Validé sur tenant Adminfortinassocies.onmicrosoft.com — données réelles Graph API",
    },
    "intune": {
        "trust_level": 2,
        "can_sandbox": True,
        "validated_at": "2026-06-14",
        "notes": "Auth Graph OK (token client_credentials). Bloqué sur MDM authority non configurée sur tenant Developer Program — validé dès premier client avec Intune actif.",
    },
    "jira": {
        "trust_level": 3,
        "can_sandbox": True,
        "validated_at": "2026-06-13",
        "notes": "OAuth connecté sur edemgnagblodjro2.atlassian.net — scopes jira-user, jira-work, confluence",
    },
    "quickbooks": {
        "trust_level": 3,
        "can_sandbox": True,
        "validated_at": "2026-06-14",
        "notes": "Sandbox Intuit connecté — realm_id 9341457237782000, 20 factures réelles retournées (5852 CAD). QUICKBOOKS_SANDBOX=true sur Render.",
    },
    "salesforce": {
        "trust_level": 1,
        "can_sandbox": True,
        "validated_at": None,
        "notes": "Salesforce Developer Edition — developer.salesforce.com (permanent)",
    },
    "hubspot": {
        "trust_level": 1,
        "can_sandbox": True,
        "validated_at": None,
        "notes": "HubSpot Developer Account — developers.hubspot.com (CRM sandbox permanent)",
    },
    "google_workspace": {
        "trust_level": 1,
        "can_sandbox": True,
        "validated_at": None,
        "notes": "Google Cloud Console + compte Gmail personnel suffisant pour test",
    },
    "slack": {
        "trust_level": 3,
        "can_sandbox": True,
        "validated_at": "2026-06-14",
        "notes": "OAuth v2 validé — workspace Nexhire_EPI (T0B8GDS3895), 3 canaux réels (social, new-channel, all-nexhireepi). Bot token OK. User scope search:read séparé pour search.messages.",
    },
    "servicenow": {
        "trust_level": 1,
        "can_sandbox": True,
        "validated_at": None,
        "notes": "Personal Developer Instance (PDI) — developer.servicenow.com (gratuit, 24h d'activation)",
    },
    "aws": {
        "trust_level": 1,
        "can_sandbox": True,
        "validated_at": None,
        "notes": "AWS Free Tier 12 mois — Cost Explorer disponible même sur compte vide",
    },
    "zendesk": {
        "trust_level": 1,
        "can_sandbox": False,
        "validated_at": None,
        "notes": "Essai 14 jours uniquement — pas de sandbox permanent",
    },
    "bamboohr": {
        "trust_level": 1,
        "can_sandbox": False,
        "validated_at": None,
        "notes": "Essai 7 jours uniquement — recommandé d'attendre un client RH réel",
    },
    "asana": {
        "trust_level": 1,
        "can_sandbox": True,
        "validated_at": None,
        "notes": "Plan Free Asana (15 users, permanent)",
    },
    "monday": {
        "trust_level": 1,
        "can_sandbox": True,
        "validated_at": None,
        "notes": "Plan Free Monday.com (2 users, permanent)",
    },
    "clickup": {
        "trust_level": 1,
        "can_sandbox": True,
        "validated_at": None,
        "notes": "Plan Free ClickUp (permanent)",
    },
    "sap": {
        "trust_level": 1,
        "can_sandbox": False,
        "validated_at": None,
        "notes": "Requiert instance S/4HANA client réel — SAP BTP Trial ne couvre pas S/4HANA Cloud",
    },
    "workday": {
        "trust_level": 1,
        "can_sandbox": False,
        "validated_at": None,
        "notes": "Requiert client sous contrat Workday — Preview Tenant non accessible publiquement",
    },
    "adp": {
        "trust_level": 1,
        "can_sandbox": False,
        "validated_at": None,
        "notes": "Requiert accord partenaire ADP Marketplace",
    },
    "netsuite": {
        "trust_level": 1,
        "can_sandbox": False,
        "validated_at": None,
        "notes": "Requiert client NetSuite réel — Oracle Developer Network par approbation",
    },
    "epicor": {
        "trust_level": 1,
        "can_sandbox": False,
        "validated_at": None,
        "notes": "ERP auto-hébergé — requiert instance client réelle",
    },
    "autotask": {
        "trust_level": 1,
        "can_sandbox": False,
        "validated_at": None,
        "notes": "Réservé aux partenaires Datto/Kaseya — MSP requis",
    },
    "crowdstrike": {
        "trust_level": 1,
        "can_sandbox": False,
        "validated_at": None,
        "notes": "Essai commercial via équipe CrowdStrike uniquement",
    },
}


def get_trust(connector_type: str) -> dict:
    return CONNECTOR_TRUST.get(connector_type, {"trust_level": 0, "can_sandbox": False, "validated_at": None, "notes": ""})


def get_trust_label(level: int) -> str:
    return {
        0: "Inconnu",
        1: "Code uniquement",
        2: "Auth validée",
        3: "Données collectées",
        4: "Dashboard alimenté",
        5: "Validé en production",
    }.get(level, "Inconnu")


def maturity_summary() -> dict:
    levels = [v["trust_level"] for v in CONNECTOR_TRUST.values()]
    return {
        "total": len(levels),
        "level_5": sum(1 for l in levels if l >= 5),
        "level_3_plus": sum(1 for l in levels if l >= 3),
        "level_1": sum(1 for l in levels if l == 1),
        "can_sandbox": sum(1 for v in CONNECTOR_TRUST.values() if v["can_sandbox"]),
        "need_real_client": sum(1 for v in CONNECTOR_TRUST.values() if not v["can_sandbox"]),
    }
