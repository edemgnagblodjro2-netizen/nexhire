# NexHire Enterprise Assistant — Guide complet du système

> Document de référence — à usage interne et présentation client
> Version : 2.0 · Juin 2026 · Trilingue FR / EN / ES

---

## Vue d'ensemble

NexHire est une plateforme SaaS d'intelligence artificielle conçue pour les organisations canadiennes. Elle connecte vos systèmes d'entreprise existants (Microsoft 365, Salesforce, Jira, ServiceNow, SAP, Workday, Autotask, Zendesk, HubSpot et plus) à un seul agent conversationnel intelligent, accessible en **français, anglais et espagnol**.

**En résumé :** au lieu d'ouvrir 5 systèmes différents pour répondre à une question, vous la posez une fois à NexHire — et il interroge tous vos outils automatiquement.

---

## Points clés de la plateforme

| | |
|---|---|
| 🌍 **Trilingue** | Français / Anglais / Espagnol — bascule instantanée |
| 💳 **Facturation live** | Stripe Checkout — plans Mensuel (99$/mois) et Annuel (990$/an) |
| 🔐 **SSO natif** | Microsoft Entra ID, Google Workspace, Okta — OIDC |
| 🏢 **Multi-tenant isolé** | Chaque client est une organisation séparée — données 100% isolées |
| 🔌 **20+ connecteurs** | OAuth 2.0 et credentials chiffrés AES-128 |
| 🛡️ **Super Admin** | Panel de gestion de tous les clients (NexHire seulement) |
| 📧 **Emails transactionnels** | Invitations, alertes licences, rapport mensuel — via Resend |
| 🔔 **Webhooks** | Notifications Slack / Teams sur événements clés |
| 📱 **Mobile optimisé** | Interface responsive pour tablettes et téléphones |

---

## Architecture générale

| Composant | Technologie |
|---|---|
| Backend API | FastAPI (Python) — déployé sur Render (Starter) |
| Base de données | PostgreSQL via Supabase |
| Intelligence artificielle | OpenAI GPT (modèle configurable) |
| Authentification | JWT ES256 — sessions sécurisées |
| Chiffrement des tokens | Fernet (AES-128-CBC) |
| Facturation | Stripe Checkout + Customer Portal + Webhooks |
| Emails transactionnels | Resend — domaine nexhire.ca vérifié |
| Notifications | Webhooks Slack / Microsoft Teams |
| Interface | SPA (Single Page Application) — aucun rechargement de page |
| Langues | Français / Anglais / Espagnol |

---

## Système de rôles (RBAC)

Chaque utilisateur a un rôle qui détermine ce qu'il peut voir et faire.

| Rôle | Description | Accès |
|---|---|---|
| **Super Admin** | Équipe NexHire uniquement | Panel global — tous les clients, métriques, activation/suspension |
| **Owner** | Fondateur de l'organisation | Tout — seul à ne pas pouvoir être modifié |
| **Admin** | Administrateur | Tous les onglets, gestion de l'équipe, connecteurs, webhooks, SSO |
| **Manager** | Gestionnaire | Agent IA, Parc IT, Optimisation, Documents |
| **User** | Utilisateur standard | Agent IA, Documents, Paramètres personnels |

> Les onglets Organisation, Audit, Équipe et la gestion des connecteurs sont réservés aux **admins et owners**.

---

## PARTIE 1 — Page d'accueil publique (Landing Page)

La page d'accueil est visible sans connexion. C'est la vitrine commerciale de NexHire.

### Ce qu'elle contient

**Navigation principale**
- Liens vers les sections : Fonctionnalités, Tarifs, Connecteurs
- Bouton "Se connecter" et bouton "Essai gratuit 14 jours"
- Bascule de langue FR / EN / ES

**Section Héro (image défilante)**
- 3 photos de fond qui alternent automatiquement
- Titre principal : "Un assistant IA pour tous vos systèmes"
- Démo visuelle : une fenêtre simulant une vraie conversation avec l'agent

**Bande des connecteurs**
- Logos de tous les systèmes compatibles défilant en continu

**Section Fonctionnalités (6 points forts)**
1. 20+ connecteurs intégrés
2. Agent IA conversationnel trilingue
3. Sécurité entreprise (chiffrement Fernet, audit complet)
4. FR / EN / ES — bascule instantanée
5. Analyse de documents PDF
6. SSO natif (Microsoft, Google, Okta)

**Section Tarifs**
- Plan Mensuel : 99 $/mois
- Plan Annuel : 990 $/an (équivaut à 82,50 $/mois — 2 mois gratuits)
- Essai gratuit 14 jours — aucune carte requise

