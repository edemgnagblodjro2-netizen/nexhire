-- ═══════════════════════════════════════════════════════════════════════════
-- phase20_connector_expiry.sql
-- Colonne token_expires_at sur connectors — alertes expiry OAuth
-- À exécuter dans Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. Colonne token_expires_at (nullable — uniquement pour les connecteurs OAuth)
ALTER TABLE public.connectors
  ADD COLUMN IF NOT EXISTS token_expires_at TIMESTAMPTZ;

-- 2. Index pour les requêtes d'alerte (expiry dans 7 jours)
CREATE INDEX IF NOT EXISTS idx_connectors_token_expires
  ON public.connectors (organization_id, token_expires_at)
  WHERE token_expires_at IS NOT NULL;
