# Guide de connexion des connecteurs NexHire

Ce guide explique, pour chaque connecteur, comment l'activer dans NexHire.

---

## Connecteurs en 1 clic — Connexion directe

Pour ces connecteurs, **aucune configuration IT n'est requise**. L'administrateur NexHire clique sur "Connecter", se connecte avec le compte de l'entreprise, accepte les permissions demandées, et c'est terminé.

| Connecteur | Compte requis | Ce que NexHire accède |
|---|---|---|
| **Microsoft 365** | Compte Microsoft 365 / Azure AD de l'entreprise | Emails, Teams, SharePoint, OneDrive, Calendrier |
| **Salesforce CRM** | Compte Salesforce de l'entreprise | Comptes, Leads, Opportunités, Tickets |
| **Jira / Confluence** | Compte Atlassian (Jira Cloud) | Tickets, Sprints, Projets, Pages Confluence |
| **HubSpot** | Compte HubSpot de l'entreprise | CRM, Contacts, Deals, Tickets |
| **Google Workspace** | Compte Google Workspace de l'entreprise | Gmail, Drive, Agenda, Annuaire |
| **Slack** | Compte Slack de l'entreprise (Admin requis) | Messages, canaux, fichiers, recherche |
| **QuickBooks Online** | Compte Intuit / QuickBooks | Facturation, dépenses, rapports financiers |

> **Remarque Microsoft 365 :** lors de la première connexion, un administrateur Azure AD doit approuver les permissions pour l'ensemble de l'organisation ("Grant admin consent"). Un simple utilisateur ne peut pas accorder des permissions à l'échelle de l'org.

> **Remarque Google Workspace :** si votre organisation a restreint l'accès aux applications tierces, un administrateur Google Workspace doit approuver NexHire dans la console d'administration Google.

> **Remarque Slack :** seul un administrateur Slack peut autoriser une application à accéder à l'ensemble du workspace.

---

## Connecteurs avec configuration préalable

Pour ces connecteurs, votre équipe IT doit effectuer une **configuration unique** avant la connexion.

---

### ServiceNow

**Ce que NexHire accède :** Incidents, Changements, CMDB, SLA, Demandes de service.

**Étape 1 — Votre équipe IT configure une application OAuth dans ServiceNow (une seule fois) :**

1. Dans ServiceNow, dans la barre de recherche en haut → tapez **Application Registry** → ouvrez-le
2. Cliquez **New** → choisissez **Create an OAuth API endpoint for external clients**
3. Remplissez :
   - **Name :** `NexHire`
   - **Redirect URL :** `https://agenthub.nexhire.ca/api/connectors/oauth/callback`