**Pied de page**
- Liens produit, support, légal
- Conditions d'utilisation et Politique de confidentialité intégrées
- Mention "Conçu pour les organisations canadiennes 🍁"

---

## PARTIE 2 — Authentification

### Inscription (Essai gratuit)

L'utilisateur saisit :
- Nom de l'organisation
- Prénom et nom
- Adresse courriel
- Mot de passe (minimum 8 caractères)

À la création, une organisation est créée automatiquement et l'utilisateur obtient le rôle **Owner**. Un email de vérification est envoyé via Resend.

### Connexion

Email + mot de passe. Un token JWT ES256 est émis et stocké dans le navigateur.

### SSO (Authentification unique)

Connexion via les identifiants d'entreprise existants :
- **Microsoft Entra ID (Azure AD)** — OIDC
- **Google Workspace** — OIDC
- **Okta** — OIDC

L'admin configure le SSO directement dans Paramètres → SSO (client_id, client_secret, tenant). Aucune intervention NexHire requise.

### Invitation d'un collaborateur

Un admin génère un lien d'invitation (valide 7 jours). Le collaborateur clique sur le lien, choisit son mot de passe, et rejoint l'organisation avec le rôle assigné. Un email d'invitation est automatiquement envoyé.

### Bannière d'essai

Si l'organisation est en période d'essai, une bannière apparaît en haut de l'application avec **deux boutons de conversion directe** :
- **Mensuel — 99 $/mois** → Stripe Checkout
- **Annuel — 990 $/an ⭐** → Stripe Checkout

---

## PARTIE 3 — Application (après connexion)

---

## ONGLET 1 — Assistant IA

> Onglet par défaut à l'ouverture de l'application.

C'est le cœur du produit. L'utilisateur pose une question en langage naturel et l'agent interroge automatiquement les systèmes connectés.

### Tableau de bord de département (personnalisé)

En haut de l'onglet, chaque utilisateur voit un mini-tableau de bord spécifique à son département. Il affiche des KPIs pertinents selon le type : finances, IT, RH, opérations, etc.

### Modes de l'agent

- **Enterprise** — questions de gestion, IT, budget, incidents
- **Municipal / Organisme** — adapté aux villes, OBNL, institutions publiques
- **Recrutement** — postes vacants, candidatures, effectifs

### Langue de réponse

L'agent peut répondre en **français**, **anglais** ou **espagnol**, indépendamment de la langue de l'interface.

### Comment fonctionne une requête

1. L'utilisateur tape sa question (ou clique sur un raccourci)
2. L'agent détermine quels systèmes interroger
3. Il appelle chaque système concerné (ServiceNow, M365, SAP, Workday, etc.)
4. Il synthétise toutes les réponses en un seul texte structuré
5. La réponse s'affiche avec la liste des sources consultées

### Après la réponse

- **Notation (1 à 5 étoiles)** — l'utilisateur note la pertinence
- **Export** : PDF, Excel, Word, PowerPoint
- **Outils appelés** — section dépliable montrant exactement quels systèmes ont été interrogés

### Quota de requêtes

Chaque organisation a un quota mensuel. Un indicateur dans la navigation montre les requêtes restantes.

---

## ONGLET 2 — Connecteurs d'entreprise

> Gestion réservée aux admins. Accès par département configurable.

### 20+ connecteurs disponibles

**OAuth 2.0 (connexion en 1 clic)**

| Connecteur | Données accessibles |
|---|---|
| Microsoft 365 | Emails, OneDrive, SharePoint, Teams |
| Salesforce | CRM, opportunités, contacts, leads |
| Jira | Tickets, projets, sprints, bugs |
| ServiceNow | Incidents, changements, demandes |
| Zendesk | Tickets support, satisfaction client |
| HubSpot | CRM, marketing, deals |
| Google Workspace | Gmail, Drive, Agenda, Meet |
| Slack | Messages, canaux, fichiers |
| QuickBooks | Comptabilité, factures, dépenses |

**Credentials / API Key (formulaire sécurisé — chiffrement Fernet)**

| Connecteur | Credentials requis |
|---|---|
| **SAP** (S/4HANA, ECC) | URL API + Utilisateur + Mot de passe |
| **Workday** | URL Tenant + Client ID + Client Secret (+ Refresh Token optionnel) |
| **Autotask** (Datto) | Username + Clé API + Code d'intégration + Zone URL |
| BambooHR | Domaine + Clé API |
| ADP | Client ID + Client Secret |
| AWS | Access Key + Secret Key + Région |
| NetSuite | Account ID + Consumer Key/Secret + Token |
| Et plus... | |

> Tous les credentials sont **chiffrés Fernet (AES-128)** avant stockage. NexHire n'affiche jamais une valeur en clair.

