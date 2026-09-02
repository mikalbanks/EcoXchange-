-- TICKET 08 / SPEC 04: project-finance tenancy foundation.
-- EcoXchange currently authenticates with public.users. This migration extends that
-- identity model with a durable organization key instead of creating a second auth system.

create schema if not exists project_finance;
create extension if not exists pgcrypto;

grant usage on schema project_finance to authenticated, service_role;

create table if not exists project_finance.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  legacy_org_key text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz
);

alter table public.users add column if not exists organization_id uuid;
alter table public.users add column if not exists auth_user_id uuid;

-- Backfill one durable organization per legacy org_name. Users without org_name receive
-- a personal organization so no existing account is orphaned by the tenancy migration.
insert into project_finance.organizations(name, legacy_org_key)
select distinct
  coalesce(nullif(trim(u.org_name), ''), 'Personal Workspace ' || u.id),
  coalesce('org:' || nullif(trim(u.org_name), ''), 'user:' || u.id)
from public.users u
on conflict (legacy_org_key) do nothing;

update public.users u
set organization_id = o.id
from project_finance.organizations o
where u.organization_id is null
  and o.legacy_org_key = coalesce('org:' || nullif(trim(u.org_name), ''), 'user:' || u.id);

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'users_project_finance_organization_fk'
      and conrelid = 'public.users'::regclass
  ) then
    alter table public.users
      add constraint users_project_finance_organization_fk
      foreign key (organization_id) references project_finance.organizations(id) on delete restrict;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'users_auth_user_id_unique'
      and conrelid = 'public.users'::regclass
  ) then
    alter table public.users add constraint users_auth_user_id_unique unique (auth_user_id);
  end if;
end $$;

-- Existing rows are backfilled above; future users must have an organization.
alter table public.users alter column organization_id set not null;

create or replace function project_finance.touch_updated_at()
returns trigger
language plpgsql
set search_path = project_finance, public
as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- Server-side requests may SET LOCAL app.organization_id after validating the local
-- Express session. Direct Supabase-auth requests may alternatively resolve through
-- public.users.auth_user_id. Client-supplied row organization_id is never trusted.
create or replace function project_finance.current_organization_id()
returns uuid
language plpgsql
stable
security definer
set search_path = project_finance, public
as $$
declare
  configured text;
  resolved uuid;
begin
  configured := nullif(current_setting('app.organization_id', true), '');
  if configured is not null then
    begin
      return configured::uuid;
    exception when invalid_text_representation then
      return null;
    end;
  end if;

  if auth.uid() is not null then
    select u.organization_id into resolved
    from public.users u
    where u.auth_user_id = auth.uid()
    limit 1;
  end if;

  return resolved;
end $$;

create or replace function project_finance.current_actor_user_id()
returns varchar
language plpgsql
stable
security definer
set search_path = project_finance, public
as $$
declare
  configured text;
  resolved varchar;
begin
  configured := nullif(current_setting('app.user_id', true), '');
  if configured is not null then return configured; end if;

  if auth.uid() is not null then
    select u.id into resolved from public.users u where u.auth_user_id = auth.uid() limit 1;
  end if;
  return resolved;
end $$;

revoke all on function project_finance.current_organization_id() from public;
revoke all on function project_finance.current_actor_user_id() from public;
grant execute on function project_finance.current_organization_id() to authenticated, service_role;
grant execute on function project_finance.current_actor_user_id() to authenticated, service_role;

create trigger organizations_touch_updated_at
before update on project_finance.organizations
for each row execute function project_finance.touch_updated_at();

alter table project_finance.organizations enable row level security;

create policy organizations_same_org_select on project_finance.organizations
for select to authenticated
using (id = project_finance.current_organization_id());

create policy organizations_same_org_update on project_finance.organizations
for update to authenticated
using (id = project_finance.current_organization_id())
with check (id = project_finance.current_organization_id());

comment on schema project_finance is 'Immutable, tenant-scoped project-finance underwriting records. Finance math remains authoritative in application code.';
comment on column public.users.organization_id is 'Durable EcoXchange tenant key used by project-finance RLS; replaces org_name as an authorization boundary.';
