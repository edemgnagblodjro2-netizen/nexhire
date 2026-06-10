-- ============================================================
-- NexHire — Sécurité N1-N5
-- MFA, alertes, suppressions PIPEDA/Loi25
-- À exécuter sur Supabase SQL Editor
-- ============================================================

-- ── Table MFA TOTP ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS mfa_factors (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id          UUID NOT NULL,
    organization_id  UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    factor_type      TEXT NOT NULL DEFAULT 'totp',
    encrypted_secret TEXT NOT NULL,
    is_verified      BOOLEAN DEFAULT FALSE,
    friendly_name    TEXT DEFAULT 'Authenticator',
    created_at       TIMESTAMPTZ DEFAULT NOW(),
    last_used_at     TIMESTAMPTZ,
    UNIQUE (user_id, factor_type)
);
CREATE INDEX IF NOT EXISTS idx_mfa_user ON mfa_factors(user_id);

-- ── Table alertes sécurité ──────────────────────────────────
CREATE TABLE IF NOT EXISTS security_alerts (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id  UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id          UUID,
    alert_type       TEXT NOT NULL,
    severity         TEXT NOT NULL DEFAULT 'high',
    details          JSONB,
    ip_address       TEXT,
    is_acknowledged  BOOLEAN DEFAULT FALSE,
    acknowledged_by  UUID,
    acknowledged_at  TIMESTAMPTZ,
    created_at       TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_sec_alerts_org  ON security_alerts(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sec_alerts_unack ON security_alerts(organization_id) WHERE NOT is_acknowledged;

-- ── Table demandes suppression données (Loi 25 / PIPEDA) ───
CREATE TABLE IF NOT EXISTS data_deletion_requests (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id          UUID NOT NULL,
    organization_id  UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    requested_at     TIMESTAMPTZ DEFAULT NOW(),
    reason           TEXT,
    status           TEXT DEFAULT 'pending',
    processed_at     TIMESTAMPTZ,
    processed_by     UUID,
    notes            TEXT,
    CONSTRAINT status_check CHECK (status IN ('pending','processing','completed','rejected'))
);
CREATE INDEX IF NOT EXISTS idx_del_req_org ON data_deletion_requests(organization_id, requested_at DESC);

-- ── Colonne require_mfa sur organizations ──────────────────
ALTER TABLE organizations
    ADD COLUMN IF NOT EXISTS require_mfa BOOLEAN DEFAULT FALSE;

-- ── Journal des consentements (Loi 25) ─────────────────────
CREATE TABLE IF NOT EXISTS consent_records (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id          UUID NOT NULL,
    organization_id  UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    consent_type     TEXT NOT NULL,
    granted          BOOLEAN NOT NULL,
    ip_address       TEXT,
    user_agent       TEXT,
    recorded_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_consent_user ON consent_records(user_id, recorded_at DESC);
