-- SPEC 04 / 0015: isolated project-finance tenancy domain.
-- A dedicated schema is intentional: public.projects and public.users already exist
-- with incompatible legacy meanings/ID types. Keeping the underwriting domain in
-- project_finance preserves the Spec 04 entity names without mutating live tables.

create schema if not exists project_finance;
create extension if not exists pgcrypto;

grant usage on schema project_finance to authenticated, service_role;

create table if not exists project_finance.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists project_finance.users (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null unique references auth.users(id) on delete restrict,
  organization_id uuid not null references project_finance.organizations(id) on delete restrict,
  display_name text,
  role text not null check (role in ('OWNER','ADMIN','ANALYST','VIEWER')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function project_finance.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

create or replace function project_finance.current_organization_id()
returns uuid
language sql
stable
security definer
set search_path = project_finance, public
as $$
  select u.organization_id
  from project_finance.users u
  where u.auth_user_id = auth.uid()
  limit 1
$$;

create trigger organizations_touch_updated_at
before update on project_finance.organizations
for each row execute function project_finance.touch_updated_at();

create trigger users_touch_updated_at
before update on project_finance.users
for each row execute function project_finance.touch_updated_at();

alter table project_finance.organizations enable row level security;
alter table project_finance.users enable row level security;

create policy organizations_same_org on project_finance.organizations
for select to authenticated
using (id = project_finance.current_organization_id());

create policy users_same_org on project_finance.users
for select to authenticated
using (organization_id = project_finance.current_organization_id());

create policy organizations_admin_update on project_finance.organizations
for update to authenticated
using (id = project_finance.current_organization_id())
with check (id = project_finance.current_organization_id());

create policy users_admin_manage on project_finance.users
for all to authenticated
using (organization_id = project_finance.current_organization_id())
with check (organization_id = project_finance.current_organization_id());
