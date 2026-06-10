-- ═══════════════════════════════════════════════════════════════════════════
-- phase_add_phone.sql
-- Ajoute le numéro de téléphone aux utilisateurs
-- À exécuter dans Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. Ajouter la colonne phone à la table users
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS phone text;

-- 2. Mettre à jour le trigger d'inscription pour capturer le téléphone
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_org_id uuid;
  org_name   text := COALESCE(NULLIF(new.raw_user_meta_data->>'org_name', ''), 'Mon organisation');
  full_name  text := NULLIF(new.raw_user_meta_data->>'full_name', '');
  phone      text := NULLIF(new.raw_user_meta_data->>'phone', '');
BEGIN
  INSERT INTO public.organizations (name, subscription_status, trial_ends_at)
    VALUES (org_name, 'trialing', NOW() + INTERVAL '14 days')
    RETURNING id INTO new_org_id;

  INSERT INTO public.users (id, organization_id, email, full_name, role, phone)
    VALUES (new.id, new_org_id, new.email, full_name, 'owner', phone);

  RETURN new;
END;
$$;
