-- ═══════════════════════════════════════════════════════════════════════════
-- Phase 46 : Sales Intelligence — Prospection IA Enterprise
-- Prospects · Campagnes · Conversations · Réunions · Agents · Templates
--
-- IDEMPOTENCE : toutes les instructions sont rejouables sans effet de bord
-- DÉPENDANCES : phase42_platform_core.sql (organizations, users, partners)
-- ═══════════════════════════════════════════════════════════════════════════

-- ──────────────────────────────────────────────────────────────────────────
-- 1. PROFIL ICP (Ideal Customer Profile) par organisation
-- ──────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS si_profiles (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id     uuid        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  products            jsonb       NOT NULL DEFAULT '[]',
  target_sectors      text[]      NOT NULL DEFAULT '{}',
  target_countries    text[]      NOT NULL DEFAULT '{"CA","FR","BE","CH"}',
  employee_min        int         DEFAULT 10,
  employee_max        int         DEFAULT 5000,
  languages           text[]      NOT NULL DEFAULT '{"fr"}',
  icp_description     text,
  value_proposition   text,
  avg_deal_size       numeric(12,2),
  sales_cycle_days    int         DEFAULT 30,
  is_active           boolean     NOT NULL DEFAULT true,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS si_profiles_org_unique ON si_profiles(organization_id) WHERE is_active;

-- ──────────────────────────────────────────────────────────────────────────
-- 2. PROSPECTS
-- ──────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS si_prospects (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id     uuid        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  company_name        text        NOT NULL,
  website             text,
  linkedin_url        text,
  sector              text,
  country             text,
  city                text,
  employee_count      int,
  revenue_estimate    numeric(15,2),
  contact_name        text,
  contact_title       text,
  contact_email       text,
  contact_phone       text,
  contact_linkedin    text,
  decision_makers     jsonb       NOT NULL DEFAULT '[]',
  ai_score            int         CHECK (ai_score BETWEEN 0 AND 100),
  score_factors       jsonb       NOT NULL DEFAULT '{}',
  status              text        NOT NULL DEFAULT 'new'
    CHECK (status IN ('new','researched','contacted','replied','meeting_set','proposal_sent','won','lost','disqualified')),
  intent_signals      jsonb       NOT NULL DEFAULT '[]',
  estimated_budget    numeric(12,2),
  tags                text[]      NOT NULL DEFAULT '{}',
  notes               text,
  source              text        DEFAULT 'manual',
  assigned_to         uuid        REFERENCES users(id) ON DELETE SET NULL,
  enriched_at         timestamptz,
  scored_at           timestamptz,
  last_contacted_at   timestamptz,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS si_prospects_org_idx ON si_prospects(organization_id);
CREATE INDEX IF NOT EXISTS si_prospects_status_idx ON si_prospects(organization_id, status);
CREATE INDEX IF NOT EXISTS si_prospects_score_idx ON si_prospects(organization_id, ai_score DESC NULLS LAST);

-- ──────────────────────────────────────────────────────────────────────────
-- 3. CAMPAGNES DE PROSPECTION
-- ──────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS si_campaigns (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id     uuid        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name                text        NOT NULL,
  objective           text,
  description         text,
  target_criteria     jsonb       NOT NULL DEFAULT '{}',
  status              text        NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','active','paused','completed','cancelled')),
  agent_config        jsonb       NOT NULL DEFAULT '{"prospector":true,"research":true,"qualification":true,"sales":true,"followup":true}',
  template_ids        uuid[]      NOT NULL DEFAULT '{}',
  target_count        int,
  daily_limit         int         DEFAULT 20,
  started_at          timestamptz,
  ended_at            timestamptz,
  created_by          uuid        REFERENCES users(id) ON DELETE SET NULL,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS si_campaigns_org_idx ON si_campaigns(organization_id);

-- ──────────────────────────────────────────────────────────────────────────
-- 4. ASSOCIATION CAMPAGNE <-> PROSPECT
-- ──────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS si_campaign_prospects (
  campaign_id         uuid        NOT NULL REFERENCES si_campaigns(id) ON DELETE CASCADE,
  prospect_id         uuid        NOT NULL REFERENCES si_prospects(id) ON DELETE CASCADE,
  status              text        NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','processing','contacted','replied','converted','failed')),
  added_at            timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (campaign_id, prospect_id)
);

-- ──────────────────────────────────────────────────────────────────────────
-- 5. CONVERSATIONS
-- ──────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS si_conversations (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id     uuid        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  prospect_id         uuid        NOT NULL REFERENCES si_prospects(id) ON DELETE CASCADE,
  campaign_id         uuid        REFERENCES si_campaigns(id) ON DELETE SET NULL,
  channel             text        NOT NULL DEFAULT 'email'
    CHECK (channel IN ('email','linkedin','chat','phone','other')),
  status              text        NOT NULL DEFAULT 'open'
    CHECK (status IN ('open','waiting','replied','meeting_set','closed_won','closed_lost')),
  subject             text,
  sentiment           text        DEFAULT 'neutral'
    CHECK (sentiment IN ('positive','neutral','negative','unknown')),
  conversion_prob     int         DEFAULT 0 CHECK (conversion_prob BETWEEN 0 AND 100),
  ai_summary          text,
  next_action         text,
  next_action_at      timestamptz,
  assigned_to         uuid        REFERENCES users(id) ON DELETE SET NULL,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS si_conversations_org_idx ON si_conversations(organization_id);
CREATE INDEX IF NOT EXISTS si_conversations_prospect_idx ON si_conversations(prospect_id);

-- ──────────────────────────────────────────────────────────────────────────
-- 6. MESSAGES DE CONVERSATION
-- ──────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS si_messages (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id     uuid        NOT NULL REFERENCES si_conversations(id) ON DELETE CASCADE,
  organization_id     uuid        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  role                text        NOT NULL CHECK (role IN ('ai','prospect','human')),
  content             text        NOT NULL,
  subject             text,
  agent_type          text,
  tokens_used         int,
  model_used          text,
  sent_at             timestamptz NOT NULL DEFAULT now(),
  delivered_at        timestamptz,
  read_at             timestamptz
);
CREATE INDEX IF NOT EXISTS si_messages_conv_idx ON si_messages(conversation_id);

-- ──────────────────────────────────────────────────────────────────────────
-- 7. RÉUNIONS
-- ──────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS si_meetings (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id     uuid        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  prospect_id         uuid        NOT NULL REFERENCES si_prospects(id) ON DELETE CASCADE,
  conversation_id     uuid        REFERENCES si_conversations(id) ON DELETE SET NULL,
  title               text        NOT NULL,
  description         text,
  scheduled_at        timestamptz NOT NULL,
  duration_minutes    int         NOT NULL DEFAULT 30,
  timezone            text        DEFAULT 'America/Toronto',
  location            text,
  meeting_url         text,
  status              text        NOT NULL DEFAULT 'scheduled'
    CHECK (status IN ('scheduled','confirmed','completed','cancelled','no_show')),
  outcome             text,
  outcome_notes       text,
  next_steps          text,
  assigned_to         uuid        REFERENCES users(id) ON DELETE SET NULL,
  crm_meeting_id      text,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS si_meetings_org_idx ON si_meetings(organization_id);
CREATE INDEX IF NOT EXISTS si_meetings_scheduled_idx ON si_meetings(organization_id, scheduled_at);

-- ──────────────────────────────────────────────────────────────────────────
-- 8. RUNS D'AGENTS IA (logs d'exécution)
-- ──────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS si_agent_runs (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id     uuid        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  agent_type          text        NOT NULL
    CHECK (agent_type IN ('prospector','research','qualification','sales','followup','meeting','proposal','crm_sync')),
  prospect_id         uuid        REFERENCES si_prospects(id) ON DELETE SET NULL,
  campaign_id         uuid        REFERENCES si_campaigns(id) ON DELETE SET NULL,
  conversation_id     uuid        REFERENCES si_conversations(id) ON DELETE SET NULL,
  status              text        NOT NULL DEFAULT 'running'
    CHECK (status IN ('running','success','error','partial')),
  input_data          jsonb       NOT NULL DEFAULT '{}',
  output_data         jsonb       NOT NULL DEFAULT '{}',
  error_message       text,
  tokens_used         int,
  model_used          text,
  cost_usd            numeric(10,6),
  duration_ms         int,
  started_at          timestamptz NOT NULL DEFAULT now(),
  completed_at        timestamptz
);
CREATE INDEX IF NOT EXISTS si_agent_runs_org_idx ON si_agent_runs(organization_id);
CREATE INDEX IF NOT EXISTS si_agent_runs_type_idx ON si_agent_runs(agent_type, status);

-- ──────────────────────────────────────────────────────────────────────────
-- 9. TEMPLATES D'EMAIL / MESSAGE
-- ──────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS si_templates (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id     uuid        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name                text        NOT NULL,
  type                text        NOT NULL DEFAULT 'outreach'
    CHECK (type IN ('outreach','followup','proposal','meeting_request','nurture')),
  channel             text        NOT NULL DEFAULT 'email'
    CHECK (channel IN ('email','linkedin','chat')),
  subject             text,
  body                text        NOT NULL,
  variables           text[]      NOT NULL DEFAULT '{}',
  language            text        NOT NULL DEFAULT 'fr'
    CHECK (language IN ('fr','en')),
  is_active           boolean     NOT NULL DEFAULT true,
  usage_count         int         NOT NULL DEFAULT 0,
  open_rate           numeric(5,2),
  reply_rate          numeric(5,2),
  created_by          uuid        REFERENCES users(id) ON DELETE SET NULL,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS si_templates_org_idx ON si_templates(organization_id, type, is_active);

-- ──────────────────────────────────────────────────────────────────────────
-- 10. SYNCHRONISATIONS CRM
-- ──────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS si_crm_syncs (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id     uuid        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  prospect_id         uuid        NOT NULL REFERENCES si_prospects(id) ON DELETE CASCADE,
  crm_type            text        NOT NULL CHECK (crm_type IN ('hubspot','salesforce','pipedrive')),
  crm_record_id       text,
  crm_record_url      text,
  status              text        NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','synced','failed','stale')),
  last_sync_at        timestamptz,
  error_message       text,
  sync_data           jsonb       NOT NULL DEFAULT '{}',
  created_at          timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS si_crm_syncs_org_idx ON si_crm_syncs(organization_id, crm_type);
CREATE INDEX IF NOT EXISTS si_crm_syncs_prospect_idx ON si_crm_syncs(prospect_id);

-- ──────────────────────────────────────────────────────────────────────────
-- 11. TRIGGERS updated_at (réutilise la fonction set_updated_at existante)
-- ──────────────────────────────────────────────────────────────────────────
DO $$ BEGIN
  -- si_profiles
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'si_profiles_updated_at') THEN
    CREATE TRIGGER si_profiles_updated_at
      BEFORE UPDATE ON si_profiles
      FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;
  -- si_prospects
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'si_prospects_updated_at') THEN
    CREATE TRIGGER si_prospects_updated_at
      BEFORE UPDATE ON si_prospects
      FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;
  -- si_campaigns
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'si_campaigns_updated_at') THEN
    CREATE TRIGGER si_campaigns_updated_at
      BEFORE UPDATE ON si_campaigns
      FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;
  -- si_conversations
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'si_conversations_updated_at') THEN
    CREATE TRIGGER si_conversations_updated_at
      BEFORE UPDATE ON si_conversations
      FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;
  -- si_meetings
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'si_meetings_updated_at') THEN
    CREATE TRIGGER si_meetings_updated_at
      BEFORE UPDATE ON si_meetings
      FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;
  -- si_templates
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'si_templates_updated_at') THEN
    CREATE TRIGGER si_templates_updated_at
      BEFORE UPDATE ON si_templates
      FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;
