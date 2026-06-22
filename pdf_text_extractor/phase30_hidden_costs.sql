-- Migration phase30 : détection des coûts cachés contractuels
-- 1. Fenêtre de résiliation auto-renouvellement
-- 2. Engagement minimum contractuel
-- 3. Extension finding_type pour les 3 nouvelles règles

-- ── Contrats : nouveaux champs ──────────────────────────────────────────────
ALTER TABLE public.contracts
  ADD COLUMN IF NOT EXISTS cancellation_notice_days INT NOT NULL DEFAULT 60,
  ADD COLUMN IF NOT EXISTS min_commitment_qty       INT DEFAULT NULL CHECK (min_commitment_qty IS NULL OR min_commitment_qty >= 0),
  ADD COLUMN IF NOT EXISTS actual_seats_used        INT DEFAULT NULL CHECK (actual_seats_used IS NULL OR actual_seats_used >= 0);

COMMENT ON COLUMN public.contracts.cancellation_notice_days IS
  'Délai en jours avant le renouvellement pour envoyer un avis de résiliation (défaut 60j).';
COMMENT ON COLUMN public.contracts.min_commitment_qty IS
  'Nombre minimum d''unités/sièges engagés contractuellement (plancher de volume).';
COMMENT ON COLUMN public.contracts.actual_seats_used IS
  'Nombre réel de sièges/unités utilisés actuellement — à renseigner manuellement.';

-- ── Étend le CHECK finding_type ─────────────────────────────────────────────
ALTER TABLE public.risk_findings
  DROP CONSTRAINT IF EXISTS risk_findings_finding_type_check;

ALTER TABLE public.risk_findings
  ADD CONSTRAINT risk_findings_finding_type_check
  CHECK (finding_type IN (
    'orphan_account', 'ghost_license', 'unused_license',
    'budget_overspend', 'contract_expiry', 'security_gap', 'duplicate_tool',
    'license_surplus', 'license_overassigned',
    'auto_renew_risk', 'commitment_gap', 'shadow_it'
  ));
