-- ═══════════════════════════════════════════════════════════════════════════
-- Phase 15 — Stripe billing + SSO columns
-- À exécuter dans Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. Colonnes Stripe sur la table organizations
ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS stripe_customer_id    TEXT,
  ADD COLUMN IF NOT EXISTS subscription_plan     TEXT DEFAULT 'trial',
  ADD COLUMN IF NOT EXISTS subscription_end      TIMESTAMPTZ;

-- Index pour les lookups par customer_id (webhooks Stripe)
CREATE INDEX IF NOT EXISTS idx_orgs_stripe_customer
  ON organizations (stripe_customer_id)
  WHERE stripe_customer_id IS NOT NULL;

-- 2. Colonne owner_email (pratique pour les webhooks sans join)
ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS owner_email TEXT;

-- Backfill : récupère l'email de l'owner actuel pour les orgs existantes
UPDATE organizations o
SET owner_email = u.email
FROM users u
WHERE u.organization_id = o.id
  AND u.role = 'owner'
  AND o.owner_email IS NULL;

-- 3. Table audit_billing — historique des événements de facturation
CREATE TABLE IF NOT EXISTS audit_billing (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  event_type    TEXT NOT NULL,   -- 'subscription.created', 'subscription.updated', etc.
  stripe_event_id TEXT,
  payload       JSONB,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_billing_org
  ON audit_billing (organization_id, created_at DESC);

-- 4. S'assurer que la colonne subscription_status existe (phase 1 normalement)
ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'trialing';

-- Commentaires utiles
COMMENT ON COLUMN organizations.stripe_customer_id IS 'ID Stripe Customer (cus_xxx)';
COMMENT ON COLUMN organizations.subscription_plan   IS 'trial | monthly | annual';
COMMENT ON COLUMN organizations.subscription_end    IS 'Date de fin de la période de facturation courante';
COMMENT ON COLUMN organizations.owner_email         IS 'Email du owner (dénormalisé pour les webhooks)';
