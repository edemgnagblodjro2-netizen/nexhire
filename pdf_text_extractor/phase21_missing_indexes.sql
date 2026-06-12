-- ═══════════════════════════════════════════════════════════════════════════
-- phase21_missing_indexes.sql
-- Index manquants identifiés lors de l'audit de performance
-- À exécuter dans Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════════════════

-- risk_findings : requêtes fréquentes par type + severity dans agent + optimizer
CREATE INDEX IF NOT EXISTS idx_risk_findings_type
  ON public.risk_findings (organization_id, finding_type);

CREATE INDEX IF NOT EXISTS idx_risk_findings_severity
  ON public.risk_findings (organization_id, severity)
  WHERE resolved_at IS NULL;

-- kpi_snapshots : requêtes chronologiques par dept + metric
CREATE INDEX IF NOT EXISTS idx_kpi_snapshots_dept_metric
  ON public.kpi_snapshots (department_id, metric_name, snapshot_date DESC);

-- audit_logs : filtrage par action + date (dashboards analytics)
CREATE INDEX IF NOT EXISTS idx_audit_logs_action_date
  ON public.audit_logs (organization_id, action, created_at DESC);

-- identities : lookup par email canonique (connector_loader, entra_collector)
CREATE INDEX IF NOT EXISTS idx_identities_canonical_email
  ON public.identities (organization_id, canonical_email)
  WHERE canonical_email IS NOT NULL;

-- identity_accounts : lookup par source (entra, intune, etc.)
CREATE INDEX IF NOT EXISTS idx_identity_accounts_source
  ON public.identity_accounts (identity_id, source_connector);

-- license_usage : requêtes par période + data_source
CREATE INDEX IF NOT EXISTS idx_license_usage_period
  ON public.license_usage (license_pool_id, period_start DESC);

-- financial_transactions : tri par montant pour top-vendor queries
CREATE INDEX IF NOT EXISTS idx_ftxn_amount
  ON public.financial_transactions (organization_id, amount DESC)
  WHERE status = 'paid';
