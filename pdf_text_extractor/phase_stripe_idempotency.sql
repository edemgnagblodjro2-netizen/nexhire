-- ============================================================
-- phase_stripe_idempotency.sql
-- Crée la table d'idempotence Stripe pour les webhooks.
-- À exécuter UNE SEULE FOIS dans Supabase SQL Editor.
--
-- Contexte : le webhook POST /api/billing/webhook utilise
-- cette table pour garantir qu'un même event_id Stripe
-- n'est traité qu'une seule fois (protection contre les
-- livraisons dupliquées de Stripe).
-- ============================================================

CREATE TABLE IF NOT EXISTS stripe_processed_events (
    event_id     TEXT        PRIMARY KEY,
    processed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour le nettoyage des anciens événements (optionnel, job de maintenance)
CREATE INDEX IF NOT EXISTS idx_spe_processed_at
    ON stripe_processed_events (processed_at);

-- Activer RLS (accès uniquement via service_role côté backend)
ALTER TABLE public.stripe_processed_events ENABLE ROW LEVEL SECURITY;

-- Aucune politique authenticated — seul service_role y accède
-- Le backend utilise DATABASE_URL (service_role) qui bypass RLS.

-- Vérification
SELECT tablename, rowsecurity
FROM   pg_tables
WHERE  schemaname = 'public'
  AND  tablename  = 'stripe_processed_events';
