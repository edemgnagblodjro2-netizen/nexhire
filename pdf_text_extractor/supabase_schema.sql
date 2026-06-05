create extension if not exists pgcrypto;

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique,
  created_at timestamptz not null default now()
);

create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  organization_id uuid references public.organizations(id) on delete set null,
  email text not null,
  full_name text,
  role text not null default 'member',
  created_at timestamptz not null default now()
);

create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  user_id uuid references public.users(id) on delete set null,
  filename text not null,
  mime_type text not null default 'application/pdf',
  source_system text not null default 'upload',
  storage_path text,
  content_text text not null default '',
  summary text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  document_id uuid references public.documents(id) on delete cascade,
  user_id uuid references public.users(id) on delete set null,
  question text not null,
  answer text not null,
  model text,
  assistant_mode text not null default 'enterprise',
  language text not null default 'fr',
  connector_ids jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'documents_source_system_check'
  ) then
    alter table public.documents
      add constraint documents_source_system_check
      check (
        source_system in (
          'upload',
          'microsoft_365',
          'salesforce',
          'servicenow',
          'jira',
          'sap',
          'workday'
        )
      );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'conversations_assistant_mode_check'
  ) then
    alter table public.conversations
      add constraint conversations_assistant_mode_check
      check (assistant_mode in ('enterprise', 'municipal', 'recruiting'));
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'conversations_language_check'
  ) then
    alter table public.conversations
      add constraint conversations_language_check
      check (language in ('fr', 'en'));
  end if;
end $$;

create index if not exists users_organization_id_idx
  on public.users (organization_id);

create index if not exists documents_organization_id_created_at_idx
  on public.documents (organization_id, created_at desc);

create index if not exists conversations_document_id_created_at_idx
  on public.conversations (document_id, created_at asc);

alter table public.organizations enable row level security;
alter table public.users enable row level security;
alter table public.documents enable row level security;
alter table public.conversations enable row level security;

create policy "Users can read their organization"
  on public.organizations
  for select
  using (
    exists (
      select 1
      from public.users u
      where u.id = auth.uid()
        and u.organization_id = organizations.id
    )
  );

create policy "Users can read organization users"
  on public.users
  for select
  using (
    id = auth.uid()
    or exists (
      select 1
      from public.users current_user
      where current_user.id = auth.uid()
        and current_user.organization_id = users.organization_id
    )
  );

create policy "Users can read organization documents"
  on public.documents
  for select
  using (
    exists (
      select 1
      from public.users u
      where u.id = auth.uid()
        and u.organization_id = documents.organization_id
    )
  );

create policy "Users can read organization conversations"
  on public.conversations
  for select
  using (
    exists (
      select 1
      from public.users u
      where u.id = auth.uid()
        and u.organization_id = conversations.organization_id
    )
  );
