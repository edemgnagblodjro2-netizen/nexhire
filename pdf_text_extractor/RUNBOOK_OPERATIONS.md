# Runbook Opérations — MyPortal v1.0

**Propriétaire :** CivicAI Inc.  
**Dernière mise à jour :** 2026-07-01  
**Contact urgence :** support@nexhire.ca

---

## 1. Infrastructure

| Composant | Service | URL / Dashboard |
|---|---|---|
| Backend API | Render (civicai-myportal) | dashboard.render.com |
| Base de données | Supabase PostgreSQL | supabase.com/dashboard |
| Email | Resend | resend.com/dashboard |
| Monitoring | Logfire (Pydantic) | logfire.pydantic.dev |
| Paiements | Stripe | dashboard.stripe.com |
| IA | Anthropic / OpenAI | console.anthropic.com |

---

## 2. Sauvegardes

### 2.1 Politique de sauvegarde Supabase

| Type | Fréquence | Rétention | Activation |
|---|---|---|---|
| Backup automatique quotidien | 24h | 7 jours (Free) / 30 jours (Pro) | Automatique — aucune action requise |
| Point-in-Time Recovery (PITR) | Continu | 7 jours | Disponible sur plan Pro+ |
| Backup manuel (pg_dump) | Sur demande | À conserver localement | Procédure ci-dessous |

### 2.2 Backup manuel (avant migration ou changement majeur)

```bash
# Depuis le dashboard Supabase → Settings → Database
# Copier la chaîne de connexion directe (port 5432)

pg_dump \
  "postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres" \
  --no-acl --no-owner \
  -F c \
  -f backup_$(date +%Y%m%d_%H%M).dump

# Vérifier la taille du fichier (doit être > 0 octets)
ls -lh backup_*.dump
```

### 2.3 Restauration complète (disaster recovery)

```bash
# Étape 1 — Créer un nouveau projet Supabase (si DB détruite)
# Étape 2 — Restaurer le dump
pg_restore \
  --no-acl --no-owner \
  -d "postgresql://postgres:[PASSWORD]@[NOUVEAU_HOST]:5432/postgres" \
  backup_YYYYMMDD_HHMM.dump

# Étape 3 — Vérifier l'intégrité
psql "postgresql://..." -c "SELECT COUNT(*) FROM organizations;"
psql "postgresql://..." -c "SELECT COUNT(*) FROM users;"
psql "postgresql://..." -c "SELECT COUNT(*) FROM connectors;"

# Étape 4 — Mettre à jour SUPABASE_URL sur Render
# Render Dashboard → Environment → SUPABASE_URL → nouvelle valeur → Save → Redeploy
```

### 2.4 Restauration Point-in-Time (PITR)

1. Supabase Dashboard → Settings → Backups → Point in Time Recovery
2. Sélectionner le timestamp cible (format UTC)
3. Confirmer la restauration — la DB est indisponible ~5 min
4. Déclencher un redéploiement Render manuellement après

### 2.5 Procédure de sauvegarde avant migration SQL

Avant chaque fichier `phase*.sql`, exécuter systématiquement :
```sql
-- Dans Supabase SQL Editor — crée un snapshot logique des tables modifiées
CREATE TABLE _backup_[table]_[date] AS SELECT * FROM [table];
-- Exécuter après validation : DROP TABLE _backup_[table]_[date];
```

---

## 3. Journalisation des erreurs

### 3.1 Logfire (monitoring principal)

**Dashboard :** logfire.pydantic.dev  
**Token :** variable d'env `LOGFIRE_TOKEN` sur Render  

```python
# Pattern à utiliser dans les routes critiques
import logfire
with logfire.span("operation_name", org_id=str(user.organization_id)):
    # code ici
    logfire.info("résultat", extra_data=...)
```

**Niveaux utilisés :**
- `logfire.info()` — opérations normales (sync M365, diagnostic complété)
- `logfire.warning()` — anomalies non-bloquantes (token expirant bientôt, retry API)
- `logfire.error()` — erreurs fonctionnelles (OAuth callback échoué, email non envoyé)

### 3.2 Logs Python standards

Les logs Python standard sont capturés par Render :
- Render Dashboard → Logs (streaming temps réel)
- Render Dashboard → Logs → Filter par niveau ERROR

