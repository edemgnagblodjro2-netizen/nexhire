-- ═══════════════════════════════════════════════════════════════════
-- Seed : Partner "demo" — workspace de démonstration AgentHub
-- Usage : exécuter dans Supabase SQL Editor (idempotent)
-- Accès : /workspace/demo
-- ═══════════════════════════════════════════════════════════════════

-- 1. Partner demo
INSERT INTO partners (slug, name, primary_color, plan, is_active)
VALUES (
  'demo',
  'CCI3R',
  '#7c3aed',   -- violet — distinct du bleu CCI3R pour reconnaître visuellement le mode démo
  'starter',
  true
)
ON CONFLICT (slug) DO UPDATE SET
  name          = EXCLUDED.name,
  primary_color = EXCLUDED.primary_color,
  is_active     = true;

-- 2. Installer diagnostic-ia + observatoire pour le partner demo
WITH p AS (SELECT id FROM partners WHERE slug = 'demo')
INSERT INTO installed_apps (partner_id, app_slug, is_enabled, config)
SELECT p.id, app_slug, true, '{}'::jsonb
FROM p, (VALUES ('diagnostic-ia'), ('observatoire')) AS apps(app_slug)
ON CONFLICT (partner_id, app_slug) DO UPDATE SET is_enabled = true;

-- 3. Benchmark de démonstration (mêmes données que CCI3R)
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
-- /workspace/demo  →  Accélérateur IA CCI3R (violet — mode démo)
-- /workspace/cci3r →  Accélérateur IA CCI3R (bleu — production)
