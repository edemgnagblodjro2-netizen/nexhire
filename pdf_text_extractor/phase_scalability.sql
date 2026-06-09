-- ============================================================
-- NexHire EIP — Scalabilité multi-tenant
-- À exécuter dans Supabase SQL Editor
-- ============================================================

-- ── 1. INDEXES MANQUANTS ─────────────────────────────────────

-- conversations : manque index sur organization_id seul
-- (document_id+created_at existe mais ne couvre pas les requêtes par org)
create index if not exists conversations_org_idx
  on public.conversations(organization_id, created_at desc);

-- budget_entries
create index if not exists budget_entries_org_idx
  on public.budget_entries(organization_id);

create index if not exists budget_entries_org_year_month_idx
  on public.budget_entries(organization_id, year desc, month desc);

-- tables enterprise (licenses, contracts, workforce_processes, etc.)
create index if not exists licenses_org_idx
  on public.licenses(organization_id);

create index if not exists contracts_org_idx
  on public.contracts(organization_id);

create index if not exists workforce_processes_org_idx
  on public.workforce_processes(organization_id);

create index if not exists it_applications_org_idx
  on public.it_applications(organization_id);

create index if not exists servers_org_idx
  on public.servers(organization_id);

create index if not exists service_accounts_org_idx
  on public.service_accounts(organization_id);

create index if not exists department_members_org_idx
  on public.department_members(department_id);

-- kpi_snapshots : index health_score pour filtrer les orgs en difficulté
-- (idx_kpi_snap_org et idx_kpi_snap_dept déjà créés dans phase_kpi_snapshots.sql)
create index if not exists kpi_snapshots_org_health_idx
  on public.kpi_snapshots(org_id, health_score, snapshot_date desc);


-- ── 2. TABLE D'ARCHIVAGE — conversations > 12 mois ──────────

create table if not exists public.conversations_archive (
  like public.conversations including all
);

comment on table public.conversations_archive is
  'Conversations archivées (> 12 mois). Non interrogées en temps réel.';


-- ── 3. TABLE D'ARCHIVAGE — audit_logs > 6 mois ───────────────

create table if not exists public.audit_logs_archive (
  like public.audit_logs including all
);

comment on table public.audit_logs_archive is
  'Audit logs archivés (> 6 mois). Conservés pour conformité.';


-- ── 4. TABLE D'ARCHIVAGE — usage_events > 6 mois ─────────────

create table if not exists public.usage_events_archive (
  like public.usage_events including all
);

comment on table public.usage_events_archive is
  'Usage events archivés (> 6 mois).';


-- ── 5. FONCTION D'ARCHIVAGE (à appeler manuellement ou via cron) ──

create or replace function public.archive_old_data()
returns jsonb
language plpgsql
security definer
as $$
declare
  conv_count   int;
  audit_count  int;
  usage_count  int;
begin
  -- Archiver conversations > 12 mois
  with moved as (
    delete from public.conversations
    where created_at < now() - interval '12 months'
    returning *
  )
  insert into public.conversations_archive select * from moved;
  get diagnostics conv_count = row_count;

  -- Archiver audit_logs > 6 mois
  with moved as (
    delete from public.audit_logs
    where created_at < now() - interval '6 months'
    returning *
  )
  insert into public.audit_logs_archive select * from moved;
  get diagnostics audit_count = row_count;

  -- Archiver usage_events > 6 mois
  with moved as (
    delete from public.usage_events
    where created_at < now() - interval '6 months'
    returning *
  )
  insert into public.usage_events_archive select * from moved;
  get diagnostics usage_count = row_count;

  return jsonb_build_object(
    'conversations_archived', conv_count,
    'audit_logs_archived',    audit_count,
    'usage_events_archived',  usage_count,
    'archived_at',            now()
  );
end;
$$;

comment on function public.archive_old_data() is
  'Déplace les données anciennes vers les tables _archive. Appeler mensuellement.';


-- ── 6. VUE TAILLE PAR TENANT (monitoring) ────────────────────

create or replace view public.tenant_data_size as
select
  o.id                                          as org_id,
  o.name                                        as org_name,
  count(distinct c.id)                          as conversations_count,
  count(distinct d.id)                          as documents_count,
  count(distinct al.id)                         as audit_logs_count,
  count(distinct ue.id)                         as usage_events_count,
  max(c.created_at)                             as last_conversation_at
from public.organizations o
left join public.conversations  c  on c.organization_id = o.id
left join public.documents      d  on d.organization_id = o.id
left join public.audit_logs     al on al.organization_id = o.id
left join public.usage_events   ue on ue.org_id = o.id
group by o.id, o.name
order by conversations_count desc;

comment on view public.tenant_data_size is
  'Volume de données par organisation — utile pour identifier les gros tenants.';
