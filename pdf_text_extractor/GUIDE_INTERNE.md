# Guide Interne — MyPortal Operations (CivicAI / NexHire)

Document opérationnel pour l'équipe NexHire. Mis à jour le 2026-06-19.

---

## État actuel : ce qui est fait

### Infrastructure
- [x] FastAPI multi-tenant sur Render
- [x] Supabase PostgreSQL avec RBAC complet
- [x] JWT HS256 + SSO OIDC (Entra ID / Google / Okta)
- [x] Stripe Checkout + webhooks + portail client
- [x] Emails Resend (invitations, alertes, rapports hebdomadaires)
- [x] Monitoring Logfire (remplace Sentry — gratuit)
- [x] Pages légales (CGU, confidentialité, sécurité)
- [x] Smoke tests `smoke_tests.py` (mock + réel)

### Connecteurs
- [x] 22 connecteurs avec fallback mock automatique
- [x] Bug fix `_call_tool` : `if _real_matched and _real_result is not None`
- [x] Indicateurs visuels mock vs réel dans l'UI
- [x] Manifeste de maturité `connector_trust.py`
- [x] Endpoint `GET /api/connectors/trust`

### Migrations DB exécutées
- [x] `phase20_connector_expiry.sql` — colonne `token_expires_at`
- [x] `phase21_missing_indexes.sql` — index de performance
- [x] `phase22_drop_entities_legacy.sql` — tables legacy supprimées
- [x] `migrate_currency.sql` — colonne `currency` sur `organizations`
- [x] `add_document_dept.sql` — colonne `department_id` sur `documents` (exécuté 2026-06-20)
- [ ] `add_contract_soft_delete.sql` — colonne `deleted_at` sur `contracts` **(à exécuter dans Supabase SQL Editor)**

### Dashboards
- [x] Posture sécurité Entra ID (MFA, admins, risques)
- [x] Assets Intune (appareils, conformité)
- [x] Transactions financières IT (fournisseurs, factures)
- [x] Gouvernance IT v2 (modules intégrés)

### Copilots IA (AgentHub Intelligence Platform)
- [x] Finance Copilot — score, maturité, synthèse IA, recommandations (sous-tab "Vue Exécutive")
- [x] RH Copilot — même structure, données membres
- [x] Procurement Copilot — tab Achats dédié (Vue Exécutive, Contrats, Fournisseurs, Dépenses)
- [x] IT Copilot — sous-tab "Copilot IT" dans Parc IT
- [x] Executive Copilot — sous-tab "Executive Copilot" dans Organisation (admin/owner)
- [x] Global Intelligence Score = Finance×0.30 + RH×0.20 + Achats×0.25 + IT×0.25

