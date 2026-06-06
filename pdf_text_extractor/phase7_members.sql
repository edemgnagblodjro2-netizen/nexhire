-- Phase 7 : Gestion des membres et invitations
-- Exécuter dans Supabase SQL Editor (une seule fois)

-- ── 1. Colonne is_active sur users ────────────────────────────────────────
alter table public.users
  add column if not exists is_active boolean not null default true;

-- ── 2. Table pending_invitations ─────────────────────────────────────────
create table if not exists public.pending_invitations (
  id           uuid primary key default gen_random_uuid(),
  org_id       uuid not null references public.organizations(id) on delete cascade,
  invited_by   uuid references public.users(id) on delete set null,
  email        text not null,
  role         text not null default 'user' check (role in ('user','manager','admin')),
  token        text not null unique default encode(gen_random_bytes(32), 'hex'),
  expires_at   timestamptz not null default now() + interval '7 days',
  used_at      timestamptz,
  created_at   timestamptz not null default now()
);

create index if not exists pending_inv_token_idx  on public.pending_invitations(token);
create index if not exists pending_inv_org_idx    on public.pending_invitations(org_id);

alter table public.pending_invitations enable row level security;

-- Les admins/owners de l'org voient et gèrent les invitations de leur org
do $$ begin
  create policy "inv_admin_all" on public.pending_invitations
    for all using (
      exists (
        select 1 from public.users
        where id = auth.uid()
          and organization_id = public.pending_invitations.org_id
          and role in ('admin','owner')
      )
    );
exception when duplicate_object then null; end $$;

-- ── 3. Trigger handle_new_user modifié ───────────────────────────────────
-- Si invite_token présent dans les métadonnées → rejoindre l'org existante
-- Sinon → comportement normal (nouvel org + owner)
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
  invite_token text := nullif(new.raw_user_meta_data->>'invite_token', '');
  inv_org_id   uuid;
  inv_role     text;
begin
  -- Flux invitation
  if invite_token is not null then
    select org_id, role into inv_org_id, inv_role
    from public.pending_invitations
    where token      = invite_token
      and expires_at > now()
      and used_at    is null;

    if inv_org_id is not null then
      insert into public.users (id, organization_id, email, full_name, role, is_active)
        values (new.id, inv_org_id, new.email, full_name, coalesce(inv_role, 'user'), true);
      update public.pending_invitations
        set used_at = now()
        where token = invite_token;
      return new;
    end if;
  end if;

  -- Flux normal : nouvelle organisation
  insert into public.organizations (name, subscription_status, trial_ends_at)
    values (org_name, 'trialing', now() + interval '14 days')
    returning id into new_org_id;

  insert into public.users (id, organization_id, email, full_name, role, is_active)
    values (new.id, new_org_id, new.email, full_name, 'owner', true);

  return new;
end;
$$;

-- ── 4. Index is_active ───────────────────────────────────────────────────
create index if not exists users_active_idx on public.users(organization_id, is_active);
