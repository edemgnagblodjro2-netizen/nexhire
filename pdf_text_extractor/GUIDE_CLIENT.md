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

## Tableaux de bord disponibles

| Dashboard | Données affichées |
|---|---|
| **Vue d'ensemble** | Score de santé org, KPIs clés |
| **Licences M365** | Utilisateurs actifs, licences inutilisées, économies |
| **Sécurité Entra ID** | MFA, admins, risques |
| **Assets (Intune)** | Appareils, conformité, OS |
| **Transactions financières** | Fournisseurs, factures, coûts IT |
| **Gouvernance IT** | Droits d'accès, politiques, audit |

---

## Sécurité de vos données

- Connexion HTTPS uniquement
- Credentials connecteurs chiffrés (Fernet AES-128)
- Données strictement isolées par organisation
- Aucun accès NexHire à vos données sans votre autorisation
- Logs d'audit complets sur chaque action

---

## Support

Contactez votre représentant NexHire ou écrivez à support@nexhire.ca
