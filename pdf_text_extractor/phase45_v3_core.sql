-- ═══════════════════════════════════════════════════════════════════════════
-- Phase 45 : AgentHub Platform v3 — Core Modules
-- Décisions IA · Playbooks · Centre d'Orchestration · Initiatives
-- Politiques Vivantes · Conformité Causale · Event Bus
--
-- IDEMPOTENCE : toutes les instructions sont rejouables sans effet de bord
-- DÉPENDANCES : phase42_platform_core.sql, phase_intelligence.sql
-- ═══════════════════════════════════════════════════════════════════════════


-- ═══════════════════════════════════════════════════════════════════════════
-- 1. DÉCISIONS IA (remplace conceptuellement les recommandations vagues)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS ai_decisions (
  id                    uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                uuid        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  title                 text        NOT NULL,
  category              text        NOT NULL DEFAULT 'general'
    CHECK (category IN ('finance','security','compliance','hr','it','operations','governance','general')),
  priority              text        NOT NULL DEFAULT 'medium'
    CHECK (priority IN ('critical','high','medium','low')),
  status                text        NOT NULL DEFAULT 'new'
    CHECK (status IN ('new','reviewing','accepted','delegated','scheduled','applied','ignored','expired')),
  -- Dossier décisionnel
  problem_statement     text,
  why_now               text,
  evidence              jsonb       NOT NULL DEFAULT '[]',
  -- Impact financier
  cost_of_inaction      numeric(12,2),
  cost_period           text        DEFAULT 'year',
  savings_annual        numeric(12,2),
  roi_label             text        DEFAULT 'neutral'
    CHECK (roi_label IN ('excellent','good','neutral','negative','unknown')),
  roi_details           text,
  -- Risque
  risk_label            text        DEFAULT 'medium'
    CHECK (risk_label IN ('critical','high','medium','low','none')),
  risk_details          text,
  -- Exécution
  time_to_apply_min     int,
  time_label            text,
  ai_confidence         int         CHECK (ai_confidence BETWEEN 0 AND 100),
  source                text,
  source_ref            uuid,
  -- Responsable
  responsible_id        uuid        REFERENCES users(id) ON DELETE SET NULL,
  responsible_dept      text,
  responsible_backup_id uuid        REFERENCES users(id) ON DELETE SET NULL,
  -- Liens d'action
  playbook_id           uuid,
  orchestration_ids     uuid[]      NOT NULL DEFAULT '{}',
  policy_ids            uuid[]      NOT NULL DEFAULT '{}',
  compliance_refs       jsonb       NOT NULL DEFAULT '[]',
  -- Cycle de vie
  due_date              date,
  accepted_by           uuid        REFERENCES users(id) ON DELETE SET NULL,
  accepted_at           timestamptz,
  applied_at            timestamptz,
  delegated_to          uuid        REFERENCES users(id) ON DELETE SET NULL,
  scheduled_for         timestamptz,
  ignored_reason        text,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ai_decisions_org_idx      ON ai_decisions (org_id, status, priority);
CREATE INDEX IF NOT EXISTS ai_decisions_resp_idx     ON ai_decisions (responsible_id) WHERE responsible_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS ai_decisions_category_idx ON ai_decisions (org_id, category);

DROP TRIGGER IF EXISTS ai_decisions_updated_at ON ai_decisions;
CREATE TRIGGER ai_decisions_updated_at
  BEFORE UPDATE ON ai_decisions FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE ai_decisions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ai_decisions_org" ON ai_decisions;
CREATE POLICY "ai_decisions_org" ON ai_decisions
  FOR ALL TO service_role USING (true);


-- ═══════════════════════════════════════════════════════════════════════════
-- 2. CENTRE D'ORCHESTRATION (orchestrations atomiques réutilisables)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS orchestrations (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id           uuid        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name             text        NOT NULL,
  description      text,
  connector_type   text        NOT NULL
    CHECK (connector_type IN (
      'microsoft_graph','exchange','sharepoint','teams','power_automate',
      'azure_automation','entra_id','intune','sentinel',
      'powershell','python','bash',
      'servicenow','jira',
      'sap','workday',
      'email','slack','webhook',
      'rest_api','graphql','soap',
      'internal'
    )),
  category         text,
  responsible_id   uuid        REFERENCES users(id) ON DELETE SET NULL,
  responsible_dept text,
  status           text        NOT NULL DEFAULT 'active'
    CHECK (status IN ('active','inactive','draft','deprecated')),
  steps            jsonb       NOT NULL DEFAULT '[]',
  input_schema     jsonb       NOT NULL DEFAULT '{}',
  output_schema    jsonb       NOT NULL DEFAULT '{}',
  trigger_type     text[]      NOT NULL DEFAULT '{manual}',
  trigger_config   jsonb       NOT NULL DEFAULT '{}',
  timeout_seconds  int         NOT NULL DEFAULT 300,
  retry_count      int         NOT NULL DEFAULT 3,
  credential_ref   text,
  is_reusable      boolean     NOT NULL DEFAULT true,
  run_count        int         NOT NULL DEFAULT 0,
  success_count    int         NOT NULL DEFAULT 0,
  last_run_at      timestamptz,
  last_run_status  text,
  created_by       uuid        REFERENCES users(id) ON DELETE SET NULL,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS orchestration_runs (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  orchestration_id uuid        NOT NULL REFERENCES orchestrations(id) ON DELETE CASCADE,
  org_id           uuid        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  status           text        NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','running','completed','failed','cancelled','timeout')),
  trigger_type     text,
  trigger_ref      uuid,
  triggered_by     uuid        REFERENCES users(id) ON DELETE SET NULL,
  input            jsonb       NOT NULL DEFAULT '{}',
  output           jsonb       NOT NULL DEFAULT '{}',
  error            text,
  duration_ms      int,
  started_at       timestamptz,
  ended_at         timestamptz,
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS orchestrations_org_idx  ON orchestrations (org_id, status);
CREATE INDEX IF NOT EXISTS orch_runs_orch_idx      ON orchestration_runs (orchestration_id, created_at DESC);
CREATE INDEX IF NOT EXISTS orch_runs_org_idx       ON orchestration_runs (org_id, created_at DESC);

DROP TRIGGER IF EXISTS orchestrations_updated_at ON orchestrations;
CREATE TRIGGER orchestrations_updated_at
  BEFORE UPDATE ON orchestrations FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE orchestrations    ENABLE ROW LEVEL SECURITY;
ALTER TABLE orchestration_runs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "orchestrations_srole"     ON orchestrations;
DROP POLICY IF EXISTS "orchestration_runs_srole" ON orchestration_runs;
CREATE POLICY "orchestrations_srole"     ON orchestrations     FOR ALL TO service_role USING (true);
CREATE POLICY "orchestration_runs_srole" ON orchestration_runs FOR ALL TO service_role USING (true);


-- ═══════════════════════════════════════════════════════════════════════════
-- 3. PLAYBOOKS (processus métier multi-étapes)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS playbooks (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id           uuid        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name             text        NOT NULL,
  description      text,
  category         text        NOT NULL DEFAULT 'general'
    CHECK (category IN ('hr','security','compliance','it','finance','operations','general')),
  icon             text        NOT NULL DEFAULT '📋',
  responsible_id   uuid        REFERENCES users(id) ON DELETE SET NULL,
  responsible_dept text,
  -- Déclencheurs
  trigger_type     text[]      NOT NULL DEFAULT '{manual}',
  trigger_config   jsonb       NOT NULL DEFAULT '{}',
  -- Étapes (jsonb array de StepDefinition)
  steps            jsonb       NOT NULL DEFAULT '[]',
  -- SLA
  sla_minutes      int,
  -- Modèle
  is_template      boolean     NOT NULL DEFAULT false,
  template_source  uuid        REFERENCES playbooks(id) ON DELETE SET NULL,
  -- Stats
  status           text        NOT NULL DEFAULT 'active'
    CHECK (status IN ('active','inactive','draft','archived')),
  run_count        int         NOT NULL DEFAULT 0,
  success_count    int         NOT NULL DEFAULT 0,
  last_run_at      timestamptz,
  created_by       uuid        REFERENCES users(id) ON DELETE SET NULL,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS playbook_runs (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  playbook_id      uuid        NOT NULL REFERENCES playbooks(id) ON DELETE CASCADE,
  org_id           uuid        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  status           text        NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','running','waiting_human','completed','failed','cancelled')),
  trigger_type     text,
  trigger_ref      uuid,
  triggered_by     uuid        REFERENCES users(id) ON DELETE SET NULL,
  context          jsonb       NOT NULL DEFAULT '{}',
  current_step     int         NOT NULL DEFAULT 0,
  total_steps      int         NOT NULL DEFAULT 0,
  sla_deadline     timestamptz,
  sla_breached     boolean     NOT NULL DEFAULT false,
  responsible_id   uuid        REFERENCES users(id) ON DELETE SET NULL,
  started_at       timestamptz,
  ended_at         timestamptz,
  error            text,
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS playbook_step_runs (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id            uuid        NOT NULL REFERENCES playbook_runs(id) ON DELETE CASCADE,
  step_index        int         NOT NULL,
  step_type         text        NOT NULL,
  step_name         text        NOT NULL,
  status            text        NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','running','waiting','completed','failed','skipped')),
  responsible_id    uuid        REFERENCES users(id) ON DELETE SET NULL,
  started_at        timestamptz,
  ended_at          timestamptz,
  human_action_by   uuid        REFERENCES users(id) ON DELETE SET NULL,
  human_action_at   timestamptz,
  human_comment     text,
  orchestration_run_ids uuid[]  NOT NULL DEFAULT '{}',
  output            jsonb       NOT NULL DEFAULT '{}',
  error             text,
  created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS playbooks_org_idx       ON playbooks (org_id, status);
CREATE INDEX IF NOT EXISTS playbook_runs_pb_idx    ON playbook_runs (playbook_id, created_at DESC);
CREATE INDEX IF NOT EXISTS playbook_runs_org_idx   ON playbook_runs (org_id, status);
CREATE INDEX IF NOT EXISTS step_runs_run_idx       ON playbook_step_runs (run_id, step_index);

DROP TRIGGER IF EXISTS playbooks_updated_at ON playbooks;
CREATE TRIGGER playbooks_updated_at
  BEFORE UPDATE ON playbooks FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE playbooks          ENABLE ROW LEVEL SECURITY;
ALTER TABLE playbook_runs      ENABLE ROW LEVEL SECURITY;
ALTER TABLE playbook_step_runs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "playbooks_srole"     ON playbooks;
DROP POLICY IF EXISTS "playbook_runs_srole" ON playbook_runs;
DROP POLICY IF EXISTS "step_runs_srole"     ON playbook_step_runs;
CREATE POLICY "playbooks_srole"     ON playbooks          FOR ALL TO service_role USING (true);
CREATE POLICY "playbook_runs_srole" ON playbook_runs      FOR ALL TO service_role USING (true);
CREATE POLICY "step_runs_srole"     ON playbook_step_runs FOR ALL TO service_role USING (true);


-- ═══════════════════════════════════════════════════════════════════════════
-- 4. POLITIQUES VIVANTES
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS policies (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id           uuid        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  title            text        NOT NULL,
  description      text,
  category         text        NOT NULL DEFAULT 'general'
    CHECK (category IN ('security','privacy','hr','it','finance','governance','compliance','general')),
  responsible_id   uuid        REFERENCES users(id) ON DELETE SET NULL,
  responsible_dept text,
  status           text        NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','review','active','expired','archived')),
  version          text        NOT NULL DEFAULT '1.0',
  effective_date   date,
  review_date      date,
  expiry_date      date,
  live_score       int,
  last_verified_at timestamptz,
  framework_refs   text[]      NOT NULL DEFAULT '{}',
  document_url     text,
  created_by       uuid        REFERENCES users(id) ON DELETE SET NULL,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS policy_rules (
  id                    uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_id             uuid        NOT NULL REFERENCES policies(id) ON DELETE CASCADE,
  org_id                uuid        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  rule_order            int         NOT NULL DEFAULT 1,
  title                 text        NOT NULL,
  description           text,
  verification_type     text        NOT NULL DEFAULT 'manual'
    CHECK (verification_type IN (
      'connector_query','policy_link','document_check',
      'schedule_check','attestation','report_link','manual'
    )),
  connector_type        text,
  connector_config      jsonb       NOT NULL DEFAULT '{}',
  assertion_logic       jsonb       NOT NULL DEFAULT '{}',
  compliance_threshold  int         NOT NULL DEFAULT 100 CHECK (compliance_threshold BETWEEN 0 AND 100),
  verification_cron     text,
  last_run_at           timestamptz,
  last_run_result       jsonb,
  status                text        NOT NULL DEFAULT 'unknown'
    CHECK (status IN ('compliant','non_compliant','partial','unknown','error')),
  responsible_id        uuid        REFERENCES users(id) ON DELETE SET NULL,
  on_fail_actions       text[]      NOT NULL DEFAULT '{create_nc,notify}',
  on_fail_playbook_id   uuid        REFERENCES playbooks(id) ON DELETE SET NULL,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS policy_rule_runs (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id         uuid        NOT NULL REFERENCES policy_rules(id) ON DELETE CASCADE,
  policy_id       uuid        NOT NULL REFERENCES policies(id) ON DELETE CASCADE,
  org_id          uuid        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  run_at          timestamptz NOT NULL DEFAULT now(),
  status          text        NOT NULL
    CHECK (status IN ('compliant','non_compliant','partial','error')),
  score           int,
  subjects_total  int,
  subjects_ok     int,
  subjects_fail   int,
  fail_details    jsonb       NOT NULL DEFAULT '[]',
  nc_created_id   uuid,
  decision_id     uuid        REFERENCES ai_decisions(id) ON DELETE SET NULL,
  error_message   text
);

CREATE INDEX IF NOT EXISTS policies_org_idx        ON policies (org_id, status);
CREATE INDEX IF NOT EXISTS policy_rules_policy_idx ON policy_rules (policy_id, rule_order);
CREATE INDEX IF NOT EXISTS rule_runs_rule_idx       ON policy_rule_runs (rule_id, run_at DESC);

DROP TRIGGER IF EXISTS policies_updated_at     ON policies;
DROP TRIGGER IF EXISTS policy_rules_updated_at ON policy_rules;
CREATE TRIGGER policies_updated_at
  BEFORE UPDATE ON policies FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER policy_rules_updated_at
  BEFORE UPDATE ON policy_rules FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE policies         ENABLE ROW LEVEL SECURITY;
ALTER TABLE policy_rules     ENABLE ROW LEVEL SECURITY;
ALTER TABLE policy_rule_runs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "policies_srole"         ON policies;
DROP POLICY IF EXISTS "policy_rules_srole"     ON policy_rules;
DROP POLICY IF EXISTS "policy_rule_runs_srole" ON policy_rule_runs;
CREATE POLICY "policies_srole"         ON policies         FOR ALL TO service_role USING (true);
CREATE POLICY "policy_rules_srole"     ON policy_rules     FOR ALL TO service_role USING (true);
CREATE POLICY "policy_rule_runs_srole" ON policy_rule_runs FOR ALL TO service_role USING (true);


-- ═══════════════════════════════════════════════════════════════════════════
-- 5. CONFORMITÉ CAUSALE
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS compliance_frameworks (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id           uuid        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name             text        NOT NULL,
  slug             text        NOT NULL,
  description      text,
  responsible_id   uuid        REFERENCES users(id) ON DELETE SET NULL,
  current_score    int         NOT NULL DEFAULT 0 CHECK (current_score BETWEEN 0 AND 100),
  target_score     int         NOT NULL DEFAULT 80  CHECK (target_score BETWEEN 0 AND 100),
  cost_of_inaction numeric(12,2),
  cost_rationale   text,
  status           text        NOT NULL DEFAULT 'active'
    CHECK (status IN ('active','inactive','completed')),
  last_assessed_at timestamptz,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (org_id, slug)
);

CREATE TABLE IF NOT EXISTS compliance_controls (
  id                       uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  framework_id             uuid        NOT NULL REFERENCES compliance_frameworks(id) ON DELETE CASCADE,
  org_id                   uuid        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  reference                text        NOT NULL,
  title                    text        NOT NULL,
  description              text,
  responsible_id           uuid        REFERENCES users(id) ON DELETE SET NULL,
  responsible_dept         text,
  status                   text        NOT NULL DEFAULT 'not_started'
    CHECK (status IN ('compliant','partial','non_compliant','not_started','na')),
  weight                   int         NOT NULL DEFAULT 1,
  cost_of_noncompliance    numeric(12,2),
  cost_rationale           text,
  projected_score_if_fixed int,
  auto_from_rule_id        uuid        REFERENCES policy_rules(id) ON DELETE SET NULL,
  evidence_required        boolean     NOT NULL DEFAULT false,
  evidence_refs            jsonb       NOT NULL DEFAULT '[]',
  last_assessed_at         timestamptz,
  due_date                 date,
  created_at               timestamptz NOT NULL DEFAULT now(),
  updated_at               timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS compliance_nonconformities (
  id                        uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  framework_id              uuid        NOT NULL REFERENCES compliance_frameworks(id) ON DELETE CASCADE,
  control_id                uuid        REFERENCES compliance_controls(id) ON DELETE SET NULL,
  org_id                    uuid        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  reference                 text        NOT NULL,
  title                     text        NOT NULL,
  description               text,
  severity                  text        NOT NULL DEFAULT 'medium'
    CHECK (severity IN ('critical','high','medium','low')),
  responsible_id            uuid        REFERENCES users(id) ON DELETE SET NULL,
  status                    text        NOT NULL DEFAULT 'open'
    CHECK (status IN ('open','in_progress','resolved','accepted_risk','closed')),
  cost_of_inaction          numeric(12,2),
  auto_remediation_available boolean    NOT NULL DEFAULT false,
  remediation_playbook_id   uuid        REFERENCES playbooks(id) ON DELETE SET NULL,
  remediation_decision_id   uuid        REFERENCES ai_decisions(id) ON DELETE SET NULL,
  evidence_refs             jsonb       NOT NULL DEFAULT '[]',
  due_date                  date,
  resolved_at               timestamptz,
  created_at                timestamptz NOT NULL DEFAULT now(),
  updated_at                timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS compliance_action_plans (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id           uuid        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  framework_id     uuid        NOT NULL REFERENCES compliance_frameworks(id) ON DELETE CASCADE,
  generated_at     timestamptz NOT NULL DEFAULT now(),
  generated_by     text        NOT NULL DEFAULT 'atlas',
  current_score    int,
  projected_score  int,
  total_savings    numeric(12,2),
  actions          jsonb       NOT NULL DEFAULT '[]',
  status           text        NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','approved','in_progress','completed','cancelled')),
  approved_by      uuid        REFERENCES users(id) ON DELETE SET NULL,
  responsible_id   uuid        REFERENCES users(id) ON DELETE SET NULL,
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS cf_org_idx   ON compliance_frameworks (org_id, status);
CREATE INDEX IF NOT EXISTS cc_fw_idx    ON compliance_controls (framework_id, status);
CREATE INDEX IF NOT EXISTS cnc_fw_idx   ON compliance_nonconformities (framework_id, status);
CREATE INDEX IF NOT EXISTS cap_org_idx  ON compliance_action_plans (org_id, framework_id);

DROP TRIGGER IF EXISTS compliance_fw_updated_at  ON compliance_frameworks;
DROP TRIGGER IF EXISTS compliance_ctrl_updated_at ON compliance_controls;
DROP TRIGGER IF EXISTS compliance_nc_updated_at  ON compliance_nonconformities;
CREATE TRIGGER compliance_fw_updated_at   BEFORE UPDATE ON compliance_frameworks      FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER compliance_ctrl_updated_at BEFORE UPDATE ON compliance_controls         FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER compliance_nc_updated_at   BEFORE UPDATE ON compliance_nonconformities  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE compliance_frameworks      ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_controls        ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_nonconformities ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_action_plans    ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "cf_srole"   ON compliance_frameworks;
DROP POLICY IF EXISTS "cc_srole"   ON compliance_controls;
DROP POLICY IF EXISTS "cnc_srole"  ON compliance_nonconformities;
DROP POLICY IF EXISTS "cap_srole"  ON compliance_action_plans;
CREATE POLICY "cf_srole"  ON compliance_frameworks      FOR ALL TO service_role USING (true);
CREATE POLICY "cc_srole"  ON compliance_controls         FOR ALL TO service_role USING (true);
CREATE POLICY "cnc_srole" ON compliance_nonconformities  FOR ALL TO service_role USING (true);
CREATE POLICY "cap_srole" ON compliance_action_plans     FOR ALL TO service_role USING (true);


-- ═══════════════════════════════════════════════════════════════════════════
-- 6. INITIATIVES (couche au-dessus des Playbooks)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS initiatives (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id           uuid        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name             text        NOT NULL,
  description      text,
  category         text        NOT NULL DEFAULT 'general'
    CHECK (category IN (
      'certification','migration','transformation','compliance',
      'security','hr','cost_reduction','ai_adoption','general'
    )),
  icon             text        NOT NULL DEFAULT '🎯',
  responsible_id   uuid        REFERENCES users(id) ON DELETE SET NULL,
  responsible_dept text,
  status           text        NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','active','paused','completed','cancelled')),
  target_score     int         CHECK (target_score BETWEEN 0 AND 100),
  current_score    int         NOT NULL DEFAULT 0 CHECK (current_score BETWEEN 0 AND 100),
  budget_estimate  numeric(12,2),
  deadline         date,
  -- Liens vers tous les objets
  decision_ids     uuid[]      NOT NULL DEFAULT '{}',
  playbook_ids     uuid[]      NOT NULL DEFAULT '{}',
  policy_ids       uuid[]      NOT NULL DEFAULT '{}',
  framework_ids    uuid[]      NOT NULL DEFAULT '{}',
  -- Métriques calculées (mise à jour par trigger ou background)
  total_decisions  int         NOT NULL DEFAULT 0,
  done_decisions   int         NOT NULL DEFAULT 0,
  total_playbooks  int         NOT NULL DEFAULT 0,
  done_playbooks   int         NOT NULL DEFAULT 0,
  created_by       uuid        REFERENCES users(id) ON DELETE SET NULL,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS initiatives_org_idx ON initiatives (org_id, status);

DROP TRIGGER IF EXISTS initiatives_updated_at ON initiatives;
CREATE TRIGGER initiatives_updated_at
  BEFORE UPDATE ON initiatives FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE initiatives ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "initiatives_srole" ON initiatives;
CREATE POLICY "initiatives_srole" ON initiatives FOR ALL TO service_role USING (true);


-- ═══════════════════════════════════════════════════════════════════════════
-- 7. EVENT BUS
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS platform_events (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          uuid        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  event_type      text        NOT NULL,
  source_module   text        NOT NULL,
  source_id       uuid,
  payload         jsonb       NOT NULL DEFAULT '{}',
  processed       boolean     NOT NULL DEFAULT false,
  processed_at    timestamptz,
  error           text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS platform_events_org_idx      ON platform_events (org_id, event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS platform_events_pending_idx  ON platform_events (processed, created_at) WHERE NOT processed;

ALTER TABLE platform_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "platform_events_srole" ON platform_events;
CREATE POLICY "platform_events_srole" ON platform_events FOR ALL TO service_role USING (true);


-- ═══════════════════════════════════════════════════════════════════════════
-- 8. APP REGISTRY — nouveaux modules
-- ═══════════════════════════════════════════════════════════════════════════

INSERT INTO app_registry (slug, name, description, icon, category, layer, version, status, permissions, dependencies, entry_path, sort_order)
VALUES
  (
    'decisions',
    'Décisions IA',
    'Tableau exécutif — chaque recommandation est un dossier complet avec ROI, coût d''inaction et bouton d''action.',
    '🎯', 'governance', 'app', '1.0', 'available',
    '{"min_role": "user", "min_plan": "starter"}',
    '{"core": ["ai-engine"], "apps": ["diagnostic-ia"]}',
    '/workspace/{slug}/decisions',
    15
  ),
  (
    'playbooks',
    'Playbooks',
    'Processus métier multi-étapes — Onboarding, Offboarding, Sécurité, Conformité et plus.',
    '📋', 'governance', 'app', '1.0', 'available',
    '{"min_role": "user", "min_plan": "starter"}',
    '{"core": ["ai-engine", "connectors"], "apps": []}',
    '/workspace/{slug}/playbooks',
    25
  ),
  (
    'orchestrations',
    'Centre d''Orchestration',
    'Chef d''orchestre de vos systèmes — Microsoft 365, SAP, Workday, Jira, ServiceNow et API REST.',
    '⚙️', 'productivity', 'app', '1.0', 'available',
    '{"min_role": "admin", "min_plan": "growth"}',
    '{"core": ["connectors"], "apps": []}',
    '/workspace/{slug}/orchestrations',
    35
  ),
  (
    'initiatives',
    'Initiatives',
    'Pilotez vos programmes stratégiques — ISO 27001, Loi 25, Migration M365, Adoption IA.',
    '🚀', 'governance', 'app', '1.0', 'available',
    '{"min_role": "manager", "min_plan": "growth"}',
    '{"core": ["ai-engine"], "apps": ["decisions", "playbooks"]}',
    '/workspace/{slug}/initiatives',
    45
  )
ON CONFLICT (slug) DO NOTHING;


-- ═══════════════════════════════════════════════════════════════════════════
-- 9. DONNÉES DÉMO — organisation de démonstration
-- ═══════════════════════════════════════════════════════════════════════════

DO $$
DECLARE
  v_org uuid;
BEGIN
  SELECT id INTO v_org FROM organizations LIMIT 1;
  IF v_org IS NULL THEN RETURN; END IF;

  -- Décisions démo
  INSERT INTO ai_decisions (org_id, title, category, priority, status,
    problem_statement, why_now, cost_of_inaction, savings_annual,
    roi_label, risk_label, time_label, time_to_apply_min, ai_confidence)
  VALUES
    (v_org, '14 licences Microsoft 365 E3 inutilisées', 'finance', 'critical', 'new',
     '14 licences E3 à 28 $/mois n''ont enregistré aucune connexion depuis plus de 90 jours.',
     'Renouvellement Microsoft au 15 août. Agir maintenant évite 12 mois de facturation supplémentaire.',
     4760, 4760, 'excellent', 'low', '2 minutes', 2, 96),
    (v_org, '8 comptes administrateurs sans MFA', 'security', 'critical', 'new',
     '8 sur 23 comptes administrateurs n''ont pas l''authentification multifacteur activée.',
     'Exposition critique : un compte admin compromis donne un accès total au tenant Microsoft 365.',
     89000, NULL, 'excellent', 'critical', '12 secondes', 1, 98),
    (v_org, 'Politique IA absente — ISO 42001 §6.1', 'compliance', 'high', 'new',
     'Aucune politique d''utilisation de l''IA n''est documentée dans l''organisation.',
     'Appel d''offres public exigeant une politique IA prévu en septembre 2026.',
     150000, NULL, 'good', 'high', '4 heures', 240, 87)
  ON CONFLICT DO NOTHING;

  -- Frameworks démo
  INSERT INTO compliance_frameworks (org_id, name, slug, description, current_score, target_score, cost_of_inaction, cost_rationale)
  VALUES
    (v_org, 'Loi 25 (Québec)', 'loi25', 'Loi modernisant des dispositions législatives en matière de protection des renseignements personnels', 82, 95, 25000, 'Amende CAI potentielle'),
    (v_org, 'ISO 27001', 'iso27001', 'Systèmes de management de la sécurité de l''information', 58, 90, 339000, 'Incident cyber probable + perte appels d''offres'),
    (v_org, 'ISO 42001', 'iso42001', 'Systèmes de management de l''intelligence artificielle', 71, 85, 80000, 'Contrats perdus sans certification IA')
  ON CONFLICT (org_id, slug) DO NOTHING;

  -- Playbooks démo
  INSERT INTO playbooks (org_id, name, description, category, icon, sla_minutes, status, run_count, success_count,
    steps)
  VALUES
    (v_org, 'Onboarding Employé', 'Processus complet d''intégration d''un nouvel employé — compte AD, M365, Teams, Jira, ServiceNow.', 'hr', '👤', 240, 'active', 47, 46,
     '[
       {"index":1,"type":"automation","name":"Créer compte Entra ID","connector":"microsoft_graph","est_seconds":8},
       {"index":2,"type":"automation","name":"Créer Exchange + Licence E3","connector":"exchange","est_seconds":12},
       {"index":3,"type":"automation","name":"Ajouter aux groupes M365","connector":"microsoft_graph","est_seconds":5},
       {"index":4,"type":"human_approval","name":"Validation manager","timeout_minutes":120,"escalate_after_min":90},
       {"index":5,"type":"automation","name":"Créer Teams + canaux","connector":"teams","est_seconds":4},
       {"index":6,"type":"automation","name":"Créer ticket Jira","connector":"jira","est_seconds":3},
       {"index":7,"type":"automation","name":"Créer incident ServiceNow","connector":"servicenow","est_seconds":3},
       {"index":8,"type":"notification","name":"Envoyer courriel de bienvenue","connector":"email","est_seconds":1},
       {"index":9,"type":"human_task","name":"RH confirme remise des accès"},
       {"index":10,"type":"automation","name":"Générer rapport d''audit","connector":"internal","est_seconds":5}
     ]'),
    (v_org, 'Offboarding Sécurisé', 'Désactivation sécurisée d''un employé quittant l''organisation.', 'hr', '🚪', 120, 'active', 12, 12,
     '[
       {"index":1,"type":"automation","name":"Désactiver compte Entra ID","connector":"microsoft_graph","est_seconds":5},
       {"index":2,"type":"automation","name":"Révoquer toutes les sessions","connector":"microsoft_graph","est_seconds":3},
       {"index":3,"type":"automation","name":"Retirer des groupes M365","connector":"microsoft_graph","est_seconds":4},
       {"index":4,"type":"automation","name":"Archiver boîte Exchange","connector":"exchange","est_seconds":8},
       {"index":5,"type":"human_approval","name":"Validation RH — accès révoqués","timeout_minutes":60},
       {"index":6,"type":"automation","name":"Libérer la licence M365","connector":"microsoft_graph","est_seconds":3},
       {"index":7,"type":"automation","name":"Clôturer tickets ouverts Jira","connector":"jira","est_seconds":5},
       {"index":8,"type":"automation","name":"Générer rapport d''audit offboarding","connector":"internal","est_seconds":5}
     ]'),
    (v_org, 'Réponse Incident Sécurité', 'Procédure de réponse rapide en cas d''incident de sécurité détecté.', 'security', '🔐', 60, 'active', 3, 3,
     '[
       {"index":1,"type":"notification","name":"Alerter RSSI et Direction","connector":"teams"},
       {"index":2,"type":"automation","name":"Isoler le compte compromis","connector":"microsoft_graph","est_seconds":3},
       {"index":3,"type":"automation","name":"Révoquer toutes les sessions","connector":"microsoft_graph","est_seconds":3},
       {"index":4,"type":"automation","name":"Forcer réinitialisation MFA","connector":"microsoft_graph","est_seconds":5},
       {"index":5,"type":"human_approval","name":"RSSI confirme l''isolation","timeout_minutes":15},
       {"index":6,"type":"automation","name":"Créer incident ServiceNow P1","connector":"servicenow","est_seconds":5}
     ]')
  ON CONFLICT DO NOTHING;

  -- Orchestrations démo
  INSERT INTO orchestrations (org_id, name, description, connector_type, category, status, is_reusable, run_count, success_count)
  VALUES
    (v_org, 'Créer utilisateur Microsoft 365', 'Crée un compte Entra ID + Exchange + assigne une licence.', 'microsoft_graph', 'hr', 'active', true, 234, 232),
    (v_org, 'Désactiver licences inactives', 'Identifie et désactive les licences M365 sans connexion depuis N jours.', 'microsoft_graph', 'finance', 'active', true, 14, 14),
    (v_org, 'Créer incident ServiceNow', 'Ouvre un incident ou une demande de service dans ServiceNow.', 'servicenow', 'it', 'active', true, 89, 87),
    (v_org, 'Synchroniser employé Workday → M365', 'Synchronise les données RH de Workday vers Microsoft 365.', 'workday', 'hr', 'active', true, 156, 154),
    (v_org, 'Rapport audit Loi 25', 'Génère un rapport d''audit de conformité Loi 25 via script Python.', 'python', 'compliance', 'active', true, 6, 5)
  ON CONFLICT DO NOTHING;

  -- Initiatives démo
  INSERT INTO initiatives (org_id, name, description, category, icon, status, target_score, current_score, budget_estimate, total_decisions, done_decisions, total_playbooks, done_playbooks)
  VALUES
    (v_org, 'Certification ISO 27001', 'Atteindre la certification ISO 27001 d''ici Q4 2026.', 'certification', '🏆', 'active', 90, 58, 12000, 5, 1, 3, 1),
    (v_org, 'Programme Conformité Loi 25', 'Conformité complète à la Loi 25 avant les audits de la CAI.', 'compliance', '⚖️', 'active', 95, 82, 8000, 3, 2, 2, 2),
    (v_org, 'Adoption IA — Transformation numérique', 'Programme d''adoption IA pour accélérer la transformation de l''organisation.', 'ai_adoption', '🤖', 'active', 85, 52, 15000, 3, 0, 2, 0)
  ON CONFLICT DO NOTHING;

END $$;
