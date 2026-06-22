# Guide Client — NexHire EIP

**Plateforme d'intelligence opérationnelle pour PME, PMI et organisations canadiennes**  
Version 2.0 — Juin 2026 · support@nexhire.ca

---

## Démarrage rapide

1. Créez votre compte sur **agenthub.nexhire.ca**
2. Acceptez les CGU et la politique de confidentialité
3. Configurez votre organisation (nom, logo, devise)
4. Invitez vos collaborateurs via **Paramètres → Membres**
5. Connectez vos outils via **Intégrations → Connecteurs**

> **Premier connecteur recommandé :** Microsoft 365 — résultats immédiats, connexion en 2 minutes.

---

## Les 7 modules de NexHire EIP

| Module | Qui y accède | Ce qu'il fait |
|---|---|---|
| 🤖 **Assistant IA** | Tous | Agent conversationnel multi-connecteurs en FR/EN |
| 📊 **Optimisation** | Admin, Direction | Détection d'économies, risques, score de santé |
| 💰 **Dépenses** | Finance, Admin | Budgets, transactions, alertes de dépassement |
| 📦 **Achats** | Achats, Admin | Contrats fournisseurs, dépenses, négociation |
| 💻 **Parc IT** | IT, Admin | Licences, applications, équipements, coûts cachés |
| 📄 **Rapports** | Tous | Exports PDF/Word/Excel, rapports automatiques |
| 🏛 **Organisation** | Admin | Départements, membres, rôles, audit |

---

## Connecter Microsoft 365 (recommandé en premier)

**Ce que NexHire analyse :**
- Licences non utilisées et économies potentielles
- Comptes sans MFA (risque de sécurité)
- Administrateurs globaux non nécessaires
- Appareils Intune non conformes
- Contrats et documents SharePoint

**Étapes :**
1. Intégrations → Microsoft 365 → **Connecter**
2. Connectez-vous avec un compte **administrateur Microsoft**
3. Accordez les permissions demandées (lecture seule)
4. NexHire collecte les données en arrière-plan (~2 min)
5. Vos tableaux de bord se mettent à jour automatiquement

**Permissions requises sur votre tenant :**
- `User.Read.All`
- `Organization.Read.All`
- `Reports.Read.All`
- `DeviceManagementManagedDevices.Read.All` (Intune)
- `AuditLog.Read.All` (MFA)

---

## Connecter Jira

**Ce que NexHire analyse :**
- Tickets bloqués ou en retard
- Charge par sprint et par équipe
- Issues par priorité ou projet
- Backlog et vélocité

**Prérequis :** Un site Jira actif (atlassian.com)

**Étapes :**
1. Intégrations → Jira → **Connecter via Atlassian**
2. Autorisez l'accès à votre site Jira
3. Posez des questions à l'agent : *«Quels tickets sont bloqués ce sprint ?»*

---

## Connecter QuickBooks

**Ce que NexHire analyse :**
- Factures envoyées et impayées
- Dépenses par catégorie
- Bilan simplifié et flux de trésorerie

**Étapes :**
1. Intégrations → QuickBooks → **Connecter via Intuit**
2. Autorisez l'accès à votre entreprise QuickBooks
3. L'agent peut répondre : *«Quelles factures sont en retard de plus de 30 jours ?»*

---

## Connecter SAP / Workday / ServiceNow

Ces connecteurs (plan Enterprise) utilisent des credentials directs.

1. Intégrations → \[SAP / Workday / ServiceNow\] → **Configurer**
2. Entrez l'URL de votre instance, le client ID et le secret
3. NexHire teste la connexion et confirme l'accès

> Vos credentials sont chiffrés (Fernet AES-128) et jamais visibles par l'équipe NexHire.

---

## Module Dépenses — Budgets et transactions

### Ajouter un budget
Dépenses → Budgets → **+ Nouveau budget**  
Sélectionnez le département, le montant alloué, la devise et la période (exercice fiscal).  
NexHire génère une alerte automatique à **95 %** du budget consommé.

### Enregistrer une transaction
Dépenses → Transactions → **+ Nouvelle transaction**  
Renseignez : département, catégorie, montant, date, fournisseur.  
La transaction est immédiatement prise en compte dans le calcul budgétaire et les rapports.

### Catégories de dépenses disponibles
Logiciels & licences · Matériel · Services professionnels · Hébergement cloud  
Télécommunications · Formation · Marketing · RH · Autres

---

## Module Parc IT — Applications, Contrats, Licences

### Ajouter une application
Parc IT → Applications → **+ Nouvelle application**  
Champs : nom, catégorie, statut (Actif / Inactif / En évaluation), coût mensuel, département.  
NexHire détecte les doublons fonctionnels si ≥ 3 applications actives dans la même catégorie.

