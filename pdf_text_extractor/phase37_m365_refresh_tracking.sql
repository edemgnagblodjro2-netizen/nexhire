-- Phase 37 — Suivi de l'expiration du refresh token M365 (compte de service)
-- À exécuter dans Supabase SQL Editor

ALTER TABLE connectors
  ADD COLUMN IF NOT EXISTS refresh_token_issued_at TIMESTAMPTZ;
