-- ============================================================
-- fix_security_advisor.sql
-- Corrige les 6 erreurs du Security Advisor Supabase :
--   4 × Security Definer View  → security_invoker = true
--   2 × RLS Disabled in Public → ENABLE + policies
--
-- À coller et exécuter en une seule fois dans :
--   Supabase → SQL Editor → New Query
-- ============================================================


-- ════════════════════════════════════════════════════════════
-- PARTIE 1 — ACTIVER RLS SUR LES 2 TABLES NON PROTÉGÉES
-- ════════════════════════════════════════════════════════════

-- ── role_change_requests  (colonne org) ───────────────────
ALTER TABLE public.role_change_requests ENABLE ROW LEVEL SECURITY;

-- Supprimer les anciennes politiques si elles existent déjà
DROP POLICY IF EXISTS "rcr_select"  ON public.role_change_requests;
DROP POLICY IF EXISTS "rcr_insert"  ON public.role_change_requests;

-- Lecture : membres de la même organisation (via org_id)
CREATE POLICY "rcr_select" ON public.role_change_requests
  FOR SELECT TO authenticated
  USING (
    org_id = (
      SELECT organization_id
      FROM   public.users
      WHERE  id = auth.uid()
      LIMIT  1
    )
  );

-- Création : uniquement par un membre de l'org (la résolution se fait côté backend)
CREATE POLICY "rcr_insert" ON public.role_change_requests
  FOR INSERT TO authenticated
  WITH CHECK (
    requested_by = auth.uid()
    AND org_id = (
      SELECT organization_id
      FROM   public.users
      WHERE  id = auth.uid()
      LIMIT  1
    )
  );

-- Les UPDATE / DELETE restent côté backend (service_role) — pas de politique anon/authenticated


-- ── sharepoint_dept_mappings  (colonne org_id) ────────────
ALTER TABLE public.sharepoint_dept_mappings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sp_maps_select" ON public.sharepoint_dept_mappings;
DROP POLICY IF EXISTS "sp_maps_write"  ON public.sharepoint_dept_mappings;

-- Lecture : membres de la même organisation
CREATE POLICY "sp_maps_select" ON public.sharepoint_dept_mappings
  FOR SELECT TO authenticated
  USING (
    org_id = (
      SELECT organization_id
      FROM   public.users
      WHERE  id = auth.uid()
      LIMIT  1
    )
  );

-- Écriture : admin/owner de l'organisation
CREATE POLICY "sp_maps_write" ON public.sharepoint_dept_mappings
  FOR ALL TO authenticated
  USING (
    org_id = (
      SELECT organization_id
      FROM   public.users
      WHERE  id = auth.uid() AND role IN ('owner', 'admin')
      LIMIT  1
    )
  )
  WITH CHECK (
    org_id = (
      SELECT organization_id
      FROM   public.users
      WHERE  id = auth.uid() AND role IN ('owner', 'admin')
      LIMIT  1
    )
  );


-- ════════════════════════════════════════════════════════════
-- PARTIE 2 — CONVERTIR LES 4 VUES EN SECURITY INVOKER
-- ════════════════════════════════════════════════════════════
-- Cela force la vue à appliquer le RLS du DEMANDEUR (caller)
-- au lieu des droits du CRÉATEUR (service_role).
-- Le backend utilise DATABASE_URL (service_role) → aucun changement
-- de comportement côté FastAPI. Seule la surface PostgREST est protégée.

ALTER VIEW public.accounts_pending_deletion    SET (security_invoker = true);
ALTER VIEW public.workspace_catalog            SET (security_invoker = true);
ALTER VIEW public.platform_hierarchy           SET (security_invoker = true);
ALTER VIEW public.diagnostic_partner_stats     SET (security_invoker = true);


-- ════════════════════════════════════════════════════════════
-- VÉRIFICATION  (coller après les corrections pour confirmer)
-- ════════════════════════════════════════════════════════════

-- Doit retourner 't' pour les 2 tables :
SELECT tablename, rowsecurity
FROM   pg_tables
WHERE  schemaname = 'public'
  AND  tablename IN ('role_change_requests', 'sharepoint_dept_mappings');

-- Doit retourner 'security_invoker' pour les 4 vues :
SELECT viewname,
       CASE WHEN definition ILIKE '%security_invoker%' THEN 'security_invoker (def)' ELSE 'check options' END
FROM   pg_views
WHERE  schemaname = 'public'
  AND  viewname IN (
    'accounts_pending_deletion',
    'workspace_catalog',
    'platform_hierarchy',
    'diagnostic_partner_stats'
  );

-- Vérification directe via pg_class (plus fiable)
SELECT relname, reloptions
FROM   pg_class
WHERE  relkind = 'v'
  AND  relnamespace = 'public'::regnamespace
  AND  relname IN (
    'accounts_pending_deletion',
    'workspace_catalog',
    'platform_hierarchy',
    'diagnostic_partner_stats'
  );
