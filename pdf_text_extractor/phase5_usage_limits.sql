-- Phase 5 : Compteurs d'utilisation mensuels par organisation
-- À exécuter dans l'éditeur SQL de Supabase (une seule fois).
-- Idempotent : toutes les instructions utilisent IF NOT EXISTS / OR REPLACE.

-- 1. Table usage_counters ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS usage_counters (
    id               uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id  uuid        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    period           text        NOT NULL, -- format 'YYYY-MM'
    agent_queries    integer     NOT NULL DEFAULT 0,
    created_at       timestamptz DEFAULT now(),
    updated_at       timestamptz DEFAULT now(),
    CONSTRAINT usage_counters_org_period_unique UNIQUE (organization_id, period)
);

ALTER TABLE usage_counters ENABLE ROW LEVEL SECURITY;

-- Seul le service role peut lire/écrire cette table.
DROP POLICY IF EXISTS "service_only" ON usage_counters;
CREATE POLICY "service_only" ON usage_counters FOR ALL USING (false);

-- 2. Fonction atomique : vérifier le quota ET incrémenter ─────────────────────
-- Renvoie un JSONB : { "allowed": bool, "used": int, "limit": int }
-- p_limit = -1 signifie "illimité".
-- L'opération INSERT … ON CONFLICT est atomique dans Postgres (verrou de ligne).
-- Pour des volumes < quelques milliers req/s, c'est suffisant (soft limit).
CREATE OR REPLACE FUNCTION check_and_increment_agent_query(
    p_org_id uuid,
    p_period text,
    p_limit  integer   -- -1 = illimité
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_used integer;
BEGIN
    -- Lecture du compteur actuel (sans incrémenter).
    SELECT agent_queries INTO v_used
    FROM usage_counters
    WHERE organization_id = p_org_id AND period = p_period;

    IF v_used IS NULL THEN
        v_used := 0;
    END IF;

    -- Quota dépassé → retour immédiat sans incrémenter.
    IF p_limit <> -1 AND v_used >= p_limit THEN
        RETURN jsonb_build_object(
            'allowed', false,
            'used',    v_used,
            'limit',   p_limit
        );
    END IF;

    -- Incrémenter (INSERT si première requête du mois, UPDATE sinon).
    INSERT INTO usage_counters (organization_id, period, agent_queries)
    VALUES (p_org_id, p_period, 1)
    ON CONFLICT (organization_id, period) DO UPDATE
        SET agent_queries = usage_counters.agent_queries + 1,
            updated_at    = now()
    RETURNING agent_queries INTO v_used;

    RETURN jsonb_build_object(
        'allowed', true,
        'used',    v_used,
        'limit',   p_limit
    );
END;
$$;

-- 3. Droits d'exécution pour le service role ──────────────────────────────────
GRANT EXECUTE ON FUNCTION check_and_increment_agent_query(uuid, text, integer)
    TO service_role;
