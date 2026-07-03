-- Migration phase50 : préférences régionales et de langue par organisation
-- Idempotent : utilise ADD COLUMN IF NOT EXISTS

ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS language  VARCHAR(10)  NOT NULL DEFAULT 'fr',
  ADD COLUMN IF NOT EXISTS timezone  VARCHAR(50)  NOT NULL DEFAULT 'America/Toronto';

COMMENT ON COLUMN organizations.language IS 'Code ISO langue de l''interface (fr, en)';
COMMENT ON COLUMN organizations.timezone IS 'Fuseau horaire IANA (ex. America/Toronto)';
