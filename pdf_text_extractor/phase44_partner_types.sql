-- ═══════════════════════════════════════════════════════════════════
-- Phase 44 : Partner Types + Org Workspace Support
-- Ajout du type de partenaire pour adapter le vocabulaire du workspace.
-- Idempotent — rejouable sans effet de bord.
-- ═══════════════════════════════════════════════════════════════════

-- 1. Colonne partner_type sur partners
ALTER TABLE partners
  ADD COLUMN IF NOT EXISTS partner_type text
    NOT NULL DEFAULT 'chamber'
    CHECK (partner_type IN (
      'chamber',       -- Chambre de commerce ou d'industrie
      'incubator',     -- Incubateur ou accélérateur (startups)
      'association',   -- Association professionnelle ou sectorielle
      'municipality',  -- Municipalité ou régie municipale
      'university',    -- Université ou cégep
      'direct'         -- Organisation sans partenaire intermédiaire (B2B direct)
    ));

COMMENT ON COLUMN partners.partner_type IS
  'Type d''organisation du partenaire — détermine le vocabulaire du workspace (membres/startups, cohorte/promotion, etc.)';

-- 2. Mettre à jour les partenaires existants
UPDATE partners SET partner_type = 'chamber' WHERE slug IN ('cci3r', 'demo') AND partner_type = 'chamber';

-- 3. Index pour filtrer par type
CREATE INDEX IF NOT EXISTS partners_type_idx ON partners (partner_type);

-- ─────────────────────────────────────────────────────────────────────────────
-- Vocabulaire par type (référence — géré côté client dans workspace.js)
-- ─────────────────────────────────────────────────────────────────────────────
-- chamber      : membres / cohorte / membre
-- incubator    : startups / promotion / startup
-- association  : membres / cohorte / membre
-- municipality : services / programme / service
-- university   : projets / cohorte / projet
-- direct       : équipes / programme / équipe
-- ─────────────────────────────────────────────────────────────────────────────

-- 4. Exemple : seed incubateur démo
INSERT INTO partners (slug, name, hero_title, hero_subtitle, primary_color, plan, is_active, partner_type)
VALUES (
  'incubateur-demo',
  'HUB Mauricie',
  'Accélérateur IA Startups',
  'Mesurez · Structurez · Accélérez',
  '#059669',
  'starter',
  true,
  'incubator'
)
ON CONFLICT (slug) DO UPDATE SET
  name          = EXCLUDED.name,
  hero_title    = EXCLUDED.hero_title,
  hero_subtitle = EXCLUDED.hero_subtitle,
  partner_type  = EXCLUDED.partner_type,
  is_active     = true;

-- Installer les apps pour l'incubateur démo
WITH p AS (SELECT id FROM partners WHERE slug = 'incubateur-demo')
INSERT INTO installed_apps (partner_id, app_slug, is_enabled, config)
SELECT p.id, app_slug, true, '{}'::jsonb
FROM p, (VALUES
  ('diagnostic-ia'),
  ('gouvernance'),
  ('reports'),
  ('settings')
) AS apps(app_slug)
ON CONFLICT (partner_id, app_slug) DO UPDATE SET is_enabled = true;

-- ── Résultat attendu ────────────────────────────────────────────────
-- /workspace/incubateur-demo → "HUB Mauricie · Accélérateur IA Startups"
-- Vocabulaire adapté : "startups" au lieu de "membres", "promotion" au lieu de "cohorte"
