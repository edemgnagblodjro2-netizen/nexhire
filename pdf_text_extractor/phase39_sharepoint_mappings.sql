-- Phase 39 — Mappages manuels sites SharePoint → départements NexHire
-- À exécuter dans Supabase SQL Editor

CREATE TABLE IF NOT EXISTS sharepoint_dept_mappings (
    id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id    UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    site_id   TEXT NOT NULL,
    site_name TEXT NOT NULL,
    dept_id   UUID REFERENCES departments(id) ON DELETE SET NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(org_id, site_id)
);

CREATE INDEX IF NOT EXISTS idx_sp_mappings_org ON sharepoint_dept_mappings(org_id);
