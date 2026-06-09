# NexHire EIP — Guide de présentation client

**Version :** 2.0 (juin 2026)  
**Produit :** NexHire Enterprise Intelligence Platform  
**URL :** `https://agenthub.nexhire.ca`

---

## Ce qu'est NexHire EIP

NexHire EIP est une **plateforme d'intelligence d'entreprise tout-en-un** qui connecte tous les systèmes d'une organisation — ERP, RH, CRM, outils collaboratifs — et les transforme en intelligence actionnable via un assistant IA et des tableaux de bord exécutifs, le tout sans configuration technique complexe.

**En une phrase :** *Vos données éparpillées dans 10 systèmes, unifiées et interrogeables en langage naturel.*

---

## Pour qui ?

| Cible | Exemple |
|---|---|
| Municipalités et organismes publics | Villes, MRC, CIUSSS |
| PME et entreprises de taille intermédiaire | 50 à 500 employés |
| Firmes professionnelles | Cabinets juridiques, comptables, ingénieurs-conseils |
| Entreprises technologiques (MSP, SSII) | Prestataires IT qui gèrent plusieurs clients |

---

## Les 7 modules clés

### 1. Assistant IA contextuel

L'assistant IA se configure **automatiquement** selon le département de l'employé connecté. Un employé Juridique voit des suggestions sur les contrats et la conformité. Un employé Finance voit des questions sur les budgets et les écarts.

- Posez vos questions en français ou en anglais
- Contexte chargé depuis vos propres documents et données connectées
- Suggestions rapides pré-paramétrées par département

**Exemple de question :** *"Quels contrats arrivent à renouvellement dans les 60 prochains jours ?"*

---

### 2. Executive Intelligence Dashboard (EID)

Tableau de bord de direction temps réel avec :

- **Cartes KPI accordéon** par département (expandables au clic)
- **Ticker défilant** des métriques critiques
- **Alertes cliquables** avec actions contextuelles recommandées
- **Graphiques de tendance** avec historique sur 6 mois (Chart.js)
- **Comparaisons mois-sur-mois** pour anticiper les dérapages

Le tableau de bord s'adapte au rôle de l'utilisateur : un directeur général voit l'agrégé de tous les départements, un responsable Finance ne voit que ses KPIs.

---

### 3. Gestion des membres et départements

- Créer tous les départements de votre organisation (Juridique, Finance, IT, RH, Opérations, Marketing, etc.)
- Inviter les membres par email — ils reçoivent un lien d'activation sécurisé
- Affecter chaque membre à son département avec son niveau de permission
- Dès la connexion, chaque employé voit l'interface et l'IA adaptées à son contexte

---

### 4. Budget et optimisation

- Saisir les budgets alloués par catégorie et département
- Suivre les dépenses réelles en temps réel
- **Alerte automatique** à 80% du budget consommé → notification dans Teams ou Slack
- Recommandations d'optimisation générées par l'IA

---

### 5. Connecteurs — 19 systèmes d'entreprise

Connectez NexHire à vos outils existants. Aucune migration, aucun double-encodage.

#### Connexion en 1 clic (OAuth)

| Système | Ce que NexHire accède |
|---|---|
| Microsoft 365 | Emails, Teams, SharePoint, OneDrive, Calendrier |
| Google Workspace | Gmail, Drive, Agenda, Annuaire |
| Salesforce CRM | Comptes, Opportunités, Tickets |
| Jira / Confluence | Tickets, Sprints, Documentation |
| HubSpot | CRM, Contacts, Deals |
| Slack | Messages, canaux, fichiers |
| QuickBooks Online | Facturation, dépenses, rapports |

#### Connexion avec credentials (API Key)

| Système | Ce que NexHire accède |
|---|---|
| SAP | ERP, Finance, Achats, Logistique, RH |
| Workday | RH, Paie, Recrutement, Absences |
| Autotask / Datto PSA | Tickets PSA, Projets, Facturation |
| ServiceNow | Incidents, CMDB, SLA |
| Zendesk | Tickets support, Base de connaissances |
| BambooHR | Employés, Congés, Onboarding |
| NetSuite ERP | Finance, Inventaire, Commandes |
| Asana | Projets, Tâches, Équipes |
| Monday.com | Tableaux, Automatisations |
| ClickUp | Tâches, Documents, Sprints |

> **Sécurité :** Toutes les credentials sont chiffrées (AES-128) avant d'être stockées. Elles ne sont jamais affichées en clair.

---

### 6. SSO — Connexion unique d'entreprise

Les employés se connectent à NexHire avec leurs **identifiants d'entreprise existants** — plus de mot de passe NexHire séparé à retenir.

**Fournisseurs supportés :**
- Microsoft Entra ID (Azure AD) — idéal pour les entreprises Microsoft
- Google Workspace — idéal pour les organisations Google
- Okta — pour les entreprises avec un IdP dédié

**Bénéfices :**
- Déploiement instantané sur toute l'organisation
- Accès révoqué dès que l'employé quitte l'entreprise (centralisé dans votre IdP)
- Conformité IT et sécurité renforcée

---

### 7. Alertes Teams et Slack

Recevez les alertes critiques directement dans vos canaux Teams ou Slack existants.

| Alerte | Déclencheur |
|---|---|
| Nouveau membre rejoint | Un employé accepte une invitation |
| Abonnement activé | Paiement Stripe confirmé |
| Alerte budget | Dépenses ≥ 80% du budget alloué |
| Licence bientôt expirée | 30 jours avant la date d'expiration |

Configuration en 2 clics : **Paramètres → Intégrations → coller l'URL de votre webhook Teams/Slack**.

