-- Correctif : tables servers + workforce_processes manquantes
-- Exécuter dans Supabase SQL Editor si phase9/10 ont été partiellement appliqués

-- ── Fonction trigger updated_at (si absente) ──────────────────────────────────
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

-- ── 1. SERVEURS ───────────────────────────────────────────────────────────────
create table if not exists public.servers (
  id              uuid          default gen_random_uuid() primary key,
  organization_id uuid          not null references public.organizations(id) on delete cascade,
  department_id   uuid          references public.departments(id) on delete set null,
  hostname        text          not null,
  ip_address      text,
  environment     text          default 'production'
    check (environment in ('production','staging','development','test','backup')),
  os              text,
  cpu_cores       int,
  ram_gb          int,
  storage_gb      int,
  location        text,
  status          text          not null default 'active'
    check (status in ('active','idle','to_decommission','decommissioned')),
  last_ping_at    timestamptz,
  monthly_cost    numeric(10,2) default 0,
  notes           text,
  created_at      timestamptz   default now(),
  updated_at      timestamptz   default now()
);

alter table public.servers enable row level security;

do $$ begin
  create policy "srv_dept_read" on public.servers for select
    using (organization_id = (select organization_id from public.users where id = auth.uid())
           and ((select role from public.users where id = auth.uid()) in ('admin','owner')
                or department_id in (select department_id from public.department_members where user_id = auth.uid())));
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "srv_admin_write" on public.servers for all
    using (organization_id = (select organization_id from public.users where id = auth.uid())
           and (select role from public.users where id = auth.uid()) in ('admin','owner'));
exception when duplicate_object then null; end $$;

do $$ begin
  create trigger servers_updated_at before update on public.servers
    for each row execute function public.touch_updated_at();
exception when duplicate_object then null; end $$;

-- ── 2. PROCESSUS RH / WORKFLOWS ──────────────────────────────────────────────
create table if not exists public.workforce_processes (
  id                     uuid          default gen_random_uuid() primary key,
  organization_id        uuid          not null references public.organizations(id) on delete cascade,
  department_id          uuid          references public.departments(id) on delete set null,
  name                   text          not null,
  description            text,
  team_size              int           default 1,
  manual_hours_per_month numeric(10,2) default 0,
  automation_potential   numeric(5,2)  default 0,
  hourly_cost            numeric(10,2) default 50,
  status                 text          not null default 'manual'
    check (status in ('manual','semi_automated','automated')),
  notes                  text,
  created_at             timestamptz   default now(),
  updated_at             timestamptz   default now()
);

alter table public.workforce_processes enable row level security;

do $$ begin
  create policy "wfp_dept_read" on public.workforce_processes for select
    using (organization_id = (select organization_id from public.users where id = auth.uid())
           and ((select role from public.users where id = auth.uid()) in ('admin','owner')
                or department_id in (select department_id from public.department_members where user_id = auth.uid())));
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "wfp_manager_write" on public.workforce_processes for all
    using (organization_id = (select organization_id from public.users where id = auth.uid())
           and (select role from public.users where id = auth.uid()) in ('manager','admin','owner'));
exception when duplicate_object then null; end $$;

do $$ begin
  create trigger wfp_updated_at before update on public.workforce_processes
    for each row execute function public.touch_updated_at();
exception when duplicate_object then null; end $$;
