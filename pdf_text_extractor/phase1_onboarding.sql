-- =====================================================================
-- CivicAI AgentHub — Phase 1 : onboarding automatique
-- À exécuter APRÈS supabase_v1_migration.sql.
--
-- À la création d'un compte (insert dans auth.users), crée automatiquement :
--   • l'organisation (tenant), nom tiré des métadonnées d'inscription
--   • l'utilisateur 'owner' lié à ce tenant
--   • l'essai de 14 jours (statut 'trialing')
-- =====================================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  new_org_id   uuid;
  org_name     text := coalesce(nullif(new.raw_user_meta_data->>'org_name', ''), 'Mon organisation');
  full_name    text := nullif(new.raw_user_meta_data->>'full_name', '');
  org_type_raw text := new.raw_user_meta_data->>'org_type';
  org_type_val text := case
    when org_type_raw in ('entreprise', 'entrepreneur', 'hopital', 'municipalite', 'universite')
    then org_type_raw
    else 'entreprise'
  end;
  currency_raw text := new.raw_user_meta_data->>'currency';
  currency_val text := case
    when currency_raw ~ '^[A-Z]{3}$' then currency_raw
    else 'CAD'
  end;
begin
  insert into public.organizations (name, subscription_status, trial_ends_at, org_type, currency)
    values (org_name, 'trialing', now() + interval '14 days', org_type_val, currency_val)
    returning id into new_org_id;

  insert into public.users (id, organization_id, email, full_name, role)
    values (new.id, new_org_id, new.email, full_name, 'owner');

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
