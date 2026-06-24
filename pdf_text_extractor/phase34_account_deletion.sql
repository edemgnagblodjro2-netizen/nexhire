-- ============================================================
-- Phase 34 — Suppression automatique des comptes expirés
-- À exécuter dans Supabase → SQL Editor
-- ============================================================

-- Colonne qui enregistre la date limite avant suppression.
-- Remplie par le scheduler dès qu'un compte est verrouillé.
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS deletion_scheduled_at timestamptz;

-- Index pour le job quotidien
CREATE INDEX IF NOT EXISTS idx_orgs_deletion_scheduled
  ON public.organizations (deletion_scheduled_at)
  WHERE deletion_scheduled_at IS NOT NULL;

-- Vue utilitaire pour le monitoring (Super Admin)
CREATE OR REPLACE VIEW public.accounts_pending_deletion AS
SELECT
  id,
  name,
  owner_email,
  subscription_status,
  deletion_scheduled_at,
  (deletion_scheduled_at::date - CURRENT_DATE) AS days_remaining
FROM public.organizations
WHERE deletion_scheduled_at IS NOT NULL
  AND subscription_status NOT IN ('active', 'trialing')
ORDER BY deletion_scheduled_at ASC;

GRANT SELECT ON public.accounts_pending_deletion TO service_role;
