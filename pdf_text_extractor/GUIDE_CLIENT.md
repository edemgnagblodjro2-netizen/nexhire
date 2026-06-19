# Guide Client AgentHub

Ce guide explique comment connecter vos outils à AgentHub et ce que la plateforme analyse pour vous.

---

## Connexion initiale

1. Créez votre compte sur [agenthub.nexhire.ca](https://agenthub.nexhire.ca)
2. Acceptez les CGU et la politique de confidentialité
3. Invitez vos collègues via **Paramètres → Membres**
4. Connectez vos outils via **Connecteurs**

---

## Connecter Microsoft 365 (recommandé en premier)

Microsoft 365 est le connecteur le mieux validé — résultats immédiats.

**Ce qu'AgentHub analyse :**
- Licences non utilisées et économies potentielles
- Comptes sans MFA (risque sécurité)
- Administrateurs globaux non nécessaires
- Appareils Intune non conformes
- Contrats et documents SharePoint

**Étapes :**
1. Dans AgentHub → Connecteurs → Microsoft 365 → **Connecter**
2. Connectez-vous avec un compte administrateur Microsoft
3. Accordez les permissions demandées (lecture seule)
4. AgentHub collecte les données en arrière-plan (~2 min)
5. Vos tableaux de bord se mettent à jour automatiquement

**Permissions requises sur votre tenant :**
- `User.Read.All`
- `Organization.Read.All`
- `Reports.Read.All`
- `DeviceManagementManagedDevices.Read.All` (Intune)
- `AuditLog.Read.All` (MFA)

---

## Connecter Jira

**Ce qu'AgentHub analyse :**
- Tickets bloqués ou en retard
- Charge par sprint et par équipe
- Issues par priorité ou projet
- Backlog et vélocité

**Prérequis :**
- Un site Jira actif (atlassian.com) — compte gratuit suffisant (10 users)

**Étapes :**
1. Connecteurs → Jira → **Connecter via Atlassian**
2. Autorisez l'accès à votre site Jira
3. Dans l'agent IA, posez des questions comme :
   - *"Quels tickets sont bloqués ce sprint ?"*
   - *"Affiche le backlog du projet NEXH trié par priorité"*

---

## Connecter QuickBooks

**Ce qu'AgentHub analyse :**
- Factures envoyées et impayées
- Dépenses par catégorie
- Bilan simplifié
- Flux de trésorerie

**Prérequis :**
- Un compte QuickBooks Online actif

**Étapes :**
1. Connecteurs → QuickBooks → **Connecter via Intuit**
2. Autorisez l'accès à votre entreprise QuickBooks
3. L'agent peut répondre à : *"Quelles factures sont en retard de plus de 30 jours ?"*

---

## Connecter SAP / Workday / ServiceNow

Ces connecteurs utilisent des credentials directs (pas OAuth).

1. Connecteurs → \[SAP / Workday / ServiceNow\] → **Configurer**
2. Entrez l'URL de votre instance, le client ID et le secret
3. AgentHub teste la connexion et confirme l'accès

> Vos credentials sont chiffrés et jamais visibles par l'équipe NexHire.

---

## Ce que l'agent IA peut faire pour vous

Une fois vos connecteurs configurés, posez n'importe quelle question en langage naturel :

```
"Combien de licences Microsoft 365 ne sont pas utilisées ?"
"Montre-moi les appareils non conformes dans Intune"
"Quelles factures QuickBooks sont impayées depuis plus de 60 jours ?"
"Y a-t-il des admins sans MFA dans notre tenant ?"
"Résume les tickets Jira bloqués par priorité"
```

---

## Données simulées vs données réelles

Un badge **Données simulées** apparaît si un connecteur n'est pas configuré.  
Un badge **Données réelles** confirme que les données viennent directement de vos outils.

---

## Accès par département

AgentHub affiche uniquement les modules auxquels vous avez accès selon votre département. Un employé du département Finance voit le module Finance ; un employé TI voit le Parc IT — et ainsi de suite. Les administrateurs voient tout.

| Département | Module visible |
|---|---|
| Finance | 💰 Finance (budgets, transactions, copilot) |
| Approvisionnement | 📦 Achats (contrats, fournisseurs, dépenses) |
| Technologies de l'information | 💻 Parc IT (licences, serveurs, copilot IT) |
| Direction / Administration | Tous les modules + 🏛️ Organisation |

> Si vous ne voyez pas un onglet, contactez votre administrateur pour qu'il vous assigne au bon département dans **Organisation → Départements**.

---

## Recherche interne dans vos documents

Chaque module dispose d'un sous-onglet **🔍 Recherche** qui vous permet d'interroger vos documents internes en langage naturel.

**Où trouver la recherche :**
- Finance → sous-onglet Recherche
- Achats → sous-onglet Recherche
- Parc IT → sous-onglet Recherche

**Exemples de questions :**
- *"Quelle est notre politique de remboursement de frais ?"*
- *"Quelles sont les clauses de résiliation de notre contrat avec le fournisseur X ?"*
- *"Résume les procédures de sécurité informatique"*

La recherche n'interroge que les documents de votre département (et les documents partagés à toute l'organisation). Vos collègues d'autres départements ne voient pas vos documents.

---

## Téléverser un document

1. Allez dans **📄 Documents**
2. Choisissez votre fichier PDF
3. Sélectionnez le **Département propriétaire** (ou laissez "Accessible à toute l'organisation" pour un document partagé)
4. Cliquez **Extraire le texte**

Le document sera ensuite disponible dans la recherche interne du département sélectionné.

---

## Tableaux de bord disponibles

| Module | Ce qu'il contient |
|---|---|
| **🤖 Assistant IA** | Agent conversationnel multi-connecteurs |
| **📊 Optimisation IA** | Recommandations de réduction de coûts |
| **💰 Finance** | Budgets, transactions, prévisions, Copilot Finance |
| **📦 Achats** | Contrats fournisseurs, dépenses, Copilot Achats |
| **💻 Parc IT** | Licences, serveurs, appareils, Copilot IT |
| **📄 Documents** | Analyse PDF, résumé IA, recherche interne |
| **🏛️ Organisation** | Départements, membres, Executive Copilot (admin) |

---

## Sécurité de vos données

- Connexion HTTPS uniquement
- Credentials connecteurs chiffrés (Fernet AES-128)
- Données strictement isolées par organisation **et par département**
- Un employé ne peut pas accéder aux données d'un département auquel il n'appartient pas
- Les documents sont tagués par département — la recherche interne ne retourne que ce que vous êtes autorisé à voir
- Aucun accès NexHire à vos données sans votre autorisation
- Logs d'audit complets sur chaque action

---

## Support

Contactez votre représentant NexHire ou écrivez à support@nexhire.ca
