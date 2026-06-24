-- ============================================================
-- Phase 33 — Verrouillage automatique essai expiré
-- À exécuter dans Supabase → SQL Editor
-- ============================================================

-- Mise à jour de get_org_status : retourne "trial_expired"
-- si subscription_status = 'trialing' ET trial_ends_at < NOW().
-- auth.py appelle cette fonction à chaque requête — le verrouillage
-- est donc immédiat dès minuit du jour d'expiration.
CREATE OR REPLACE FUNCTION public.get_org_status(p_org_id uuid)
RETURNS text
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT
    CASE
      WHEN subscription_status = 'trialing'
           AND trial_ends_at IS NOT NULL
           AND trial_ends_at < NOW()
      THEN 'trial_expired'
      ELSE subscription_status
    END
  FROM public.organizations
  WHERE id = p_org_id
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_org_status(uuid) TO authenticated, service_role;

-- Ajout de la colonne phone sur organizations (si absente)
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS phone text;

-- Ajout phone sur users/profiles (si absente)
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS phone text;
