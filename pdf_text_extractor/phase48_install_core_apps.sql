-- ============================================================
-- Phase 48 — Enregistrement + activation des modules core
-- Étape 1 : insère les entrées manquantes dans app_registry
-- Étape 2 : installe ces apps pour tous les partenaires actifs
-- Idempotent — ON CONFLICT DO NOTHING / DO UPDATE
-- ============================================================

-- ── Étape 1 : app_registry ───────────────────────────────────

INSERT INTO app_registry
  (slug, name, description, icon, category, layer, version, status,
   permissions, entry_path, sort_order)
VALUES
  (
    'sales-intelligence',
    'Sales Intelligence',
    'Pipeline commercial, prospection IA et analyse des opportunités de vente.',
    '🎯', 'analytics', 'app', '1.0.0', 'available',
    '{"min_role": "user", "min_plan": "starter"}',
    '/static/apps/sales-intelligence/main.js',
    15
  ),
  (
    'marketplace',
    'Workspace Marketplace',
    'Catalogue d''agents IA, connecteurs, templates et extensions pour votre workspace.',
    '🏪', 'platform', 'app', '1.0.0', 'available',
    '{"min_role": "user", "min_plan": "starter"}',
    '/static/apps/marketplace/main.js',
    88
  ),
  (
    'assets',
    'Parc TI',
    'Inventaire complet des actifs informatiques : ordinateurs, serveurs, réseau et licences.',
    '💻', 'productivity', 'app', '1.0.0', 'available',
    '{"min_role": "user", "min_plan": "starter"}',
    '/static/apps/assets/main.js',
    35
  ),
  (
    'budget',
    'Budget & Finances',
    'Pilotage budgétaire par catégorie et département avec suivi alloué vs réel.',
    '💰', 'finance', 'app', '1.0.0', 'available',
    '{"min_role": "manager", "min_plan": "starter"}',
    '/static/apps/budget/main.js',
    45
  ),
  (
    'contracts',
    'Contrats',
    'Gestion centralisée des contrats fournisseurs, échéances et alertes de renouvellement.',
    '📄', 'compliance', 'app', '1.0.0', 'available',
    '{"min_role": "user", "min_plan": "starter"}',
    '/static/apps/contracts/main.js',
    55
  ),
  (
    'automation',
    'Automatisation',
    'Workflows intelligents, déclencheurs et bibliothèque de templates pour automatiser vos processus.',
    '⚡', 'productivity', 'app', '1.0.0', 'available',
    '{"min_role": "user", "min_plan": "starter"}',
    '/static/apps/automation/main.js',
    75
  )
ON CONFLICT (slug) DO UPDATE SET
  name       = EXCLUDED.name,
  status     = EXCLUDED.status,
  entry_path = EXCLUDED.entry_path,
  version    = EXCLUDED.version;


-- ── Étape 2 : installed_apps pour tous les partenaires actifs ─

INSERT INTO installed_apps (partner_id, app_slug)
SELECT p.id, a.slug
FROM partners p
CROSS JOIN (
  VALUES
    ('sales-intelligence'),
    ('marketplace'),
    ('assets'),
    ('budget'),
    ('contracts'),
    ('automation'),
    ('sso-mfa'),
    ('recommandations')
) AS a(slug)
WHERE p.is_active = true
ON CONFLICT DO NOTHING;