### Accès par département

Un admin peut restreindre l'accès à un connecteur par département. Par défaut, un connecteur est accessible à toute l'organisation.

---

## ONGLET 3 — Analyse de documents PDF

> Accessible à tous les rôles.

1. **Téléversement** — fichier PDF (max 16 Mo)
2. **Extraction du texte** automatique
3. **Résumé IA** en un clic
4. **Chat sur le document** — questions précises sur le contenu
5. **Aperçu du texte extrait**

---

## ONGLET 4 — Organisation (Tableau de bord exécutif)

> Réservé aux admins et owners.

**KPIs globaux :** membres actifs, connecteurs actifs, budget consommé, licences expirant, serveurs à décommissionner, score d'optimisation.

**Santé des départements** en 3 niveaux : 🔴 À risque / 🟡 Attention / 🟢 Sain

---

## ONGLET 5 — Parc IT

> Accessible à tous. Ajout/modification réservé aux admins.

**4 sous-onglets :**

| Sous-onglet | Contenu |
|---|---|
| Vue d'ensemble | KPIs + graphiques budget + prévision 3 mois |
| Budget | Dépenses IT par catégorie, période, devise |
| Licences | Inventaire, taux d'utilisation, alertes expiration |
| Serveurs | Physique / virtuel / cloud, statut, décommissionnement |
| Applications | Inventaire, coûts, applications inutilisées |

---

## ONGLET 6 — Optimisation IA

> Accessible aux managers et admins.

**5 sous-onglets :**

| Sous-onglet | Contenu |
|---|---|
| Tableau de bord | Score d'efficacité /100, économies identifiées, top 10 opportunités |
| Licences inutilisées | Licences < 80% d'utilisation, économie annuelle potentielle |
| Outils en doublon | Catégories redondantes, recommandation de consolidation |
| Contrats | Suivi fournisseurs, alertes renouvellement 90 jours |
| Processus RH | Processus manuels, potentiel d'automatisation, ROI |
| Plan IA | Chat stratégique pour générer un plan d'économies personnalisé |

---

## ONGLET 7 — Journal d'audit

> Réservé aux admins et owners.

Registre immuable (append-only) de toutes les actions : connexions, requêtes IA, modifications de membres, connexions de connecteurs, exports, etc.

Conçu pour satisfaire les exigences de conformité : **ISO 27001, SOC 2, Loi 25 (Québec)**.

---

## ONGLET 8 — Statistiques

KPIs : requêtes du mois, satisfaction moyenne, utilisateurs actifs.

Graphiques : activité quotidienne, connecteurs utilisés, distribution des notes.

---

## ONGLET 9 — Équipe

> Réservé aux admins et owners.

**Membres** — gestion des rôles, activation/désactivation, suppression.

**Invitations** — liens valides 7 jours, email automatique via Resend.

**Départements** — CRUD, budget par département, initialisation par secteur en un clic (Entreprise / Hôpital / Municipalité / Université).

**Organigramme** — hiérarchie visuelle sur 6 niveaux (Direction → VP → Directeur → Manager → Superviseur → Employé).

---

## ONGLET 10 — Paramètres

### Profil
- Modifier nom complet, type d'organisation

### Sécurité
- Changer son mot de passe

### SSO (admins uniquement)
Configuration directe dans l'interface :
- Choix du provider : Microsoft Entra ID / Google Workspace / Okta
- Saisie du Client ID, Client Secret, Tenant ID
- Activation / désactivation sans intervention NexHire

### Abonnement
- Plan actuel affiché avec badge (Essai / Premium actif / Annulé)
- **Passer au Premium** : deux boutons directs Stripe Checkout
  - Mensuel — 99 $/mois
  - Annuel — 990 $/an
- **Gérer l'abonnement** : accès au portail Stripe (modifier carte, annuler, voir factures)

### Webhooks Slack / Teams (admins uniquement)
Configuration des notifications automatiques :
- URL Webhook Slack et/ou Microsoft Teams
- Événements déclencheurs : nouveau membre, licence expirant, alerte budget, souscription
- Bouton de test pour vérifier la configuration

### Rapport mensuel (admins uniquement)
- Envoi en un clic d'un rapport HTML par email
- Contenu : requêtes IA du mois, satisfaction moyenne, utilisateurs actifs, licences expirant

### Comptes de service (admins uniquement)
Tokens d'accès longue durée pour intégrations API, scripts automatisés, pipelines CI/CD.

---

## ONGLET 11 — Marketplace

> Réservé aux admins.

Workspaces préconfigurés par secteur. Chaque workspace installe automatiquement les connecteurs recommandés et configure un tableau de bord IA spécialisé.

---

