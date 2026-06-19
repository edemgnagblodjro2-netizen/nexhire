-- Migration : ajout du département aux documents
-- À exécuter UNE FOIS dans Supabase SQL Editor

ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_documents_department_id ON public.documents(department_id);
