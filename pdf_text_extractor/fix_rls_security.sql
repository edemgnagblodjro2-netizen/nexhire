-- ============================================================
-- Fix sécurité Supabase — RLS + vue SECURITY DEFINER
-- À exécuter dans Supabase → SQL Editor
-- ============================================================

-- ── 1. mfa_factors ──────────────────────────────────────────
ALTER TABLE public.mfa_factors ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "mfa_factors_service_only" ON public.mfa_factors;
CREATE POLICY "mfa_factors_service_only"
  ON public.mfa_factors
  USING (false)
  WITH CHECK (false);

-- ── 2. security_alerts ──────────────────────────────────────
ALTER TABLE public.security_alerts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "security_alerts_service_only" ON public.security_alerts;
CREATE POLICY "security_alerts_service_only"
  ON public.security_alerts
  USING (false)
  WITH CHECK (false);

-- ── 3. data_deletion_requests ───────────────────────────────
ALTER TABLE public.data_deletion_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "data_deletion_requests_service_only" ON public.data_deletion_requests;
CREATE POLICY "data_deletion_requests_service_only"
  ON public.data_deletion_requests
  USING (false)
  WITH CHECK (false);

-- ── 4. consent_records ──────────────────────────────────────
ALTER TABLE public.consent_records ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "consent_records_service_only" ON public.consent_records;
CREATE POLICY "consent_records_service_only"
  ON public.consent_records
  USING (false)
  WITH CHECK (false);

-- ── 5. Vue SECURITY DEFINER → SECURITY INVOKER ──────────────
-- Recréer la vue sans SECURITY DEFINER (INVOKER par défaut)
DROP VIEW IF EXISTS public.external_contractors_view;
CREATE VIEW public.external_contractors_view
  WITH (security_invoker = true)
AS
SELECT
  c.*,
  CASE
    WHEN c.contract_end < CURRENT_DATE THEN 'expired'
    WHEN c.contract_end <= CURRENT_DATE + INTERVAL '30 days' THEN 'expiring_soon'
    ELSE 'active'
  END AS computed_status,
  (c.contract_end - CURRENT_DATE) AS days_remaining,
  ARRAY(
    SELECT d.name
    FROM external_contractor_departments ecd
    JOIN departments d ON d.id = ecd.department_id
    WHERE ecd.contractor_id = c.id
  ) AS department_names,
  ARRAY(
    SELECT ecd.department_id::text
    FROM external_contractor_departments ecd
    WHERE ecd.contractor_id = c.id
  ) AS department_ids
FROM external_contractors c;