4. Cliquez **Submit**
5. Ouvrez l'entrée créée → notez :
   - **Client ID** (généré automatiquement)
   - **Client Secret** (cliquez sur le cadenas pour l'afficher)

**Étape 2 — Transmettez à votre gestionnaire de compte NexHire :**

| Information | Exemple |
|---|---|
| URL de votre instance ServiceNow | `https://votreentreprise.service-now.com` |
| Client ID | `abc123def456...` |
| Client Secret | (à transmettre de façon sécurisée) |

**Étape 3 — Connexion :**

Votre gestionnaire NexHire entre ces informations dans le portail → un lien d'authentification vous est envoyé → vous vous connectez avec votre compte ServiceNow → connecteur actif.

---

### Zendesk

**Ce que NexHire accède :** Tickets support, Agents, SLA, Base de connaissances.

**Ce que vous nous fournissez :** Votre sous-domaine Zendesk.

```
Exemple : votreentreprise  (si votre URL est votreentreprise.zendesk.com)
```

Ensuite : cliquez "Connecter" dans NexHire → connexion avec votre compte Zendesk Admin.

---

## Connecteurs API Key — Saisie dans NexHire

Pour ces connecteurs, les identifiants sont saisis **directement dans NexHire** par votre administrateur (onglet Connecteurs → formulaire). Aucune redirection ni application OAuth.

Toutes les credentials sont chiffrées (AES-128) avant d'être stockées et ne sont jamais affichées en clair.

---

### SAP

**Ce que vous obtenez :** ERP, Finance, Achats, Logistique, Ressources Humaines.

**Prérequis :** Un utilisateur de service (service account) avec accès en lecture aux modules OData souhaités.

| Champ | Description | Exemple |
|---|---|---|
| URL de l'API SAP | Endpoint OData de votre instance SAP | `https://hostname:port/sap/opu/odata/sap/` |
| Utilisateur SAP | Nom d'utilisateur du service account | `NEXHIRE_SVC` |
| Mot de passe SAP | Mot de passe du service account | — |

---

### Workday

**Ce que vous obtenez :** RH, Paie, Recrutement, Absences, Formation.

**Prérequis :** Un Integration System User (ISU) et un client OAuth configuré dans Workday.

| Champ | Description | Exemple |
|---|---|---|
| URL du Tenant | URL complète de votre service Workday | `https://wd3-impl.workday.com/ccx/service/votreentreprise` |
| Client ID | ID du client OAuth Workday | — |
| Client Secret | Secret du client OAuth Workday | — |
| Refresh Token | Optionnel — pour le flux refresh_token | — |

---

### Autotask / Datto PSA

**Ce que vous obtenez :** Tickets PSA, Projets, Facturation, Temps — pour MSP.

**Prérequis :** Un utilisateur API et un Integration Code généré dans Admin > API Integrations.

| Champ | Description | Exemple |
|---|---|---|
| Nom d'utilisateur | Email de l'utilisateur API | `api@votreentreprise.com` |
| Clé API secrète | Clé générée dans le profil utilisateur Autotask | — |
| Code d'intégration API | Code généré dans Admin > API | `ABC123DEF456` |
| Zone URL | URL de votre zone Autotask | `https://webservices24.autotask.net` |

---

### BambooHR

| Champ | Description | Exemple |
|---|---|---|
| Sous-domaine | Votre identifiant BambooHR | `votreentreprise` (de `votreentreprise.bamboohr.com`) |
| Clé API | Générée dans BambooHR → Profil → API Keys | — |

---

### NetSuite ERP

**Prérequis :** Token-Based Authentication (TBA) configuré dans NetSuite.

| Champ | Description |
|---|---|
| Account ID | ID de votre compte NetSuite (ex. `1234567`) |
| Consumer Key | Généré dans Setup → Integrations |
| Consumer Secret | Secret du Consumer |
| Token ID | Token de l'utilisateur API |
| Token Secret | Secret du Token |

---

### Asana

| Champ | Description |
|---|---|
| Personal Access Token | Généré dans Asana → Profil → Apps → Manage Developer Apps |

---

### Monday.com

| Champ | Description |
|---|---|
| API Token | Généré dans Monday → Profil → Developers → My Access Tokens |

---

### ClickUp

| Champ | Description |
|---|---|
| Personal API Token | Généré dans ClickUp → Profil → Apps |

---

### ADP Workforce Now

**Ce que vous obtenez :** RH, Paie, Gestion des temps, Structure organisationnelle.

**Prérequis :** Un accès développeur ADP (ADP Marketplace ou API Gateway).

| Champ | Description |
|---|---|
| Client ID | Généré dans ADP Developer Portal → vos applications |
| Client Secret | Secret du client ADP |

---

### AWS (Amazon Web Services)

**Ce que vous obtenez :** Ressources cloud, coûts et facturation, logs CloudWatch, alertes.

**Prérequis :** Un utilisateur IAM avec accès en lecture seule (politique `ReadOnlyAccess` ou personnalisée).

| Champ | Description | Exemple |
|---|---|---|
| Access Key ID | Clé d'accès de l'utilisateur IAM | `AKIAIOSFODNN7EXAMPLE` |
| Secret Access Key | Clé secrète IAM | — |
| Région | Région AWS principale | `ca-central-1` |

---

### Microsoft Intune

**Ce que vous obtenez :** Gestion des appareils, conformité, politiques de sécurité, inventaire endpoints.

**Prérequis :** Une app registration Azure AD avec les permissions Microsoft Graph `DeviceManagementManagedDevices.Read.All`.

| Champ | Description |
|---|---|
| Tenant ID | ID du tenant Azure AD |
| Client ID | ID de l'app registration Azure |
| Client Secret | Secret de l'app registration |

---

### CrowdStrike Falcon

**Ce que vous obtenez :** Alertes de sécurité, incidents, détections de menaces, score de santé des endpoints.

**Prérequis :** Un client API dans CrowdStrike Falcon Console avec le scope `Detections: Read`.

| Champ | Description |
|---|---|
| Client ID | Généré dans CrowdStrike Falcon Console → API Clients |
| Client Secret | Secret du client API |

---

### Epicor ERP

**Ce que vous obtenez :** ERP manufacturier — Production, Inventaire, Finance, Commandes clients, Achats.

**Prérequis :** Un utilisateur de service avec accès API REST Epicor.

| Champ | Description | Exemple |
|---|---|---|
| URL de l'instance | URL de votre instance Epicor | `https://epicor.votreentreprise.com` |
| Nom d'utilisateur | Utilisateur de service Epicor | `NEXHIRE_SVC` |
| Mot de passe | Mot de passe du service account | — |

---

> **Test de connexion automatique :** Pour SAP, Workday et Autotask, NexHire teste automatiquement la connectivité dès l'enregistrement des credentials. Un message de confirmation (ou d'erreur détaillée) s'affiche immédiatement à l'administrateur.