---

## L'expérience utilisateur

### Premier accès — Splash screen de bienvenue

À la connexion, une animation de bienvenue soignée s'affiche pendant 5 secondes avec le nom de l'organisation et la signature NexHire EIP. Première impression professionnelle garantie lors des démonstrations et du déploiement.

### Interface contextuelle automatique

L'application détecte le département de chaque employé et adapte automatiquement :
- Les suggestions de l'assistant IA
- Les KPIs affichés en priorité
- Les raccourcis et actions rapides

**Aucune configuration par employé** : l'admin assigne un département, tout le reste s'adapte.

### Application mobile (PWA)

NexHire EIP s'installe comme une application native sur :
- **Windows / macOS** : icône sur le bureau, fenêtre standalone
- **iPhone / iPad** : Partager → Sur l'écran d'accueil
- **Android** : bannière d'installation automatique

Fonctionne hors ligne pour les données en cache. Notifications push supportées.

---

## Emails automatiques

| Email | À qui | Quand |
|---|---|---|
| Bienvenue dans NexHire | Nouvel utilisateur | Lors de l'inscription |
| Confirmation d'abonnement | Admin de l'org | Après paiement Stripe |
| Rappel fin d'essai | Admin de l'org | J-7, J-3, J-1 avant fin de l'essai |
| Confirmation d'annulation | Admin de l'org | Lors de l'annulation Stripe |

---

## Sécurité et conformité

| Point | Détail |
|---|---|
| **Chiffrement des données** | Credentials connecteurs et SSO chiffrés AES-128 (Fernet) |
| **Auth sécurisée** | Supabase Auth + JWT signés, sessions courte durée |
| **HTTPS** | TLS enforced sur tout le domaine `agenthub.nexhire.ca` |
| **Isolation des organisations** | Chaque org voit uniquement ses propres données |
| **Accès par rôle** | Chaque fonctionnalité filtrée par rôle (owner / admin / manager / member) |
| **Webhooks Stripe** | Validés par signature HMAC — impossible à forger |
| **Hébergement** | Render (infrastructure cloud canadienne disponible) |

---

## Script de démonstration (20 minutes)

### Phase 1 — Connexion et découverte (5 min)

1. Ouvrir `https://agenthub.nexhire.ca`
2. Se connecter avec le compte de démo → **le splash screen s'affiche** (5 secondes)
3. Pointer : *"À chaque connexion, l'employé est accueilli avec le nom de son organisation"*
4. Montrer le **tableau de bord EID** : ticker, cartes KPI, alertes
5. Cliquer sur une carte KPI → afficher le **graphique de tendance**

### Phase 2 — Intelligence contextuelle (5 min)

6. Ouvrir l'**Assistant IA** (onglet Agent)
7. Pointer les suggestions rapides : *"Elles sont différentes selon le département — un Juridique voit 'Contrats à renouveler', un Finance voit 'Dépenses vs budget'"*
8. Poser une question en langage naturel
9. Montrer comment l'IA répond avec les données de l'organisation

### Phase 3 — Connecteurs et intégrations (5 min)

10. Aller dans **Connecteurs**
11. Montrer la liste des 19 connecteurs disponibles
12. Cliquer sur un connecteur OAuth (ex: Microsoft 365) → montrer le flux de connexion en 1 clic
13. Montrer le bouton **Test de connexion** (ping) pour les connecteurs API Key

### Phase 4 — Administration et sécurité (5 min)

14. Aller dans **Paramètres → Membres** → montrer la gestion des départements
15. Montrer **Paramètres → SSO** → *"Vos employés se connectent avec leurs identifiants Microsoft existants"*
16. Montrer **Paramètres → Intégrations** → *"Les alertes arrivent directement dans votre Teams ou Slack"*
17. Conclure : *"Tout est installable en PWA sur mobile — vos managers ont leurs tableaux de bord dans leur poche"*

---

## Questions fréquentes en démonstration

**Q : Nos données restent-elles en sécurité ?**  
R : Oui. Chaque organisation est complètement isolée. Les credentials de vos connecteurs sont chiffrées avant stockage et ne sont jamais affichées en clair. L'hébergement peut être configuré sur des serveurs canadiens.

**Q : Faut-il migrer nos données actuelles ?**  
R : Non. NexHire se connecte à vos systèmes existants et les lit là où ils sont. Aucune migration, aucun double-encodage.

**Q : Combien de temps pour déployer ?**  
R : La configuration de base (organisation, membres, 2-3 connecteurs) prend moins d'une demi-journée. Le SSO peut être configuré en 1 heure avec votre équipe IT.

**Q : Et si on utilise un logiciel non listé ?**  
R : Contactez-nous — nous évaluons les nouvelles intégrations sur demande.

**Q : Y a-t-il une app mobile ?**  
R : Oui, via PWA (Progressive Web App). Elle s'installe sur iPhone, Android et bureau sans passer par l'App Store. Pour une app native dédiée, nous contacter.

---

## Prochaines étapes pour démarrer

1. **Essai gratuit 14 jours** — aucune carte de crédit requise
2. Créer votre organisation sur `https://agenthub.nexhire.ca`
3. Inviter vos premiers membres
4. Connecter votre premier système (Microsoft 365 recommandé — 2 minutes)
5. Planifier une session d'accompagnement avec l'équipe NexHire

---

**Contact :** edemgnagblodjro2@gmail.com  
**Domaine :** `https://agenthub.nexhire.ca`

---

*Dernière mise à jour : juin 2026 — NexHire EIP v2.0*
