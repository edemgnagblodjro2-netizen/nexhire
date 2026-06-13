# AgentHub — NexHire Enterprise Intelligence Platform

Assistant IA multi-connecteurs pour PME et grandes entreprises canadiennes.  
Hébergé sur Render · Base Supabase PostgreSQL · FastAPI + Python

---

## Stack

| Couche | Technologie |
|---|---|
| Backend | FastAPI + Python 3.12 |
| Base de données | Supabase PostgreSQL (multi-tenant) |
| IA | Claude claude-sonnet-4-6 (Anthropic) |
| Auth | JWT HS256 + SSO OIDC (Entra ID / Google / Okta) |
| Paiements | Stripe Checkout + webhooks |
| Emails | Resend (invitations, rapports, alertes) |
| Monitoring | Logfire (Pydantic) |
| Chiffrement | Fernet (credentials connecteurs) |

---

## Connecteurs (22)

| Catégorie | Connecteurs |
|---|---|
| Microsoft | Microsoft 365, Intune |
| ITSM | ServiceNow, Jira, Zendesk |
| CRM/Ventes | Salesforce, HubSpot |
| Collaboration | Google Workspace, Slack |
| Gestion projet | Asana, Monday, ClickUp |
| Finance | QuickBooks, SAP, NetSuite |
| RH | Workday, BambooHR, ADP |
| Cloud | AWS |
| Sécurité | CrowdStrike |
| ERP/MSP | Epicor, Autotask |

Tous les connecteurs ont un fallback mock automatique si non configurés.

---

## Variables d'environnement requises

```bash
# Core
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
FERNET_KEYS=                      # clé Fernet pour chiffrement credentials
JWT_SECRET=                       # secret JWT
OPENAI_API_KEY=                   # ou ANTHROPIC_API_KEY
ANTHROPIC_API_KEY=

# Email
RESEND_API_KEY=

# Stripe
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PRICE_ID_STARTER=
STRIPE_PRICE_ID_PRO=
STRIPE_PRICE_ID_ENTERPRISE=

# Monitoring
LOGFIRE_TOKEN=

# OAuth connectors (chaque connecteur actif)
JIRA_CLIENT_ID=
JIRA_CLIENT_SECRET=
JIRA_REDIRECT_URI=
SALESFORCE_CLIENT_ID=
SALESFORCE_CLIENT_SECRET=
HUBSPOT_CLIENT_ID=
HUBSPOT_CLIENT_SECRET=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
SLACK_CLIENT_ID=
SLACK_CLIENT_SECRET=
QB_CLIENT_ID=
QB_CLIENT_SECRET=

# Environnement
ENVIRONMENT=production
BASE_URL=https://agenthub.nexhire.ca
```

---

## Lancer en local

```bash
cd pdf_text_extractor
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

Portail : http://127.0.0.1:8000

---

## Smoke tests

```bash
# Tous les tests mock (pas de credentials requis)
python smoke_tests.py

# Test réel d'un connecteur (credentials en Supabase requis)
python smoke_tests.py --real intune <org_id>
python smoke_tests.py --real jira <org_id>
python smoke_tests.py --real microsoft_365 <org_id>
```

---

## Migrations DB (ordre chronologique)

| Fichier | Description |
|---|---|
| `supabase_schema.sql` | Schema initial |
| `phase20_connector_expiry.sql` | Colonne token_expires_at |
| `phase21_missing_indexes.sql` | Index de performance |
| `phase22_drop_entities_legacy.sql` | Suppression tables legacy |

---

## Architecture multi-tenant

- Chaque organisation a son `organization_id` (UUID)
- Credentials connecteurs chiffrés par org en DB (`connectors.encrypted_credentials`)
- RBAC : `user(1) < manager(2) < admin(3) < owner(4)`
- Isolation totale : aucune donnée org A visible par org B

---

## Maturité connecteurs

- **Niveau 5** (validé en production) : Microsoft 365
- **Niveau 1** (code uniquement) : les 21 autres

Voir `connector_trust.py` pour le manifeste complet.  
Endpoint : `GET /api/connectors/trust` (rôle manager minimum)
