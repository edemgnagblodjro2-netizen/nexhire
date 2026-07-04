-- ═══════════════════════════════════════════════════════════════════════════
-- FIX : Installer diagnostic-ia pour tous les partenaires actifs
-- Usage : Supabase SQL Editor (idempotent — sans effet de bord si déjà installé)
-- ═══════════════════════════════════════════════════════════════════════════

INSERT INTO installed_apps (partner_id, app_slug, is_enabled, config)
SELECT p.id, 'diagnostic-ia', true, '{}'::jsonb
FROM partners p
WHERE p.is_active = true
ON CONFLICT (partner_id, app_slug) DO UPDATE SET is_enabled = true;

-- Vérification
SELECT p.slug, p.name, ia.app_slug, ia.is_enabled
FROM partners p
LEFT JOIN installed_apps ia ON ia.partner_id = p.id AND ia.app_slug = 'diagnostic-ia'
WHERE p.is_active = true
ORDER BY p.slug;
