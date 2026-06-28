-- Phase 43 — Diagnostic : plafond d'envoi par session + contrainte unique réponses
-- À lancer AVANT le déploiement du code correspondant.

-- 1. Colonnes de suivi pour le cap d'emails par session
ALTER TABLE diagnostic_sessions
  ADD COLUMN IF NOT EXISTS email_send_count    integer     NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_email_sent_at  timestamptz;

-- 2. Dédoublonnage des réponses avant d'ajouter la contrainte unique
--    (supprime les doublons en gardant la rangée avec le plus petit id)
DELETE FROM diagnostic_answers a
USING diagnostic_answers b
WHERE a.id > b.id
  AND a.session_id   = b.session_id
  AND a.question_code = b.question_code;

-- 3. Contrainte unique — permet le vrai upsert (DO UPDATE) dans le code
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'uq_answer_session_question'
  ) THEN
    ALTER TABLE diagnostic_answers
      ADD CONSTRAINT uq_answer_session_question
      UNIQUE (session_id, question_code);
  END IF;
END $$;
