-- ═══════════════════════════════════════════════════════════════════════════
-- phase_universal_model.sql
-- Modèle de données universel AgentHub
-- À exécuter dans Supabase SQL Editor APRÈS phase_intelligence.sql
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. Hiérarchie organisationnelle (extension de departments)
-- ─────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.org_units (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  parent_id         UUID REFERENCES public.org_units(id),
  unit_type         TEXT NOT NULL DEFAULT 'department'
                    CHECK (unit_type IN ('division','direction','department','team')),
  name              TEXT NOT NULL,
  code              TEXT,
  cost_center_code  TEXT,
  headcount         INT DEFAULT 0,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_org_units_org    ON public.org_units (organization_id);
CREATE INDEX IF NOT EXISTS idx_org_units_parent ON public.org_units (parent_id);

-- 2. Identités maîtres (source de vérité cross-connecteurs)
-- ─────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.identities (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  identity_type     TEXT NOT NULL DEFAULT 'employee'
                    CHECK (identity_type IN
                    ('employee','contractor','vendor','partner','service_account')),
  canonical_email   TEXT NOT NULL,
  full_name         TEXT,
  org_unit_name     TEXT,
  job_title         TEXT,
  hire_date         DATE,
  termination_date  DATE,
  status            TEXT NOT NULL DEFAULT 'active'
                    CHECK (status IN ('active','inactive','terminated','on_leave','pending')),
  source_of_truth   TEXT DEFAULT 'workday',
  cost_monthly      DECIMAL(12,2) DEFAULT 0,
  metadata          JSONB NOT NULL DEFAULT '{}',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, canonical_email)
);
CREATE INDEX IF NOT EXISTS idx_identities_org   ON public.identities (organization_id, status);
CREATE INDEX IF NOT EXISTS idx_identities_email ON public.identities (organization_id, canonical_email);

-- 3. Comptes cross-systèmes (N comptes par identité)
-- ─────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.identity_accounts (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  identity_id      UUID REFERENCES public.identities(id) ON DELETE SET NULL,
  source_connector TEXT NOT NULL,
  external_id      TEXT NOT NULL,
  external_email   TEXT,
  display_name     TEXT,
  status           TEXT NOT NULL DEFAULT 'active'
                   CHECK (status IN ('active','inactive','suspended','orphan','ghost','unknown')),
  last_activity_at TIMESTAMPTZ,
  data             JSONB NOT NULL DEFAULT '{}',
  synced_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, source_connector, external_id)
);
CREATE INDEX IF NOT EXISTS idx_ia_org        ON public.identity_accounts (organization_id, source_connector);
CREATE INDEX IF NOT EXISTS idx_ia_identity   ON public.identity_accounts (identity_id);
CREATE INDEX IF NOT EXISTS idx_ia_status     ON public.identity_accounts (organization_id, status);
CREATE INDEX IF NOT EXISTS idx_ia_email      ON public.identity_accounts (organization_id, external_email)
  WHERE external_email IS NOT NULL;

-- 4. Catalogue applicatif
-- ─────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.applications (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id       UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  connector_type        TEXT,
  name                  TEXT NOT NULL,
  vendor                TEXT,
  category              TEXT,
  monthly_cost_per_unit DECIMAL(10,2) DEFAULT 0,
  is_sanctioned         BOOLEAN DEFAULT true,
  status                TEXT DEFAULT 'active',
  UNIQUE (organization_id, name)
);

-- 5. Pools de licences (contrats achetés)
-- ─────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.license_pools (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  application_id    UUID REFERENCES public.applications(id),
  connector_type    TEXT,
  sku_name          TEXT NOT NULL,
  sku_id            TEXT,
  quantity_total    INT NOT NULL DEFAULT 0,
  quantity_assigned INT NOT NULL DEFAULT 0,
  unit_cost_monthly DECIMAL(10,2) DEFAULT 0,
  renewal_date      DATE,
  data              JSONB NOT NULL DEFAULT '{}',
  synced_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, connector_type, sku_name)
);

-- 6. Attributions de licences (qui a quoi)
-- ─────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.license_assignments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  identity_id     UUID REFERENCES public.identities(id),
  account_id      UUID REFERENCES public.identity_accounts(id),
  pool_id         UUID REFERENCES public.license_pools(id),
  sku_name        TEXT NOT NULL,
  connector_type  TEXT,
  assigned_at     TIMESTAMPTZ DEFAULT now(),
  revoked_at      TIMESTAMPTZ,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  UNIQUE (organization_id, account_id, sku_name)
);
CREATE INDEX IF NOT EXISTS idx_la_identity ON public.license_assignments (identity_id, is_active);
CREATE INDEX IF NOT EXISTS idx_la_pool     ON public.license_assignments (pool_id);

-- 7. Métriques d'utilisation des licences (snapshot périodique)
-- ─────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.license_usage (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id     UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  assignment_id       UUID REFERENCES public.license_assignments(id) ON DELETE CASCADE,
  period_start        DATE NOT NULL,
  period_end          DATE NOT NULL,
  metrics             JSONB NOT NULL DEFAULT '{}',
  activity_score      SMALLINT DEFAULT 0 CHECK (activity_score BETWEEN 0 AND 100),
  tier_needed         TEXT CHECK (tier_needed IN
                      ('none','basic','standard','advanced','enterprise')),
  UNIQUE (assignment_id, period_start)
);
CREATE INDEX IF NOT EXISTS idx_lu_score  ON public.license_usage (activity_score);
CREATE INDEX IF NOT EXISTS idx_lu_period ON public.license_usage (period_start);

-- 8. Posture sécurité par identité
-- ─────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.security_postures (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id      UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  identity_id          UUID NOT NULL REFERENCES public.identities(id) ON DELETE CASCADE,
  mfa_enabled          BOOLEAN DEFAULT false,
  mfa_method           TEXT CHECK (mfa_method IN ('app','sms','hardware_key','email','none')),
  last_password_change TIMESTAMPTZ,
  privileged_access    BOOLEAN DEFAULT false,
  risk_score           SMALLINT DEFAULT 0 CHECK (risk_score BETWEEN 0 AND 100),
  risk_factors         JSONB DEFAULT '[]',
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, identity_id)
);

-- 9. RLS — accès service uniquement (backend Python)
-- ─────────────────────────────────────────────────────────────────────────
ALTER TABLE public.org_units           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.identities          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.identity_accounts   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.applications        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.license_pools       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.license_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.license_usage       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_postures   ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'org_units','identities','identity_accounts','applications',
    'license_pools','license_assignments','license_usage','security_postures'
  ] LOOP
    EXECUTE format(
      'DROP POLICY IF EXISTS "svc_%1$s" ON public.%1$s; '
      'CREATE POLICY "svc_%1$s" ON public.%1$s USING (false) WITH CHECK (false);',
      tbl
    );
  END LOOP;
END $$;