```python
import logging
logger = logging.getLogger(__name__)
logger.error("Message", exc_info=True)  # inclut le traceback complet
```

### 3.3 Audit logs (actions utilisateurs)

Toutes les actions utilisateur sont tracées dans la table `audit_logs` :
```sql
SELECT action, user_id, ip_address, success, http_status, created_at
FROM audit_logs
WHERE success = false
ORDER BY created_at DESC
LIMIT 50;
```

### 3.4 Requêtes utiles — investigation d'incidents

```sql
-- Erreurs 5xx des 24 dernières heures
SELECT action, http_status, COUNT(*), MAX(created_at)
FROM audit_logs
WHERE http_status >= 500 AND created_at > NOW() - INTERVAL '24h'
GROUP BY action, http_status ORDER BY COUNT(*) DESC;

-- Utilisateurs avec tentatives d'auth échouées
SELECT user_id, COUNT(*), MAX(created_at)
FROM audit_logs
WHERE action LIKE '%login%' AND success = false AND created_at > NOW() - INTERVAL '1h'
GROUP BY user_id HAVING COUNT(*) > 5;

-- Connecteurs avec erreurs récentes
SELECT connector_type, last_error, updated_at
FROM connectors WHERE last_error IS NOT NULL ORDER BY updated_at DESC;
```

---

## 4. Surveillance (Monitoring)

### 4.1 Endpoints de santé

| Endpoint | Auth | Usage |
|---|---|---|
| `GET /api/health` | Aucune | Uptime monitoring (Render, UptimeRobot) |
| `GET /api/readiness` | Admin | Vérification env vars + DB avant déploiement |

**Réponse health nominale :**
```json
{
  "status": "ok",
  "version": "1.0.0",
  "environment": "production",
  "db": "ok",
  "db_latency_ms": 12.4,
  "scheduler": "ok"
}
```

**Alerte si :** `status != "ok"` ou `db_latency_ms > 500`

### 4.2 Configurer UptimeRobot (recommandé)

1. Créer un compte sur uptimerobot.com (plan gratuit — 50 monitors)
2. Add Monitor → HTTP(s)
3. URL : `https://myportal.nexhire.ca/api/health`
4. Interval : 5 minutes
5. Alert contacts : support@nexhire.ca
6. Keyword monitoring : vérifier `"status":"ok"` dans la réponse

### 4.3 Alertes Logfire

Dans logfire.pydantic.dev → Alerts :
- Alerte si `level = "error"` → email immédiat
- Alerte si `latency_p95 > 2000ms` sur `/api/intelligence/m365/sync` → warning
- Alerte si `connector_health_check` renvoie erreur 3 fois de suite → critique

### 4.4 Métriques Render

Render Dashboard → ton service → Metrics :
- CPU Usage (alerte si > 80% sustained)
- Memory Usage (alerte si > 80%)
- Response Time P95

### 4.5 Scheduler jobs (tâches planifiées)

| Job | Fréquence | Description |
|---|---|---|
| `monthly_report` | 1er du mois 8h UTC | Rapports mensuels par org |
| `license_expiry_check` | Quotidien 9h UTC | Alertes licences expirant |
| `trial_expiry` | Quotidien 10h UTC | Trials expirant → notification |
| `connector_health` | Quotidien 11h UTC | Tokens OAuth à renouveler |
| `weekly_briefing` | Lundi 7h UTC | Briefing hebdomadaire |
| `entra_sync` | Toutes les 6h | Sync Entra ID posture |
| `contract_expiry` | Quotidien 8h30 UTC | Alertes contrats |
| `mfa_admin_check` | Toutes les 12h | Admin sans MFA |
| `m365_token_expiry` | Toutes les 6h | Tokens M365 proches expiration |

---

## 5. Procédure de mise à jour

### 5.1 Déploiement standard

```bash
# 1. Vérifier que les tests passent
python smoke_tests.py
# → Doit afficher : ✓ PASS xx/xx — NE PAS DÉPLOYER si échec

# 2. Commit et push (déclenche le déploiement automatique sur Render)
git push origin main

# 3. Vérifier le déploiement
# Render Dashboard → Logs → Attendre "Application startup complete"
# Durée typique : 2-3 minutes

# 4. Smoke test post-déploiement
curl https://myportal.nexhire.ca/api/health
# → Doit retourner {"status":"ok",...}
```