## Panel Super Admin (NexHire uniquement)

Accessible uniquement aux emails autorisés (variable `SUPERADMIN_EMAILS`). Invisible pour tous les clients.

### Métriques globales
- Nombre total d'organisations
- Organisations Premium actives
- Organisations en essai
- Utilisateurs total
- Requêtes IA ce mois (toute la plateforme)

### Table de toutes les organisations
Pour chaque client : nom, statut, plan, utilisateurs, requêtes du mois, connecteurs actifs, présence Stripe, date de création.

### Actions par client
- **Activer** → passe en Premium actif immédiatement
- **Reset Trial** → remet en période d'essai
- **Suspendre** → coupe l'accès

---

## Facturation Stripe

| Fonctionnalité | Détail |
|---|---|
| Plans | Mensuel 99 $/mois · Annuel 990 $/an |
| Essai | 14 jours gratuits — aucune carte requise |
| Checkout | Stripe Checkout hébergé (PCI-compliant) |
| Portail | Stripe Customer Portal — modification carte, annulation, factures |
| Webhooks | Mise à jour automatique du statut en base après paiement |
| Bannière de conversion | Boutons directs Stripe dans l'app dès le statut "trialing" |

---

## Emails automatiques (Resend)

| Email | Déclencheur |
|---|---|
| Invitation | Quand un admin invite un nouveau membre |
| Alerte licence | Licences expirant dans les 30 jours |
| Rapport mensuel | À la demande de l'admin (bouton en Paramètres) |
| Confirmation abonnement | Après activation Stripe |

Domaine `nexhire.ca` vérifié — emails délivrés sans atterrir en spam.

---

## Fonctionnalités transversales

| | |
|---|---|
| **SPA** | Aucun rechargement de page — navigation fluide |
| **Bouton retour** | Historique navigateur fonctionnel |
| **Permaliens** | Chaque onglet a son URL (`#parc-it/budget`) |
| **Trilingue** | FR / EN / ES — bascule instantanée, mémorisée |
| **Mobile** | Interface responsive (tablettes et téléphones) |
| **Notifications** | Cloche d'alertes : licences, invitations, essai |
| **Auto-déconnexion** | Après inactivité prolongée |
| **No-cache** | JS/CSS toujours à jour — pas de problème de cache navigateur |

---

## Sécurité

| Mécanisme | Détail |
|---|---|
| Authentification | JWT ES256 (algorithme à courbe elliptique P-256) |
| Tokens OAuth | Chiffrés Fernet (AES-128-CBC) avant stockage |
| Credentials API | Chiffrés Fernet — jamais affichés en clair |
| Mots de passe | Hashés bcrypt via Supabase Auth |
| Connexion base de données | SSL obligatoire (sslmode=require) |
| RBAC | 5 niveaux de rôles, vérifiés à chaque requête API |
| Stripe | Signatures HMAC vérifiées sur chaque webhook |
| Audit log | Immuable, append-only — chaque action tracée |
| Sessions | Expiration automatique + auto-logout sur inactivité |
| Super Admin | Accès par liste blanche d'emails (variable d'env serveur) |

---

## Infrastructure

| Composant | Plan | Capacité |
|---|---|---|
| Render | Starter ($7/mois) | Toujours actif, pas de cold start |
| Supabase | Free tier | 500 MB DB — suffisant pour 10-20 clients |
| Stripe | Pay-as-you-go | 2,9% + 30¢ par transaction |
| Resend | Free tier | 3 000 emails/mois |

> **Prochain upgrade à prévoir :** Supabase Pro ($25/mois) vers 20+ clients actifs.

---

## Glossaire

| Terme | Définition |
|---|---|
| **Connecteur** | Pont entre NexHire et un système externe |
| **Token OAuth** | Clé d'accès chiffrée permettant à NexHire d'interroger un système sans stocker votre mot de passe |
| **Fernet** | Algorithme de chiffrement symétrique AES-128 — clé partagée uniquement côté serveur |
| **RBAC** | Role-Based Access Control — contrôle d'accès basé sur les rôles |
| **SSO** | Single Sign-On — une seule connexion pour tous les systèmes |
| **OIDC** | OpenID Connect — protocole d'authentification moderne (SSO) |
| **Multi-tenant** | Architecture où chaque client (tenant) est isolé — données séparées par organisation |
| **SaaS** | Software as a Service — logiciel accessible en ligne, sans installation |
| **JWT** | JSON Web Token — format standard pour les tokens d'authentification sécurisés |
| **KPI** | Key Performance Indicator — indicateur clé de performance |

---

*NexHire Enterprise Assistant — Version 2.0 · Juin 2026*
*Pour toute question : contact@nexhire.ca · nexhire.ca*
