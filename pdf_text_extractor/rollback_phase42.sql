-- ROLLBACK Phase 42 : AgentHub Platform Core
-- Exécuter rollback_phase41.sql EN PREMIER avant ce script
--
-- ATTENTION : supprime partners, app_registry, installed_apps
--             et retire les colonnes partner_id des tables organizations et users.

-- Vues
DROP VIEW IF EXISTS workspace_catalog;
DROP VIEW IF EXISTS platform_hierarchy;

-- Tables Platform (installed_apps référence partners et app_registry)
DROP TABLE IF EXISTS installed_apps CASCADE;
DROP TABLE IF EXISTS app_registry   CASCADE;
DROP TABLE IF EXISTS partners       CASCADE;

-- Colonnes ajoutées aux tables existantes
ALTER TABLE organizations DROP COLUMN IF EXISTS partner_id;
ALTER TABLE users         DROP COLUMN IF EXISTS partner_id;

-- Fonction trigger (ne supprimer que si elle n'est pas utilisée ailleurs)
-- DROP FUNCTION IF EXISTS set_updated_at();
