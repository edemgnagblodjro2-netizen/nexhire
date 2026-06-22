-- Migration phase29 : étend les finding_type autorisés dans risk_findings
-- Ajout : license_surplus (stock en excédent) et license_overassigned (incohérence saisie)

ALTER TABLE public.risk_findings
  DROP CONSTRAINT IF EXISTS risk_findings_finding_type_check;

ALTER TABLE public.risk_findings
  ADD CONSTRAINT risk_findings_finding_type_check
  CHECK (finding_type IN (
    'orphan_account', 'ghost_license', 'unused_license',
    'budget_overspend', 'contract_expiry', 'security_gap', 'duplicate_tool',
    'license_surplus', 'license_overassigned'
  ));