END $$;

-- ──────────────────────────────────────────────────────────────────────────
-- 12. ENREGISTREMENT DANS app_registry
-- ──────────────────────────────────────────────────────────────────────────
INSERT INTO app_registry (slug, name, description, category, layer, version, status, icon, entry_path, sort_order, permissions)
VALUES (
  'sales-intelligence',
  'Sales Intelligence',
  'Prospection IA Enterprise — identifiez, qualifiez et convertissez vos prospects avec des agents IA spécialisés.',
  'analytics',
  'app',
  '1.0',
  'available',
  'target',
  '/static/apps/sales-intelligence/main.js',
  85,
  '{"min_role": "user", "min_plan": "starter"}'::jsonb
)
ON CONFLICT (slug) DO UPDATE
  SET name        = EXCLUDED.name,
      description = EXCLUDED.description,
      icon        = EXCLUDED.icon,
      entry_path  = EXCLUDED.entry_path,
      status      = EXCLUDED.status;

-- ──────────────────────────────────────────────────────────────────────────
-- 13. DONNÉES DE DÉMARRAGE — templates par défaut
-- ──────────────────────────────────────────────────────────────────────────
-- Note : les templates de démarrage sont créés per-org par l'API au premier accès.
-- Pas de données globales ici pour respecter l'isolation multi-tenant.

-- ═══════════════════════════════════════════════════════════════════════════
-- FIN phase46_sales_intelligence.sql
-- ═══════════════════════════════════════════════════════════════════════════
