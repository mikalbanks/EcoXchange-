-- SPEC 04 / 0016: stable project identity.

create table if not exists project_finance.projects (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references project_finance.organizations(id) on delete restrict,
  name text not null,
  internal_project_code text,
  projectco_name text,
  sponsor_name text,
  technology text not null,
  country_code text not null default 'US',
  state_code text,
  county text,
  city text,
  capacity_mw_ac numeric(18,10),
  development_status text check (development_status is null or development_status in ('DEVELOPMENT','READY_TO_BUILD','CONSTRUCTION','OPERATING','RETIRED','UNKNOWN')),
  revenue_structure text check (revenue_structure is null or revenue_structure in ('FULLY_CONTRACTED','PARTIALLY_CONTRACTED','MERCHANT','UNKNOWN')),
  created_by uuid references project_finance.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz
);

create index if not exists pf_projects_organization_idx on project_finance.projects(organization_id);
create index if not exists pf_projects_updated_idx on project_finance.projects(updated_at desc);

create trigger projects_touch_updated_at
before update on project_finance.projects
for each row execute function project_finance.touch_updated_at();

create or replace function project_finance.can_access_project(p_project_id uuid)
returns boolean language sql stable security definer set search_path = project_finance, public as $$
  select exists (
    select 1 from project_finance.projects p
    where p.id = p_project_id
      and p.organization_id = project_finance.current_organization_id()
  )
$$;

alter table project_finance.projects enable row level security;
create policy projects_same_org on project_finance.projects
for all to authenticated
using (organization_id = project_finance.current_organization_id())
with check (organization_id = project_finance.current_organization_id());
