-- ============================================================
-- Fix sécurité Supabase — RLS tables Entra ID
-- À exécuter dans Supabase → SQL Editor
-- ============================================================

-- ── 1. security_group_members ────────────────────────────────
ALTER TABLE public.security_group_members ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "security_group_members_service_only" ON public.security_group_members;
CREATE POLICY "security_group_members_service_only"
  ON public.security_group_members
  USING (false)
  WITH CHECK (false);

-- ── 2. entra_ca_policies ─────────────────────────────────────
ALTER TABLE public.entra_ca_policies ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "entra_ca_policies_service_only" ON public.entra_ca_policies;
CREATE POLICY "entra_ca_policies_service_only"
  ON public.entra_ca_policies
  USING (false)
  WITH CHECK (false);

-- ── 3. entra_risky_users ─────────────────────────────────────
ALTER TABLE public.entra_risky_users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "entra_risky_users_service_only" ON public.entra_risky_users;
CREATE POLICY "entra_risky_users_service_only"
  ON public.entra_risky_users
  USING (false)
  WITH CHECK (false);

-- ── 4. entra_signin_anomalies ────────────────────────────────
ALTER TABLE public.entra_signin_anomalies ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "entra_signin_anomalies_service_only" ON public.entra_signin_anomalies;
CREATE POLICY "entra_signin_anomalies_service_only"
  ON public.entra_signin_anomalies
  USING (false)
  WITH CHECK (false);