### Ajouter un contrat fournisseur
Parc IT → Contrats → **+ Nouveau contrat**

| Champ | Description |
|---|---|
| Fournisseur | Nom du vendeur |
| Valeur annuelle | Montant total du contrat |
| Date de renouvellement | NexHire alerte à J−30 et J−90 |
| Potentiel de négociation (%) | Économies estimées au renouvellement |
| **Renouvellement automatique** | Cochez si le contrat se reconduit seul |
| **Délai de résiliation (jours)** | Fenêtre pour envoyer l'avis (ex : 60 jours) |
| **Sièges contractuels min.** | Plancher imposé par le fournisseur |
| **Sièges réellement utilisés** | Usage actuel — pour détecter l'écart |

> **Attention renouvellement automatique :** NexHire génère une **alerte critique** dès que la fenêtre de résiliation est dépassée (ex : 60 jours avant renouvellement). Agissez avant ce délai.

### Gérer les licences logicielles
Parc IT → Licences → **+ Nouvelle licence**

**Les 3 catégories de licences (NexHire les distingue automatiquement) :**

| Catégorie | Description | Alerte |
|---|---|---|
| Assignées et actives | Licences utilisées par des membres identifiés | Aucune |
| Stock tampon (buffer) | Réservées pour nouvelles embauches / projets | Aucune si déclaré |
| Surplus réel | Non assignées au-delà du buffer déclaré | ⚠ Opportunité d'économie |

**Formule :** `surplus = (quantité − assignées) − buffer_déclaré`

> Exemple : 50 licences achetées, 12 assignées, 8 en buffer → **surplus = 30** (pas 38).  
> NexHire recommande de réduire de 30 au prochain renouvellement, pas de 38.

**Déclarer un stock tampon :**  
Champ *Stock tampon* lors de l'ajout ou modification d'une licence.  
Réévaluez votre buffer à chaque changement de plan d'embauche.

---

## Les 3 coûts cachés que NexHire surveille

### 1. Fenêtre de résiliation automatique
Contrats avec renouvellement automatique + délai de résiliation renseigné.  
→ Alerte critique quand `date_aujourd'hui ≥ renouvellement − délai_résiliation`.  
**Risque :** vous payez un an de plus si vous manquez cette fenêtre.

### 2. Engagement minimum non atteint
`Sièges contractuels min.` vs `Sièges réellement utilisés` renseignés dans le contrat.  
→ Alerte quand l'usage réel est inférieur au plancher négocié.  
**Exemple :** 200 sièges Microsoft EA, 142 utilisés → 58 sièges × prix unitaire = **montant à renégocier**.

### 3. Shadow IT — achats non déclarés
NexHire croise vos **transactions financières** avec les **contrats et licences** enregistrés.  
Si un fournisseur logiciel connu (Slack, Zoom, Adobe, Dropbox…) apparaît dans les transactions **sans contrat ni licence associé**, il est signalé.  
**Risque :** dépenses non gouvernées + données hors périmètre sécurité.  
**Solution :** créez le contrat/licence correspondant dans Parc IT, ou vérifiez si l'achat est autorisé.

> Ces 3 alertes sont visibles dans **Optimisation → Risques**.

---

## Module Optimisation — Score de santé et recommandations

**Score de santé IT (0–100) :**  
Calculé automatiquement selon : licences expirant, contrats à risque, appareils décommissionnés, applications inutilisées, budget dépassé.

**Sources d'économies détectées :**
1. Surplus de licences (au-delà du buffer déclaré)
2. Outils en doublon (≥ 3 actifs dans la même catégorie fonctionnelle)
3. Contrats avec potentiel de négociation × valeur annuelle
4. Microsoft 365 : licences d'inactifs + sur-dimensionnement de plan (via Graph API)
5. Engagement minimum non atteint
6. Contrats Shadow IT non gouvernés

---

## Rapports automatiques

Rapports → **+ Planifier un rapport**  
Choisissez : fréquence (hebdomadaire / mensuel), modules à inclure, destinataires.

**Formats d'export disponibles :**
- PDF (avec logo de votre organisation)
- Word (.docx)
- Excel (.xlsx)
- PowerPoint (.pptx)

**Rapports disponibles par module :**
- Rapport d'optimisation (économies + risques)
- Rapport Parc IT (licences, contrats, équipements)
- Rapport financier (budgets, transactions, tendances)
- Rapport RH (accès, identités, onboarding/offboarding)

---

## Accès par département

| Département | Modules visibles |
|---|---|
| Finance | 💰 Dépenses (budgets, transactions, copilot) |
| Approvisionnement | 📦 Achats (contrats, fournisseurs) |
| Technologies de l'information | 💻 Parc IT + Dépenses IT |
| Direction / Administration | Tous les modules + 🏛 Organisation |

