-- Migration : ajout du champ devise par organisation
-- À exécuter UNE FOIS dans Supabase SQL Editor

ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS currency VARCHAR(3) NOT NULL DEFAULT 'CAD';

-- Mettre à jour les comptes existants selon leur région (optionnel)
-- UPDATE public.organizations SET currency = 'CAD' WHERE currency IS NULL;
