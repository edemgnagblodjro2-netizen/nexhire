# Guide interne — Configuration OAuth NexHire (à faire une seule fois)

Ce guide est pour l'équipe NexHire. Il y a deux catégories de connecteurs OAuth :

**Catégorie A — App NexHire partagée (tu enregistres une fois, tous les clients partagent) :**
Microsoft 365, Salesforce, Jira, HubSpot, Google Workspace, Slack, QuickBooks

**Catégorie B — App per-client (chaque client enregistre sa propre app OAuth chez lui) :**
ServiceNow, Zendesk → aucune variable Render nécessaire, l'admin NexHire entre les credentials dans un modal au moment de la connexion.

**URL de callback à utiliser partout :**
```
https://agenthub.nexhire.ca/api/connectors/oauth/callback
```

**Une fois les clés obtenues → les ajouter dans Render :**
Dashboard Render → ton service → Environment → Add Environment Variable

---

## 1. Microsoft 365

**Variables Render :** `M365_CLIENT_ID` · `M365_CLIENT_SECRET` · `M365_REDIRECT_URI`

**Étapes :**
1. Va sur [portal.azure.com](https://portal.azure.com) → connecte-toi avec un compte Microsoft
2. **Azure Active Directory → App registrations → New registration**
3. Remplis :
   - Name : `NexHire`
   - Supported account types : **Accounts in any organizational directory (Any Azure AD tenant - Multitenant)**
   - Redirect URI : Web → `https://agenthub.nexhire.ca/api/connectors/oauth/callback`
4. Clique **Register**
5. Note le **Application (client) ID** → c'est `M365_CLIENT_ID`
6. Va dans **Certificates & secrets → New client secret**
   - Description : `nexhire-prod`, Expiration : 24 mois
   - Clique **Add** → note immédiatement le **Value** → c'est `M365_CLIENT_SECRET`
7. Va dans **API permissions → Add a permission → Microsoft Graph → Delegated**
   - Ajoute : `Mail.Read`, `Files.Read.All`, `Sites.Read.All`, `Calendars.Read`, `Chat.Read`, `User.Read`, `offline_access`, `openid`, `email`, `profile`

**Dans Render :**
```
M365_CLIENT_ID     = <Application (client) ID>
M365_CLIENT_SECRET = <Client secret Value>
M365_REDIRECT_URI  = https://agenthub.nexhire.ca/api/connectors/oauth/callback
```

---

## 2. Salesforce CRM ✅

**Variables Render :** `SF_CLIENT_ID` · `SF_CLIENT_SECRET` · `SF_REDIRECT_URI`

> ⚠️ Salesforce Developer Edition est gratuit et permanent (pas de limite 30 jours) : [developer.salesforce.com/signup](https://developer.salesforce.com/signup). Ne pas confondre avec l'essai commercial 30 jours.

**Étapes (nouvelle interface — External Client App) :**
1. Connecte-toi → **Setup → Apps → External Client Apps → External Client App Manager → New**
2. Remplis :
   - External Client App Name : `NexHire EIP`
   - API Name : `NexHire_EIP`
   - Contact Email : ton email
   - Distribution State : `Local`
3. Active **Enable OAuth** → remplis :
   - Callback URL : `https://agenthub.nexhire.ca/api/connectors/oauth/callback`
   - OAuth Scopes → sélectionne : `Manage user data via APIs (api)` + `Perform requests at any time (refresh_token, offline_access)`
   - Flows → coche : **Enable Authorization Code and Credentials Flow** uniquement
4. **Save** → onglet **Settings** → note **Consumer Key** et **Consumer Secret**

**Dans Render :**
```
SF_CLIENT_ID     = <Consumer Key>
SF_CLIENT_SECRET = <Consumer Secret>
SF_REDIRECT_URI  = https://agenthub.nexhire.ca/api/connectors/oauth/callback
```

---

## 3. ServiceNow — Catégorie B (per-client, aucune variable Render)

> ✅ **Multi-tenant natif** : chaque client enregistre sa propre app OAuth sur son instance. L'admin NexHire entre les credentials dans un modal au moment de connecter.

**Ce que le client doit faire (une fois sur son instance ServiceNow) :**
1. ServiceNow → barre de recherche → **Application Registry → New**
2. Choisir **Create an OAuth API endpoint for external clients**
3. Remplir :
   - Name : `NexHire`
   - Redirect URL : `https://agenthub.nexhire.ca/api/connectors/oauth/callback`
4. Cliquer **Submit** → noter **Client ID** et **Client Secret**
5. Fournir à NexHire : URL de l'instance + Client ID + Client Secret

**Ce que l'admin NexHire fait dans l'interface :**
1. NexHire → **Connecteurs** → ServiceNow → **Connecter via OAuth**
2. Un modal s'ouvre — remplir les 3 champs fournis par le client :
   ```
   URL de l'instance : https://votreclient.service-now.com
   Client ID         : <Client ID>
   Client Secret     : ••••••••
   ```
3. Cliquer **Connecter via OAuth →** → le client s'authentifie → connecteur actif ✓

**Variables Render : aucune requise pour ServiceNow.**

---

## 4. Jira / Confluence (Atlassian)

**Variables Render :** `JIRA_CLIENT_ID` · `JIRA_CLIENT_SECRET` · `JIRA_REDIRECT_URI`

**Étapes :**
1. Va sur [developer.atlassian.com/console/myapps](https://developer.atlassian.com/console/myapps/)
2. **Create → OAuth 2.0 integration** → Name : `NexHire`
3. Onglet **Authorization** → Callback URL : `https://agenthub.nexhire.ca/api/connectors/oauth/callback`
4. Onglet **Permissions** :
   - Jira : `read:jira-work`, `read:jira-user`
   - Confluence : `read:confluence-content.all`, `read:confluence-space.summary`
5. Onglet **Settings** → note **Client ID** et **Secret**

**Dans Render :**
```
JIRA_CLIENT_ID     = <Client ID>
JIRA_CLIENT_SECRET = <Secret>
JIRA_REDIRECT_URI  = https://agenthub.nexhire.ca/api/connectors/oauth/callback
```

---

## 5. Zendesk — Catégorie B (per-client, aucune variable Render)

> ✅ **Multi-tenant natif** : chaque client enregistre sa propre app OAuth sur son instance Zendesk. L'admin NexHire entre les credentials dans un modal au moment de connecter. Aucun compte Zendesk NexHire nécessaire.

**Ce que le client doit faire (une fois sur son instance Zendesk) :**
1. Zendesk Admin Center → **Apps and integrations → APIs → OAuth Clients → Add OAuth client**
2. Remplir :
   - Client name : `NexHire`
   - Redirect URLs : `https://agenthub.nexhire.ca/api/connectors/oauth/callback`
3. Save → noter **Unique identifier** et **Secret**
4. Fournir à NexHire : sous-domaine + Unique identifier + Secret

**Ce que l'admin NexHire fait dans l'interface :**
1. NexHire → **Connecteurs** → Zendesk → **Connecter via OAuth**
2. Un modal s'ouvre — remplir les 3 champs fournis par le client :
   ```
   Sous-domaine    : monentreprise  (de monentreprise.zendesk.com)
   Client ID       : <Unique identifier>
   Client Secret   : ••••••••
   ```
3. Cliquer **Connecter via OAuth →** → le client s'authentifie → connecteur actif ✓

**Variables Render : aucune requise pour Zendesk.**

---

## 6. HubSpot

**Variables Render :** `HUBSPOT_CLIENT_ID` · `HUBSPOT_CLIENT_SECRET` · `HUBSPOT_REDIRECT_URI`

**Étapes :**
1. Va sur [developers.hubspot.com](p/) → **Create app**
2. Onglet **Auth** :
   - Redirect URLs : `https://agenthub.nexhire.ca/api/connectors/oauth/callback`
   - Scopes : `crm.objects.contacts.read`, `crm.objects.deals.read`, `crm.objects.companies.read`, `tickets`
3. Note **Client ID** et **Client secret**

**Dans Render :**
```
HUBSPOT_CLIENT_ID     = <Client ID>
HUBSPOT_CLIENT_SECRET = <Client secret>
HUBSPOT_REDIRECT_URI  = https://agenthub.nexhire.ca/api/connectors/oauth/callback
```

---

## 7. Google Workspace

**Variables Render :** `GOOGLE_CLIENT_ID` · `GOOGLE_CLIENT_SECRET` · `GOOGLE_REDIRECT_URI`

**Étapes :**
1. Va sur [console.cloud.google.com](https://console.cloud.google.com) → **Create Project** → `NexHire Production`
2. **APIs & Services → Library** → active : `Gmail API`, `Google Drive API`, `Google Calendar API`, `Admin SDK API`
3. **APIs & Services → OAuth consent screen (ou "Google Auth Platform") → Get started**
   - App name : `NexHire`
   - User support email : ton email
   - Audience : **External**
   - Authorized domains : `agenthub.nexhire.ca`
   - **Publish App** (pour sortir du mode test)
4. **APIs & Services → Credentials → + Create Credentials → OAuth 2.0 Client ID**
   - Application type : **Web application**
   - Name : `NexHire Web`
   - Authorized redirect URIs : `https://agenthub.nexhire.ca/api/connectors/oauth/callback`
   - **Create** → note **Client ID** et **Client Secret**

> ⚠️ Google exige une vérification OAuth pour les scopes sensibles (Gmail, Drive, Admin SDK) — processus de 1-4 semaines. En attendant, les utilisateurs voient "App non vérifiée" mais peuvent quand même connecter en cliquant "Avancé → Continuer".

**Dans Render :**
```
GOOGLE_CLIENT_ID     = <Client ID>.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET = <Client Secret>
GOOGLE_REDIRECT_URI  = https://agenthub.nexhire.ca/api/connectors/oauth/callback
```

---

## 8. Slack

**Variables Render :** `SLACK_CLIENT_ID` · `SLACK_CLIENT_SECRET` · `SLACK_REDIRECT_URI`

**Étapes :**
1. Va sur [api.slack.com/apps](https://api.slack.com/apps) → **Create New App → From scratch**
2. App Name : `NexHire`
3. **OAuth & Permissions → Redirect URLs** : `https://agenthub.nexhire.ca/api/connectors/oauth/callback`
4. **Bot Token Scopes** : `channels:read`, `channels:history`, `files:read`, `users:read`, `team:read`, `search:read`
5. **Basic Information** → note **Client ID** et **Client Secret**
6. **Manage Distribution → Activate Public Distribution** (pour tous les workspaces)

**Dans Render :**
```
SLACK_CLIENT_ID     = <Client ID>
SLACK_CLIENT_SECRET = <Client Secret>
SLACK_REDIRECT_URI  = https://agenthub.nexhire.ca/api/connectors/oauth/callback
```

---

## 9. QuickBooks Online ✅

**Variables Render :** `QUICKBOOKS_CLIENT_ID` · `QUICKBOOKS_CLIENT_SECRET` · `QUICKBOOKS_REDIRECT_URI`

**Étapes :**
1. Va sur [developer.intuit.com](https://developer.intuit.com) → **Create an app → QuickBooks Online and Payments**
2. Scope : `com.intuit.quickbooks.accounting`
3. **Keys & credentials** → Redirect URIs : ajoute `https://agenthub.nexhire.ca/api/connectors/oauth/callback` (garde le playground Intuit en parallèle)
4. Host domain : `agenthub.nexhire.ca` · Launch/Disconnect/Reconnect URL : `https://agenthub.nexhire.ca`
5. Catégories : `Accounting` + `Business Insights` · Industries : `None of the above`
6. Note **Client ID** et **Client Secret**

**Dans Render :**
```
QUICKBOOKS_CLIENT_ID     = <Client ID>
QUICKBOOKS_CLIENT_SECRET = <Client Secret>
QUICKBOOKS_REDIRECT_URI  = https://agenthub.nexhire.ca/api/connectors/oauth/callback
```

---

## Récapitulatif — Variables à ajouter dans Render

| Connecteur | Catégorie | Variables Render |
|---|---|---|
| Microsoft 365 | A — App partagée | `M365_CLIENT_ID`, `M365_CLIENT_SECRET`, `M365_REDIRECT_URI` |
| Salesforce | A — App partagée | `SF_CLIENT_ID`, `SF_CLIENT_SECRET`, `SF_REDIRECT_URI` |
| Jira / Confluence | A — App partagée | `JIRA_CLIENT_ID`, `JIRA_CLIENT_SECRET`, `JIRA_REDIRECT_URI` |
| HubSpot | A — App partagée | `HUBSPOT_CLIENT_ID`, `HUBSPOT_CLIENT_SECRET`, `HUBSPOT_REDIRECT_URI` |
| Google Workspace | A — App partagée | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI` |
| Slack | A — App partagée | `SLACK_CLIENT_ID`, `SLACK_CLIENT_SECRET`, `SLACK_REDIRECT_URI` |
| QuickBooks Online | A — App partagée | `QUICKBOOKS_CLIENT_ID`, `QUICKBOOKS_CLIENT_SECRET`, `QUICKBOOKS_REDIRECT_URI` |
| Zendesk | **B — Per-client** | ❌ Aucune variable Render — credentials saisis dans le modal |
| ServiceNow | **B — Per-client** | ❌ Aucune variable Render — credentials saisis dans le modal |

**URL de callback pour tous :** `https://agenthub.nexhire.ca/api/connectors/oauth/callback`

---

## Ordre recommandé

1. **Microsoft 365** — ✅ fait
2. **Salesforce** — ✅ fait (2026-06-08)
3. **QuickBooks** — ✅ fait (2026-06-08)
4. **Google Workspace** — en cours ✍️
5. **Jira / Confluence** — ~10 min
6. **HubSpot** — ~10 min
7. **Slack** — ~10 min
8. **Zendesk** — ✅ per-client (modal, aucune variable Render)
9. **ServiceNow** — ✅ per-client (modal, aucune variable Render)

---

> **Note sécurité :** Ne partage jamais ces clés dans Slack, GitHub, ou par email.
> Utilise uniquement le panneau Render Environment pour les stocker.