### 5.2 Migration SQL (avant ou après déploiement)

```
RÈGLE : Une migration SQL s'exécute dans Supabase SQL Editor, jamais via code.
ORDRE : Toujours migrer APRÈS avoir vérifié le backup récent.
```

1. Supabase Dashboard → SQL Editor → New Query
2. Coller le contenu du fichier `phase*.sql`
3. Cliquer Run
4. Vérifier absence d'erreur
5. Valider : `SELECT COUNT(*) FROM [nouvelle_table];`

**Migrations pendantes à exécuter :**
```
[ ] add_contract_soft_delete.sql    — colonne deleted_at sur contracts
[ ] phase45_v3_core.sql             — tables Décisions IA, Playbooks, Orchestrations, Initiatives
```

### 5.3 Rollback d'un déploiement

**Via Render (recommandé) :**
1. Render Dashboard → ton service → Deploys
2. Cliquer sur le déploiement précédent → "Rollback to this deploy"
3. Durée : ~2 minutes

**Via Git :**
```bash
git revert HEAD --no-edit
git push origin main
```

### 5.4 Rollback SQL (si migration échoue)

Si la migration est idempotente (tous les `phase*.sql` le sont via `IF NOT EXISTS`), elle peut être simplement ignorée ou relancée.

Pour annuler une migration destructive :
```sql
-- Restaurer depuis la table de backup créée avant migration
INSERT INTO [table] SELECT * FROM _backup_[table]_[date];
DROP TABLE _backup_[table]_[date];
```

### 5.5 Checklist avant mise en production majeure

```
[ ] Backup manuel créé (pg_dump)
[ ] smoke_tests.py → PASS 100%
[ ] /api/readiness → all checks "set"
[ ] Migration SQL appliquée en staging si possible
[ ] CHANGELOG.md mis à jour
[ ] Équipe informée (si downtime prévu > 2 min)
[ ] Fenêtre de maintenance : mardi ou jeudi 22h-23h UTC (hors heures ouvrables QC)
```

---

## 6. Procédure de support

### 6.1 Canaux de support

| Canal | Usage | Responsable |
|---|---|---|
| support@nexhire.ca | Demandes générales, bugs | Équipe NexHire |
| dpo@nexhire.ca | Demandes Loi 25 (suppression, accès données) | DPO CivicAI |
| Render Dashboard | Incidents infrastructure | Render (SLA 99.9%) |
| Supabase Dashboard | Incidents base de données | Supabase (SLA 99.9%) |

### 6.2 Triage des demandes

**Niveau 1 — Auto-résolu (< 1h)**
- Mot de passe oublié → flux Supabase automatique
- Connecteur déconnecté → client reconecte lui-même
- Données non affichées → vérifier si connecteur actif

**Niveau 2 — Support NexHire (< 4h)**
- Invitation non reçue → vérifier Resend logs + re-envoyer manuellement
- Connecteur OAuth en erreur → vérifier logs Logfire + re-autoriser
- Score diagnostic incorrect → vérifier `diagnostic_sessions` + `diagnostic_answers` en DB

**Niveau 3 — Incident critique (< 1h, escalade immédiate)**
- Plateforme inaccessible → vérifier Render status + /api/health
- Données d'une org visibles par une autre → isoler immédiatement (désactiver org, investigation)
- Fuite de credentials → rotation immédiate des secrets Fernet + SUPABASE_SERVICE_ROLE_KEY

### 6.3 Réponse à une fuite de données (Loi 25)

1. **T+0** : Isoler l'accès (désactiver l'endpoint concerné ou l'org)
2. **T+1h** : Évaluer le périmètre (quelles données, quels utilisateurs, quelle fenêtre temporelle)
3. **T+24h** : Notifier les personnes concernées (email via Resend)
4. **T+72h** : Déclarer à la Commission d'accès à l'information (CAI) si données sensibles impliquées
5. **T+30j** : Rapport d'incident complet + correctifs déployés

### 6.4 Onboarder un nouveau partenaire (Chambre, PME, Université)

