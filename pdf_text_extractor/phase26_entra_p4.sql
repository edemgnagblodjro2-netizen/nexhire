-- phase26_entra_p4.sql
-- P4 Entra ID : risky users (Identity Protection) + anomalies sign-in

-- 1. Élargit la contrainte CHECK
ALTER TABLE public.risk_findings
  DROP CONSTRAINT IF EXISTS risk_findings_finding_type_check;

ALTER TABLE public.risk_findings
  ADD CONSTRAINT risk_findings_finding_type_check
  CHECK (finding_type IN (
    'orphan_account','ghost_license','unused_license',
    'budget_overspend','contract_expiry','security_gap','duplicate_tool',
    'admin_no_mfa','privileged_inactive','user_no_mfa',
    'group_no_owner','service_account_risk',
    'guest_privileged','missing_ca_policy','ca_policy_report_only',
    'risky_user_detected','signin_anomaly'
  ));

-- 2. Utilisateurs risqués détectés par Microsoft Identity Protection
CREATE TABLE IF NOT EXISTS public.entra_risky_users (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id         TEXT NOT NULL,
  user_principal_name TEXT,
  display_name    TEXT,
  risk_state      TEXT NOT NULL DEFAULT 'atRisk'
                  CHECK (risk_state IN (
                    'none','confirmedSafe','remediated','dismissed',
                    'atRisk','confirmedCompromised','unknownFutureValue'
                  )),
  risk_level      TEXT NOT NULL DEFAULT 'medium'
                  CHECK (risk_level IN (
                    'none','low','medium','high','hidden','unknownFutureValue'
                  )),
  risk_detail     TEXT,
  risk_last_updated TIMESTAMPTZ,
  synced_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_eru_org
  ON public.entra_risky_users (organization_id);

CREATE INDEX IF NOT EXISTS idx_eru_org_level
  ON public.entra_risky_users (organization_id, risk_level)
  WHERE risk_state NOT IN ('dismissed','confirmedSafe','remediated');

-- 3. Anomalies de connexion agrégées (échecs, pics, comptes suspects)
CREATE TABLE IF NOT EXISTS public.entra_signin_anomalies (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id         TEXT,
  user_principal_name TEXT,
  display_name    TEXT,
  anomaly_type    TEXT NOT NULL
                  CHECK (anomaly_type IN ('failed_logins_spike','risky_signin','impossible_travel')),
  failure_count   INT NOT NULL DEFAULT 0,
  period_hours    INT NOT NULL DEFAULT 24,
  detected_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  synced_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, user_id, anomaly_type)
);

CREATE INDEX IF NOT EXISTS idx_esa_org
  ON public.entra_signin_anomalies (organization_id, detected_at DESC);
