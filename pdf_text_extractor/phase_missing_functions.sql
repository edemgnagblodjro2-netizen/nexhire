-- ═══════════════════════════════════════════════════════════════════════════
-- phase_missing_functions.sql
-- Fonctions SQL manquantes — à exécuter UNE SEULE FOIS dans Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1. get_org_status — retourne le subscription_status de l'organisation ──
-- Appelée à chaque requête authentifiée dans auth.py.
-- Sans cette fonction, tous les utilisateurs sont limités à 50 req/mois.
CREATE OR REPLACE FUNCTION public.get_org_status(p_org_id uuid)
RETURNS text
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT subscription_status
  FROM public.organizations
  WHERE id = p_org_id
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_org_status(uuid) TO authenticated, service_role;

-- ── 2. get_user_profile_by_id — profil complet pour l'authentification ──────
-- Appelée à chaque requête authentifiée. DROP requis si la signature change.
DROP FUNCTION IF EXISTS public.get_user_profile_by_id(uuid);

CREATE FUNCTION public.get_user_profile_by_id(p_user_id uuid)
RETURNS TABLE (
  id              uuid,
  email           text,
  full_name       text,
  role            text,
  organization_id uuid,
  is_active       boolean
)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT
    u.id,
    u.email,
    u.full_name,
    u.role,
    u.organization_id,
    COALESCE(u.is_active, true) AS is_active
  FROM public.users u
  WHERE u.id = p_user_id;
$$;

GRANT EXECUTE ON FUNCTION public.get_user_profile_by_id(uuid) TO authenticated, service_role;

-- ── 3. get_org_quota — quota d'utilisation mensuel ───────────────────────────
-- Appelée par GET /api/agent/quota pour afficher les requêtes restantes.
CREATE OR REPLACE FUNCTION public.get_org_quota(p_org_id uuid)
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'used',   COALESCE(uc.agent_queries, 0),
    'limit',  1000,
    'period', TO_CHAR(NOW(), 'YYYY-MM')
  )
  FROM (SELECT 1) dummy
  LEFT JOIN usage_counters uc
    ON uc.organization_id = p_org_id
   AND uc.period = TO_CHAR(NOW(), 'YYYY-MM');
$$;

GRANT EXECUTE ON FUNCTION public.get_org_quota(uuid) TO authenticated, service_role;
