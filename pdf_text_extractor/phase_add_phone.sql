-- ═══════════════════════════════════════════════════════════════════════════
-- phase_add_phone.sql
-- Ajoute le numéro de téléphone aux utilisateurs
-- À exécuter dans Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. Ajouter la colonne phone à la table users
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS phone text;

-- 2. Mettre à jour le trigger d'inscription — conserve la gestion des invitations
--    (phase7_members.sql) et ajoute la capture du téléphone.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_org_id   uuid;
  org_name     text := COALESCE(NULLIF(new.raw_user_meta_data->>'org_name', ''), 'Mon organisation');
  full_name    text := NULLIF(new.raw_user_meta_data->>'full_name', '');
  phone        text := NULLIF(new.raw_user_meta_data->>'phone', '');
  invite_token text := NULLIF(new.raw_user_meta_data->>'invite_token', '');
  inv_org_id   uuid;
  inv_role     text;
BEGIN
  -- ── Flux invitation : rejoindre une organisation existante ──────────────
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

  -- ── Flux normal : nouvelle organisation, rôle owner ────────────────────
  INSERT INTO public.organizations (name, subscription_status, trial_ends_at)
    VALUES (org_name, 'trialing', NOW() + INTERVAL '14 days')
    RETURNING id INTO new_org_id;

  INSERT INTO public.users (id, organization_id, email, full_name, role, is_active, phone)
    VALUES (new.id, new_org_id, new.email, full_name, 'owner', true, phone);

  RETURN new;
END;
$$;
