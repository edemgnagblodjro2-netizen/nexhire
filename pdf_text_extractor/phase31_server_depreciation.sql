-- Migration phase31 : cycle de vie des équipements IT
-- Ajoute valeur d'acquisition, numéro d'étiquette et dates de suivi sur la table servers

ALTER TABLE public.servers
  ADD COLUMN IF NOT EXISTS purchase_price      NUMERIC(10,2)  DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS asset_tag           VARCHAR(100)   DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS acquisition_date    DATE           DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS warranty_end_date   DATE           DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS replacement_date    DATE           DEFAULT NULL;

COMMENT ON COLUMN public.servers.purchase_price IS
  'Valeur d''acquisition de l''équipement en dollars CAD.';
COMMENT ON COLUMN public.servers.asset_tag IS
  'Numéro d''étiquette ou code d''inventaire physique apposé sur l''équipement.';
COMMENT ON COLUMN public.servers.acquisition_date IS
  'Date d''achat ou de mise en service. Sert à calculer l''âge et le statut du cycle de vie.';
COMMENT ON COLUMN public.servers.warranty_end_date IS
  'Date de fin de garantie constructeur ou contrat de support.';
COMMENT ON COLUMN public.servers.replacement_date IS
  'Date de remplacement planifiée pour la gestion budgétaire du cycle de vie.';