1. Créer le partenaire en DB :
   ```sql
   INSERT INTO partners (id, name, slug, type, is_active, primary_color)
   VALUES (gen_random_uuid(), 'Nom Organisation', 'slug-org', 'chamber', true, '#0078D4');
   ```
2. Transmettre le lien d'invitation : `https://myportal.nexhire.ca/inscription?partenaire=slug-org`
3. Le premier inscrit devient automatiquement `owner` de l'organisation
4. Vérifier en DB après inscription :
   ```sql
   SELECT u.email, u.role, o.name FROM users u
   JOIN organizations o ON o.id = u.organization_id WHERE o.partner_id = '[partner_id]';
   ```
5. Configurer le connecteur M365 avec le client (30 min en visioconférence)

---

## 7. Documentation administrateur

### 7.1 Variables d'environnement — état complet

| Variable | Obligatoire | Statut |
|---|---|---|
| `SUPABASE_URL` | ✅ Oui | ✅ Configuré |
| `SUPABASE_ANON_KEY` | ✅ Oui | ✅ Configuré |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ Oui | ✅ Configuré |
| `FERNET_KEYS` | ✅ Oui | ✅ Configuré |
| `RESEND_API_KEY` | ✅ Oui | ✅ Configuré |
| `LOGFIRE_TOKEN` | ✅ Oui | ✅ Configuré (2026-06-12) |
| `STRIPE_SECRET_KEY` | ✅ Oui | ✅ Configuré |
| `STRIPE_WEBHOOK_SECRET` | ✅ Oui | ✅ Configuré |
| `STRIPE_PRICE_STARTER` | ✅ Oui | ⚠️ À créer ($99/mois CAD) |
| `STRIPE_PRICE_PROFESSIONAL` | ✅ Oui | ⚠️ À créer ($299/mois CAD) |
| `OPENAI_API_KEY` | ✅ Oui | ✅ Configuré |
| `ANTHROPIC_API_KEY` | ✅ Oui | ✅ Configuré |
| `APP_URL` | ✅ Oui | ✅ https://myportal.nexhire.ca |
| `ENVIRONMENT` | ✅ Oui | ✅ production |
| `ALLOWED_ORIGINS` | Non | Défaut inclut myportal.nexhire.ca |
| `M365_CLIENT_ID` | Si M365 | ✅ Configuré |
| `M365_CLIENT_SECRET` | Si M365 | ✅ Configuré |
| `M365_REDIRECT_URI` | Si M365 | ⚠️ Vérifier → myportal.nexhire.ca |
| `JIRA_CLIENT_ID` | Si Jira | ⚠️ À vérifier |
| `JIRA_REDIRECT_URI` | Si Jira | ⚠️ → myportal.nexhire.ca |
| `QUICKBOOKS_SANDBOX` | Si QB | ⚠️ Passer à `false` pour prod |
| `CONTACT_EMAIL` | Non | support@nexhire.ca |
| `DPO_EMAIL` | Non | dpo@nexhire.ca |

### 7.2 Commandes de diagnostic rapide

```sql
-- Santé globale
SELECT
  (SELECT COUNT(*) FROM organizations WHERE subscription_status = 'active') AS orgs_actives,
  (SELECT COUNT(*) FROM users WHERE is_active = true) AS utilisateurs_actifs,
  (SELECT COUNT(*) FROM connectors WHERE status = 'connected') AS connecteurs_actifs,
  (SELECT COUNT(*) FROM diagnostic_sessions WHERE status = 'completed') AS diagnostics_complets;

-- Connecteurs par org
SELECT o.name, c.connector_type, c.status, c.connected_at
FROM connectors c JOIN organizations o ON o.id = c.organization_id
ORDER BY o.name, c.connector_type;

-- Trials expirant dans 7 jours
SELECT o.name, o.trial_ends_at, u.email
FROM organizations o JOIN users u ON u.organization_id = o.id AND u.role = 'owner'
WHERE o.subscription_status = 'trial' AND o.trial_ends_at BETWEEN NOW() AND NOW() + INTERVAL '7d';

-- Tokens OAuth proches de l'expiration
SELECT c.connector_type, o.name, c.token_expires_at
FROM connectors c JOIN organizations o ON o.id = c.organization_id
WHERE c.token_expires_at < NOW() + INTERVAL '7d' AND c.status = 'connected';
```
