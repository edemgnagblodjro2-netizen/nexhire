-- ═══════════════════════════════════════════════════════════════════
-- Seed : Partner "demo" — workspace de démonstration AgentHub
-- Usage : exécuter dans Supabase SQL Editor (idempotent)
-- Accès : /workspace/demo
-- ═══════════════════════════════════════════════════════════════════

-- 1. Partner demo
INSERT INTO partners (slug, name, hero_title, hero_subtitle, primary_color, plan, is_active)
VALUES (
  'demo',
  'AgentHub Demo',
  'AgentHub Platform',
  'L''Enterprise Intelligence Platform propulsée par ATLAS AI.',
  '#7c3aed',
  'starter',
  true
)
ON CONFLICT (slug) DO UPDATE SET
  name           = EXCLUDED.name,
  hero_title     = EXCLUDED.hero_title,
  hero_subtitle  = EXCLUDED.hero_subtitle,
  primary_color  = EXCLUDED.primary_color,
  is_active      = true;

-- 2. Enregistrer les apps Sprint 2 dans le catalogue (idempotent)
INSERT INTO app_registry
  (slug, name, description, icon, category, layer, version, status,
   permissions, dependencies, entry_path, sort_order)
VALUES
  (
    'gouvernance',
    'Gouvernance IA',
    'Checklist Loi 25, génération de politique IA, registre des outils IA.',
    '⚖️', 'governance', 'app', '1.0', 'available',
    '{"min_role": "user", "min_plan": "starter"}',
    '{"core": [], "apps": []}',
    '/workspace/{slug}/gouvernance',
    30
  ),
  (
    'reports',
    'Rapports',
    'Rapports individuels et de cohorte, exports CSV.',
    '📊', 'analytics', 'app', '1.0', 'available',
    '{"min_role": "user", "min_plan": "starter"}',
    '{"core": [], "apps": ["diagnostic-ia"]}',
    '/workspace/{slug}/reports',
    40
  ),
  (
    'settings',
    'Paramètres',
    'Configuration du workspace : profil, apparence, apps installées, sécurité.',
    '⚙️', 'platform', 'app', '1.0', 'available',
    '{"min_role": "user", "min_plan": "starter"}',
    '{"core": [], "apps": []}',
    '/workspace/{slug}/settings',
    90
  ),
  (
    'automation',
    'Automatisations',
    'Automatisations IA — Power Automate, agents ATLAS, 400+ connecteurs.',
    '⚡', 'productivity', 'app', '0.5', 'coming_soon',
    '{"min_role": "user", "min_plan": "growth"}',
    '{"core": [], "apps": []}',
    '/workspace/{slug}/automation',
    50
  ),
  (
    'knowledge',
    'Knowledge Hub',
    'Base de connaissance privée — ATLAS répond avec vos documents sectoriels.',
    '📚', 'productivity', 'app', '0.5', 'coming_soon',
    '{"min_role": "user", "min_plan": "growth"}',
    '{"core": [], "apps": []}',
    '/workspace/{slug}/knowledge',
    60
  ),
  (
    'ms365',
    'M365 Optimizer',
    'Audit et optimisation Microsoft 365 — licences, sécurité Entra, adoption Copilot.',
    '🪟', 'productivity', 'app', '0.5', 'coming_soon',
    '{"min_role": "user", "min_plan": "growth"}',
    '{"core": [], "apps": []}',
    '/workspace/{slug}/ms365',
    70
  )
ON CONFLICT (slug) DO UPDATE SET
  name        = EXCLUDED.name,
  description = EXCLUDED.description,
  status      = EXCLUDED.status,
  sort_order  = EXCLUDED.sort_order;

-- 3. Installer toutes les apps disponibles pour le partner demo
WITH p AS (SELECT id FROM partners WHERE slug = 'demo')
INSERT INTO installed_apps (partner_id, app_slug, is_enabled, config)
SELECT p.id, app_slug, true, '{}'::jsonb
FROM p, (VALUES
  ('diagnostic-ia'),
  ('observatoire'),
  ('gouvernance'),
  ('reports'),
  ('settings'),
  ('automation'),
  ('knowledge'),
  ('ms365')
) AS apps(app_slug)
ON CONFLICT (partner_id, app_slug) DO UPDATE SET is_enabled = true;

-- 4. Benchmark de démonstration (données fictives — mode DEMO isolé)
WITH p AS (SELECT id FROM partners WHERE slug = 'demo')
INSERT INTO diagnostic_benchmarks (
  partner_id, period_start, sector, size_range, sample_size,
  imai_avg, imai_p25, imai_p75,
  dim_strategie_avg, dim_personnes_avg, dim_processus_avg,
  dim_technologies_avg, dim_gouvernance_avg,
  is_demo
)
SELECT
  p.id,
  '2025-01-01'::date,
  NULL, NULL,
  42,
  58.3, 38.5, 74.2,
  62.1, 46.3, 55.8, 50.2, 38.7,
  true
FROM p
ON CONFLICT (partner_id, period_start, sector, size_range)
  WHERE sector IS NULL AND size_range IS NULL
DO UPDATE SET
  imai_avg   = EXCLUDED.imai_avg,
  is_demo    = true;

-- ── Résultat attendu ────────────────────────────────────────────────
-- /workspace/demo  →  AgentHub Demo (violet — mode démo isolé)
