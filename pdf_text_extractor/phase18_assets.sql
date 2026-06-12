-- ═══════════════════════════════════════════════════════════════════════════
-- phase18_assets.sql
-- Table assets — inventaire des appareils Intune (et futurs connecteurs)
-- À exécuter dans Supabase SQL Editor APRÈS phase_universal_model.sql
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. Table principale des assets
-- ─────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.assets (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  source_connector  TEXT NOT NULL DEFAULT 'intune',
  external_id       TEXT NOT NULL,

  -- Identification appareil
  display_name      TEXT,
  device_type       TEXT,          -- desktop, mobile, tablet, cloudPC, etc.
  os                TEXT,          -- Windows, iOS, Android, macOS, Linux
  os_version        TEXT,
  serial_number     TEXT,
  model             TEXT,
  manufacturer      TEXT,

  -- Conformité & sécurité
  compliance_state  TEXT NOT NULL DEFAULT 'unknown'
                    CHECK (compliance_state IN
                      ('compliant','noncompliant','unknown','notApplicable','inGracePeriod')),
  is_encrypted      BOOLEAN,
  is_supervised     BOOLEAN,
  management_state  TEXT,          -- managed, unmanaged, etc.

  -- Propriétaire
  owner_upn         TEXT,          -- userPrincipalName dans Intune
  owner_identity_id UUID REFERENCES public.identities(id) ON DELETE SET NULL,

  -- Dates
  enrolled_at       TIMESTAMPTZ,
  last_sync_at      TIMESTAMPTZ,
  synced_at         TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Données brutes Graph
  raw_data          JSONB NOT NULL DEFAULT '{}',

  UNIQUE (organization_id, source_connector, external_id)
);

CREATE INDEX IF NOT EXISTS idx_assets_org         ON public.assets (organization_id);
CREATE INDEX IF NOT EXISTS idx_assets_compliance  ON public.assets (organization_id, compliance_state);
CREATE INDEX IF NOT EXISTS idx_assets_owner       ON public.assets (owner_identity_id);
CREATE INDEX IF NOT EXISTS idx_assets_last_sync   ON public.assets (organization_id, last_sync_at);

-- 2. RLS — même pattern que les autres tables
-- ─────────────────────────────────────────────────────────────────────────
ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "assets_org_isolation" ON public.assets
  USING (
    organization_id IN (
      SELECT organization_id FROM public.members
      WHERE user_id = auth.uid()
    )
  );
