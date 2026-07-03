-- ============================================================
-- Phase 47 — Modules Registry: recommandations + sso-mfa
-- Ajoute les entrées app_registry pour les nouveaux modules.
-- Idempotent via ON CONFLICT DO NOTHING.
-- ============================================================

-- Recommandations IA
INSERT INTO app_registry (slug, name, description, category, layer, version, status, icon, entry_path, sort_order, permissions)
VALUES (
  'recommandations',
  'Recommandations IA',
  'Recommandations priorisées par ATLAS avec score IMAI, plan d''adoption 12 semaines et suivi de l''historique.',
  'evaluation',
  'app',
  '1.0.0',
  'available',
  '⚡',
  '/static/apps/recommandations/main.js',
  25,
  '{"roles": ["user", "manager", "admin", "owner"]}'::jsonb
)
ON CONFLICT (slug) DO UPDATE SET
  name        = EXCLUDED.name,
  description = EXCLUDED.description,
  status      = EXCLUDED.status,
  entry_path  = EXCLUDED.entry_path,
  version     = EXCLUDED.version;

-- SSO & MFA
INSERT INTO app_registry (slug, name, description, category, layer, version, status, icon, entry_path, sort_order, permissions)
VALUES (
  'sso-mfa',
  'SSO & MFA',
  'Gestion centralisée des identités : fournisseurs SSO (Azure AD, Google, Okta, Auth0), MFA, sessions actives et journal des connexions.',
  'governance',
  'app',
  '1.0.0',
  'available',
  '🔐',
  '/static/apps/sso-mfa/main.js',
  85,
  '{"roles": ["admin", "owner"]}'::jsonb
)
ON CONFLICT (slug) DO UPDATE SET
  name        = EXCLUDED.name,
  description = EXCLUDED.description,
  status      = EXCLUDED.status,
  entry_path  = EXCLUDED.entry_path,
  version     = EXCLUDED.version;
