-- ── Rapport mensuel automatique ──────────────────────────────────────────────
-- À exécuter dans Supabase SQL Editor

ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS monthly_report_enabled BOOLEAN NOT NULL DEFAULT TRUE;
