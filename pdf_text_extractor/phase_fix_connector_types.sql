-- ═══════════════════════════════════════════════════════════════════════════
-- phase_fix_connector_types.sql
-- Supprime la contrainte CHECK obsolète sur connector_type.
-- La validation est déjà faite côté Python (VALID_TYPES dans routes_connectors.py).
-- À exécuter dans Supabase SQL Editor.
-- ═══════════════════════════════════════════════════════════════════════════

-- Supprime les deux anciennes contraintes (selon quelle migration a été exécutée)
ALTER TABLE public.connectors DROP CONSTRAINT IF EXISTS connectors_type_check;
ALTER TABLE public.connectors DROP CONSTRAINT IF EXISTS connectors_connector_type_check;

-- Supprime aussi l'éventuelle contrainte inline sans nom connue sous phase13
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT conname FROM pg_constraint
    WHERE conrelid = 'public.connectors'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) LIKE '%connector_type%'
  LOOP
    EXECUTE format('ALTER TABLE public.connectors DROP CONSTRAINT IF EXISTS %I', r.conname);
  END LOOP;
END $$;
