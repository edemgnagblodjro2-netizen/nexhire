-- Phase 6 : Analytics & Satisfaction
-- Exécuter dans Supabase SQL Editor (une seule fois)

-- 1. Colonnes satisfaction sur audit_logs
alter table public.audit_logs
  add column if not exists satisfaction_score   smallint check (satisfaction_score between 1 and 5),
  add column if not exists satisfaction_comment text;

-- 2. Table usage_events (exports, logins, etc.)
create table if not exists public.usage_events (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references public.users(id) on delete cascade,
  org_id      uuid references public.organizations(id) on delete cascade,
  event_type  text not null check (event_type in ('query','export','connector_test','login','logout')),
  meta        jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);

create index if not exists usage_events_user_idx on public.usage_events(user_id);
create index if not exists usage_events_org_idx  on public.usage_events(org_id);
create index if not exists usage_events_date_idx on public.usage_events(created_at desc);

-- 3. RLS sur usage_events
alter table public.usage_events enable row level security;

-- Les membres voient seulement leurs propres événements
do $$ begin
  create policy "usage_events_own_read" on public.usage_events
    for select using (user_id = auth.uid());
exception when duplicate_object then null;
end $$;

-- Les admins voient tous les événements de l'organisation
do $$ begin
  create policy "usage_events_admin_read" on public.usage_events
    for select using (
      exists (
        select 1 from public.users
        where id = auth.uid()
          and role in ('admin','owner','superadmin')
          and organization_id = public.usage_events.org_id
      )
    );
exception when duplicate_object then null;
end $$;

-- Insert permis pour tous les utilisateurs authentifiés
do $$ begin
  create policy "usage_events_insert" on public.usage_events
    for insert with check (user_id = auth.uid());
exception when duplicate_object then null;
end $$;

-- 4. Index satisfaction sur audit_logs
create index if not exists audit_logs_satisfaction_idx
  on public.audit_logs(satisfaction_score)
  where satisfaction_score is not null;
