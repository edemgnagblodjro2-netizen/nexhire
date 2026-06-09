-- ── KPI Snapshots — historique des scores par département ───────────────────
-- À exécuter dans Supabase SQL Editor

CREATE TABLE IF NOT EXISTS kpi_snapshots (
  id              UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id          UUID        NOT NULL,
  dept_id         UUID        NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
  dept_type       TEXT,
  dept_name       TEXT,
  snapshot_date   DATE        NOT NULL DEFAULT CURRENT_DATE,
  kpis            JSONB       NOT NULL DEFAULT '[]',
  health_score    SMALLINT,                         -- 0-100 calculé côté frontend
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT kpi_snapshots_dept_date_unique UNIQUE (dept_id, snapshot_date)
);

CREATE INDEX IF NOT EXISTS idx_kpi_snap_dept ON kpi_snapshots (dept_id, snapshot_date DESC);
CREATE INDEX IF NOT EXISTS idx_kpi_snap_org  ON kpi_snapshots (org_id,  snapshot_date DESC);

-- RLS : un utilisateur ne voit que les snapshots de son org
ALTER TABLE kpi_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY kpi_snap_select ON kpi_snapshots FOR SELECT
  USING (org_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

CREATE POLICY kpi_snap_insert ON kpi_snapshots FOR INSERT
  WITH CHECK (org_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

CREATE POLICY kpi_snap_update ON kpi_snapshots FOR UPDATE
  USING (org_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));
