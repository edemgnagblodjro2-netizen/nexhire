-- FairRent Portfolio — table fr_portfolio_units
-- À exécuter dans Supabase SQL Editor (idempotent)

CREATE TABLE IF NOT EXISTS fr_portfolio_units (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  listing_url    TEXT NOT NULL,
  listing_id     UUID REFERENCES fr_listings(id) ON DELETE SET NULL,
  title          TEXT,
  price          INT,
  city           TEXT,
  province       TEXT,
  neighborhood   TEXT,
  listing_type   TEXT,
  bedrooms       SMALLINT,
  fairrent_score SMALLINT,
  decision       TEXT,
  platform       TEXT,
  status         TEXT NOT NULL DEFAULT 'saved'
    CHECK (status IN ('saved','to_contact','contacted','visit','documents','analysis','accepted','signed','rejected')),
  notes          TEXT,
  contact_name   TEXT,
  visit_date     TIMESTAMPTZ,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, listing_url)
);

ALTER TABLE fr_portfolio_units ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "fr_portfolio_units_own" ON fr_portfolio_units;
CREATE POLICY "fr_portfolio_units_own" ON fr_portfolio_units
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS fr_portfolio_units_user_idx ON fr_portfolio_units(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS fr_portfolio_units_status_idx ON fr_portfolio_units(user_id, status);
