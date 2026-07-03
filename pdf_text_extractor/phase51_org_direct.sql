-- Phase 51 — Workspace direct PME : auto-génération du slug d'organisation
-- Permet à chaque organisation de disposer de son propre workspace /workspace/{org-slug}
-- sans passer par un partenaire (chambre). Modèle B2B direct.

-- Activer l'extension unaccent pour les slugs avec accents français
CREATE EXTENSION IF NOT EXISTS unaccent;

-- ────────────────────────────────────────────────────────────────────────────
-- 1. Fonction : génère un slug unique et URL-safe pour une organisation
--    "Ets Navi & Fils Ltée" → "ets-navi-fils-ltee"
--    Gère les collisions par suffixe numérique (-1, -2, ...)
-- ────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION generate_org_slug(p_name text) RETURNS text
LANGUAGE plpgsql AS $$
DECLARE
  base_slug text;
  candidate text;
  counter   int := 0;
BEGIN
  -- Supprimer les accents, mettre en minuscules, remplacer les séquences
  -- non alphanumériques par des tirets
  base_slug := lower(unaccent(coalesce(p_name, 'org')));
  base_slug := regexp_replace(base_slug, '[^a-z0-9]+', '-', 'g');
  base_slug := trim(both '-' from base_slug);
  base_slug := left(base_slug, 60);
  IF base_slug = '' THEN base_slug := 'org'; END IF;

  -- Trouver un slug unique
  candidate := base_slug;
  LOOP
    EXIT WHEN NOT EXISTS (
      SELECT 1 FROM public.organizations WHERE slug = candidate
    );
    counter   := counter + 1;
    candidate := base_slug || '-' || counter;
  END LOOP;

  RETURN candidate;
END;
$$;

-- ────────────────────────────────────────────────────────────────────────────
-- 2. Trigger BEFORE INSERT : auto-remplir slug si NULL ou vide
-- ────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION _org_set_slug() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    NEW.slug := generate_org_slug(NEW.name);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_org_set_slug ON public.organizations;
CREATE TRIGGER trg_org_set_slug
  BEFORE INSERT ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION _org_set_slug();

-- ────────────────────────────────────────────────────────────────────────────
-- 3. Backfill : mettre à jour les organisations existantes sans slug
--    Chaque org reçoit un slug dérivé de son nom (unique, idempotent)
-- ────────────────────────────────────────────────────────────────────────────
DO $$
DECLARE
  rec RECORD;
BEGIN
  FOR rec IN
    SELECT id, name
    FROM public.organizations
    WHERE slug IS NULL OR slug = ''
    ORDER BY created_at
  LOOP
    UPDATE public.organizations
    SET slug = generate_org_slug(rec.name)
    WHERE id = rec.id;
  END LOOP;
END;
$$;

-- Vérification post-migration
SELECT count(*) AS orgs_without_slug
FROM public.organizations
WHERE slug IS NULL OR slug = '';
