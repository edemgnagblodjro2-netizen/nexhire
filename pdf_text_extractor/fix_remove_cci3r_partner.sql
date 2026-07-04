-- ═══════════════════════════════════════════════════════════════════════════
-- FIX : Supprimer le partenaire CCI3R + corriger le nom du partenaire demo
-- Usage : Supabase SQL Editor (idempotent)
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. Supprimer toutes les apps installées pour cci3r (FK avant DELETE)
DELETE FROM installed_apps
WHERE partner_id = (SELECT id FROM partners WHERE slug = 'cci3r');

-- 2. Supprimer le partenaire cci3r
DELETE FROM partners WHERE slug = 'cci3r';

-- 3. Corriger le nom du partenaire demo
UPDATE partners SET
  name          = 'AgentHub Demo',
  hero_title    = 'AgentHub Platform',
  hero_subtitle = 'Enterprise Intelligence Platform — propulsé par ATLAS AI.'
WHERE slug = 'demo';

-- 4. Vérification finale
SELECT slug, name, hero_title, is_active FROM partners ORDER BY slug;