### RBAC Départemental (2026-06-19)
- [x] Tabs Finance et Achats masqués pour les utilisateurs hors département
- [x] `switchTab()` bloque la navigation directe (URL hash, popstate)
- [x] Recherche interne retirée du menu principal → intégrée dans Finance, Achats, Parc IT
- [x] `/api/search/internal` filtre les documents par `department_id` (même pattern que `routes_budget.py`)
- [x] `/api/documents` (GET) : filtre dept — `department_id IS NULL OR department_id IN (user's depts)`
- [x] Upload de document : champ `department_id` optionnel (null = toute l'org)
- [x] `state.user.dept_types` (retourné par `/api/auth/me`) pilote toute la visibilité nav

---

## Ce qui reste avant premier client payant

### Priorité 1 — Validation connecteurs (cette semaine)

#### Intune
- [ ] Vérifier permission `DeviceManagementManagedDevices.Read.All` sur l'App Registration Azure
- [ ] Enrôler un appareil test dans le tenant M365 Developer Program
- [ ] Lancer : `python smoke_tests.py --real intune <org_id_test>`
- [ ] Si OK → mettre `trust_level: 3` dans `connector_trust.py`

#### Jira ✅
- [x] Site Jira Free : `edemgnagblodjro2.atlassian.net` (espace AgentHub Demo)
- [x] Auth via API Token (Basic Auth) — OAuth Bearer non supporté sur URL directe sans claim JWT audience
- [x] Endpoint `/rest/api/3/search/jql` (GET) — `/rest/api/3/search` est déprécié (410)
- [x] Agent retourne tickets réels (SCRUM-2, SCRUM-5, SCRUM-6 validés 2026-06-14)
- [x] `trust_level: 3` dans `connector_trust.py`
- ⚠️ Token API expire le 2026-06-20 — renouveler avant cette date sur id.atlassian.com

#### QuickBooks ✅
- [x] App Intuit Developer créée — sandbox Development keys sur Render
- [x] Env vars Render : `QUICKBOOKS_CLIENT_ID`, `QUICKBOOKS_CLIENT_SECRET`, `QUICKBOOKS_REDIRECT_URI`, `QUICKBOOKS_SANDBOX=true`
- [x] Sandbox connecté — realm_id `9341457237782000`, company "Sandbox Company US 7492"
- [x] Ping `/companyinfo` → ok:true (2026-06-14)
- [x] `trust_level: 3` dans `connector_trust.py`
- ⚠️ Passer `QUICKBOOKS_SANDBOX=false` + clés Production Intuit quand premier client QB réel

### Priorité 2 — Variables Render à vérifier

Aller sur Render Dashboard → ton service → **Environment** et vérifier :

| Variable | Statut attendu |
|---|---|
| `LOGFIRE_TOKEN` | ✅ Configuré (session 2026-06-12) |
| `RESEND_API_KEY` | ✅ Configuré |
| `STRIPE_SECRET_KEY` | ✅ Configuré |
| `STRIPE_WEBHOOK_SECRET` | ✅ Configuré |
| `STRIPE_PRICE_STARTER` | ⚠️ Créer Price ID Stripe à 99$/mois |
| `STRIPE_PRICE_PROFESSIONAL` | ⚠️ Créer Price ID Stripe à 299$/mois |
| `JIRA_CLIENT_ID` | ⚠️ À vérifier |
| `JIRA_CLIENT_SECRET` | ⚠️ À vérifier |
| `JIRA_REDIRECT_URI` | ⚠️ À vérifier |
| `QB_CLIENT_ID` | ❌ À ajouter |
| `QB_CLIENT_SECRET` | ❌ À ajouter |
| `SALESFORCE_CLIENT_ID` | ❌ À ajouter si client Salesforce |
| `HUBSPOT_CLIENT_ID` | ❌ À ajouter si client HubSpot |

### Priorité 3 — Dashboard Jira dédié (optionnel avant premier client)

Actuellement, les données Jira sont accessibles via l'agent conversationnel uniquement.  
Il n'existe pas de widget KPI Jira dans le dashboard DG.

Si un client demande un widget Jira : ajouter dans `routes_dashboard.py` + `static/app.js`.  
**Ne pas développer avant qu'un client le demande explicitement.**

---

## Runbook : déploiement sur Render

```bash
git push origin main
```

Render redéploie automatiquement. Durée : ~2-3 min.

Pour forcer un redéploiement sans commit :
- Render Dashboard → ton service → **Manual Deploy**

---

## Runbook : smoke tests avant chaque déploiement

```bash
cd pdf_text_extractor
python smoke_tests.py
# Doit afficher : ✓ PASS xx/xx
```

Si un test échoue, ne pas déployer avant correction.

---

## Runbook : ajouter un nouveau connecteur

1. Créer `<connector>_service.py` avec fonction principale + retour `None` si pas de credentials
2. Ajouter dans `agent_service.py` : branche `elif name == "<connector>":` dans `_call_tool()`
3. Ajouter `_mock_<connector>()` dans `agent_service.py`
4. Ajouter `"<connector>"` dans `VALID_TYPES` dans `routes_connectors.py`
5. Ajouter l'entrée dans `CONNECTOR_TRUST` dans `connector_trust.py`
6. Si OAuth : ajouter la config dans `routes_oauth.py`
7. Ajouter le test mock dans `smoke_tests.py`
8. Lancer `python smoke_tests.py` — doit passer

---

## Runbook : valider un connecteur (passer Level 1 → 3+)

1. Configurer les credentials dans Supabase pour l'org de test
2. Lancer `python smoke_tests.py --real <connector> <org_id>`
3. Vérifier que `is_simulated=False` dans les logs Logfire
4. Mettre à jour `connector_trust.py` : `trust_level`, `validated_at`
5. Commit + push

---

## Runbook : onboarder un nouveau client M365

1. Client crée son compte MyPortal (myportal.nexhire.ca/inscription?partenaire={slug})
2. Aller dans **Paramètres → Organisation** → noter l'`org_id`
3. Client va dans **Connecteurs → Microsoft 365 → Connecter**
4. Client se connecte avec son compte admin Microsoft
5. Vérifier dans Supabase : `SELECT * FROM connectors WHERE organization_id = '<org_id>'`
6. Lancer `python smoke_tests.py --real microsoft_365 <org_id>`
7. Si `PASS` → client est opérationnel

---

## Matrice de maturité connecteurs (2026-06-12)

| Connecteur | Niveau | Sandbox dispo | Validé le |
|---|---|---|---|
| Microsoft 365 | 5 — Validé prod | Oui | 2026-06-12 |
| Intune | 1 — Code only | Oui | — |
| Jira | 3 — Données collectées | Oui | 2026-06-14 |
| QuickBooks | 3 — Données collectées | Oui | 2026-06-14 |
| Salesforce | 1 — Code only | Oui | — |
| HubSpot | 1 — Code only | Oui | — |
| Google Workspace | 1 — Code only | Oui | — |
| Slack | 1 — Code only | Oui | — |
| ServiceNow | 1 — Code only | Oui (PDI) | — |
| AWS | 1 — Code only | Oui (Free Tier) | — |
| Asana | 1 — Code only | Oui | — |
| Monday | 1 — Code only | Oui | — |
| ClickUp | 1 — Code only | Oui | — |
| SAP | 1 — Code only | Non | — |
| Workday | 1 — Code only | Non | — |
| BambooHR | 1 — Code only | Non (essai 7j) | — |
| Zendesk | 1 — Code only | Non (essai 14j) | — |
| NetSuite | 1 — Code only | Non | — |
| ADP | 1 — Code only | Non | — |
| Epicor | 1 — Code only | Non | — |
| Autotask | 1 — Code only | Non | — |
| CrowdStrike | 1 — Code only | Non | — |

---

## Contacts et accès

| Service | Accès |
|---|---|
| Render | Dashboard Render → service `agenthub` |
| Supabase | dashboard.supabase.com → projet NexHire |
| Logfire | logfire.pydantic.dev |
| Resend | resend.com → dashboard |
| Stripe | dashboard.stripe.com |
| Atlassian Dev | developer.atlassian.com/console/myapps |
| Jira (test) | edemgnagblodjro2.atlassian.net — plan Free, espace "AgentHub Demo" |
| Intuit Dev | developer.intuit.com |

---

## Instance Jira de test

- **Site :** `edemgnagblodjro2.atlassian.net`
- **Plan :** Free (10 users, permanent)
- **Espace :** AgentHub Demo (Scrum) — types : Task · Story · Feature · Request · Bug
- **Statuts :** To Do → In Progress → In Review → Done
- **OAuth App :** developer.atlassian.com/console/myapps
- **Callback :** `https://myportal.nexhire.ca/api/connectors/oauth/callback`
- **Env vars Render :** `JIRA_CLIENT_ID` · `JIRA_CLIENT_SECRET` · `JIRA_REDIRECT_URI`

> ⚠️ Passer au plan **Standard** (7 $/user/mois) quand un client dépasse 10 users ou a besoin d'automatisations avancées.
