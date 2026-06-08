# Guide interne — Configuration OAuth NexHire (à faire une seule fois)

Ce guide est pour l'équipe NexHire. Il y a deux catégories de connecteurs OAuth :

**Catégorie A — App NexHire partagée (tu enregistres une fois, tous les clients partagent) :**
Microsoft 365, Salesforce, Jira, HubSpot, Google Workspace, Slack, QuickBooks

**Catégorie B — App per-client (chaque client enregistre sa propre app OAuth chez lui) :**
ServiceNow, Zendesk → aucune variable Render nécessaire, l'admin NexHire entre les credentials dans un modal au moment de la connexion.

**URL de callback à utiliser partout :**
```
https://nexhire.ca/api/connectors/oauth/callback
```

**Une fois les clés obtenues → les ajouter dans Render :**
Dashboard Render → ton service → Environment → Add Environment Variable

---

## 1. Microsoft 365

**Variables Render :** `M365_CLIENT_ID` · `M365_CLIENT_SECRET` · `M365_REDIRECT_URI`

**Étapes :**
1. Va sur [portal.azure.com](https://portal.azure.com) → connecte-toi avec un compte Microsoft (crée-en un si tu n'en as pas)
2. **Azure Active Directory → App registrations → New registration**
3. Remplis :
   - Name : `NexHire`
   - Supported account types : **Accounts in any organizational directory (Any Azure AD tenant - Multitenant)**
   - Redirect URI : Web → `https://nexhire.ca/api/connectors/oauth/callback`
4. Clique **Register**
5. Note le **Application (client) ID** → c'est `M365_CLIENT_ID`
6. Va dans **Certificates & secrets → New client secret**
   - Description : `nexhire-prod`
   - Expiration : 24 mois
   - Clique **Add** → note immédiatement le **Value** → c'est `M365_CLIENT_SECRET`
7. Va dans **API permissions → Add a permission → Microsoft Graph → Delegated**
   - Ajoute : `Mail.Read`, `Files.Read.All`, `Sites.Read.All`, `Calendars.Read`, `Chat.Read`, `User.Read`, `offline_access`, `openid`, `email`, `profile`
   - Clique **Grant admin consent for (ton tenant)** si disponible (optionnel pour une app multi-tenant)

**Dans Render :**
```
M365_CLIENT_ID     = <Application (client) ID>
M365_CLIENT_SECRET = <Client secret Value>
M365_REDIRECT_URI  = https://nexhire.ca/api/connectors/oauth/callback
```

---

## 2. Salesforce CRM

**Variables Render :** `SF_CLIENT_ID` · `SF_CLIENT_SECRET` · `SF_REDIRECT_URI`

**Étapes :**
1. Crée un compte développeur Salesforce gratuit sur [developer.salesforce.com](https://developer.salesforce.com/signup)
2. Connecte-toi → va dans **Setup** (roue dentée en haut à droite → Setup)
3. Dans la barre de recherche gauche : tape `App Manager` → **App Manager → New Connected App**
4. Remplis :
   - Connected App Name : `NexHire`
   - API Name : `NexHire`
   - Contact Email : ton email
   - Coche **Enable OAuth Settings**
   - Callback URL : `https://nexhire.ca/api/connectors/oauth/callback`
   - Selected OAuth Scopes : ajoute `api`, `refresh_token / offline access`, `openid`, `profile`, `email`
5. Clique **Save** puis **Continue**
6. Attends 2-10 minutes (propagation Salesforce)
7. Retourne dans App Manager → clique sur NexHire → **View**
   - **Consumer Key** → c'est `SF_CLIENT_ID`
   - **Consumer Secret** (cliquer sur "Click to reveal") → c'est `SF_CLIENT_SECRET`

**Dans Render :**
```
SF_CLIENT_ID     = <Consumer Key>
SF_CLIENT_SECRET = <Consumer Secret>
SF_REDIRECT_URI  = https://nexhire.ca/api/connectors/oauth/callback
```

---

## 3. ServiceNow — Catégorie B (per-client, aucune variable Render)

> ✅ **Multi-tenant natif** : chaque client enregistre sa propre app OAuth sur son instance ServiceNow. L'admin NexHire entre les credentials dans un modal au moment de connecter. Aucune variable Render à configurer.

**Ce que le client doit faire (une fois sur son instance ServiceNow) :**
1. Dans ServiceNow : barre de recherche → **Application Registry → New**
2. Choisir **Create an OAuth API endpoint for external clients**
3. Remplir :
   - Name : `NexHire`
   - Redirect URL : `https://nexhire.ca/api/connectors/oauth/callback`
   - Cliquer **Submit**
4. Ouvrir l'entrée créée → noter **Client ID** (auto-généré) et **Client Secret**
5. Fournir à NexHire : URL de l'instance + Client ID + Client Secret

**Ce que l'admin NexHire fait dans l'interface :**
1. Aller dans NexHire → onglet **Connecteurs** → ServiceNow
2. Cliquer **Connecter via OAuth**
3. Un modal s'ouvre — remplir les 3 champs fournis par le client :
   ```
   URL de l'instance   : https://votreclient.service-now.com
   Client ID           : <Client ID>
   Client Secret       : ••••••••
   ```
4. Cliquer **Connecter via OAuth →** → le client est redirigé vers ServiceNow pour s'authentifier
5. Après authentification → connecteur actif ✓

**Variables Render : aucune requise pour ServiceNow.**

---

## 4. Jira / Confluence (Atlassian)

**Variables Render :** `JIRA_CLIENT_ID` · `JIRA_CLIENT_SECRET` · `JIRA_REDIRECT_URI`

**Étapes :**
1. Va sur [developer.atlassian.com/console/myapps](https://developer.atlassian.com/console/myapps/)
2. Connecte-toi avec un compte Atlassian (crée-en un gratuit)
3. Clique **Create** → **OAuth 2.0 integration**
4. Name : `NexHire` → **Create**
5. Dans l'onglet **Authorization** :
   - Callback URL : `https://nexhire.ca/api/connectors/oauth/callback`
   - Clique **Save changes**
6. Dans l'onglet **Permissions** :
   - Jira → **Add** → coche : `read:jira-work`, `read:jira-user`
   - Confluence → **Add** → coche : `read:confluence-content.all`, `read:confluence-space.summary`
   - Sauvegarde
7. Dans l'onglet **Settings** :
   - **Client ID** → c'est `JIRA_CLIENT_ID`
   - **Secret** → c'est `JIRA_CLIENT_SECRET`

**Dans Render :**
```
JIRA_CLIENT_ID     = <Client ID>
JIRA_CLIENT_SECRET = <Secret>
JIRA_REDIRECT_URI  = https://nexhire.ca/api/connectors/oauth/callback
```

---

## 5. Zendesk — Catégorie B (per-client, 3 variables Render partagées)

> ✅ **Multi-tenant natif** : NexHire enregistre une app OAuth Zendesk une seule fois. Le sous-domaine du client est saisi dans un prompt au moment de la connexion.

**Étapes NexHire (une seule fois) :**
1. Crée un compte Zendesk développeur ou utilise une sandbox : [zendesk.com/register](https://www.zendesk.com/register/)
2. Dans Zendesk Admin Center → **Apps and integrations → APIs → OAuth Clients → Add OAuth client**
3. Client name : `NexHire`
4. Redirect URLs : `https://nexhire.ca/api/connectors/oauth/callback`
5. Clique **Save** → note **Unique identifier** et **Secret**

**Dans Render (une seule fois, app NexHire partagée) :**
```
ZENDESK_CLIENT_ID     = <Unique identifier de ton app NexHire Zendesk>
ZENDESK_CLIENT_SECRET = <Secret de ton app NexHire Zendesk>
ZENDESK_REDIRECT_URI  = https://nexhire.ca/api/connectors/oauth/callback
```

**Ce que l'admin NexHire fait pour chaque client :**
1. NexHire → **Connecteurs** → Zendesk → **Connecter via OAuth**
2. Un prompt demande le sous-domaine du client (ex. `monentreprise` si l'URL est `monentreprise.zendesk.com`)
3. Le client s'authentifie → connecteur actif ✓

> Note : `ZENDESK_SUBDOMAIN` n'est plus une variable Render — il est entré au moment de la connexion.

---

## 6. HubSpot

**Variables Render :** `HUBSPOT_CLIENT_ID` · `HUBSPOT_CLIENT_SECRET` · `HUBSPOT_REDIRECT_URI`

**Étapes :**
1. Va sur [developers.hubspot.com](https://developers.hubspot.com/) → connecte-toi ou crée un compte
2. **Create app** (dans ton compte développeur, pas dans un portal client)
3. Onglet **Auth** :
   - Redirect URLs → ajoute : `https://nexhire.ca/api/connectors/oauth/callback`
   - Scopes → coche : `crm.objects.contacts.read`, `crm.objects.deals.read`, `crm.objects.companies.read`, `tickets`
4. Enregistre
5. Dans l'onglet **Auth** :
   - **App ID / Client ID** → c'est `HUBSPOT_CLIENT_ID`
   - **Client secret** → c'est `HUBSPOT_CLIENT_SECRET`

**Dans Render :**
```
HUBSPOT_CLIENT_ID     = <Client ID>
HUBSPOT_CLIENT_SECRET = <Client secret>
HUBSPOT_REDIRECT_URI  = https://nexhire.ca/api/connectors/oauth/callback
```

---

## 7. Google Workspace

**Variables Render :** `GOOGLE_CLIENT_ID` · `GOOGLE_CLIENT_SECRET` · `GOOGLE_REDIRECT_URI`

**Étapes :**
1. Va sur [console.cloud.google.com](https://console.cloud.google.com) → connecte-toi avec un compte Google (crée un compte dédié `dev@nexhire.ca` recommandé)
2. **Create Project** → Nom : `NexHire Production`
3. Active les APIs (**APIs & Services → Library**) :
   - `Gmail API`
   - `Google Drive API`
   - `Google Calendar API`
   - `Admin SDK API`
4. **APIs & Services → OAuth consent screen** :
   - User Type : **External** (pour couvrir tous les comptes Google Workspace)
   - App name : `NexHire`
   - User support email : ton email
   - App logo : ton logo (optionnel)
   - Authorized domains : `nexhire.ca`
   - Developer contact : ton email
   - Scopes → ajoute :
     - `openid`, `email`, `profile`
     - `https://www.googleapis.com/auth/drive.readonly`
     - `https://www.googleapis.com/auth/gmail.readonly`
     - `https://www.googleapis.com/auth/calendar.readonly`
     - `https://www.googleapis.com/auth/admin.directory.user.readonly`
   - Sauvegarde → passe en **Production** (sinon seuls les comptes de test peuvent connecter)
5. **APIs & Services → Credentials → Create Credentials → OAuth 2.0 Client ID**
   - Application type : **Web application**
   - Name : `NexHire Web`
   - Authorized redirect URIs : `https://nexhire.ca/api/connectors/oauth/callback`
   - Clique **Create**
6. Télécharge le JSON ou note **Client ID** et **Client Secret**

> ⚠️ Google exige une **vérification OAuth** si tu utilises des scopes sensibles (Gmail, Drive, Admin SDK). Le processus prend 1-4 semaines. En attendant, les utilisateurs verront un avertissement "App non vérifiée" mais pourront quand même connecter.

**Dans Render :**
```
GOOGLE_CLIENT_ID     = <Client ID>.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET = <Client Secret>
GOOGLE_REDIRECT_URI  = https://nexhire.ca/api/connectors/oauth/callback
```

---

## 8. Slack

**Variables Render :** `SLACK_CLIENT_ID` · `SLACK_CLIENT_SECRET` · `SLACK_REDIRECT_URI`

**Étapes :**
1. Va sur [api.slack.com/apps](https://api.slack.com/apps) → **Create New App → From scratch**
2. App Name : `NexHire`, Workspace : sélectionne ton propre workspace (pour les tests)
3. Dans **OAuth & Permissions** :
   - Redirect URLs → **Add New Redirect URL** : `https://nexhire.ca/api/connectors/oauth/callback`
   - Bot Token Scopes → ajoute :
     - `channels:read`, `channels:history`, `files:read`, `users:read`, `team:read`, `search:read`
4. Dans **Basic Information** :
   - **Client ID** → c'est `SLACK_CLIENT_ID`
   - **Client Secret** → c'est `SLACK_CLIENT_SECRET`
5. Va dans **Manage Distribution → Activate Public Distribution** pour que n'importe quel workspace Slack puisse connecter l'app

**Dans Render :**
```
SLACK_CLIENT_ID     = <Client ID>
SLACK_CLIENT_SECRET = <Client Secret>
SLACK_REDIRECT_URI  = https://nexhire.ca/api/connectors/oauth/callback
```

---

## 9. QuickBooks Online

**Variables Render :** `QUICKBOOKS_CLIENT_ID` · `QUICKBOOKS_CLIENT_SECRET` · `QUICKBOOKS_REDIRECT_URI`

**Étapes :**
1. Va sur [developer.intuit.com](https://developer.intuit.com) → **Sign In / Create Account** (compte Intuit gratuit)
2. **Dashboard → Create an app**
   - Select APIs : **QuickBooks Online and Payments**
   - App Name : `NexHire`
3. Dans **Keys & credentials → Production** (ou Sandbox d'abord pour tester) :
   - Redirect URIs → **Add URI** : `https://nexhire.ca/api/connectors/oauth/callback`
4. Note **Client ID** et **Client Secret** (onglet Production)
5. Pour passer en production, Intuit demande de remplir un formulaire d'approbation (quelques jours)

**Dans Render :**
```
QUICKBOOKS_CLIENT_ID     = <Client ID>
QUICKBOOKS_CLIENT_SECRET = <Client Secret>
QUICKBOOKS_REDIRECT_URI  = https://nexhire.ca/api/connectors/oauth/callback
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
| Zendesk | A — App partagée (subdomain per-client via UI) | `ZENDESK_CLIENT_ID`, `ZENDESK_CLIENT_SECRET`, `ZENDESK_REDIRECT_URI` |
| ServiceNow | **B — Per-client** | ❌ Aucune variable Render — credentials saisis dans le modal |

**Valeur `REDIRECT_URI` pour tous :** `https://nexhire.ca/api/connectors/oauth/callback`

---

## Ordre recommandé

Commence par les connecteurs les plus demandés :

1. **Microsoft 365** — presque tous les clients canadiens l'utilisent
2. **Google Workspace** — alternative Microsoft très commune
3. **Jira / Confluence** — très demandé en tech/agences
4. **HubSpot** — incontournable pour les équipes sales
5. **Slack** — communication d'équipe universelle
6. **Salesforce** — grandes entreprises
7. **QuickBooks** — PME comptabilité
8. **ServiceNow** — au cas par cas, credentials saisis dans le modal NexHire
9. **Zendesk** — app NexHire partagée, sous-domaine entré par l'admin au moment de connecter

---

> **Note sécurité :** Ne partage jamais ces clés dans Slack, GitHub, ou par email.
> Utilise uniquement le panneau Render Environment pour les stocker.
