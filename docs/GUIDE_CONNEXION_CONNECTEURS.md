# Guide de connexion des connecteurs NexHire

Ce guide détaille, pour chaque connecteur, ce que votre équipe IT doit préparer avant que NexHire puisse être activé sur votre instance.

**URL de redirection OAuth (à utiliser pour TOUS les connecteurs OAuth) :**
```
https://nexhire.ca/api/connectors/oauth/callback
```

---

## Connecteurs OAuth 2.0

Pour ces connecteurs, votre équipe IT doit créer une application OAuth dans le portail correspondant, puis nous transmettre le **Client ID** et le **Client Secret**. NexHire se charge du reste.

---

### Microsoft 365

**Ce que vous obtenez :** Exchange (emails), Teams, SharePoint, OneDrive, Calendrier.

**Étapes IT :**
1. Connectez-vous sur [portal.azure.com](https://portal.azure.com)
2. Allez dans **Azure Active Directory → App registrations → New registration**
3. Nom : `NexHire Integration` (ou au choix)
4. Supported account types : **Accounts in this organizational directory only**
5. Redirect URI : `https://nexhire.ca/api/connectors/oauth/callback`
6. Une fois créé, allez dans **Certificates & secrets → New client secret** (durée recommandée : 24 mois)
7. Dans **API permissions**, ajoutez (Microsoft Graph) :
   - `Mail.Read`, `Files.Read.All`, `Sites.Read.All`, `Calendars.Read`, `Chat.Read`, `User.Read`, `offline_access`
8. Cliquez sur **Grant admin consent**

**À nous fournir :**
- Application (client) ID
- Client secret value

---

### Salesforce CRM

**Ce que vous obtenez :** Comptes, Leads, Opportunités, Tickets, Rapports.

**Étapes IT :**
1. Dans Salesforce, allez dans **Setup → App Manager → New Connected App**
2. Nom : `NexHire`
3. Cochez **Enable OAuth Settings**
4. Callback URL : `https://nexhire.ca/api/connectors/oauth/callback`
5. Selected OAuth Scopes : `api`, `refresh_token`, `offline_access`
6. Enregistrez et attendez quelques minutes (propagation Salesforce)

**À nous fournir :**
- Consumer Key (= Client ID)
- Consumer Secret

---

### ServiceNow

**Ce que vous obtenez :** Incidents, Changements, CMDB, SLA, Demandes de service.

**Étapes IT :**
1. Dans ServiceNow, allez dans **System OAuth → Application Registry → New → Create an OAuth API endpoint for external clients**
2. Name : `NexHire`
3. Redirect URL : `https://nexhire.ca/api/connectors/oauth/callback`
4. Notez le **Client ID** généré automatiquement
5. Définissez un **Client Secret** fort

**À nous fournir :**
- URL de votre instance (ex. : `https://votreentreprise.service-now.com`)
- Client ID
- Client Secret

---

### Jira / Confluence (Atlassian)

**Ce que vous obtenez :** Tickets Jira, Sprints, Projets, Pages Confluence.

**Étapes IT :**
1. Connectez-vous sur [developer.atlassian.com](https://developer.atlassian.com/console/myapps/)
2. Cliquez **Create** → **OAuth 2.0 integration**
3. Nom : `NexHire`
4. Dans **Permissions**, activez :
   - Jira : `read:jira-work`, `read:jira-user`
   - Confluence : `read:confluence-content.all`, `read:confluence-space.summary`
5. Dans **Authorization**, ajoutez la Callback URL : `https://nexhire.ca/api/connectors/oauth/callback`
6. Dans **Settings**, récupérez Client ID et Secret

**À nous fournir :**
- Client ID
- Client Secret

---

### Zendesk

**Ce que vous obtenez :** Tickets support, Agents, SLA, Base de connaissances.

**Étapes IT :**
1. Dans Zendesk Admin Center, allez dans **Apps and integrations → APIs → OAuth Clients → Add OAuth client**
2. Client name : `NexHire`
3. Redirect URLs : `https://nexhire.ca/api/connectors/oauth/callback`
4. Enregistrez et notez le **Secret**

**À nous fournir :**
- Sous-domaine Zendesk (ex. : `votreentreprise` si votre URL est `votreentreprise.zendesk.com`)
- Unique identifier (= Client ID)
- Secret (= Client Secret)

---

### HubSpot

**Ce que vous obtenez :** CRM, Contacts, Deals, Tickets, Pipelines marketing.

**Étapes IT :**
1. Connectez-vous sur [developers.hubspot.com](https://developers.hubspot.com/)
2. Créez une app → **Create app**
3. Dans **Auth**, ajoutez la Redirect URL : `https://nexhire.ca/api/connectors/oauth/callback`
4. Scopes requis : `crm.objects.contacts.read`, `crm.objects.deals.read`, `crm.objects.companies.read`, `tickets`
5. Récupérez Client ID et Client secret dans l'onglet **Auth**

**À nous fournir :**
- Client ID
- Client Secret

---

### Google Workspace

**Ce que vous obtenez :** Gmail, Google Drive, Agenda, Google Docs, Annuaire d'entreprise.

**Étapes IT :**
1. Connectez-vous sur [console.cloud.google.com](https://console.cloud.google.com)
2. Créez un nouveau projet (ou utilisez un existant)
3. Dans **APIs & Services → Library**, activez :
   - Gmail API
   - Google Drive API
   - Google Calendar API
   - Admin SDK API
4. Dans **APIs & Services → Credentials → Create Credentials → OAuth 2.0 Client ID**
   - Application type : **Web application**
   - Authorized redirect URIs : `https://nexhire.ca/api/connectors/oauth/callback`
5. Si votre organisation utilise Google Workspace (domaine d'entreprise), configurez l'**OAuth consent screen** en mode **Internal**

**À nous fournir :**
- Client ID
- Client Secret

---

### Slack

**Ce que vous obtenez :** Messages, canaux, fichiers partagés, recherche dans l'historique.

**Étapes IT :**
1. Connectez-vous sur [api.slack.com/apps](https://api.slack.com/apps)
2. Cliquez **Create New App → From scratch**
3. Nom : `NexHire`, sélectionnez votre Workspace
4. Dans **OAuth & Permissions → Redirect URLs**, ajoutez : `https://nexhire.ca/api/connectors/oauth/callback`
5. Dans **OAuth & Permissions → Bot Token Scopes**, ajoutez :
   - `channels:read`, `channels:history`, `files:read`, `users:read`, `team:read`, `search:read`
6. Récupérez **Client ID** et **Client Secret** dans **Basic Information**

**À nous fournir :**
- Client ID
- Client Secret

---

### QuickBooks Online

**Ce que vous obtenez :** Facturation, dépenses, comptes, bilan, rapport P&L, clients.

**Étapes IT :**
1. Connectez-vous sur [developer.intuit.com](https://developer.intuit.com)
2. Créez une app → **Create an app → QuickBooks Online and Payments**
3. Dans **Keys & OAuth → Production** (ou Sandbox pour tests) :
   - Ajoutez la Redirect URI : `https://nexhire.ca/api/connectors/oauth/callback`
4. Récupérez Client ID et Client Secret

**À nous fournir :**
- Client ID
- Client Secret

---

## Connecteurs API Key / Credentials

Pour ces connecteurs, les credentials sont saisies **directement dans NexHire** par votre administrateur. Aucune création d'application OAuth n'est nécessaire.

---

### SAP

**Ce que vous obtenez :** ERP, Finance, Achats, Logistique, Ressources Humaines.

**Prérequis côté SAP :** Un utilisateur de service (service account) avec accès en lecture aux modules OData souhaités.

**Champs à saisir dans NexHire :**
| Champ | Description | Exemple |
|---|---|---|
| URL de l'API SAP | Endpoint OData de votre instance | `https://hostname:port/sap/opu/odata/sap/` |
| Utilisateur SAP | Nom d'utilisateur du service account | `NEXHIRE_SVC` |
| Mot de passe SAP | Mot de passe du service account | `••••••••` |

---

### Workday

**Ce que vous obtenez :** RH, Paie, Recrutement, Absences, Formation.

**Prérequis côté Workday :** Un Integration System User (ISU) avec les permissions nécessaires et un client OAuth enregistré dans Workday.

**Champs à saisir dans NexHire :**
| Champ | Description | Exemple |
|---|---|---|
| URL du Tenant | URL complète du service Workday | `https://wd3-impl-services1.workday.com/ccx/service/votreentreprise` |
| Client ID | ID du client OAuth Workday | `abc123...` |
| Client Secret | Secret du client OAuth Workday | `••••••••` |
| Refresh Token | Optionnel — si le flux refresh_token est utilisé | `token_...` |

---

### Autotask / Datto PSA

**Ce que vous obtenez :** Tickets, Projets, Facturation, Temps — pour fournisseurs MSP.

**Prérequis côté Autotask :** Un utilisateur API avec les droits en lecture et un Integration Code généré dans Admin.

**Champs à saisir dans NexHire :**
| Champ | Description | Exemple |
|---|---|---|
| Nom d'utilisateur | Email de l'utilisateur API | `api@votreentreprise.com` |
| Clé API secrète | Clé générée dans le profil utilisateur | `••••••••` |
| Code d'intégration API | Code généré dans Admin > API | `ABC123DEF456` |
| Zone URL | URL de la zone Autotask assignée | `https://webservices24.autotask.net` |

---

### BambooHR

**Champs à saisir dans NexHire :**
| Champ | Description | Exemple |
|---|---|---|
| Sous-domaine BambooHR | Votre identifiant BambooHR | `votreentreprise` (de `votreentreprise.bamboohr.com`) |
| Clé API | Générée dans BambooHR → Profil → API Keys | `••••••••` |

---

### NetSuite ERP

**Champs à saisir dans NexHire :**
| Champ | Description | Exemple |
|---|---|---|
| Account ID | ID de votre compte NetSuite | `1234567` |
| Consumer Key | Généré dans NetSuite → Setup → Integrations | `••••••••` |
| Consumer Secret | Secret associé au Consumer Key | `••••••••` |
| Token ID | Token de l'utilisateur API | `••••••••` |
| Token Secret | Secret associé au Token | `••••••••` |

---

### Asana

**Champs à saisir dans NexHire :**
| Champ | Description | Exemple |
|---|---|---|
| Personal Access Token | Généré dans Asana → Profil → Apps → Manage Developer Apps | `1/••••••••` |

---

### Monday.com

**Champs à saisir dans NexHire :**
| Champ | Description | Exemple |
|---|---|---|
| API Token | Généré dans Monday → Profil → Developers → My Access Tokens | `eyJhbGci…` |

---

### ClickUp

**Champs à saisir dans NexHire :**
| Champ | Description | Exemple |
|---|---|---|
| Personal API Token | Généré dans ClickUp → Profil → Apps | `pk_••••••••` |

---

## Récapitulatif — Ce que vous nous transmettez

| Connecteur | Type | Ce que vous nous envoyez |
|---|---|---|
| Microsoft 365 | OAuth | Client ID + Client Secret |
| Salesforce | OAuth | Consumer Key + Consumer Secret |
| ServiceNow | OAuth | Instance URL + Client ID + Client Secret |
| Jira / Confluence | OAuth | Client ID + Client Secret |
| Zendesk | OAuth | Sous-domaine + Client ID + Client Secret |
| HubSpot | OAuth | Client ID + Client Secret |
| Google Workspace | OAuth | Client ID + Client Secret |
| Slack | OAuth | Client ID + Client Secret |
| QuickBooks Online | OAuth | Client ID + Client Secret |
| SAP | API | URL API + Utilisateur + Mot de passe |
| Workday | API | Tenant URL + Client ID + Secret (+ Refresh Token) |
| Autotask | API | Utilisateur + Clé API + Code intégration + Zone URL |
| BambooHR | API | Sous-domaine + Clé API |
| NetSuite | API | Account ID + Consumer Key/Secret + Token ID/Secret |
| Asana | API | Personal Access Token |
| Monday.com | API | API Token |
| ClickUp | API | Personal API Token |

---

> **Sécurité :** Toutes les credentials sont chiffrées (Fernet AES-128) avant d'être stockées. Elles ne sont jamais affichées en clair dans l'interface NexHire.
>
> **Questions ?** Contactez votre gestionnaire de compte NexHire.
