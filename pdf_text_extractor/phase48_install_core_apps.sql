-- ============================================================
-- Phase 48 — Activation des modules core pour tous les partenaires
-- Installe toutes les apps "available" dans installed_apps pour
-- chaque partenaire actif. Idempotent via ON CONFLICT DO NOTHING.
-- ============================================================

-- Sales Intelligence
INSERT INTO installed_apps (partner_id, app_slug)
SELECT p.id, 'sales-intelligence'
FROM partners p
WHERE p.is_active = true
ON CONFLICT DO NOTHING;

-- Marketplace
INSERT INTO installed_apps (partner_id, app_slug)
SELECT p.id, 'marketplace'
FROM partners p
WHERE p.is_active = true
ON CONFLICT DO NOTHING;

-- Parc TI (assets)
INSERT INTO installed_apps (partner_id, app_slug)
SELECT p.id, 'assets'
FROM partners p
WHERE p.is_active = true
ON CONFLICT DO NOTHING;

-- Budget & Finances
INSERT INTO installed_apps (partner_id, app_slug)
SELECT p.id, 'budget'
FROM partners p
WHERE p.is_active = true
ON CONFLICT DO NOTHING;

-- Contrats
INSERT INTO installed_apps (partner_id, app_slug)
SELECT p.id, 'contracts'
FROM partners p
WHERE p.is_active = true
ON CONFLICT DO NOTHING;

-- SSO & MFA
INSERT INTO installed_apps (partner_id, app_slug)
SELECT p.id, 'sso-mfa'
FROM partners p
WHERE p.is_active = true
ON CONFLICT DO NOTHING;

-- Automatisation
INSERT INTO installed_apps (partner_id, app_slug)
SELECT p.id, 'automation'
FROM partners p
WHERE p.is_active = true
ON CONFLICT DO NOTHING;

-- Recommandations IA
INSERT INTO installed_apps (partner_id, app_slug)
SELECT p.id, 'recommandations'
FROM partners p
WHERE p.is_active = true
ON CONFLICT DO NOTHING;
