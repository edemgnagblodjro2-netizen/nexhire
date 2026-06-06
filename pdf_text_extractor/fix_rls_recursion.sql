-- Fix : récursion infinie dans la politique RLS "Users can read organization users"
-- La politique sur public.users se sous-requêtait elle-même → infinite recursion (42P17).
--
-- Solution : fonction SECURITY DEFINER qui lit l'org_id sans déclencher l'RLS,
-- puis politique réécrite pour l'utiliser.

-- 1. Fonction helper (SECURITY DEFINER = s'exécute sans RLS)
create or replace function public.get_auth_user_org_id()
returns uuid
language sql
security definer
stable
set search_path = public
as $$
  select organization_id from public.users where id = auth.uid();
$$;

-- 2. Remplacer la politique récursive
drop policy if exists "Users can read organization users" on public.users;

create policy "Users can read organization users"
  on public.users
  for select
  using (
    id = auth.uid()
    or organization_id = public.get_auth_user_org_id()
  );
