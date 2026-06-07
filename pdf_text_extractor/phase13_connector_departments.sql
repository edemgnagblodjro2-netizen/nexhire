-- Phase 13 : Accès connecteurs par département (many-to-many)
-- Exécuter dans Supabase SQL Editor (une seule fois)

CREATE TABLE IF NOT EXISTS public.connector_departments (
    connector_id  UUID NOT NULL REFERENCES public.connectors(id)   ON DELETE CASCADE,
    department_id UUID NOT NULL REFERENCES public.departments(id)  ON DELETE CASCADE,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (connector_id, department_id)
);

CREATE INDEX IF NOT EXISTS idx_connector_departments_dept
    ON public.connector_departments(department_id);

COMMENT ON TABLE public.connector_departments IS
    'Restriction d''accès connecteur par département. '
    'Si aucune ligne pour un connector_id : accès org-wide. '
    'Sinon : réservé aux membres des départements listés + admins/owners.';