---

## Authentification SSO (Single Sign-On)

Le SSO permet aux employés d'un client de se connecter à NexHire avec leurs identifiants d'entreprise existants (Microsoft, Google, Okta, etc.) **sans créer un compte NexHire séparé**.

---

### Ce que NexHire vous fournit

| Élément | Valeur |
|---|---|
| **URL de callback (Redirect URI)** | `https://agenthub.nexhire.ca/api/sso/callback` |
| **Identifiant d'organisation (slug)** | Visible dans NexHire → Paramètres → SSO (ex : `ville-trois-rivieres`) |

Ces deux informations sont les **seules choses que NexHire vous transmet**. Toute la configuration se fait ensuite de votre côté et dans votre panneau NexHire.

---

### Fournisseurs supportés

| Fournisseur | Type | Utilisation typique |
|---|---|---|
| **Microsoft Entra ID (Azure AD)** | OIDC / OAuth 2.0 | Entreprises, gouvernements, municipalités |
| **Google Workspace** | OIDC / OAuth 2.0 | Organisations Google |
| **Okta** | OIDC / OAuth 2.0 | Entreprises avec IdP dédié |

---

### Étapes de configuration — côté client (équipe IT)

**Étape 1 — Créer une application OIDC chez votre fournisseur d'identité (IdP)**

Exemple pour **Microsoft Entra ID (Azure AD)** :

