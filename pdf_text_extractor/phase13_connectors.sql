-- Phase 13 : Table connectors + RLS
-- Exécuter dans Supabase SQL Editor (une seule fois)

-- 1. Table connectors
create table if not exists public.connectors (
  id                      uuid primary key default gen_random_uuid(),
  organization_id         uuid not null references public.organizations(id) on delete cascade,
  connector_type          text not null
    check (connector_type in (
      'microsoft_365','salesforce','servicenow','jira','sap','workday',
      'zendesk','autotask','hubspot'
    )),
  status                  text not null default 'disconnected'
    check (status in ('connected','disconnected','error')),
  encrypted_credentials   text,
  connected_at            timestamptz,
  last_error              text,
  updated_at              timestamptz not null default now(),
  unique (organization_id, connector_type)
);

-- 2. Index
create index if not exists idx_connectors_org
  on public.connectors (organization_id, connector_type);

-- 3. RLS — accès par service_role uniquement (le backend utilise service_client())
alter table public.connectors enable row level security;

-- Seul le service_role peut lire/écrire (aucun accès direct depuis le navigateur)
create policy "connectors_service_only"
  on public.connectors
  using (false)
  with check (false);

-- 4. Commentaire
comment on table public.connectors is
  'Credentials OAuth / API-key chiffrés (Fernet) par connecteur et par organisation.';
