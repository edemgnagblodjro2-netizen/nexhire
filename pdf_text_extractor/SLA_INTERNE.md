# SLA Interne — MyPortal v1.0

**Propriétaire :** CivicAI Inc.  
**Applicable dès :** 2026-07-01  
**Révision :** Trimestrielle  

> Ce document définit les engagements de niveau de service internes de CivicAI Inc. envers ses clients MyPortal.  
> Il s'applique aux plans Starter et Professional. Un SLA Enterprise personnalisé est disponible sur demande.

---

## 1. Disponibilité (Uptime)

| Plan | Uptime garanti | Fenêtre de calcul |
|---|---|---|
| Starter | 99,5 % | Mensuel (hors maintenance planifiée) |
| Professional | 99,5 % | Mensuel (hors maintenance planifiée) |
| Enterprise (sur demande) | 99,9 % | Mensuel |

**Calcul :** `Uptime = (minutes_total - minutes_indisponible) / minutes_total × 100`

**Exclusions (non comptabilisées comme downtime) :**
- Maintenance planifiée annoncée 48h à l'avance
- Incidents chez fournisseurs tiers (Supabase, Render, Stripe, Resend)
- Cas de force majeure
- Incidents causés par une action du client (ex : révocation des permissions OAuth)

**Compensation si SLA non atteint :**
- Downtime entre 99,0 % et 99,5 % : crédit de 10 % du mois facturé
- Downtime en dessous de 99,0 % : crédit de 25 % du mois facturé
- Demande de crédit à effectuer dans les 30 jours via support@nexhire.ca

---

## 2. Temps de réponse support

| Niveau | Définition | Délai de première réponse | Délai de résolution cible |
|---|---|---|---|
| **P1 — Critique** | Plateforme inaccessible, fuite de données, perte de données | 1 heure | 4 heures |
| **P2 — Élevé** | Module majeur infonctionnel (diagnostic, M365 sync), erreur affectant tous les utilisateurs | 4 heures | 24 heures |
| **P3 — Moyen** | Fonctionnalité partielle, connecteur en erreur, performance dégradée | 1 jour ouvrable | 3 jours ouvrables |
| **P4 — Faible** | Demande de fonctionnalité, question générale, amélioration | 2 jours ouvrables | Backlog priorisé |

**Heures de support :** Lundi–vendredi, 8h–18h EST  
**Canal :** support@nexhire.ca  
**Urgence hors heures (P1 uniquement) :** Mentionner [URGENT P1] en objet  

---

## 3. Niveaux de sévérité des incidents

### P1 — Critique
- Plateforme entièrement inaccessible (HTTP 503 sur /api/health)
- Fuite de données personnelles entre organisations
- Perte irréversible de données client
- Compromission de credentials

**Procédure :** Voir RUNBOOK_OPERATIONS.md §6.3

### P2 — Élevé
- Module core non-fonctionnel (diagnostic, billing, connecteur M365)
- Emails système non envoyés (invitations, rapports)
- Erreurs 500 sur > 10 % des requêtes d'une fonctionnalité
- Scheduler jobs non exécutés pendant > 24h

### P3 — Moyen
- Connecteur tiers en erreur (non-M365)
- Performance dégradée (latence API > 3s)
- Rapport PDF non généré
- Anomalie de données (score incorrect, KPI erroné)

### P4 — Faible
- Problème d'affichage mineur
- Question de configuration
- Demande d'évolution

---

## 4. Procédure d'escalade

```
Utilisateur → support@nexhire.ca
    ↓ (si P1 non résolu en 1h)
Équipe technique NexHire (Render + Supabase status)
    ↓ (si P1 non résolu en 2h)
Escalade infrastructure (Render support ticket)
    ↓ (si fuite de données confirmée)
DPO CivicAI → dpo@nexhire.ca → notification CAI (72h max)
```

---

## 5. Fenêtres de maintenance planifiée

| Type | Fenêtre | Préavis |
|---|---|---|
| Maintenance mineure (déploiement) | En tout temps (Render zero-downtime ~2 min) | Aucun requis |
| Maintenance majeure (migration DB lourde) | Mardi ou jeudi 22h–23h UTC | 48 heures (email) |
| Migration d'urgence (sécurité) | Dès que possible | Meilleur effort |

---

## 6. Métriques de performance cibles

| Endpoint | Latence P95 cible | Latence P99 acceptable |
|---|---|---|
| `GET /api/health` | < 100 ms | < 200 ms |
| `POST /api/auth/login` | < 500 ms | < 1 000 ms |
| `GET /api/dashboard/executive` | < 1 500 ms | < 3 000 ms |
| `POST /api/intelligence/m365/sync` | < 10 000 ms | < 30 000 ms |
| `POST /api/diagnostic/session/{id}/complete` | < 2 000 ms | < 5 000 ms |
| `GET /api/connectors` | < 300 ms | < 600 ms |

---

## 7. Sauvegarde et rétention des données

| Données | Fréquence backup | Rétention | Délai de restauration |
|---|---|---|---|
| Base de données PostgreSQL | Quotidien (Supabase auto) | 7 jours (Starter) / 30 jours (Pro) | < 2 heures |
| Audit logs | Continue (DB) | 90 jours minimum (Loi 25) | Immédiat (requête SQL) |
| Documents uploadés | Supabase Storage | Durée vie du compte | < 30 min |
| Credentials connecteurs (chiffrés) | Inclus dans backup DB | Idem | < 2 heures |

**Droit à la suppression (Loi 25 art. 27) :** Exécuté dans 30 jours suivant la demande via `POST /api/compliance/delete-request`.

---

## 8. Engagements de sécurité

| Engagement | Détail |
|---|---|
| Chiffrement en transit | TLS 1.2+ obligatoire (HSTS max-age=31536000) |
| Chiffrement au repos | Credentials Fernet AES-128, DB PostgreSQL chiffrée (Supabase) |
| Isolation des données | Isolation stricte par `organization_id` — aucun accès cross-org possible |
| Journalisation | 100 % des actions utilisateur tracées dans `audit_logs` |
| Notification d'incident sécurité | Dans les 72 heures si données personnelles affectées (Loi 25) |
| Tests de pénétration | À planifier annuellement avant chaque renouvellement de contrat Enterprise |

---

## 9. Exclusions de responsabilité

MyPortal ne peut être tenu responsable de :
- La qualité ou l'exactitude des données provenant des systèmes tiers connectés (M365, Jira, QuickBooks, etc.)
- Les interruptions causées par les fournisseurs tiers (Microsoft, Atlassian, Intuit, etc.)
- Les pertes de données dues à une mauvaise utilisation du module de suppression (Loi 25)
- Les décisions d'affaires prises sur la base des recommandations de l'IA

---

## 10. Contact et escalade

| Rôle | Contact | Disponibilité |
|---|---|---|
| Support général | support@nexhire.ca | Lun–Ven 8h–18h EST |
| DPO (données personnelles) | dpo@nexhire.ca | Lun–Ven 9h–17h EST |
| Urgence P1 | support@nexhire.ca — objet [URGENT P1] | 24/7 (meilleur effort) |

---

*CivicAI Inc. · NexHire EIP · Confidentiel · 2026*  
*Ce SLA est sujet à modification avec préavis de 30 jours.*
