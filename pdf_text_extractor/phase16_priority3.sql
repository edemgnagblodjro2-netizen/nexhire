-- ═══════════════════════════════════════════════════════════════════════════
-- Phase 16 — Priorité 3 : Webhooks Slack/Teams + rapport mensuel
-- À exécuter dans Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. Colonnes webhooks sur organizations
ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS webhook_slack   TEXT,
  ADD COLUMN IF NOT EXISTS webhook_teams   TEXT,
  ADD COLUMN IF NOT EXISTS webhook_events  TEXT[] DEFAULT ARRAY['member_join','license_expiry','budget_alert'];

-- 2. Table pour les rapports mensuels envoyés (optionnel — historique)
CREATE TABLE IF NOT EXISTS monthly_reports (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  sent_to         TEXT NOT NULL,
  period_month    TEXT NOT NULL,   -- ex: '2026-06'
  total_queries   INT,
  avg_rating      NUMERIC(3,1),
  active_users    INT,
  sent_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_monthly_reports_org
  ON monthly_reports (organization_id, period_month DESC);

COMMENT ON COLUMN organizations.webhook_slack  IS 'URL Incoming Webhook Slack';
COMMENT ON COLUMN organizations.webhook_teams  IS 'URL Incoming Webhook Microsoft Teams';
COMMENT ON COLUMN organizations.webhook_events IS 'Événements déclencheurs: member_join, license_expiry, budget_alert, subscription';