1. Connectez-vous à [portal.azure.com](https://portal.azure.com) → **Microsoft Entra ID** → **App registrations**
2. Cliquez **New registration**
3. Remplissez :
   - **Name :** `NexHire SSO`
   - **Redirect URI :** `https://agenthub.nexhire.ca/api/sso/callback` *(type : Web)*
4. Cliquez **Register**
5. Dans l'application créée, notez :
   - **Application (client) ID**
   - **Directory (tenant) ID**
6. Allez dans **Certificates & secrets** → **New client secret** → notez la valeur du secret

Exemple pour **Google Workspace** :
1. Console Google Cloud → **APIs & Services** → **Credentials** → **Create OAuth 2.0 Client ID**
2. Type : **Web application**
3. Ajoutez l'URL de callback : `https://agenthub.nexhire.ca/api/sso/callback`
4. Notez le **Client ID** et le **Client Secret**

---

**Étape 2 — Configurer le SSO dans NexHire**

L'administrateur NexHire de votre organisation accède à **NexHire → Paramètres → SSO** et saisit :

| Champ | Description |
|---|---|
| **Fournisseur** | Microsoft Entra ID, Google Workspace ou Okta |
| **Client ID** | ID de l'application OIDC créée chez votre IdP |
| **Client Secret** | Secret de l'application OIDC |
| **Tenant ID / Domain** | Votre identifiant de tenant (Azure) ou domaine (Google/Okta) |

> Toutes les credentials sont chiffrées (Fernet AES-128) avant stockage et ne sont jamais affichées en clair.

---

**Étape 3 — Connexion des employés**

Une fois le SSO configuré, les employés accèdent à `https://agenthub.nexhire.ca` et, dans la section SSO de la page de connexion :

1. Saisissent l'**identifiant d'organisation** (slug fourni par votre administrateur NexHire)
2. Cliquent **Se connecter avec SSO**
3. Sont redirigés vers leur IdP (Microsoft, Google, Okta) pour s'authentifier
4. Retournent automatiquement dans NexHire — aucun mot de passe NexHire requis

---

### Résumé des responsabilités

| Qui | Quoi |
|---|---|
| **NexHire** | Fournir l'URL de callback + le slug d'organisation |
| **IT client** | Créer l'app OIDC chez l'IdP, configurer l'URL de callback, fournir Client ID + Secret + Tenant ID |
| **Administrateur NexHire client** | Entrer les credentials IdP dans NexHire → Paramètres → SSO |
| **Employés** | Entrer le slug d'organisation sur la page de connexion NexHire |

---

## Récapitulatif

| Connecteur | Action requise |
|---|---|
| Microsoft 365 | Connexion directe (admin consent Azure AD requis) |
| Salesforce | Connexion directe |
| Jira / Confluence | Connexion directe |
| HubSpot | Connexion directe |
| Google Workspace | Connexion directe (approbation admin Google si restreint) |
| Slack | Connexion directe (admin Slack requis) |
| QuickBooks Online | Connexion directe |
| **ServiceNow** | **IT crée une app OAuth dans ServiceNow → fournir URL + Client ID + Secret** |
| Zendesk | Fournir le sous-domaine + connexion directe |
| SAP | Saisir URL API + utilisateur + mot de passe dans NexHire |
| Workday | Saisir Tenant URL + Client ID + Secret dans NexHire |
| Autotask | Saisir utilisateur + clé API + code + zone dans NexHire |
| BambooHR | Saisir sous-domaine + clé API dans NexHire |
| NetSuite | Saisir Account ID + tokens TBA dans NexHire |
| Asana | Saisir Personal Access Token dans NexHire |
| Monday.com | Saisir API Token dans NexHire |
| ClickUp | Saisir Personal API Token dans NexHire |
| ADP Workforce Now | Saisir Client ID + Secret dans NexHire |
| AWS | Saisir Access Key ID + Secret + Région dans NexHire |
| Microsoft Intune | Saisir Tenant ID + Client ID + Secret dans NexHire |
| CrowdStrike Falcon | Saisir Client ID + Secret dans NexHire |
| Epicor ERP | Saisir URL + utilisateur + mot de passe dans NexHire |
| **SSO (Entra ID / Google / Okta)** | **IT crée une app OIDC → Admin NexHire entre Client ID + Secret + Tenant ID dans Paramètres → SSO** |

---

> **Sécurité :** Toutes les credentials sont chiffrées (Fernet AES-128) avant d'être stockées. Elles ne sont jamais affichées en clair dans l'interface NexHire.
>
> **Questions ?** Contactez votre gestionnaire de compte NexHire.
