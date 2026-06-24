-- Phase 36 — Demandes d'approbation de rôle (externe → manager/admin)
-- À exécuter dans Supabase SQL Editor

CREATE TABLE IF NOT EXISTS role_change_requests (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id         UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    requested_by   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    target_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    from_role      TEXT NOT NULL,
    to_role        TEXT NOT NULL,
    status         TEXT NOT NULL DEFAULT 'pending',
    created_at     TIMESTAMPTZ DEFAULT NOW(),
    resolved_at    TIMESTAMPTZ,
    resolved_by    UUID REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT rcr_status_check CHECK (status IN ('pending', 'approved', 'rejected')),
    CONSTRAINT rcr_role_check   CHECK (to_role IN ('user', 'manager', 'admin'))
);

CREATE INDEX IF NOT EXISTS idx_rcr_org_status ON role_change_requests(org_id, status);
CREATE INDEX IF NOT EXISTS idx_rcr_target     ON role_change_requests(target_user_id);

-- Un seul pending par cible
CREATE UNIQUE INDEX IF NOT EXISTS idx_rcr_pending_unique
    ON role_change_requests(target_user_id)
    WHERE status = 'pending';
