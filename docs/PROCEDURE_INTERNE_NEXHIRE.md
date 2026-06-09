# Procédure interne NexHire EIP — Référence opérationnelle complète

**Version :** 2.0 (juin 2026)  
**Domaine production :** `https://agenthub.nexhire.ca`  
**Hébergement :** Render (FastAPI + Python) + Supabase (PostgreSQL)

---

## Table des matières

1. [Architecture technique](#1-architecture-technique)
2. [Variables d'environnement Render](#2-variables-denvironnement-render)
3. [Base de données Supabase](#3-base-de-données-supabase)
4. [Déploiement et démarrage](#4-déploiement-et-démarrage)
5. [Scheduler — tâches planifiées](#5-scheduler--tâches-planifiées)
6. [Emails transactionnels (Resend)](#6-emails-transactionnels-resend)
7. [Notifications webhook Teams/Slack](#7-notifications-webhook-teamsslack)
8. [Connecteurs — OAuth (catégorie A)](#8-connecteurs--oauth-catégorie-a)
9. [Connecteurs — API Key (catégorie B)](#9-connecteurs--api-key-catégorie-b)
10. [SSO OIDC — configuration](#10-sso-oidc--configuration)
11. [PWA — Progressive Web App](#11-pwa--progressive-web-app)
12. [Interface utilisateur — logique de département](#12-interface-utilisateur--logique-de-département)
13. [Splash screen de bienvenue](#13-splash-screen-de-bienvenue)
14. [Executive Intelligence Dashboard (EID)](#14-executive-intelligence-dashboard-eid)
15. [Sécurité](#15-sécurité)
16. [Checklist onboarding nouveau client](#16-checklist-onboarding-nouveau-client)

---

## 1. Architecture technique

```
pdf_text_extractor/
├── main.py                  ← FastAPI app, routes PWA (/sw.js, /manifest.json), APScheduler
├── routes_auth.py           ← Inscription, connexion, invite, emails welcome
├── routes_billing.py        ← Stripe webhooks, abonnements, emails confirmation/annulation
├── routes_budget.py         ← Budget CRUD, alertes webhook à 80%
├── routes_connectors.py     ← OAuth + API Key + /ping test
├── routes_departments.py    ← Dashboard par département, KPIs, access_level
├── routes_sso.py            ← SSO OIDC authorize/callback, magic link
├── routes_webhooks.py       ← Configuration webhooks Teams/Slack, send_webhook_notification()
├── scheduler.py             ← Tâches planifiées (license_expiry, trial_expiry)
├── email_service.py         ← Resend — welcome, trial warning, cancellation
├── static/
│   ├── app.js               ← Frontend SPA principal
│   ├── index.html           ← Meta PWA, splash screen HTML, SW registration
│   ├── styles.css           ← Splash screen animations, PWA styles
│   ├── manifest.json        ← PWA manifest (servi depuis /manifest.json)
│   ├── sw.js                ← Service worker (servi depuis /sw.js)
│   └── icons/               ← Icônes PNG 72-512px + apple-touch-icon.png
```

**Stack :**

| Couche | Technologie |
|---|---|
| Backend | FastAPI (Python) |
| Base de données | Supabase PostgreSQL |
| Auth | Supabase Auth + JWT |
| Hébergement | Render (Web Service) |
| Emails | Resend API |
| Paiements | Stripe (webhooks) |
| SSO | OIDC / OAuth 2.0 (Entra ID, Google, Okta) |
| Scheduler | APScheduler (CronTrigger) |
| PWA | manifest.json + service worker natif |

---

## 2. Variables d'environnement Render

**Render Dashboard → ton service → Environment → Add Environment Variable**

### Base (obligatoires)

```
SUPABASE_URL                = https://XXXXX.supabase.co
SUPABASE_SERVICE_ROLE_KEY   = eyJ...
OPENAI_API_KEY              = sk-...
OPENAI_MODEL                = gpt-4o-mini
APP_URL                     = https://agenthub.nexhire.ca
```

### Stripe

```
STRIPE_SECRET_KEY           = sk_live_...
STRIPE_WEBHOOK_SECRET       = whsec_...
STRIPE_PRICE_MONTHLY        = price_...
STRIPE_PRICE_ANNUAL         = price_...
```

### Resend (emails transactionnels)

```
RESEND_API_KEY              = re_...
EMAIL_FROM                  = NexHire <noreply@nexhire.ca>
```

### SSO OIDC

```
SSO_SECRET_KEY              = (clé aléatoire 32 chars pour chiffrement Fernet)
```

### Connecteurs OAuth — Catégorie A (apps partagées)

```
M365_CLIENT_ID              = ...
M365_CLIENT_SECRET          = ...
M365_REDIRECT_URI           = https://agenthub.nexhire.ca/api/connectors/oauth/callback

SF_CLIENT_ID                = ...
SF_CLIENT_SECRET            = ...
SF_REDIRECT_URI             = https://agenthub.nexhire.ca/api/connectors/oauth/callback

JIRA_CLIENT_ID              = ...
JIRA_CLIENT_SECRET          = ...
JIRA_REDIRECT_URI           = https://agenthub.nexhire.ca/api/connectors/oauth/callback

HUBSPOT_CLIENT_ID           = ...
HUBSPOT_CLIENT_SECRET       = ...
HUBSPOT_REDIRECT_URI        = https://agenthub.nexhire.ca/api/connectors/oauth/callback

GOOGLE_CLIENT_ID            = ...
GOOGLE_CLIENT_SECRET        = ...
GOOGLE_REDIRECT_URI         = https://agenthub.nexhire.ca/api/connectors/oauth/callback

SLACK_CLIENT_ID             = ...
SLACK_CLIENT_SECRET         = ...
SLACK_REDIRECT_URI          = https://agenthub.nexhire.ca/api/connectors/oauth/callback

QUICKBOOKS_CLIENT_ID        = ...
QUICKBOOKS_CLIENT_SECRET    = ...
QUICKBOOKS_REDIRECT_URI     = https://agenthub.nexhire.ca/api/connectors/oauth/callback
```

> **Connecteurs Catégorie B** (ServiceNow, Zendesk, SAP, Workday, Autotask, BambooHR, NetSuite, Asana, Monday.com, ClickUp) : aucune variable Render — les credentials sont saisies directement dans le portail NexHire par l'admin client et chiffrées en base.

---

## 3. Base de données Supabase

### Fichiers SQL à exécuter dans Supabase SQL Editor (ordre important)

| Fichier | Contenu |
|---|---|
| `supabase_schema.sql` | Tables de base : organizations, users, documents, conversations |
| `phase7_members.sql` | Départements, membres, rôles, invitations |
| `phase_billing.sql` | Abonnements Stripe, historique facturation |
| `phase_connectors.sql` | Credentials connecteurs chiffrées |
| `phase_sso.sql` | Configuration SSO par organisation |
| `phase_webhooks.sql` | Webhook endpoints Teams/Slack |
| `phase_budget.sql` | Entrées budgétaires, catégories |
| `phase_monthly_report.sql` | Snapshots KPI mensuels |
| `phase_kpi_snapshots.sql` | Historique KPI pour tendances EID |

### Paramètre Supabase à configurer

- **Authentication → URL Configuration → Site URL** : `https://agenthub.nexhire.ca`
- **Authentication → URL Configuration → Redirect URLs** : ajouter `https://agenthub.nexhire.ca/**`

---

## 4. Déploiement et démarrage

### Render — configuration

- **Build Command :** `pip install -r pdf_text_extractor/requirements.txt`
- **Start Command :** `cd pdf_text_extractor && uvicorn main:app --host 0.0.0.0 --port $PORT`
- **Health Check Path :** `/api/health`
- **Auto-Deploy :** activé sur push `main`

### Routes spéciales (ne pas supprimer de main.py)

| Route | Rôle |
|---|---|
| `GET /sw.js` | Service worker avec header `Service-Worker-Allowed: /` |
| `GET /manifest.json` | PWA manifest |
| `GET /` | SPA fallback (index.html) |

---

## 5. Scheduler — tâches planifiées

Géré par **APScheduler** dans `main.py`, démarré au démarrage de l'app.

| Job ID | Déclencheur | Fonction | Description |
|---|---|---|---|
| `monthly_report` | 1er du mois à 08h00 | `generate_monthly_report_all_orgs()` | Génère les rapports KPI mensuels pour toutes les orgs |
| `license_expiry_check` | Tous les jours à 09h00 | `check_license_expiry_all_orgs()` | Alerte webhook si licence expire dans ≤ 30 jours |
| `trial_expiry_check` | Tous les jours à 10h00 | `check_trial_expiry_all_orgs()` | Email d'urgence si essai expire dans 7, 3 ou 1 jour |

### Logique `check_trial_expiry_all_orgs()`

- Requête : orgs avec `subscription_status='trialing'`
- Calcul `days_left = trial_end_date - today`
- Si `days_left IN (7, 3, 1)` → `send_trial_expiry_warning(email, org_name, days_left)`

### Logique `check_license_expiry_all_orgs()`

- Requête : licences avec `expiry_date <= today + 30 jours`
- Pour chaque licence → `send_webhook_notification(org_id, "license_expiry", {...})`

---

## 6. Emails transactionnels (Resend)

Fichier : `pdf_text_extractor/email_service.py`

| Fonction | Déclencheur | Contenu |
|---|---|---|
| `send_welcome_email(to, name, org, trial_days=14)` | Inscription (non-invite) | Bienvenue + 4 étapes pour démarrer |
| `send_trial_expiry_warning(to, org, days_left)` | Scheduler J-7 / J-3 / J-1 | Bannière urgence, tarifs, CTA upgrade |
| `send_subscription_confirmation(to, org, plan, amount)` | Activation Stripe | Confirmation abonnement actif |
| `send_subscription_cancelled_email(to, org)` | Annulation Stripe | Confirmation annulation + CTA réactivation |

### Tester en local

```bash
export RESEND_API_KEY=re_...
export EMAIL_FROM="NexHire <noreply@nexhire.ca>"
python -c "from email_service import send_welcome_email; send_welcome_email('test@example.com','Test','Ma Ville',14)"
```

---

## 7. Notifications webhook Teams/Slack

Fichier : `pdf_text_extractor/routes_webhooks.py`

### Événements déclencheurs

| Événement | Fichier source | Condition |
|---|---|---|
| `member_join` | `routes_auth.py` | Acceptation d'une invitation |
| `subscription` | `routes_billing.py` | Activation Stripe (`nexhire_status == "active"`) |
| `budget_alert` | `routes_budget.py` | Dépenses ≥ 80% du budget alloué |
| `license_expiry` | `scheduler.py` | Licence expirant dans ≤ 30 jours |

### Fonction centrale

```python
send_webhook_notification(org_id: str, event: str, data: dict)
# → Récupère les endpoints configurés pour cette org
# → Dispatch vers Slack (via Incoming Webhook) ou Teams (Adaptive Card)
```

### Configuration côté client (dans NexHire)

**Paramètres → Intégrations → Alertes** :
1. Coller l'URL du webhook Teams ou Slack
2. Choisir les événements à recevoir
3. Tester avec le bouton "Envoyer un test"

---

## 8. Connecteurs — OAuth (catégorie A)

Apps partagées — une seule app OAuth NexHire pour tous les clients.

| Connecteur | Statut | Variables Render |
|---|---|---|
| Microsoft 365 | ✅ Configuré | `M365_CLIENT_ID/SECRET/REDIRECT_URI` |
| Salesforce CRM | ✅ Configuré | `SF_CLIENT_ID/SECRET/REDIRECT_URI` |
| QuickBooks Online | ✅ Configuré | `QUICKBOOKS_CLIENT_ID/SECRET/REDIRECT_URI` |
| Google Workspace | ⏳ En cours | `GOOGLE_CLIENT_ID/SECRET/REDIRECT_URI` |
| Jira / Confluence | ⏳ À configurer | `JIRA_CLIENT_ID/SECRET/REDIRECT_URI` |
| HubSpot | ⏳ À configurer | `HUBSPOT_CLIENT_ID/SECRET/REDIRECT_URI` |
| Slack | ⏳ À configurer | `SLACK_CLIENT_ID/SECRET/REDIRECT_URI` |

**URL de callback universelle :** `https://agenthub.nexhire.ca/api/connectors/oauth/callback`

Pour les étapes de configuration détaillées → voir `docs/GUIDE_SETUP_OAUTH_NEXHIRE_INTERNE.md`

---

## 9. Connecteurs — API Key (catégorie B)

Credentials saisies par l'admin client dans le portail NexHire, chiffrées Fernet AES-128 en base.

### Test de connectivité (endpoint /ping)

Après sauvegarde des credentials, le frontend appelle automatiquement :

```
POST /api/connectors/{type}/ping
```

| Connecteur | Ce qui est testé |
|---|---|
| `sap` | Requête OData GET vers l'instance SAP |
| `workday` | Échange de token OAuth2 + requête /workers |
| `autotask` | Requête Tickets/query vers l'API Autotask |

Si `ping.ok === false` → alerte affichée à l'admin avec le message d'erreur.

### Champs requis par connecteur

| Connecteur | Champs obligatoires |
|---|---|
| SAP | `url`, `username`, `password` |
| Workday | `tenant_url`, `client_id`, `client_secret` |
| Autotask | `username`, `api_key`, `api_integration_code`, `zone_url` |
| BambooHR | `subdomain`, `api_key` |
| NetSuite | `account_id`, `consumer_key`, `consumer_secret`, `token_id`, `token_secret` |
| Asana | `access_token` |
| Monday.com | `api_token` |
| ClickUp | `api_token` |

---

## 10. SSO OIDC — configuration

Fichier : `pdf_text_extractor/routes_sso.py`

### Flux complet

```
1. Admin client configure SSO dans NexHire (Paramètres → SSO)
   → Fournisseur : Microsoft Entra ID / Google Workspace / Okta
   → Client ID, Client Secret, Tenant ID / Domain

2. Employé sur agenthub.nexhire.ca :
   → Entre son slug d'organisation
   → Clique "Se connecter avec SSO"
   → GET /api/sso/authorize?org_slug=mon-org

3. Redirect vers l'IdP (Microsoft/Google/Okta)
   → Authentification IdP

4. Callback : GET /api/sso/callback?code=...&state=...
   → NexHire échange le code contre un access_token IdP
   → Crée ou retrouve l'utilisateur dans Supabase
   → Génère un magic link Supabase
   → Redirect vers /?token=... → session active
```

### Restriction d'accès

Seuls les rôles `admin` et `owner` peuvent voir et modifier la configuration SSO dans l'interface.

### Variables

La variable `SSO_SECRET_KEY` (Render) doit être une chaîne aléatoire de 32+ caractères — utilisée pour chiffrer les credentials IdP stockées en base.

---

## 11. PWA — Progressive Web App

### Routes dans main.py

```python
GET /sw.js         → headers: {"Service-Worker-Allowed": "/"}
GET /manifest.json → manifest JSON
```

> ⚠️ Le service worker DOIT être servi depuis `/sw.js` (pas `/static/sw.js`) pour avoir accès à toute l'application.

### Stratégie de cache (sw.js)

| Pattern | Stratégie |
|---|---|
| `/api/*` | Network-first → 503 offline si réseau indisponible |
| `/static/*` | Cache-first → performance maximale |
| Autres | SPA fallback → index.html |

### Installation (côté utilisateur)

- **Desktop Chrome/Edge** : icône d'installation dans la barre d'adresse
- **iOS Safari** : "Partager → Sur l'écran d'accueil"
- **Android Chrome** : bannière automatique ou menu → "Ajouter à l'écran d'accueil"

### Raccourcis PWA

| Raccourci | URL |
|---|---|
| Agent IA | `/?shortcut=agent` |
| Tableau de bord | `/?shortcut=dashboard` |

---

## 12. Interface utilisateur — logique de département

### Comment l'assistant IA se contextualise automatiquement

Au login → `showApp()` → `loadDeptDashboard()` → `GET /api/departments/dashboard`

Le backend retourne `dept_type` selon l'utilisateur :

| Rôle / Affectation | `dept_type` retourné | Assistant IA pointe vers |
|---|---|---|
| Owner / Admin (sans dept) | `direction` | Direction Générale |
| Employé → Juridique | `legal` | Juridique / Compliance |
| Employé → Finance | `finance` | Finance / Budget |
| Employé → IT | `it` | IT / Infrastructure |
| Employé → RH | `hr` | Ressources Humaines |
| Employé → Opérations | `operations` | Opérations |
| Employé → Marketing | `marketing` | Marketing |
| Employé sans département | `general` | Vue générale |

### Niveaux d'accès (access_level)

| Niveau | Profil |
|---|---|
| 1 | Admin / Owner |
| 2 | Manager de département |
| 3–5 | Membres selon ancienneté |
| 6 | Aucun accès (cross-org non autorisé) |

---

## 13. Splash screen de bienvenue

Affiché **une seule fois par session** (contrôlé par `sessionStorage.getItem("nx_splash_shown")`).

- Durée : 5,5 secondes d'affichage → 0,8 seconde de fade-out
- Contenu : logo animé "N", nom de l'organisation, tagline "Enterprise Intelligence Platform"
- 18 particules flottantes animées
- Déclenché dans `showApp()` après chargement réussi

---

## 14. Executive Intelligence Dashboard (EID)

### Fonctionnalités

- **Cartes KPI** accordéon par département (expandables)
- **Ticker** défilant avec les métriques en temps réel
- **Alertes cliquables** avec actions contextuelles
- **Historique KPI** : graphique Chart.js avec courbe de tendance
- **Modal tendance** : évolution mensuelle d'un KPI sur 6 mois
- **Snapshots automatiques** : table `kpi_snapshots` mise à jour par le scheduler mensuel

### Table kpi_snapshots

```sql
-- Voir phase_kpi_snapshots.sql
-- Colonnes : org_id, dept_id, kpi_key, value, snapshot_date
```

---

## 15. Sécurité

| Point | Implémentation |
|---|---|
| Credentials connecteurs | Chiffrées Fernet AES-128 avant stockage |
| Credentials SSO | Chiffrées avec `SSO_SECRET_KEY` |
| JWT sessions | Géré par Supabase Auth |
| Clés API | Jamais loggées, jamais affichées en clair dans l'interface |
| HTTPS | Enforced par Render (TLS automatique) |
| Webhook secrets | Validés côté Stripe (signature HMAC) |
| Rôles | Vérification `require_min_role()` sur chaque endpoint sensible |

---

## 16. Checklist onboarding nouveau client

### Côté NexHire (avant livraison)

- [ ] Créer l'organisation dans Supabase
- [ ] Créer le compte admin/owner et l'inviter
- [ ] Configurer le slug d'organisation (pour SSO)
- [ ] Vérifier que l'email de bienvenue est bien reçu (Resend)
- [ ] Configurer le plan Stripe (essai 14 jours ou abonnement direct)

### Côté client (à faire par l'admin)

- [ ] Se connecter sur `https://agenthub.nexhire.ca`
- [ ] Créer ses départements (Paramètres → Départements)
- [ ] Inviter ses membres et les affecter aux bons départements
- [ ] Configurer les connecteurs souhaités (Connecteurs → choisir le système)
- [ ] Configurer le SSO si souhaité (Paramètres → SSO → entrer Client ID / Secret / Tenant ID)
- [ ] Configurer les alertes Teams ou Slack (Paramètres → Intégrations → Alertes)
- [ ] Installer l'app PWA sur bureau/mobile (icône dans la barre d'adresse)

---

*Dernière mise à jour : juin 2026 — NexHire EIP v2.0*
