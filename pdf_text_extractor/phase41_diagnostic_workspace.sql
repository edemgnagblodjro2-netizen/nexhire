-- Phase 41 : AgentHub Platform — App: Parcours IA PME
-- Tables applicatives du module Diagnostic · Agent Atlas · IMAI /100
--
-- DÉPENDANCE     : phase42_platform_core.sql doit être exécuté en premier (table partners)
-- IDEMPOTENCE    : toutes les instructions sont rejouables sans effet de bord
-- ROLLBACK       : voir rollback_phase41.sql

-- ═══════════════════════════════════════════════════════════════════════════
-- APP : SESSIONS DE DIAGNOSTIC
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS diagnostic_sessions (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id          uuid        NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
  -- Profil entreprise collecté par Atlas en introduction
  company_name        text        NOT NULL,
  sector              text        NOT NULL,
  size_range          text        NOT NULL
    CHECK (size_range IN ('1-9','10-49','50-199','200+')),
  priority_challenge  text,
  company_email       text,
  -- Scores IMAI (/100, pondérés par dimension)
  imai_score          numeric(5,2),
  score_strategie     numeric(5,2),
  score_personnes     numeric(5,2),
  score_processus     numeric(5,2),
  score_technologies  numeric(5,2),
  score_gouvernance   numeric(5,2),
  niveau              text
    CHECK (niveau IN ('debutant','intermediaire','avance')),
  -- État
  status              text        NOT NULL DEFAULT 'in_progress'
    CHECK (status IN ('in_progress','completed','abandoned')),
  rapport_url         text,
  created_at          timestamptz NOT NULL DEFAULT now(),
  completed_at        timestamptz
);

COMMENT ON TABLE  diagnostic_sessions                  IS 'Sessions de diagnostic IMAI par entreprise. Une session = un parcours Atlas complet ou en cours.';
COMMENT ON COLUMN diagnostic_sessions.partner_id       IS 'Partenaire Platform qui a déployé ce diagnostic (ex: cci3r).';
COMMENT ON COLUMN diagnostic_sessions.company_email    IS 'Email collecté volontairement en fin de parcours — optionnel, pas obligatoire.';
COMMENT ON COLUMN diagnostic_sessions.imai_score       IS 'Score global IMAI /100 (pondéré). NULL tant que le parcours n''est pas complété.';
COMMENT ON COLUMN diagnostic_sessions.niveau           IS 'Niveau de maturité IA : debutant (0-33), intermediaire (34-66), avance (67-100).';
COMMENT ON COLUMN diagnostic_sessions.rapport_url      IS 'URL du rapport PDF généré par WeasyPrint après completion.';

