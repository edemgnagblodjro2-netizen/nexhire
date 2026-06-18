-- phase24_entra_p1.sql
-- P1 Entra ID : correction contrainte finding_type + table security_group_members

-- 1. Supprime l'ancienne contrainte CHECK (trop restrictive, bloque les findings Entra)
ALTER TABLE public.risk_findings
  DROP CONSTRAINT IF EXISTS risk_findings_finding_type_check;

-- 2. Recrée la contrainte avec tous les types existants + Entra ID
ALTER TABLE public.risk_findings
  ADD CONSTRAINT risk_findings_finding_type_check
  CHECK (finding_type IN (
    'orphan_account','ghost_license','unused_license',
    'budget_overspend','contract_expiry','security_gap','duplicate_tool',
    'admin_no_mfa','privileged_inactive','user_no_mfa',
    'group_no_owner','service_account_risk'
  ));

-- 3. Table membres de groupes de sécurité Entra ID
CREATE TABLE IF NOT EXISTS public.security_group_members (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  group_id        TEXT NOT NULL,
  group_name      TEXT,
  member_id       TEXT NOT NULL,
  member_upn      TEXT,
  member_name     TEXT,
  member_type     TEXT NOT NULL DEFAULT 'user'
                  CHECK (member_type IN ('user','servicePrincipal','group')),
  synced_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, group_id, member_id)
);

CREATE INDEX IF NOT EXISTS idx_sgm_org_group
  ON public.security_group_members (organization_id, group_id);

CREATE INDEX IF NOT EXISTS idx_sgm_org_member
  ON public.security_group_members (organization_id, member_id);
