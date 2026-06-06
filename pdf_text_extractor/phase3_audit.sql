-- =====================================================================
-- NexHire — Phase 3 : audit_logs enrichi + append-only
-- À exécuter APRÈS phase1_onboarding.sql.
-- =====================================================================

-- organization_id devient nullable pour capturer les événements pré-auth
-- (ex. tentative de login avec email inconnu).
alter table public.audit_logs
  alter column organization_id drop not null;

-- Nouvelles colonnes (idempotent)
alter table public.audit_logs
  add column if not exists action       text not null default 'query',
  add column if not exists success      boolean not null default true,
  add column if not exists ip_address   text,
  add column if not exists http_status  smallint,
  add column if not exists resource_ids jsonb not null default '[]'::jsonb,
  add column if not exists error_detail text;

-- ── Append-only : trigger niveau ligne (contourne RLS, bloque même service role) ──
create or replace function public.prevent_audit_modification()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  raise exception 'audit_logs est append-only — toute modification est interdite';
end;
$$;

drop trigger if exists audit_logs_immutable on public.audit_logs;
create trigger audit_logs_immutable
  before update or delete on public.audit_logs
  for each row execute function public.prevent_audit_modification();

-- Colonne metadata pour logs enrichis (données libres par endpoint)
alter table public.audit_logs
  add column if not exists metadata jsonb not null default '{}'::jsonb;

-- ── Index supplémentaires ─────────────────────────────────────────────────────
create index if not exists audit_logs_action_idx
  on public.audit_logs (action, created_at desc);

create index if not exists audit_logs_success_idx
  on public.audit_logs (organization_id, success, created_at desc)
  where success = false;   -- index partiel pour les échecs (alertes rapides)
