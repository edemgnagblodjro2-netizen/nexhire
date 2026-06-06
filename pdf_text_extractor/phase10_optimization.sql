-- Phase 10 : Optimisation IA — Contrats · Processus RH · Cache analyses
-- Exécuter dans Supabase SQL Editor (une seule fois)

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. CONTRATS (fournisseurs, renouvellement, négociation)
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.contracts (
  id                      uuid          default gen_random_uuid() primary key,
  organization_id         uuid          not null references public.organizations(id) on delete cascade,
  department_id           uuid          references public.departments(id) on delete set null,
  vendor                  text          not null,
  description             text,
  category                text          default 'other' check (category in ('telecom','software','hardware','services','facilities','cloud','other')),
  annual_value            numeric(14,2) not null default 0,
  currency                text          not null default 'CAD',
  start_date              date,
  end_date                date,
  renewal_date            date,
  auto_renew              boolean       default false,
  negotiation_potential   numeric(5,2)  default 0,  -- % d'économie estimé possible
  status                  text          not null default 'active' check (status in ('active','expired','cancelled','under_negotiation')),
  notes                   text,
  created_at              timestamptz   default now(),
  updated_at              timestamptz   default now()
);

alter table public.contracts enable row level security;

do $$ begin
  create policy "contracts_dept_read" on public.contracts for select
    using (organization_id = (select organization_id from public.users where id = auth.uid())
           and ((select role from public.users where id = auth.uid()) in ('admin','owner')
                or department_id in (select department_id from public.department_members where user_id = auth.uid())));
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "contracts_manager_write" on public.contracts for all
    using (organization_id = (select organization_id from public.users where id = auth.uid())
           and (select role from public.users where id = auth.uid()) in ('manager','admin','owner'));
exception when duplicate_object then null; end $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. PROCESSUS RH / WORKFLOWS (détection des tâches manuelles à automatiser)
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.workforce_processes (
  id                        uuid          default gen_random_uuid() primary key,
  organization_id           uuid          not null references public.organizations(id) on delete cascade,
  department_id             uuid          references public.departments(id) on delete set null,
  name                      text          not null,
  description               text,
  team_size                 int           default 1,
  manual_hours_per_month    numeric(10,2) default 0,
  automation_potential      numeric(5,2)  default 0,   -- % automatisable
  hourly_cost               numeric(10,2) default 50,  -- coût horaire moyen
  status                    text          not null default 'manual' check (status in ('manual','semi_automated','automated')),
  notes                     text,
  created_at                timestamptz   default now(),
  updated_at                timestamptz   default now()
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

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. TRIGGERS updated_at
-- ─────────────────────────────────────────────────────────────────────────────
do $$ begin
  create trigger contracts_updated_at before update on public.contracts for each row execute function public.touch_updated_at();
exception when duplicate_object then null; end $$;
do $$ begin
  create trigger wfp_updated_at before update on public.workforce_processes for each row execute function public.touch_updated_at();
exception when duplicate_object then null; end $$;
