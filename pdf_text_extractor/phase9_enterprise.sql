-- Phase 9 : Comptes de service · Départements · Budget IT · Licences · Serveurs · Applications
-- Exécuter dans Supabase SQL Editor (une seule fois)

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. COMPTES DE SERVICE
-- Token svc_* longue durée, non lié à un utilisateur humain.
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.service_accounts (
  id              uuid          default gen_random_uuid() primary key,
  organization_id uuid          not null references public.organizations(id) on delete cascade,
  name            text          not null,
  description     text,
  role            text          not null default 'user' check (role in ('user','manager','admin')),
  token_hash      text          unique not null,
  token_prefix    text          not null,
  created_by      uuid          references public.users(id) on delete set null,
  created_at      timestamptz   default now(),
  last_used_at    timestamptz,
  is_active       boolean       not null default true
);

alter table public.service_accounts enable row level security;

do $$ begin
  create policy "sa_admin_read" on public.service_accounts for select
    using (organization_id = (select organization_id from public.users where id = auth.uid())
           and (select role from public.users where id = auth.uid()) in ('admin','owner'));
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "sa_admin_insert" on public.service_accounts for insert
    with check (organization_id = (select organization_id from public.users where id = auth.uid())
                and (select role from public.users where id = auth.uid()) in ('admin','owner'));
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "sa_admin_update" on public.service_accounts for update
    using (organization_id = (select organization_id from public.users where id = auth.uid())
           and (select role from public.users where id = auth.uid()) in ('admin','owner'));
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "sa_owner_delete" on public.service_accounts for delete
    using (organization_id = (select organization_id from public.users where id = auth.uid())
           and (select role from public.users where id = auth.uid()) = 'owner');
exception when duplicate_object then null; end $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. DÉPARTEMENTS
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.departments (
  id              uuid          default gen_random_uuid() primary key,
  organization_id uuid          not null references public.organizations(id) on delete cascade,
  name            text          not null,
  description     text,
  annual_budget   numeric(14,2) default 0,
  currency        text          not null default 'CAD',
  created_at      timestamptz   default now(),
  updated_at      timestamptz   default now()
);

alter table public.departments enable row level security;

do $$ begin
  create policy "dept_org_read" on public.departments for select
    using (organization_id = (select organization_id from public.users where id = auth.uid()));
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "dept_admin_write" on public.departments for all
    using (organization_id = (select organization_id from public.users where id = auth.uid())
           and (select role from public.users where id = auth.uid()) in ('admin','owner'));
exception when duplicate_object then null; end $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. MEMBRES DE DÉPARTEMENT (junction user ↔ dept)
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.department_members (
  user_id         uuid not null references public.users(id) on delete cascade,
  department_id   uuid not null references public.departments(id) on delete cascade,
  role            text not null default 'member' check (role in ('member','manager')),
  joined_at       timestamptz default now(),
  primary key (user_id, department_id)
);

alter table public.department_members enable row level security;

do $$ begin
  create policy "dm_own_read" on public.department_members for select
    using (user_id = auth.uid()
           or (select role from public.users where id = auth.uid()) in ('admin','owner'));
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "dm_admin_write" on public.department_members for all
    using ((select role from public.users where id = auth.uid()) in ('admin','owner'));
exception when duplicate_object then null; end $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. ENTRÉES BUDGÉTAIRES (AWS, Azure, M365, Exchange, custom…)
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.budget_entries (
  id              uuid          default gen_random_uuid() primary key,
  organization_id uuid          not null references public.organizations(id) on delete cascade,
  department_id   uuid          references public.departments(id) on delete set null,
  category        text          not null,
  label           text,
  year            int           not null,
  month           int           check (month between 1 and 12),
  allocated       numeric(14,2) not null default 0,
  actual          numeric(14,2) not null default 0,
  currency        text          not null default 'CAD',
  notes           text,
  created_at      timestamptz   default now(),
  updated_at      timestamptz   default now()
);

alter table public.budget_entries enable row level security;

do $$ begin
  create policy "budget_dept_read" on public.budget_entries for select
    using (organization_id = (select organization_id from public.users where id = auth.uid())
           and ((select role from public.users where id = auth.uid()) in ('admin','owner')
                or department_id in (select department_id from public.department_members where user_id = auth.uid())));
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "budget_manager_insert" on public.budget_entries for insert
    with check (organization_id = (select organization_id from public.users where id = auth.uid())
                and (select role from public.users where id = auth.uid()) in ('manager','admin','owner'));
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "budget_manager_update" on public.budget_entries for update
    using (organization_id = (select organization_id from public.users where id = auth.uid())
           and (select role from public.users where id = auth.uid()) in ('manager','admin','owner'));
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "budget_admin_delete" on public.budget_entries for delete
    using (organization_id = (select organization_id from public.users where id = auth.uid())
           and (select role from public.users where id = auth.uid()) in ('admin','owner'));
