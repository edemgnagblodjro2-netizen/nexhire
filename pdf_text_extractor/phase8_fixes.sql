-- Phase 8 : Corrections critiques + RPC profil complet
-- Exécuter dans Supabase SQL Editor (une seule fois)

-- ── 1. Trigger append-only : autoriser la notation de satisfaction ────────
-- Le trigger bloque TOUT update sur audit_logs, mais on a besoin d'y écrire
-- satisfaction_score et satisfaction_comment. On l'assouplit en n'autorisant
-- que ces deux colonnes spécifiques.
create or replace function public.prevent_audit_modification()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Autoriser uniquement les mises à jour de satisfaction
  if TG_OP = 'UPDATE'
     and new.id            = old.id
     and new.user_id       is not distinct from old.user_id
     and new.action        = old.action
     and new.query         = old.query
     and new.created_at    = old.created_at
     and new.organization_id is not distinct from old.organization_id
  then
    return new;  -- seuls satisfaction_score / satisfaction_comment changent
  end if;

  raise exception 'audit_logs est append-only — seule la notation de satisfaction est modifiable';
end;
$$;

-- ── 2. RPC get_user_profile_by_id — inclut maintenant is_active ──────────
create or replace function public.get_user_profile_by_id(p_user_id uuid)
returns table (
  id              uuid,
  email           text,
  full_name       text,
  role            text,
  organization_id uuid,
  is_active       boolean
)
language sql
security definer
stable
set search_path = public
as $$
  select
    u.id,
    u.email,
    u.full_name,
    u.role,
    u.organization_id,
    coalesce(u.is_active, true) as is_active
  from public.users u
  where u.id = p_user_id;
$$;

grant execute on function public.get_user_profile_by_id(uuid) to authenticated, service_role;

-- ── 3. Fonction quota : retourne l'utilisation du mois en cours ──────────
create or replace function public.get_org_quota(p_org_id uuid)
returns jsonb
language sql
security definer
stable
set search_path = public
as $$
  select jsonb_build_object(
    'used',  coalesce(uc.agent_queries, 0),
    'limit', 1000,
    'period', to_char(now(), 'YYYY-MM')
  )
  from (select 1) dummy
  left join usage_counters uc
    on uc.organization_id = p_org_id
   and uc.period = to_char(now(), 'YYYY-MM');
$$;

grant execute on function public.get_org_quota(uuid) to authenticated, service_role;
