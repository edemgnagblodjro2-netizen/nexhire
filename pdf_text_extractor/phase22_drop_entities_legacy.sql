-- ═══════════════════════════════════════════════════════════════════════════
-- phase22_drop_entities_legacy.sql
-- Suppression des tables legacy entities + entity_correlations
-- Ces tables n'ont jamais été utilisées dans le code (0 requête Python).
-- Le modèle actif est : identities → identity_accounts → license_assignments
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. Supprimer les politiques RLS si elles existent
DROP POLICY IF EXISTS "entities_service_only"            ON public.entities;
DROP POLICY IF EXISTS "entity_correlations_service_only" ON public.entity_correlations;

-- 2. Supprimer la table de corrélation en premier (dépend de entities)
DROP TABLE IF EXISTS public.entity_correlations CASCADE;

-- 3. Supprimer la table principale legacy
DROP TABLE IF EXISTS public.entities CASCADE;
