# NexHire EIP — Guide de présentation client

**Version :** 3.0 (juin 2026)  
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

## Les 10 modules clés

### 1. Assistant IA contextuel

L'assistant IA se configure **automatiquement** selon le département de l'employé connecté. Un employé Juridique voit des suggestions sur les contrats et la conformité. Un employé Finance voit des questions sur les budgets et les écarts.

- Posez vos questions en français ou en anglais
- Contexte chargé depuis vos propres documents et données connectées
- Suggestions rapides pré-paramétrées par département

**Exemple de question :** *"Quels contrats arrivent à renouvellement dans les 60 prochains jours ?"*

---

### 2. Executive Intelligence Dashboard (EID)

Tableau de bord de direction temps réel avec :

- **Score Santé Organisationnel (0-100)** — indicateur global calculé à partir des scores de chaque département. Affiché avec un badge coloré (Excellent / Bon / À surveiller / Critique) et une jauge SVG en anneau.
- **Cartes KPI accordéon** par département (expandables au clic)
- **Ticker défilant** des métriques critiques
- **Alertes cliquables** avec actions contextuelles recommandées
- **Graphiques de tendance** avec historique sur 6 mois (Chart.js)
- **Comparaisons mois-sur-mois** pour anticiper les dérapages
- **Briefing exécutif hebdomadaire** — email automatique envoyé chaque lundi à 07h30 UTC à l'administrateur avec un résumé des KPIs de tous les départements

Le tableau de bord s'adapte au rôle de l'utilisateur : un directeur général voit l'agrégé de tous les départements, un responsable Finance ne voit que ses KPIs.

---

### 3. Gouvernance des identités — Intelligence M365 + Entra ID

Module de gouvernance des identités alimenté par des données **réelles** provenant de Microsoft Graph API. Aucune estimation — tout est basé sur l'activité réelle des utilisateurs.

#### Tableau de bord des licences

- **Licences inutilisées** : utilisateurs avec zéro activité depuis plus de 90 jours (validé par le rapport Graph)
- **Licences surdimensionnées** : E5 pour un usage E3, ou E3 pour un usage Outlook+Teams seulement
- **Comptes orphelins** : employés terminés dans Workday avec un compte M365 encore actif
- **Économies potentielles** en $ par mois et par an

**Exemple réel :** 12 utilisateurs inactifs sur 420 → économie potentielle 84 $/mois, 1 008 $/an.

#### Posture de sécurité (Entra ID)

