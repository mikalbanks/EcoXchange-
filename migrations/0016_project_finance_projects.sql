-- TICKET 08 / SPEC 04: stable project-finance project identity.
-- public.dev_projects remains the legacy marketplace/developer record. This table is the
-- immutable-underwriting identity boundary and can optionally link back to that legacy row.

create table if not exists project_finance.projects (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references project_finance.organizations(id) on delete restrict,
  legacy_dev_project_id varchar references public.dev_projects(id) on delete restrict,
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
  created_by varchar references public.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  unique (id, organization_id),
  unique (organization_id, legacy_dev_project_id)
);

create index if not exists pf_projects_organization_idx on project_finance.projects(organization_id);
create index if not exists pf_projects_updated_idx on project_finance.projects(organization_id, updated_at desc);
create index if not exists pf_projects_active_idx on project_finance.projects(organization_id, updated_at desc) where archived_at is null;

create trigger projects_touch_updated_at
before update on project_finance.projects
for each row execute function project_finance.touch_updated_at();

create or replace function project_finance.can_access_project(p_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = project_finance, public
as $$
  select exists (
    select 1 from project_finance.projects p
    where p.id = p_project_id
      and p.organization_id = project_finance.current_organization_id()
  )
$$;

revoke all on function project_finance.can_access_project(uuid) from public;
grant execute on function project_finance.can_access_project(uuid) to authenticated, service_role;

alter table project_finance.projects enable row level security;

create policy projects_same_org_select on project_finance.projects
for select to authenticated
using (organization_id = project_finance.current_organization_id());

create policy projects_same_org_insert on project_finance.projects
for insert to authenticated
with check (
  organization_id = project_finance.current_organization_id()
  and (created_by is null or created_by = project_finance.current_actor_user_id())
);

create policy projects_same_org_update on project_finance.projects
for update to authenticated
using (organization_id = project_finance.current_organization_id())
with check (organization_id = project_finance.current_organization_id());

-- No authenticated DELETE policy: project history is archived, never hard-deleted.
