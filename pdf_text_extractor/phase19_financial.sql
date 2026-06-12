-- ═══════════════════════════════════════════════════════════════════════════
-- phase19_financial.sql
-- Transactions financières IT — fournisseurs + factures réelles
-- À exécuter dans Supabase SQL Editor APRÈS phase10_optimization.sql
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. Fournisseurs centralisés
-- ─────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.vendors (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  website         TEXT,
  category        TEXT DEFAULT 'other'
                  CHECK (category IN ('software','hardware','cloud','telecom','services','maintenance','other')),
  contract_id     UUID REFERENCES public.contracts(id) ON DELETE SET NULL,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, name)
);

CREATE INDEX IF NOT EXISTS idx_vendors_org ON public.vendors (organization_id);

ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "vendors_org_isolation" ON public.vendors
  USING (organization_id = (SELECT organization_id FROM public.users WHERE id = auth.uid()));

CREATE POLICY "vendors_manager_write" ON public.vendors FOR ALL
  USING (
    organization_id = (SELECT organization_id FROM public.users WHERE id = auth.uid())
    AND (SELECT role FROM public.users WHERE id = auth.uid()) IN ('manager','admin','owner')
  );


-- 2. Transactions financières (factures / paiements réels)
-- ─────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.financial_transactions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  department_id   UUID REFERENCES public.departments(id) ON DELETE SET NULL,
  vendor_id       UUID REFERENCES public.vendors(id) ON DELETE SET NULL,
  contract_id     UUID REFERENCES public.contracts(id) ON DELETE SET NULL,

  -- Données de la transaction
  transaction_date DATE NOT NULL,
  amount           NUMERIC(14,2) NOT NULL,
  currency         TEXT NOT NULL DEFAULT 'CAD',
  description      TEXT,
  reference_number TEXT,
  category         TEXT DEFAULT 'other'
                   CHECK (category IN ('software','hardware','cloud','telecom','services','maintenance','other')),
  status           TEXT NOT NULL DEFAULT 'paid'
                   CHECK (status IN ('paid','pending','cancelled')),

  -- Source d'importation
  source           TEXT NOT NULL DEFAULT 'manual'
                   CHECK (source IN ('manual','csv','quickbooks','netsuite','sap','epicor')),

  -- Détection d'anomalies
  is_flagged       BOOLEAN NOT NULL DEFAULT false,
  flag_reason      TEXT,

  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ftxn_org      ON public.financial_transactions (organization_id);
CREATE INDEX IF NOT EXISTS idx_ftxn_date     ON public.financial_transactions (organization_id, transaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_ftxn_vendor   ON public.financial_transactions (vendor_id);
CREATE INDEX IF NOT EXISTS idx_ftxn_dept     ON public.financial_transactions (department_id);
CREATE INDEX IF NOT EXISTS idx_ftxn_status   ON public.financial_transactions (organization_id, status);
CREATE INDEX IF NOT EXISTS idx_ftxn_flagged  ON public.financial_transactions (organization_id, is_flagged);

ALTER TABLE public.financial_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ftxn_org_isolation" ON public.financial_transactions
  USING (organization_id = (SELECT organization_id FROM public.users WHERE id = auth.uid()));

CREATE POLICY "ftxn_manager_write" ON public.financial_transactions FOR ALL
  USING (
    organization_id = (SELECT organization_id FROM public.users WHERE id = auth.uid())
    AND (SELECT role FROM public.users WHERE id = auth.uid()) IN ('manager','admin','owner')
  );


-- 3. Trigger updated_at
-- ─────────────────────────────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TRIGGER ftxn_updated_at
    BEFORE UPDATE ON public.financial_transactions
    FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
