-- ROLLBACK Phase 41 : App Parcours IA PME
-- Exécuter CE SCRIPT EN PREMIER (phase41 dépend de phase42)
-- Exécuter rollback_phase42.sql ensuite si nécessaire
--
-- ATTENTION : supprime définitivement toutes les sessions, réponses et benchmarks.

DROP VIEW  IF EXISTS diagnostic_partner_stats;
DROP TABLE IF EXISTS diagnostic_benchmarks CASCADE;
DROP TABLE IF EXISTS diagnostic_answers    CASCADE;
DROP TABLE IF EXISTS diagnostic_sessions   CASCADE;