> Si vous ne voyez pas un onglet, demandez à votre administrateur de vous assigner au bon département dans **Organisation → Départements**.

---

## Rôles et permissions

| Rôle | Peut créer | Peut modifier | Peut supprimer | Accès org complet |
|---|---|---|---|---|
| **user** | — | — | — | Non |
| **manager** | ✓ | ✓ (son dépt) | — | Non |
| **admin** | ✓ | ✓ | ✓ | Oui |
| **service_account** | API seulement | API seulement | — | Lecture |

---

## Recherche interne dans vos documents

Chaque module dispose d'un sous-onglet **🔍 Recherche** pour interroger vos documents en langage naturel.

**Exemples de questions :**
- *«Quelle est notre politique de remboursement de frais ?»*
- *«Quelles sont les clauses de résiliation du contrat avec le fournisseur X ?»*
- *«Résume les procédures de sécurité informatique»*

La recherche n'interroge que les documents de **votre département** (et les documents partagés à toute l'organisation).

---

## Téléverser un document

1. Rapports → sous-onglet **Documents** → **+ Téléverser**
2. Choisissez votre fichier PDF
3. Sélectionnez le département propriétaire (ou «Accessible à toute l'organisation»)
4. Cliquez **Extraire le texte**

---

## MFA — Authentification multi-facteurs

Le MFA protège l'accès à NexHire. NexHire surveille également le statut MFA de vos administrateurs via le connecteur Microsoft 365.

**Pour activer le MFA sur votre tenant M365 :**
1. Centre d'administration M365 → Utilisateurs → **Authentification multi-facteurs**
2. Sélectionnez l'administrateur → Activer
3. Dans NexHire : Conformité → **Synchroniser** pour mettre à jour le statut

---

## SSO — Authentification unique

Le SSO permet à vos utilisateurs de se connecter avec leurs identifiants d'entreprise (Microsoft, Okta, Google).

**Protocoles supportés :** SAML 2.0 · OpenID Connect (OIDC)  
**Fournisseurs compatibles :** Microsoft Entra ID · Okta · Google Workspace · ADFS

**Pour activer le SSO :**  
Envoyez un email à support@nexhire.ca avec votre fournisseur SSO et votre domaine de messagerie.  
Délai de mise en place : 1–3 jours ouvrables.

---

## Sécurité de vos données

- Connexion HTTPS / TLS 1.3 uniquement
- Credentials connecteurs chiffrés (Fernet AES-128)
- Données isolées par organisation **et par département**
- Tokens OAuth en lecture seule — NexHire ne modifie jamais vos systèmes
- Journaux d'audit complets sur chaque action (connexion, modification, export)
- Hébergement au Canada (conformité LPRPDE)
- Aucune donnée utilisée pour entraîner les modèles IA

---

## Migrations SQL — Administrateurs NexHire

> Cette section est pour les administrateurs techniques qui déploient NexHire.

| Fichier | Contenu | Statut |
|---|---|---|
| `phase28_license_buffer.sql` | Colonne `buffer_target` sur `licenses` | À appliquer |
| `phase29_finding_types.sql` | CHECK constraint étendu (`license_surplus`, `license_overassigned`) | À appliquer |
| `phase30_hidden_costs.sql` | Colonnes `cancellation_notice_days`, `min_commitment_qty`, `actual_seats_used` + CHECK étendu | À appliquer |

---

## Questions fréquentes

**Pourquoi mon score de santé IT est-il bas ?**  
Vérifiez : licences expirées proches de l'échéance, contrats à risque, appareils décommissionnés, budget IT dépassé. Chaque catégorie enlève des points au score.

**Je vois «Données simulées» — qu'est-ce que cela signifie ?**  
Un connecteur n'est pas encore configuré pour ce module. Activez le connecteur correspondant dans Intégrations pour obtenir vos vraies données.

**Un département ne voit pas un onglet — pourquoi ?**  
L'accès aux onglets est contrôlé par le type de département. Un admin doit assigner l'utilisateur au bon département dans Organisation → Départements.

**Comment résilier un contrat avant renouvellement automatique ?**  
Parc IT → Contrats → modifiez le contrat → décochez *Renouvellement automatique* ou notez la date d'envoi de l'avis. NexHire vous alertera avant la fin de la fenêtre de résiliation.

---

## Support

- **Email :** support@nexhire.ca
- **Dans l'application :** ? → Aide → formulaire de demande
- **Documentation en ligne :** agenthub.nexhire.ca

---

*NexHire EIP est un produit de CivicAI Inc. · Confidentiel · 2026*