- **MFA par utilisateur** : statut réel depuis Entra ID (pas une estimation)
- **Administrateurs détectés** : Global Admin, Security Admin, Conditional Access Admin, etc.
- **Admins sans MFA** : risque critique signalé automatiquement
- **Comptes de service** : principals de service (apps d'entreprise, managed identities) inventoriés

#### Comment ça marche

1. Connecter Microsoft 365 (un clic, consentement admin requis)
2. Cliquer **Analyser M365 + Entra** dans l'onglet Intelligence
3. NexHire collecte les données via Microsoft Graph API (30–60 secondes)
4. Les recommandations apparaissent automatiquement, classées par impact financier

> **Garantie qualité :** NexHire ne génère jamais de recommandation de suppression de licence pour un compte sans données d'activité confirmées. Seules les données Graph Reports ou l'historique de connexion déclenchent des recommandations.

---

### 3b. Optimisation IA — Centre d'économies

Module dédié à l'identification des opportunités d'économies et d'efficacité, organisé en trois onglets :

#### Opportunités d'économies
- Opportunités numérotées (N°1, N°2…) classées par impact financier estimé
- Chaque opportunité indique le département concerné, le type (licences / processus / contrats) et l'économie annuelle potentielle
- Badge coloré selon le type de département

#### Centre de recommandations
- Actions concrètes avec impact estimé, effort requis et délai de mise en œuvre
- Bouton de navigation directe vers le module concerné (ex. cliquer sur une recommandation contrats redirige vers Contrats)

#### Prévisions et risques
- Tendances de santé par département sur les 30 derniers jours
- Prévisions budgétaires à 3 mois basées sur les dépenses réelles
- Barres de risque budgétaire avec pourcentage de dépassement prévu

---

### 4. Gestion des membres, départements et hiérarchie

#### Créer et organiser les départements
- Initialisation automatique par secteur : Entreprise privée, Hôpital, Municipalité, Université, PME, PMI, Entrepreneur
- Types de département reconnus : Finance, RH, IT, Juridique, Opérations, Communication, Direction, Approvisionnement, Marketing
- Chaque département a un type qui détermine les catégories de contrats visibles, les KPIs affichés et les accès IA

#### Inviter des membres
1. L'administrateur génère un lien depuis **Équipe → + Inviter un membre** (valide **7 jours**)
2. Le lien est partagé par email, Slack ou tout autre canal
3. La personne invitée arrive sur le formulaire NexHire pré-rempli avec son email (verrouillé)
4. Elle choisit un mot de passe, vérifie son email et se connecte
5. Elle rejoint automatiquement l'organisation avec le rôle assigné

> **Important :** La personne invitée crée un compte NexHire propre — aucun compte Microsoft ou Google requis.

#### Niveaux hiérarchiques (1 à 6)

| Niveau | Titre | Accès |
|---|---|---|
| 1 | Direction Générale | Accès total — tous les KPIs financiers, tous les départements |
| 2 | VP / Directeur Exécutif | Accès total |
| 3 | Directeur de Département | Accès complet département + KPIs financiers |
| 4 | Gestionnaire / Chef d'équipe | Budget consommé — pas de projections ni savings $ |
| 5 | Superviseur | Comptages et scores — aucune donnée financière |
| 6 | Employé | Comptages et scores — aucune donnée financière |

> L'accès est déterminé automatiquement à l'ajout d'un membre — l'admin choisit le niveau, les droits s'appliquent immédiatement.

#### Transfert de département
- Le bouton **⇄** permet de transférer un membre d'un département à un autre
- **Par défaut** : le membre **perd tous ses droits dans l'ancien département** (suppression automatique)
- **Option "double appartenance"** : une case à cocher permet de maintenir l'accès à l'ancien département si nécessaire (ex. un manager à cheval sur Finance et Opérations)

#### Navigation contextuelle par département
- **Parc IT** — visible uniquement pour les membres IT, Direction et les admins. Les autres départements (Finance, RH, Juridique…) ne voient pas cet onglet.
- **Type d'organisation** dans les paramètres — modifiable uniquement par les admins ; figé en lecture seule pour les autres membres.

---

### 5. Connecteurs — 22 systèmes d'entreprise

Connectez NexHire à vos outils existants. Aucune migration, aucun double-encodage.

#### Connexion en 1 clic (OAuth) — 9 systèmes

| Système | Ce que NexHire accède |
|---|---|
| Microsoft 365 + Entra ID | Emails, Teams, SharePoint, OneDrive, Calendrier **+ identités, licences, MFA, rôles admin** |
| Google Workspace | Gmail, Drive, Agenda, Annuaire |
| Salesforce CRM | Comptes, Opportunités, Tickets |
| Jira / Confluence | Tickets, Sprints, Documentation |
| HubSpot | CRM, Contacts, Deals |
| Slack | Messages, canaux, fichiers |
| QuickBooks Online | Facturation, dépenses, rapports |
| ServiceNow | Incidents, CMDB, SLA |
| Zendesk | Tickets support, Base de connaissances |

#### Connexion avec credentials (API Key) — 13 systèmes

| Système | Ce que NexHire accède |
|---|---|
| SAP | ERP, Finance, Achats, Logistique, RH |
| Workday | RH, Paie, Recrutement, Absences |
| Autotask / Datto PSA | Tickets PSA, Projets, Facturation |
| BambooHR | Employés, Congés, Onboarding |
| ADP Workforce Now | Paie, RH, Gestion des temps |
| NetSuite ERP | Finance, Inventaire, Commandes |
| Epicor ERP | Production, Inventaire, Finance, Achats |
| AWS | Ressources cloud, coûts, logs, alertes |
| Microsoft Intune | Gestion des appareils, conformité, endpoints |
| CrowdStrike Falcon | Alertes sécurité, détections de menaces |
| Asana | Projets, Tâches, Équipes |
| Monday.com | Tableaux, Automatisations |
| ClickUp | Tâches, Documents, Sprints |

#### Comptes de service par département

Chaque connecteur peut être **restreint à un ou plusieurs départements**. Exemple : QuickBooks est accessible uniquement au département Finance, Jira uniquement à IT.

- L'admin assigne les départements autorisés via **🔒 Accès département** sur chaque connecteur
- Les membres des autres départements ne voient pas les connecteurs qui ne leur sont pas assignés
- Recommandation : créer un compte de service dédié par département dans chaque système source (ex. `svc-finance@org.com` pour QuickBooks, `svc-it@org.com` pour Jira) — meilleure traçabilité et révocation facilitée

> **Sécurité :** Toutes les credentials sont chiffrées (AES-128) avant stockage. Elles ne sont jamais affichées en clair.  
> **Connexion permanente :** Les tokens OAuth sont renouvelés automatiquement en arrière-plan — aucune reconnexion manuelle requise.  
> **Test automatique :** Pour SAP, Workday et Autotask, NexHire teste la connectivité dès l'enregistrement des credentials.

---

### 6. Analyse de documents PDF confidentiels

Téléversez des PDF — politiques, appels d'offres, contrats, rapports — et posez des questions directement sur leur contenu en langage naturel.

#### Sécurité et confidentialité des documents

Point clé pour les clients soucieux de la confidentialité :

| Aspect | Détail |
|---|---|
| **Fichier jamais stocké** | Le PDF est lu en mémoire, le texte extrait, le binaire immédiatement effacé |
| **Seul le texte est conservé** | Stocké dans votre espace isolé (lié à votre `organization_id`) |
| **Transport chiffré** | HTTPS/TLS entre le navigateur et le serveur |
| **Isolation totale** | Aucune autre organisation ne peut accéder à vos documents |
| **Audit complet** | Chaque upload et chaque consultation tracés dans le journal d'audit |
| **Suppression à la demande** | Bouton "🗑️ Supprimer ce document" disponible après chaque upload |
| **Anthropic (Claude) API** | Anthropic ne réutilise pas les données de l'API pour entraîner ses modèles |

#### Ce que vous répondez à un prospect

> *"Mon document est confidentiel — que se passe-t-il quand je l'uploade ?"*

**Réponse :** Le fichier PDF n'est jamais stocké. On en extrait le texte en mémoire, le fichier disparaît immédiatement. Seul le texte extrait est sauvegardé dans votre espace isolé — chiffré en transit, lié à votre organisation. Tout accès est tracé dans votre journal d'audit. Pour l'analyse IA, le texte est transmis à l'API Anthropic (Claude), qui s'engage contractuellement à ne pas utiliser les données API pour entraîner ses modèles. Vous pouvez supprimer le document à tout moment depuis l'interface.

---

### 7. Parc IT et gestion des actifs

*(Visible uniquement pour les départements IT, Direction et les administrateurs.)*

- **Budget IT** : suivi des dépenses par catégorie, prévisions à 3 mois
- **Licences logicielles** : dates d'expiration, alertes 30 jours avant, taux d'utilisation
- **Équipements** : inventaire serveurs et appareils, statut de décommissionnement
- **Applications** : suivi des apps actives, détection des inutilisées
- Vue d'ensemble en 4 KPIs : budget consommé, licences à risque, équipements à décommissionner, applications inutilisées

---

### 8. Gestion des contrats par département

- Création de contrats fournisseurs avec suivi des renouvellements et alertes automatiques
- **Catégories contextuelles par département** : un utilisateur Finance voit les catégories Audit, Conseil financier, Assurances, Banque — un utilisateur IT voit Logiciels, Cloud, Matériel, Services IT. Aucune confusion entre les secteurs.
- Potentiel de négociation estimé en %
- Alertes renouvellement à 30 et 90 jours
- Filtrage par département, statut et catégorie

---

### 9. Statistiques d'utilisation (isolées par organisation)

Chaque organisation voit **uniquement ses propres statistiques** — aucune donnée d'une autre organisation n'apparaît jamais.

- Nombre de requêtes IA sur 7 / 30 / 90 jours
- Activité quotidienne (graphique barres)
- Connecteurs les plus utilisés
- Score de satisfaction moyen (notes 1-5 étoiles)
- Taux d'utilisation : % de membres actifs vs membres inscrits *(admins uniquement)*
- Top utilisateurs *(admins uniquement)*

---

### 10. SSO — Connexion unique d'entreprise

Les employés se connectent à NexHire avec leurs **identifiants d'entreprise existants** — plus de mot de passe NexHire séparé.

**Fournisseurs supportés :**
- Microsoft Entra ID (Azure AD)
- Google Workspace
- Okta

**Bénéfices :** déploiement instantané, révocation centralisée, conformité IT renforcée.

---

## Alertes automatiques — récapitulatif complet

| Alerte | Canal | Déclencheur |
|---|---|---|
| Nouveau membre rejoint | Teams / Slack | Acceptation d'une invitation |
| Alerte budget | Teams / Slack | Dépenses ≥ 80% du budget alloué |
| Licence bientôt expirée | Teams / Slack | 30 jours avant expiration |
| Connecteur déconnecté | Email + bannière UI | Erreur de connexion détectée |
| Fin d'essai imminente | Email | J-7, J-3, J-1 avant expiration du trial |
| Abonnement activé | Teams / Slack | Paiement Stripe confirmé |
| Briefing hebdomadaire | Email | Chaque lundi à 07h30 UTC |

---

## Période d'essai — comment ça fonctionne

- **14 jours gratuits** — aucune carte de crédit requise
- Un décompte précis en temps réel est affiché dans l'interface : *"Encore 11 jours restants"*
- Le décompte change de couleur selon l'urgence :
  - Vert → plus de 3 jours restants
  - Orange → 3 jours ou moins
  - Rouge → essai expiré
- L'administrateur reçoit des **emails d'alerte automatiques** à J-7, J-3 et J-1
- Transition transparente vers Premium en 2 clics (Stripe)

---

## Sécurité et conformité

| Point | Détail |
|---|---|
| **Chiffrement credentials** | AES-128 (Fernet) pour tous les tokens et clés API |
| **Auth sécurisée** | Supabase Auth + JWT ES256, sessions courte durée |
| **HTTPS** | TLS enforced sur tout le domaine `agenthub.nexhire.ca` |
| **Isolation des organisations** | Chaque org voit uniquement ses propres données — stats, docs, contrats, membres, connecteurs |
| **Accès par rôle** | 4 rôles (owner / admin / manager / member) + 6 niveaux hiérarchiques |
| **Accès par département** | Les connecteurs, contrats, processus et budgets sont filtrés par département |
| **Documents PDF** | Binaire jamais stocké — seul le texte extrait, suppression à la demande |
| **Webhooks Stripe** | Validés par signature HMAC |
| **Journal d'audit immuable** | Chaque action tracée avec IP, utilisateur, date, résultat — append-only |
| **Conformité PIPEDA** | Loi fédérale canadienne sur la protection des renseignements personnels |
| **Conformité Loi 25 QC** | Note complémentaire pour les clients québécois |
| **Hébergement** | Render + Supabase (infrastructure canadienne disponible) |

---

## L'expérience utilisateur

### Premier accès — Splash screen de bienvenue

À la connexion, une animation de bienvenue soignée s'affiche avec le nom de l'organisation et la signature NexHire EIP. Première impression professionnelle garantie lors des démonstrations.

### Interface contextuelle automatique

| Ce que l'app détecte | Ce qui s'adapte |
|---|---|
| Département de l'employé | Suggestions IA, catégories de contrats |
| Rôle (admin / manager / member) | Onglets visibles, actions disponibles |
| Type de département (IT / Finance…) | Onglet Parc IT masqué pour les non-IT |
| Niveau hiérarchique (1-6) | KPIs financiers accessibles ou non |

**Aucune configuration par employé** : l'admin assigne un département et un niveau, tout le reste s'adapte automatiquement.

### Application mobile (PWA)

S'installe sur Windows, macOS, iPhone/iPad, Android. Fonctionne hors ligne pour les données en cache. Notifications push supportées.

---

## Script de démonstration (25 minutes)

### Phase 1 — Connexion et première impression (5 min)

1. Ouvrir `https://agenthub.nexhire.ca`
2. Connexion → **splash screen** 5 secondes
3. Pointer : *"Chaque employé est accueilli avec le nom de son organisation"*
4. Montrer le **Score Santé Organisationnel** en haut du tableau de bord (jauge 0-100)
5. Déplier une carte KPI → afficher le graphique de tendance

### Phase 2 — Intelligence contextuelle (5 min)

6. Aller dans **Assistant IA**
7. Pointer les suggestions rapides différentes par département
8. Poser une question en langage naturel
9. Montrer le score de satisfaction (étoiles) sur la réponse

### Phase 3 — Optimisation IA (5 min)

10. Aller dans **Optimisation IA**
11. Montrer les opportunités numérotées (N°1, N°2…) avec économies estimées
12. Cliquer sur **Recommandations** → montrer les actions avec impact et délai
13. Cliquer sur **Prévisions** → montrer les tendances et risques budgétaires

### Phase 4 — Connecteurs et sécurité (5 min)

14. Aller dans **Connecteurs**
15. Montrer les 22 connecteurs disponibles
16. Cliquer **🔒 Accès département** sur un connecteur → *"Ce connecteur est réservé au département Finance"*
17. Montrer les credentials chiffrées (*****) et le bouton Test de connexion

### Phase 5 — Administration et conformité (5 min)

18. **Organisation → organigramme** → montrer les niveaux hiérarchiques et le bouton transfert
19. Transférer un membre → montrer la case "Conserver l'accès à l'ancien département"
20. **Documents** → uploader un PDF → pointer la bannière sécurité verte → montrer le bouton 🗑️ Supprimer
21. **Paramètres → Abonnement** → montrer le décompte trial précis ("Encore X jours")
22. Conclure : *"Tout est installable en PWA sur mobile — vos managers ont leurs tableaux de bord dans leur poche"*

---

## Questions fréquentes en démonstration

**Q : Nos données restent-elles en sécurité ?**  
R : Chaque organisation est complètement isolée — stats, documents, contrats, membres et connecteurs sont filtrés par `organization_id`. Les credentials de vos connecteurs sont chiffrées AES-128 avant stockage et ne sont jamais affichées en clair. L'hébergement peut être configuré sur infrastructure canadienne.

**Q : Faut-il migrer nos données actuelles ?**  
R : Non. NexHire se connecte à vos systèmes existants et les lit là où ils sont.

**Q : Faut-il se reconnecter régulièrement aux connecteurs ?**  
R : Non. La connexion OAuth est permanente — NexHire renouvelle automatiquement les tokens en arrière-plan.

**Q : Que se passe-t-il si un connecteur se déconnecte ?**  
R : NexHire déclenche deux protections automatiques : un email d'alerte à l'administrateur, et une bannière d'avertissement dans l'interface agent. Les autres connecteurs continuent de fonctionner normalement.

**Q : Un employé Finance verra-t-il les données IT ou RH ?**  
R : Non. Chaque employé voit uniquement les données de son département. Les connecteurs, contrats, budgets et processus sont tous filtrés par département. L'onglet Parc IT n'apparaît même pas dans le menu d'un employé Finance.

**Q : Que se passe-t-il quand un employé change de département ?**  
R : Le transfert retire automatiquement ses accès à l'ancien département. Si vous souhaitez qu'il garde les deux accès temporairement (ex. passation), une case "double appartenance" permet de le faire explicitement.

**Q : Mon document PDF confidentiel est-il en sécurité ?**  
R : Le fichier PDF n'est **jamais stocké** — on en extrait le texte en mémoire et le fichier disparaît immédiatement. Seul le texte extrait est conservé dans votre espace isolé. Pour l'analyse IA, le texte est transmis à l'API Anthropic, qui ne réutilise pas les données de l'API pour entraîner ses modèles. Vous pouvez supprimer le document à tout moment depuis l'interface.

**Q : NexHire stocke-t-il une copie de nos données SAP, M365, Salesforce… ?**  
R : Non. Chaque réponse de l'agent interroge vos systèmes en temps réel. NexHire est une fenêtre de lecture, pas un entrepôt de données.

**Q : Combien de temps pour déployer ?**  
R : Configuration de base (organisation, membres, 2-3 connecteurs) : moins d'une demi-journée. SSO : 1 heure avec votre équipe IT.

**Q : Y a-t-il une app mobile ?**  
R : Oui, via PWA. S'installe sur iPhone, Android et bureau sans passer par l'App Store.

**Q : Et si on utilise un logiciel non listé ?**  
R : Contactez-nous — nous évaluons les nouvelles intégrations sur demande.

---

## Prochaines étapes pour démarrer

1. **Essai gratuit 14 jours** — aucune carte de crédit requise
2. Créer votre organisation sur `https://agenthub.nexhire.ca`
3. Inviter vos premiers membres et les assigner à leurs départements
4. Connecter votre premier système (Microsoft 365 recommandé — 2 minutes)
5. Initialiser les départements par secteur (⚡ bouton automatique)
6. Planifier une session d'accompagnement avec l'équipe NexHire

---

**Contact :** edemgnagblodjro2@gmail.com  
**Domaine :** `https://agenthub.nexhire.ca`

---

*Dernière mise à jour : 10 juin 2026 — NexHire EIP v3.0*
