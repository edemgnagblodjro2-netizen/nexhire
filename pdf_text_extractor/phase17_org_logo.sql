-- Phase 17 : Logo organisation + couleur de marque
ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS logo_url     TEXT,
  ADD COLUMN IF NOT EXISTS brand_color  TEXT DEFAULT '#818CF8';
