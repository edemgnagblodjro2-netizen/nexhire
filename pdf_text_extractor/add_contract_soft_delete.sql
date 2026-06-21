-- Migration : soft delete sur les contrats
-- À exécuter UNE FOIS dans Supabase SQL Editor

ALTER TABLE public.contracts
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_contracts_deleted_at ON public.contracts(deleted_at);
