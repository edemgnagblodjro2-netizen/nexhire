-- phase25_entra_p3.sql
-- P3 Entra ID : guests privilégiés + Conditional Access Policies

-- 1. Élargit la contrainte CHECK avec les nouveaux types de findings
ALTER TABLE public.risk_findings
  DROP CONSTRAINT IF EXISTS risk_findings_finding_type_check;

ALTER TABLE public.risk_findings
  ADD CONSTRAINT risk_findings_finding_type_check
  CHECK (finding_type IN (
    'orphan_account','ghost_license','unused_license',
    'budget_overspend','contract_expiry','security_gap','duplicate_tool',
    'admin_no_mfa','privileged_inactive','user_no_mfa',
    'group_no_owner','service_account_risk',
    'guest_privileged','missing_ca_policy','ca_policy_report_only'
  ));

-- 2. Table Conditional Access Policies Entra ID
CREATE TABLE IF NOT EXISTS public.entra_ca_policies (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  policy_id       TEXT NOT NULL,
  display_name    TEXT,
  state           TEXT NOT NULL DEFAULT 'enabled'
                  CHECK (state IN ('enabled','disabled','enabledForReportingButNotEnforced')),
  targets_all_users BOOLEAN NOT NULL DEFAULT false,
  requires_mfa    BOOLEAN NOT NULL DEFAULT false,
  conditions      JSONB,
  grant_controls  JSONB,
  synced_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, policy_id)
);

CREATE INDEX IF NOT EXISTS idx_cap_org
  ON public.entra_ca_policies (organization_id);

CREATE INDEX IF NOT EXISTS idx_cap_org_state
  ON public.entra_ca_policies (organization_id, state);
