-- ═══════════════════════════════════════════════════════════════════════════
-- phase_intelligence.sql
-- Couche d'intelligence organisationnelle : entités normalisées,
-- corrélations cross-connecteurs, risques détectés.
-- À exécuter dans Supabase SQL Editor.
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. Entités normalisées (objets métier communs)
CREATE TABLE IF NOT EXISTS public.entities (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  entity_type      TEXT NOT NULL CHECK (entity_type IN ('person','license','asset','contract','project','budget')),
  source_connector TEXT NOT NULL,
  source_id        TEXT NOT NULL DEFAULT '',
  email            TEXT,
  display_name     TEXT,
  department_name  TEXT,
  department_id    UUID REFERENCES public.departments(id),
  data             JSONB NOT NULL DEFAULT '{}',
  cost_monthly     DECIMAL(12,2) DEFAULT 0,
  last_activity_at TIMESTAMPTZ,
  status           TEXT NOT NULL DEFAULT 'active'
                   CHECK (status IN ('active','inactive','orphan','at_risk','unknown')),
  synced_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, source_connector, entity_type, source_id)
);

-- 2. Corrélations d'identité cross-connecteurs
CREATE TABLE IF NOT EXISTS public.entity_correlations (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id       UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  correlation_key       TEXT NOT NULL,
  entity_ids            TEXT[] NOT NULL DEFAULT '{}',
  connectors_present    TEXT[] NOT NULL DEFAULT '{}',
  status                TEXT NOT NULL DEFAULT 'normal'
                        CHECK (status IN ('normal','orphan','ghost','at_risk')),
  risk_level            TEXT NOT NULL DEFAULT 'low'
                        CHECK (risk_level IN ('low','medium','high','critical')),
  risk_reason           TEXT,
  cost_impact_monthly   DECIMAL(12,2) DEFAULT 0,
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, correlation_key)
);

-- 3. Risques détectés
CREATE TABLE IF NOT EXISTS public.risk_findings (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id     UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  department_id       UUID REFERENCES public.departments(id),
  finding_type        TEXT NOT NULL CHECK (finding_type IN (
                        'orphan_account','ghost_license','unused_license',
                        'budget_overspend','contract_expiry','security_gap','duplicate_tool'
                      )),
  severity            TEXT NOT NULL DEFAULT 'medium'
                      CHECK (severity IN ('low','medium','high','critical')),
  title               TEXT NOT NULL,
  description         TEXT,
  entity_ref          JSONB DEFAULT '{}',
  cost_impact_monthly DECIMAL(12,2) DEFAULT 0,
  remediation         TEXT,
  is_acknowledged     BOOLEAN NOT NULL DEFAULT false,
  acknowledged_by     UUID REFERENCES public.users(id),
  acknowledged_at     TIMESTAMPTZ,
  detected_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at         TIMESTAMPTZ,
  UNIQUE (organization_id, finding_type, title)
);

-- 4. Index
CREATE INDEX IF NOT EXISTS idx_entities_org_type
  ON public.entities (organization_id, entity_type);
CREATE INDEX IF NOT EXISTS idx_entities_email
  ON public.entities (organization_id, email) WHERE email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_entities_status
  ON public.entities (organization_id, status);
CREATE INDEX IF NOT EXISTS idx_correlations_org_status
  ON public.entity_correlations (organization_id, status);
CREATE INDEX IF NOT EXISTS idx_risk_findings_org
  ON public.risk_findings (organization_id, severity, is_acknowledged);
CREATE INDEX IF NOT EXISTS idx_risk_findings_dept
  ON public.risk_findings (department_id) WHERE department_id IS NOT NULL;

-- 5. RLS
ALTER TABLE public.entities             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.entity_correlations  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.risk_findings        ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "entities_service_only"            ON public.entities;
DROP POLICY IF EXISTS "entity_correlations_service_only" ON public.entity_correlations;
DROP POLICY IF EXISTS "risk_findings_service_only"       ON public.risk_findings;

CREATE POLICY "entities_service_only"            ON public.entities            USING (false) WITH CHECK (false);
CREATE POLICY "entity_correlations_service_only" ON public.entity_correlations USING (false) WITH CHECK (false);
CREATE POLICY "risk_findings_service_only"       ON public.risk_findings       USING (false) WITH CHECK (false);