-- Requêtes fréquentes : liste par partenaire, filtres par statut/secteur
CREATE INDEX IF NOT EXISTS diag_sessions_partner_idx
  ON diagnostic_sessions (partner_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS diag_sessions_sector_idx
  ON diagnostic_sessions (partner_id, sector, niveau);
-- Lookup admin par email (export, CRM)
CREATE INDEX IF NOT EXISTS diag_sessions_email_idx
  ON diagnostic_sessions (company_email)
  WHERE company_email IS NOT NULL;
-- Filtrage par statut seul (stats dashboard)
CREATE INDEX IF NOT EXISTS diag_sessions_status_idx
  ON diagnostic_sessions (status, partner_id);


-- ═══════════════════════════════════════════════════════════════════════════
-- APP : RÉPONSES INDIVIDUELLES
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS diagnostic_answers (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id      uuid        NOT NULL REFERENCES diagnostic_sessions(id) ON DELETE CASCADE,
  question_code   text        NOT NULL,
  dimension       text        NOT NULL
    CHECK (dimension IN ('strategie','personnes','processus','technologies','gouvernance')),
  answer          text        NOT NULL
    CHECK (answer IN ('oui','partiellement','non')),
  score           smallint    NOT NULL CHECK (score IN (0,1,2)),
  is_conditional  boolean     NOT NULL DEFAULT false,
  answered_at     timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE  diagnostic_answers                IS 'Réponses individuelles par question du parcours IMAI.';
COMMENT ON COLUMN diagnostic_answers.question_code  IS 'Code de la question — référence au catalogue de questions dans la logique applicative (non en DB).';
COMMENT ON COLUMN diagnostic_answers.score          IS 'Score brut : 0=non, 1=partiellement, 2=oui. Pondéré par dimension pour calculer imai_score.';
COMMENT ON COLUMN diagnostic_answers.is_conditional IS 'true si la question est une branche conditionnelle (posée uniquement selon une réponse précédente).';

CREATE INDEX IF NOT EXISTS diag_answers_session_idx
  ON diagnostic_answers (session_id);
CREATE INDEX IF NOT EXISTS diag_answers_dimension_idx
  ON diagnostic_answers (session_id, dimension);


-- ═══════════════════════════════════════════════════════════════════════════
-- APP : BENCHMARKS AGRÉGÉS
-- Recalculés quotidiennement — jamais de données individuelles.
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS diagnostic_benchmarks (
  id                    uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id            uuid        NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
  period_start          date        NOT NULL,
  sector                text,
  size_range            text,
  sample_size           integer     NOT NULL,
  imai_avg              numeric(5,2),
  imai_p25              numeric(5,2),
  imai_p75              numeric(5,2),
  dim_strategie_avg     numeric(5,2),
  dim_personnes_avg     numeric(5,2),
  dim_processus_avg     numeric(5,2),
  dim_technologies_avg  numeric(5,2),
  dim_gouvernance_avg   numeric(5,2),
  is_demo               boolean     NOT NULL DEFAULT false,
  computed_at           timestamptz NOT NULL DEFAULT now(),
  UNIQUE (partner_id, period_start, sector, size_range)
);

COMMENT ON TABLE  diagnostic_benchmarks            IS 'Agrégats anonymisés recalculés quotidiennement. Sample_size >= 5 requis avant affichage réel (sinon afficher données démo uniquement).';
COMMENT ON COLUMN diagnostic_benchmarks.is_demo    IS 'true = données de démonstration pré-chargées, visibles avec badge "DÉMO" dans le dashboard.';
COMMENT ON COLUMN diagnostic_benchmarks.period_start IS 'Premier jour du trimestre de référence (ex: 2026-04-01).';
COMMENT ON COLUMN diagnostic_benchmarks.sector     IS 'NULL = tous secteurs confondus. Sinon : secteur spécifique (ex: Manufacturier).';

CREATE INDEX IF NOT EXISTS diag_benchmarks_lookup_idx
  ON diagnostic_benchmarks (partner_id, period_start DESC, sector, size_range);


-- ═══════════════════════════════════════════════════════════════════════════
-- DONNÉES DE DÉMONSTRATION — CCI3R
-- ═══════════════════════════════════════════════════════════════════════════

INSERT INTO diagnostic_benchmarks (
  partner_id, period_start, sector, size_range,
  sample_size, imai_avg, imai_p25, imai_p75,
  dim_strategie_avg, dim_personnes_avg, dim_processus_avg,
  dim_technologies_avg, dim_gouvernance_avg, is_demo
)
SELECT p.id, '2026-04-01', NULL, NULL,
  42, 38.4, 24.0, 52.0,
  42.1, 33.8, 39.5, 49.2, 22.6, true
FROM partners p WHERE p.slug = 'cci3r'
ON CONFLICT DO NOTHING;

INSERT INTO diagnostic_benchmarks (
  partner_id, period_start, sector, size_range,
  sample_size, imai_avg, imai_p25, imai_p75,
  dim_strategie_avg, dim_personnes_avg, dim_processus_avg,
  dim_technologies_avg, dim_gouvernance_avg, is_demo
)
SELECT p.id, '2026-04-01', 'Manufacturier', NULL,
  18, 41.2, 26.0, 55.0,
  44.5, 35.2, 43.8, 51.0, 24.1, true
FROM partners p WHERE p.slug = 'cci3r'
ON CONFLICT DO NOTHING;


-- ═══════════════════════════════════════════════════════════════════════════
-- VUE : STATS AGRÉGÉES PAR PARTENAIRE
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE VIEW diagnostic_partner_stats AS
SELECT
  s.partner_id,
  COUNT(*)                                       AS total_sessions,
  COUNT(*) FILTER (WHERE s.status = 'completed') AS completed_sessions,
  ROUND(AVG(s.imai_score) FILTER (WHERE s.status = 'completed'), 1) AS imai_avg,
  COUNT(*) FILTER (WHERE s.niveau = 'debutant')      AS nb_debutant,
  COUNT(*) FILTER (WHERE s.niveau = 'intermediaire') AS nb_intermediaire,
  COUNT(*) FILTER (WHERE s.niveau = 'avance')        AS nb_avance,
  ROUND(AVG(s.score_gouvernance)  FILTER (WHERE s.status = 'completed'), 1) AS gov_avg,
  ROUND(AVG(s.score_strategie)    FILTER (WHERE s.status = 'completed'), 1) AS str_avg,
  ROUND(AVG(s.score_processus)    FILTER (WHERE s.status = 'completed'), 1) AS proc_avg,
  ROUND(AVG(s.score_technologies) FILTER (WHERE s.status = 'completed'), 1) AS tech_avg,
  ROUND(AVG(s.score_personnes)    FILTER (WHERE s.status = 'completed'), 1) AS pers_avg
FROM diagnostic_sessions s
GROUP BY s.partner_id;


-- ═══════════════════════════════════════════════════════════════════════════
-- RLS — ROW LEVEL SECURITY
--
-- Le backend bypasse RLS via service role (psycopg2 + DATABASE_URL).
-- Ces politiques protègent l'accès direct via Supabase Studio / PostgREST.
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE diagnostic_sessions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE diagnostic_answers   ENABLE ROW LEVEL SECURITY;
ALTER TABLE diagnostic_benchmarks ENABLE ROW LEVEL SECURITY;

-- workspace_admin lit les sessions de son partenaire
DROP POLICY IF EXISTS "diag_sessions_read_partner"  ON diagnostic_sessions;
CREATE POLICY "diag_sessions_read_partner" ON diagnostic_sessions
  FOR SELECT TO authenticated
  USING (
    partner_id IN (
      SELECT partner_id FROM users
      WHERE id::text = auth.uid()::text AND partner_id IS NOT NULL
    )
  );

-- Les réponses suivent les droits de la session parente
DROP POLICY IF EXISTS "diag_answers_read_partner" ON diagnostic_answers;
CREATE POLICY "diag_answers_read_partner" ON diagnostic_answers
  FOR SELECT TO authenticated
  USING (
    session_id IN (
      SELECT ds.id FROM diagnostic_sessions ds
      JOIN users u ON u.partner_id = ds.partner_id
      WHERE u.id::text = auth.uid()::text AND u.partner_id IS NOT NULL
    )
  );

-- Benchmarks : lecture publique pour tout utilisateur authentifié (données agrégées anonymes)
DROP POLICY IF EXISTS "diag_benchmarks_read" ON diagnostic_benchmarks;
CREATE POLICY "diag_benchmarks_read" ON diagnostic_benchmarks
  FOR SELECT TO authenticated USING (true);

-- Accès complet service role
DROP POLICY IF EXISTS "diag_sessions_service_all"   ON diagnostic_sessions;
DROP POLICY IF EXISTS "diag_answers_service_all"    ON diagnostic_answers;
DROP POLICY IF EXISTS "diag_benchmarks_service_all" ON diagnostic_benchmarks;

CREATE POLICY "diag_sessions_service_all"   ON diagnostic_sessions   FOR ALL TO service_role USING (true);
CREATE POLICY "diag_answers_service_all"    ON diagnostic_answers     FOR ALL TO service_role USING (true);
CREATE POLICY "diag_benchmarks_service_all" ON diagnostic_benchmarks  FOR ALL TO service_role USING (true);
