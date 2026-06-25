-- Phase 42 : AgentHub Platform — Core Schema
-- Partners · App Registry (Core + Apps) · Installed Apps · Catalogue Workspace
-- Hiérarchie : Partner → Organization → User
--
-- ORDRE D'EXÉCUTION : ce script doit précéder phase41_diagnostic_workspace.sql
-- IDEMPOTENCE     : toutes les instructions sont rejouables sans effet de bord
-- ROLLBACK        : voir rollback_phase42.sql (exécuter après rollback_phase41.sql)

-- ═══════════════════════════════════════════════════════════════════════════
-- CORE : PARTNERS
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS partners (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  slug            text        UNIQUE NOT NULL,
  name            text        NOT NULL,
  description     text,
  logo_url        text,
  primary_color   text        NOT NULL DEFAULT '#2563eb',
  secondary_color text,
  favicon_url     text,
  city            text,
  region          text,
  country         text        NOT NULL DEFAULT 'CA',
  website         text,
  contact_email   text,
  custom_domain   text        UNIQUE,
  plan            text        NOT NULL DEFAULT 'starter'
    CHECK (plan IN ('starter', 'growth', 'enterprise')),
  max_orgs        integer,
  is_active       boolean     NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE  partners               IS 'Partenaires de la Platform (CCI3R, chambres de commerce, etc.) — distributeurs auprès de leurs membres.';
COMMENT ON COLUMN partners.slug          IS 'Identifiant URL stable et immuable — utilisé dans /workspace/{slug}.';
COMMENT ON COLUMN partners.plan          IS 'Plan de la Platform : starter, growth, enterprise — détermine les apps disponibles.';
COMMENT ON COLUMN partners.custom_domain IS 'Domaine personnalisé du partenaire (Phase 2) — ex: agenthub.cci3r.qc.ca.';
COMMENT ON COLUMN partners.max_orgs      IS 'Nombre maximum d''organisations membres. NULL = illimité.';

CREATE INDEX IF NOT EXISTS partners_slug_idx   ON partners (slug);
CREATE INDEX IF NOT EXISTS partners_active_idx ON partners (is_active) WHERE is_active = true;

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS partners_updated_at ON partners;
CREATE TRIGGER partners_updated_at
  BEFORE UPDATE ON partners FOR EACH ROW EXECUTE FUNCTION set_updated_at();

INSERT INTO partners (slug, name, description, primary_color, city, region)
VALUES (
  'cci3r',
  'Chambre de commerce et d''industrie de Trois-Rivières',
  'Accompagne les entreprises de la région Mauricie dans leur transformation numérique et IA.',
  '#1d4ed8', 'Trois-Rivières', 'Mauricie'
)
ON CONFLICT (slug) DO NOTHING;


-- ═══════════════════════════════════════════════════════════════════════════
-- CORE : HIÉRARCHIE Partner → Organization → User
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE organizations ADD COLUMN IF NOT EXISTS
  partner_id uuid REFERENCES partners(id) ON DELETE SET NULL;
COMMENT ON COLUMN organizations.partner_id IS 'FK vers partners — NULL si l''organisation n''appartient pas à un partenaire Platform.';

CREATE INDEX IF NOT EXISTS org_partner_idx
  ON organizations (partner_id) WHERE partner_id IS NOT NULL;

ALTER TABLE users ADD COLUMN IF NOT EXISTS
  partner_id uuid REFERENCES partners(id) ON DELETE SET NULL;
COMMENT ON COLUMN users.partner_id IS 'FK vers partners — NULL sauf pour les workspace_admins (owner + partner_id IS NOT NULL).';

CREATE INDEX IF NOT EXISTS users_partner_idx
  ON users (partner_id) WHERE partner_id IS NOT NULL;


-- ═══════════════════════════════════════════════════════════════════════════
-- PLATFORM : APP REGISTRY
--
-- Contrat d'enregistrement — toute app DOIT fournir :
--   slug, name, description, icon, version, status, permissions,
--   dependencies, entry_path
--
-- layer :
--   'core' → service partagé du noyau (non visible dans le catalogue UI)
--   'app'  → module installable (visible dans le catalogue)
--
-- status :
--   'available'   → installable par un partenaire
--   'coming_soon' → visible dans le catalogue avec badge "Bientôt"
--   'beta'        → disponible en accès anticipé
--   'deprecated'  → retirée, masquée du catalogue
--
-- dependencies : services Core et apps dont dépend cette app
--   format : {"core": ["ai-engine", "notifications"], "apps": []}
--
-- entry_path : template URL — {slug} est substitué par le slug partenaire côté backend
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS app_registry (
  slug          text        PRIMARY KEY,
  name          text        NOT NULL,
  description   text,
  icon          text,
  category      text        NOT NULL
    CHECK (category IN (
      'platform',      -- services Core (ai-engine, pdf-engine, etc.)
      'evaluation',
      'governance',
      'analytics',
      'hr',
      'finance',
      'compliance',
      'productivity'
    )),
  layer         text        NOT NULL DEFAULT 'app'
    CHECK (layer IN ('core', 'app')),
  version       text        NOT NULL DEFAULT '1.0',
  status        text        NOT NULL DEFAULT 'available'
    CHECK (status IN ('available', 'coming_soon', 'beta', 'deprecated')),
  permissions   jsonb       NOT NULL DEFAULT '{"min_role": "user", "min_plan": "starter"}',
  dependencies  jsonb       NOT NULL DEFAULT '{"core": [], "apps": []}',
  entry_path    text,
  sort_order    integer     NOT NULL DEFAULT 100,
  created_at    timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE  app_registry              IS 'Catalogue de tous les composants de la Platform (Core et Apps installables). Toute nouvelle fonctionnalité doit y être enregistrée.';
COMMENT ON COLUMN app_registry.slug         IS 'Identifiant stable kebab-case — immuable après création.';
COMMENT ON COLUMN app_registry.status       IS 'available=installable | coming_soon=visible mais non dispo | beta=accès anticipé | deprecated=masquée.';
COMMENT ON COLUMN app_registry.layer        IS 'core=service noyau non installable | app=module installable visible dans le catalogue.';
COMMENT ON COLUMN app_registry.permissions  IS 'Permissions par défaut. Format: {"min_role": "user", "min_plan": "starter"}. Surchargeable dans installed_apps.config.';
COMMENT ON COLUMN app_registry.dependencies IS 'Services requis. Format: {"core": ["ai-engine"], "apps": []}. Vérifiés à l''installation par routes_workspace.py.';
COMMENT ON COLUMN app_registry.entry_path   IS 'URL template — {slug} est remplacé par le slug partenaire. Ex: /workspace/{slug}/diagnostic-ia.';
COMMENT ON COLUMN app_registry.sort_order   IS 'Ordre d''affichage croissant dans le catalogue Workspace.';

CREATE INDEX IF NOT EXISTS app_registry_catalog_idx
  ON app_registry (layer, status, sort_order)
  WHERE layer = 'app' AND status != 'deprecated';


-- ── Composants Core (layer = 'core', non visibles dans le catalogue) ─────────

INSERT INTO app_registry (slug, name, category, layer, version, status, sort_order)
VALUES
  ('auth',          'Authentification',  'compliance',  'core', '1.0', 'available', 0),
  ('rbac',          'Contrôle d''accès', 'compliance',  'core', '1.0', 'available', 0),
  ('billing',       'Facturation',       'finance',     'core', '1.0', 'available', 0),
  ('organizations', 'Organisations',     'compliance',  'core', '1.0', 'available', 0),
  ('connectors',    'Connecteurs',       'productivity','core', '1.0', 'available', 0),
  ('notifications', 'Notifications',     'productivity','core', '1.0', 'available', 0),
  -- Services partagés par toutes les apps IA et de génération de documents
  ('ai-engine',     'AI Engine',         'platform',    'core', '1.0', 'available', 0),
  ('pdf-engine',    'PDF Engine',        'platform',    'core', '1.0', 'available', 0)
ON CONFLICT (slug) DO NOTHING;

COMMENT ON COLUMN app_registry.slug IS
  'Identifiant stable kebab-case — immuable après création. '
  'ai-engine : prompts, modèles, conversations, scoring, recommandations. '
  'pdf-engine : génération de rapports PDF via WeasyPrint/Jinja2.';


-- ── Applications du catalogue (layer = 'app', visibles dans le Workspace) ────
--
-- NOTE sur le vocabulaire :
--   "Parcours IA" = le produit complet (expérience : Assessment → Roadmap → Suivi → Observatoire)
--   "Diagnostic IA" = la première application du Parcours IA (l'évaluation IMAI /100)

INSERT INTO app_registry
  (slug, name, description, icon, category, layer, version, status,
   permissions, dependencies, entry_path, sort_order)
VALUES
  (
    'diagnostic-ia',
    'Diagnostic IA',
    'Évaluez la maturité IA de votre entreprise en 15 questions — IMAI /100, rapport personnalisé.',
    '📊', 'evaluation', 'app', '1.0', 'available',
    '{"min_role": "user", "min_plan": "starter"}',
    '{"core": ["ai-engine", "notifications", "pdf-engine"], "apps": []}',
    '/workspace/{slug}/diagnostic-ia',
    10
  ),
  (
    'observatoire',
    'Observatoire IA',
    'Tableau de bord agrégé — comparez votre organisation aux données sectorielles anonymisées.',
    '🔭', 'analytics', 'app', '0.9', 'coming_soon',
    '{"min_role": "user", "min_plan": "starter"}',
    '{"core": ["ai-engine"], "apps": ["diagnostic-ia"]}',
    '/workspace/{slug}/observatoire',
    20
  ),
  (
    'gouvernance-ia',
    'Gouvernance IA',
    'Cadre de gouvernance IA — politiques, registres de systèmes, audits et conformité.',
    '⚖️', 'governance', 'app', '0.5', 'coming_soon',
    '{"min_role": "manager", "min_plan": "growth"}',
    '{"core": ["ai-engine", "notifications"], "apps": []}',
    '/workspace/{slug}/gouvernance-ia',
    30
  ),
  (
    'm365-optim',
    'Optimisation Microsoft 365',
    'Diagnostic et plan d''optimisation de votre environnement Microsoft 365 et Copilot.',
    '🤖', 'productivity', 'app', '0.5', 'coming_soon',
    '{"min_role": "admin", "min_plan": "growth"}',
    '{"core": ["ai-engine", "connectors"], "apps": []}',
    '/workspace/{slug}/m365-optim',
    40
  ),
  (
    'rh-intelligence',
    'RH Intelligence',
    'Module ressources humaines augmenté par IA — recrutement, onboarding, rétention.',
    '👥', 'hr', 'app', '0.1', 'coming_soon',
    '{"min_role": "manager", "min_plan": "enterprise"}',
    '{"core": ["ai-engine", "notifications"], "apps": []}',
    '/workspace/{slug}/rh',
    50
  ),
  (
    'finance-intelligence',
    'Finance Intelligence',
    'Analyse financière et prévisions assistées par IA.',
    '💰', 'finance', 'app', '1.0', 'coming_soon',
    '{"min_role": "manager", "min_plan": "growth"}',
    '{"core": ["ai-engine"], "apps": []}',
    '/workspace/{slug}/finance',
    60
  )
ON CONFLICT (slug) DO NOTHING;


-- ═══════════════════════════════════════════════════════════════════════════
-- PLATFORM : INSTALLED APPS
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS installed_apps (
  partner_id    uuid        NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
  app_slug      text        NOT NULL REFERENCES app_registry(slug),
  is_enabled    boolean     NOT NULL DEFAULT true,
  config        jsonb       NOT NULL DEFAULT '{}',
  installed_at  timestamptz NOT NULL DEFAULT now(),
  installed_by  uuid,
  PRIMARY KEY (partner_id, app_slug)
);

COMMENT ON TABLE  installed_apps              IS 'Applications activées par partenaire. La vue workspace_catalog couvre aussi les apps non-installées pour le catalogue complet.';
COMMENT ON COLUMN installed_apps.config       IS 'Surcharge de configuration spécifique au partenaire. Peut surcharger permissions, labels, thème, paramètres app.';
COMMENT ON COLUMN installed_apps.installed_by IS 'user_id de l''admin ayant activé l''app. NULL si activée par migration.';

CREATE INDEX IF NOT EXISTS installed_apps_enabled_idx
  ON installed_apps (partner_id) WHERE is_enabled = true;

-- Diagnostic IA activé pour CCI3R
INSERT INTO installed_apps (partner_id, app_slug)
SELECT p.id, 'diagnostic-ia' FROM partners p WHERE p.slug = 'cci3r'
ON CONFLICT DO NOTHING;

-- Observatoire activé en mode démo pour CCI3R
INSERT INTO installed_apps (partner_id, app_slug, config)
SELECT p.id, 'observatoire', '{"demo_mode": true}'::jsonb FROM partners p WHERE p.slug = 'cci3r'
ON CONFLICT DO NOTHING;


-- ═══════════════════════════════════════════════════════════════════════════
-- VUE : WORKSPACE CATALOG
-- Retourne toutes les apps (installed + coming_soon + available) par partenaire.
-- Utilisée par GET /api/workspace/{slug}/apps pour le sidebar et le catalogue.
-- Le backend substitue {slug} dans entry_path avant de retourner la réponse.
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE VIEW workspace_catalog AS
SELECT
  ar.slug                   AS app_slug,
  ar.name                   AS app_name,
  ar.description            AS app_description,
  ar.icon,
  ar.category,
  ar.version,
  ar.permissions            AS default_permissions,
  ar.dependencies,
  ar.entry_path,
  ar.sort_order,
  p.id                      AS partner_id,
  p.slug                    AS partner_slug,
  ia.is_enabled,
  COALESCE(ia.config, '{}') AS app_config,
  ia.installed_at,
  CASE
    WHEN ia.partner_id IS NOT NULL AND ia.is_enabled     THEN 'installed'
    WHEN ia.partner_id IS NOT NULL AND NOT ia.is_enabled THEN 'disabled'
    WHEN ar.status = 'coming_soon'                       THEN 'coming_soon'
    WHEN ar.status = 'beta'                              THEN 'available_beta'
    ELSE                                                      'available'
  END AS catalog_status
FROM app_registry ar
CROSS JOIN partners p
LEFT JOIN installed_apps ia ON ia.partner_id = p.id AND ia.app_slug = ar.slug
WHERE ar.status  != 'deprecated'
  AND ar.layer    = 'app'
  AND p.is_active = true
ORDER BY ar.sort_order, ar.slug;


-- ═══════════════════════════════════════════════════════════════════════════
-- VUE : HIÉRARCHIE PLATEFORME
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE VIEW platform_hierarchy AS
SELECT
  pa.id        AS partner_id,
  pa.slug      AS partner_slug,
  pa.name      AS partner_name,
  pa.plan      AS partner_plan,
  o.id         AS org_id,
  o.name       AS org_name,
  o.org_type,
  COUNT(u.id)  AS user_count
FROM partners pa
LEFT JOIN organizations o ON o.partner_id = pa.id
LEFT JOIN users u         ON u.organization_id = o.id
GROUP BY pa.id, pa.slug, pa.name, pa.plan, o.id, o.name, o.org_type;


-- ═══════════════════════════════════════════════════════════════════════════
-- RLS — ROW LEVEL SECURITY
-- Le backend FastAPI bypasse RLS via service role (psycopg2 + DATABASE_URL).
-- Ces politiques protègent l'accès direct via Supabase Studio / PostgREST.
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE partners       ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_registry   ENABLE ROW LEVEL SECURITY;
ALTER TABLE installed_apps ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "app_registry_read"        ON app_registry;
DROP POLICY IF EXISTS "partners_read_own"         ON partners;
DROP POLICY IF EXISTS "installed_apps_read_own"   ON installed_apps;
DROP POLICY IF EXISTS "partners_service_all"      ON partners;
DROP POLICY IF EXISTS "app_registry_service_all"  ON app_registry;
DROP POLICY IF EXISTS "installed_apps_service_all" ON installed_apps;

CREATE POLICY "app_registry_read" ON app_registry
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "partners_read_own" ON partners
  FOR SELECT TO authenticated
  USING (
    id IN (
      SELECT partner_id FROM users
      WHERE id::text = auth.uid()::text AND partner_id IS NOT NULL
    )
  );

CREATE POLICY "installed_apps_read_own" ON installed_apps
  FOR SELECT TO authenticated
  USING (
    partner_id IN (
      SELECT partner_id FROM users
      WHERE id::text = auth.uid()::text AND partner_id IS NOT NULL
    )
  );

CREATE POLICY "partners_service_all"       ON partners       FOR ALL TO service_role USING (true);
CREATE POLICY "app_registry_service_all"   ON app_registry   FOR ALL TO service_role USING (true);
CREATE POLICY "installed_apps_service_all" ON installed_apps FOR ALL TO service_role USING (true);
