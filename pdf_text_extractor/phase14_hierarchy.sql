-- Phase 14 : Hiérarchie organisationnelle (titres + niveaux)
-- Exécuter dans Supabase SQL Editor (une seule fois)

ALTER TABLE public.department_members
  ADD COLUMN IF NOT EXISTS title            TEXT,
  ADD COLUMN IF NOT EXISTS hierarchy_level  INTEGER DEFAULT 6
    CHECK (hierarchy_level BETWEEN 1 AND 6);

COMMENT ON COLUMN public.department_members.title IS
  'Poste du membre dans ce département (ex: Directeur de Département)';
COMMENT ON COLUMN public.department_members.hierarchy_level IS
  '1=Direction Générale, 2=VP/Dir.Exécutif, 3=Dir.Département, 4=Gestionnaire, 5=Superviseur, 6=Employé';
