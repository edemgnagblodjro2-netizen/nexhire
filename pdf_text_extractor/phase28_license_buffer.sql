-- Migration phase28 : ajout buffer_target sur licenses
-- buffer_target = nombre de licences intentionnellement réservées en stock
-- (nouvelles embauches, projets planifiés, remplacement urgence)
-- Valeur 0 par défaut = pas de buffer déclaré

ALTER TABLE public.licenses
  ADD COLUMN IF NOT EXISTS buffer_target int NOT NULL DEFAULT 0 CHECK (buffer_target >= 0);

COMMENT ON COLUMN public.licenses.buffer_target IS
  'Nombre de licences intentionnellement gardées en réserve (stock tampon). '
  'Ne sont pas comptées comme surplus dans les recommandations.';
