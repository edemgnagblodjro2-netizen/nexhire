-- ═══════════════════════════════════════════════════════════════════════════
-- FIX : Lier les organisations sans partenaire au partenaire 'demo'
-- Usage : Supabase SQL Editor (idempotent)
-- Contexte : dans le modèle B2B2B actuel, toute organisation doit être liée
--            à un partenaire. Ce script corrige les orgs créées sans partenaire.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1. Diagnostic — état actuel ────────────────────────────────────────────
SELECT
  o.slug        AS org_slug,
  o.name        AS org_name,
  o.partner_id  IS NOT NULL AS has_partner,
  p.slug        AS partner_slug,
  ia.is_enabled AS diagnostic_ok
FROM organizations o
LEFT JOIN partners p  ON p.id  = o.partner_id
LEFT JOIN installed_apps ia
       ON ia.partner_id = p.id AND ia.app_slug = 'diagnostic-ia'
ORDER BY o.created_at DESC;

-- ── 2. Lier les orgs sans partenaire au partenaire 'demo' ──────────────────
UPDATE organizations
SET partner_id = (SELECT id FROM partners WHERE slug = 'demo' AND is_active = true LIMIT 1)
WHERE partner_id IS NULL
  AND EXISTS (SELECT 1 FROM partners WHERE slug = 'demo' AND is_active = true);

-- ── 3. Propager partner_id aux users de ces orgs ───────────────────────────
UPDATE users u
SET partner_id = o.partner_id
FROM organizations o
WHERE u.organization_id = o.id
  AND u.partner_id IS NULL
  AND o.partner_id IS NOT NULL;

-- ── 4. Réinstaller diagnostic-ia pour tous les partenaires actifs ──────────
INSERT INTO installed_apps (partner_id, app_slug, is_enabled, config)
SELECT p.id, 'diagnostic-ia', true, '{}'::jsonb
FROM partners p WHERE p.is_active = true
ON CONFLICT (partner_id, app_slug) DO UPDATE SET is_enabled = true;

-- ── 5. Vérification finale ─────────────────────────────────────────────────
SELECT
  o.slug        AS org_slug,
  o.name        AS org_name,
  p.slug        AS partner_slug,
  ia.is_enabled AS diagnostic_ok
FROM organizations o
LEFT JOIN partners p  ON p.id  = o.partner_id
LEFT JOIN installed_apps ia
       ON ia.partner_id = p.id AND ia.app_slug = 'diagnostic-ia'
ORDER BY o.created_at DESC;
