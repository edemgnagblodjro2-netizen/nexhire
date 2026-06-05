-- =====================================================================
-- CivicAI AgentHub — Migration V1
-- À exécuter APRÈS supabase_schema.sql (additive et idempotente).
-- Étend organizations/users et ajoute connectors / subscriptions / audit_logs.
-- Source de vérité : Supabase. Zero Data Retention : on ne stocke ici que
-- les métadonnées (orgs, users, rôles, abonnements, connecteurs, audit,
-- tokens CHIFFRÉS) — jamais les documents métier du client.
-- =====================================================================

-- ── organizations : plan + statut d'abonnement + essai 14 jours ──────────
alter table public.organizations
  add column if not exists plan text,
  add column if not exists subscription_status text not null default 'trialing',
  add column if not exists trial_ends_at timestamptz not null default (now() + interval '14 days');

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'organizations_plan_check') then
    alter table public.organizations
      add constraint organizations_plan_check
      check (plan is null or plan in ('starter', 'business', 'enterprise'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'organizations_subscription_status_check') then
    alter table public.organizations
      add constraint organizations_subscription_status_check
      check (subscription_status in ('trialing', 'active', 'past_due', 'canceled', 'suspended'));
  end if;
end $$;

-- ── users : rôles Owner / Admin / Manager / User + last_login ────────────
alter table public.users
  add column if not exists last_login timestamptz;

-- Migre les anciens rôles ('member', etc.) vers 'user' avant de poser la contrainte.
update public.users set role = 'user'
  where role is null or role not in ('owner', 'admin', 'manager', 'user');

alter table public.users alter column role set default 'user';

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'users_role_check') then
    alter table public.users
      add constraint users_role_check
      check (role in ('owner', 'admin', 'manager', 'user'));
  end if;
end $$;

-- ── connectors : un connecteur par type et par organisation ──────────────
create table if not exists public.connectors (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  connector_type text not null,
  status text not null default 'disconnected',
  encrypted_credentials text,            -- tokens OAuth CHIFFRÉS (jamais en clair)
  last_error text,
  connected_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'connectors_type_check') then
    alter table public.connectors
      add constraint connectors_type_check
      check (connector_type in (
        'microsoft_365', 'salesforce', 'servicenow', 'jira', 'sap', 'workday'
      ));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'connectors_status_check') then
    alter table public.connectors
      add constraint connectors_status_check
      check (status in ('disconnected', 'pending', 'connected', 'error'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'connectors_org_type_unique') then
    alter table public.connectors
      add constraint connectors_org_type_unique unique (organization_id, connector_type);
  end if;
end $$;

-- ── subscriptions : Stripe, un abonnement par organisation ───────────────
create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null unique references public.organizations(id) on delete cascade,
  stripe_customer_id text,
  stripe_subscription_id text unique,
  plan text not null default 'starter',
  status text not null default 'trialing',
  current_period_end timestamptz,
  created_at timestamptz not null default now()
);

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'subscriptions_plan_check') then
    alter table public.subscriptions
      add constraint subscriptions_plan_check
      check (plan in ('starter', 'business', 'enterprise'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'subscriptions_status_check') then
    alter table public.subscriptions
      add constraint subscriptions_status_check
      check (status in ('trialing', 'active', 'past_due', 'canceled', 'incomplete'));
  end if;
end $$;

-- ── audit_logs : qui a cherché quoi, quand, sur quelle source ────────────
create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid references public.users(id) on delete set null,
  connector text,                         -- source interrogée (ou null = chat global)
  query text not null,
  created_at timestamptz not null default now()
);

-- ── index ────────────────────────────────────────────────────────────────
create index if not exists connectors_organization_id_idx
  on public.connectors (organization_id);
create index if not exists subscriptions_organization_id_idx
  on public.subscriptions (organization_id);
create index if not exists audit_logs_org_created_at_idx
  on public.audit_logs (organization_id, created_at desc);
create index if not exists audit_logs_user_id_idx
  on public.audit_logs (user_id);

-- ── RLS : isolation par tenant (lecture) ─────────────────────────────────
-- Les écritures passent par le backend FastAPI avec la SERVICE ROLE KEY,
-- qui contourne RLS. Ces policies protègent toute lecture directe (anon/auth).
alter table public.connectors enable row level security;
alter table public.subscriptions enable row level security;
alter table public.audit_logs enable row level security;

drop policy if exists "Users can read organization connectors" on public.connectors;
create policy "Users can read organization connectors"
  on public.connectors for select
  using (exists (
    select 1 from public.users u
    where u.id = auth.uid() and u.organization_id = connectors.organization_id
  ));

drop policy if exists "Users can read organization subscription" on public.subscriptions;
create policy "Users can read organization subscription"
  on public.subscriptions for select
  using (exists (
    select 1 from public.users u
    where u.id = auth.uid() and u.organization_id = subscriptions.organization_id
  ));

drop policy if exists "Users can read organization audit logs" on public.audit_logs;
create policy "Users can read organization audit logs"
  on public.audit_logs for select
  using (exists (
    select 1 from public.users u
    where u.id = auth.uid() and u.organization_id = audit_logs.organization_id
  ));
