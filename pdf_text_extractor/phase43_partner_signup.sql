-- ═══════════════════════════════════════════════════════════════════════════
-- phase43_partner_signup.sql
-- Sprint Auth Phase 1 — inscription via lien partenaire
-- Idempotent. Exécuter dans Supabase SQL Editor.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1. Étendre handle_new_user() avec la branche partner_slug ────────────
--    Priorité : partner_slug → invite_token → normal
--    Fail open : si le slug est invalide au moment du trigger, retomber
--    sur l'inscription normale (ne jamais bloquer l'insert auth.users).
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_org_id    uuid;
  org_name      text := COALESCE(NULLIF(new.raw_user_meta_data->>'org_name', ''), 'Mon organisation');
  full_name     text := NULLIF(new.raw_user_meta_data->>'full_name', '');
  phone         text := NULLIF(new.raw_user_meta_data->>'phone', '');
  invite_token  text := NULLIF(new.raw_user_meta_data->>'invite_token', '');
  partner_slug  text := NULLIF(new.raw_user_meta_data->>'partner_slug', '');
  partner_id    uuid;
  inv_org_id    uuid;
  inv_role      text;
BEGIN

  -- ── Flux partenaire : organisation membre d'un partenaire (chambre/programme) ──
  IF partner_slug IS NOT NULL THEN
    SELECT id INTO partner_id
    FROM public.partners
    WHERE slug = partner_slug
      AND is_active = true
    LIMIT 1;

    IF partner_id IS NOT NULL THEN
      INSERT INTO public.organizations (name, partner_id, subscription_status, trial_ends_at)
        VALUES (org_name, partner_id, 'trialing', NOW() + INTERVAL '14 days')
        RETURNING id INTO new_org_id;

      INSERT INTO public.users (id, organization_id, partner_id, email, full_name, role, is_active, phone)
        VALUES (new.id, new_org_id, partner_id, new.email, full_name, 'owner', true, phone);

      RETURN new;
    END IF;
    -- slug invalide ou inactif → fail open vers inscription normale
  END IF;

  -- ── Flux invitation : rejoindre une organisation existante ───────────────
  IF invite_token IS NOT NULL THEN
    SELECT org_id, role INTO inv_org_id, inv_role
    FROM public.pending_invitations
    WHERE token      = invite_token
      AND expires_at > NOW()
      AND used_at    IS NULL;

    IF inv_org_id IS NOT NULL THEN
      INSERT INTO public.users (id, organization_id, email, full_name, role, is_active, phone)
        VALUES (new.id, inv_org_id, new.email, full_name, COALESCE(inv_role, 'user'), true, phone);
      UPDATE public.pending_invitations
        SET used_at = NOW()
        WHERE token = invite_token;
      RETURN new;
    END IF;
  END IF;

  -- ── Flux normal : nouvelle organisation indépendante, rôle owner ─────────
  INSERT INTO public.organizations (name, subscription_status, trial_ends_at)
    VALUES (org_name, 'trialing', NOW() + INTERVAL '14 days')
    RETURNING id INTO new_org_id;

  INSERT INTO public.users (id, organization_id, email, full_name, role, is_active, phone)
    VALUES (new.id, new_org_id, new.email, full_name, 'owner', true, phone);

  RETURN new;
END;
$$;

-- ── 2. Mettre à jour get_user_profile_by_id() pour exposer partner_id ─────
--    DROP requis car la signature RETURNS TABLE change.
DROP FUNCTION IF EXISTS public.get_user_profile_by_id(uuid);

CREATE FUNCTION public.get_user_profile_by_id(p_user_id uuid)
RETURNS TABLE (
  id              uuid,
  email           text,
  full_name       text,
  role            text,
  organization_id uuid,
  partner_id      uuid,
  is_active       boolean
)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT
    u.id,
    u.email,
    u.full_name,
    u.role,
    u.organization_id,
    u.partner_id,
    COALESCE(u.is_active, true) AS is_active
  FROM public.users u
  WHERE u.id = p_user_id;
$$;

GRANT EXECUTE ON FUNCTION public.get_user_profile_by_id(uuid) TO authenticated, service_role;

-- ── Résultat attendu ─────────────────────────────────────────────────────
-- Signup via /inscription?partenaire=cci3r :
--   → organizations.partner_id = (id de cci3r)
--   → users.partner_id         = (id de cci3r)
--   → users.role               = 'owner'
-- get_user_profile_by_id() retourne maintenant partner_id dans son résultat.