exception when duplicate_object then null; end $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. APPLICATIONS IT (apps actives, inutilisées, à décommissionner)
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.it_applications (
  id              uuid          default gen_random_uuid() primary key,
  organization_id uuid          not null references public.organizations(id) on delete cascade,
  department_id   uuid          references public.departments(id) on delete set null,
  name            text          not null,
  category        text,
  vendor          text,
  status          text          not null default 'active' check (status in ('active','unused','decommissioned')),
  monthly_cost    numeric(10,2) default 0,
  last_used_at    timestamptz,
  user_count      int           default 0,
  url             text,
  notes           text,
  created_at      timestamptz   default now(),
  updated_at      timestamptz   default now()
);

alter table public.it_applications enable row level security;

do $$ begin
  create policy "apps_dept_read" on public.it_applications for select
    using (organization_id = (select organization_id from public.users where id = auth.uid())
           and ((select role from public.users where id = auth.uid()) in ('admin','owner')
                or department_id in (select department_id from public.department_members where user_id = auth.uid())));
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "apps_manager_write" on public.it_applications for all
    using (organization_id = (select organization_id from public.users where id = auth.uid())
           and (select role from public.users where id = auth.uid()) in ('manager','admin','owner'));
exception when duplicate_object then null; end $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. LICENCES (Adobe, M365, autres — expiration, renouvellement)
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.licenses (
  id              uuid          default gen_random_uuid() primary key,
  organization_id uuid          not null references public.organizations(id) on delete cascade,
  department_id   uuid          references public.departments(id) on delete set null,
  application_id  uuid          references public.it_applications(id) on delete set null,
  product_name    text          not null,
  vendor          text,
  license_type    text          default 'subscription' check (license_type in ('subscription','perpetual','volume','trial')),
  quantity        int           not null default 1,
  assigned_count  int           not null default 0,
  cost_per_unit   numeric(10,2) default 0,
  billing_cycle   text          default 'annual' check (billing_cycle in ('monthly','annual','one-time')),
  purchase_date   date,
  expiration_date date,
  renewal_date    date,
  auto_renew      boolean       default false,
  notes           text,
  created_at      timestamptz   default now(),
  updated_at      timestamptz   default now()
);

alter table public.licenses enable row level security;

do $$ begin
  create policy "lic_dept_read" on public.licenses for select
    using (organization_id = (select organization_id from public.users where id = auth.uid())
           and ((select role from public.users where id = auth.uid()) in ('admin','owner')
                or department_id in (select department_id from public.department_members where user_id = auth.uid())));
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "lic_manager_write" on public.licenses for all
    using (organization_id = (select organization_id from public.users where id = auth.uid())
           and (select role from public.users where id = auth.uid()) in ('manager','admin','owner'));
exception when duplicate_object then null; end $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 7. SERVEURS (inventaire local, décommission)
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.servers (
  id              uuid          default gen_random_uuid() primary key,
  organization_id uuid          not null references public.organizations(id) on delete cascade,
  department_id   uuid          references public.departments(id) on delete set null,
  hostname        text          not null,
  ip_address      text,
  environment     text          default 'production' check (environment in ('production','staging','development','test','backup')),
  os              text,
  cpu_cores       int,
  ram_gb          int,
  storage_gb      int,
  location        text,
  status          text          not null default 'active' check (status in ('active','idle','to_decommission','decommissioned')),
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

-- ─────────────────────────────────────────────────────────────────────────────
-- 8. TRIGGER updated_at universel
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

do $$ begin
  create trigger departments_updated_at    before update on public.departments    for each row execute function public.touch_updated_at();
exception when duplicate_object then null; end $$;
do $$ begin
  create trigger budget_entries_updated_at before update on public.budget_entries for each row execute function public.touch_updated_at();
exception when duplicate_object then null; end $$;
do $$ begin
  create trigger it_apps_updated_at        before update on public.it_applications for each row execute function public.touch_updated_at();
exception when duplicate_object then null; end $$;
do $$ begin
  create trigger licenses_updated_at       before update on public.licenses        for each row execute function public.touch_updated_at();
exception when duplicate_object then null; end $$;
do $$ begin
  create trigger servers_updated_at        before update on public.servers          for each row execute function public.touch_updated_at();
exception when duplicate_object then null; end $$;
