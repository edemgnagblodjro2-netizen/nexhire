-- Phase 35 — Centre de connaissances (Knowledge Center)
-- Prérequis : pgvector extension activée dans Supabase

-- 1. Extension pgvector
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Table principale
CREATE TABLE IF NOT EXISTS knowledge_documents (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    title           TEXT NOT NULL,
    source_type     TEXT NOT NULL CHECK (source_type IN ('sharepoint','onedrive','teams','pdf_upload','manual')),
    source_url      TEXT,
    connector_id    UUID REFERENCES connectors(id) ON DELETE SET NULL,
    content_chunk   TEXT NOT NULL,
    chunk_index     INT NOT NULL DEFAULT 0,
    embedding       vector(1536),
    metadata        JSONB DEFAULT '{}',
    file_hash       TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    synced_at       TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Index de recherche vectorielle (HNSW — pas besoin de données préexistantes)
CREATE INDEX IF NOT EXISTS idx_knowledge_embedding_hnsw
    ON knowledge_documents USING hnsw (embedding vector_cosine_ops);

-- 4. Index filtre par organisation
CREATE INDEX IF NOT EXISTS idx_knowledge_org
    ON knowledge_documents(organization_id);

CREATE INDEX IF NOT EXISTS idx_knowledge_source
    ON knowledge_documents(organization_id, source_type);

-- 5. RLS
ALTER TABLE knowledge_documents ENABLE ROW LEVEL SECURITY;

-- Les politiques RLS sont gérées par la logique applicative (organization_id dans WHERE)
-- Le service role utilisé par le backend bypasse RLS
