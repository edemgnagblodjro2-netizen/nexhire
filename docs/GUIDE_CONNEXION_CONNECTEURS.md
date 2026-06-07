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

## Connecteurs avec une information supplémentaire

Pour ces connecteurs, la connexion est également en 1 clic, mais NexHire a besoin de **l'URL ou du sous-domaine de votre instance** (unique par entreprise).

---

### ServiceNow

**Ce que NexHire accède :** Incidents, Changements, CMDB, SLA, Demandes de service.

**Ce que vous nous fournissez :** L'URL de votre instance ServiceNow.

```
Exemple : https://votreentreprise.service-now.com
```

Ensuite : cliquez "Connecter" dans NexHire → connexion avec votre compte ServiceNow.

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
| ServiceNow | Fournir l'URL d'instance + connexion directe |
| Zendesk | Fournir le sous-domaine + connexion directe |
| SAP | Saisir URL API + utilisateur + mot de passe dans NexHire |
| Workday | Saisir Tenant URL + Client ID + Secret dans NexHire |
| Autotask | Saisir utilisateur + clé API + code + zone dans NexHire |
| BambooHR | Saisir sous-domaine + clé API dans NexHire |
| NetSuite | Saisir Account ID + tokens TBA dans NexHire |
| Asana | Saisir Personal Access Token dans NexHire |
| Monday.com | Saisir API Token dans NexHire |
| ClickUp | Saisir Personal API Token dans NexHire |

---

> **Questions ?** Contactez votre gestionnaire de compte NexHire.
