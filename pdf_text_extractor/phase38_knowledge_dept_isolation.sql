-- Phase 38 — Isolation des documents Knowledge Center par département
-- À exécuter dans Supabase SQL Editor

ALTER TABLE knowledge_documents
  ADD COLUMN IF NOT EXISTS department_id UUID REFERENCES departments(id) ON DELETE SET NULL;

-- Index pour le filtre département à la recherche
CREATE INDEX IF NOT EXISTS idx_knowledge_dept
    ON knowledge_documents(organization_id, department_id);
