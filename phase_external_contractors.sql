-- ═══════════════════════════════════════════════════════════════════════════
-- NexHire — Collaborateurs externes (consultants, prestataires, fournisseurs)
-- Exécuter dans Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════════════════

-- Table principale des collaborateurs externes
CREATE TABLE IF NOT EXISTS external_contractors (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  UUID        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  full_name        TEXT        NOT NULL,
  email            TEXT,
  company_name     TEXT,
  contractor_type  TEXT        NOT NULL DEFAULT 'consultant'
                   CHECK (contractor_type IN ('consultant','vendor','provider','contractor')),
  job_title        TEXT,
  mission          TEXT,
  contract_start   DATE        NOT NULL,
  contract_end     DATE        NOT NULL,
  contract_value   NUMERIC(15,2) NOT NULL DEFAULT 0,
  currency         TEXT        NOT NULL DEFAULT 'CAD',
  scope            TEXT        NOT NULL DEFAULT 'department'
                   CHECK (scope IN ('department','organization')),
  status           TEXT        NOT NULL DEFAULT 'active'
                   CHECK (status IN ('active','expired','suspended')),
  created_by       UUID        REFERENCES users(id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT contract_dates_valid CHECK (contract_end > contract_start)
);

-- Liaisons contractor ↔ département(s)
-- Vide si scope = 'organization'
CREATE TABLE IF NOT EXISTS external_contractor_departments (
  contractor_id  UUID NOT NULL REFERENCES external_contractors(id) ON DELETE CASCADE,
  department_id  UUID NOT NULL REFERENCES departments(id)           ON DELETE CASCADE,
  PRIMARY KEY (contractor_id, department_id)
);

-- Index pour les requêtes courantes
CREATE INDEX IF NOT EXISTS idx_ext_contractors_org  ON external_contractors(organization_id);
CREATE INDEX IF NOT EXISTS idx_ext_contractors_end  ON external_contractors(contract_end);
CREATE INDEX IF NOT EXISTS idx_ext_dept_contractor  ON external_contractor_departments(contractor_id);
CREATE INDEX IF NOT EXISTS idx_ext_dept_dept        ON external_contractor_departments(department_id);

-- Mise à jour automatique de updated_at
CREATE OR REPLACE FUNCTION update_external_contractors_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS trg_ext_contractors_updated ON external_contractors;
CREATE TRIGGER trg_ext_contractors_updated
  BEFORE UPDATE ON external_contractors
  FOR EACH ROW EXECUTE FUNCTION update_external_contractors_updated_at();

-- Vue utilitaire avec statut calculé et nombre de jours restants
CREATE OR REPLACE VIEW external_contractors_view AS
SELECT
  c.*,
  CASE
    WHEN c.contract_end < CURRENT_DATE THEN 'expired'
    WHEN c.contract_end <= CURRENT_DATE + INTERVAL '30 days' THEN 'expiring_soon'
    ELSE 'active'
  END AS computed_status,
  (c.contract_end - CURRENT_DATE) AS days_remaining,
  ARRAY(
    SELECT d.name
    FROM external_contractor_departments ecd
    JOIN departments d ON d.id = ecd.department_id
    WHERE ecd.contractor_id = c.id
  ) AS department_names,
  ARRAY(
    SELECT ecd.department_id::text
    FROM external_contractor_departments ecd
    WHERE ecd.contractor_id = c.id
  ) AS department_ids
FROM external_contractors c;
