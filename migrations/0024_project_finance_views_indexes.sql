-- SPEC 04 / 0024: views, helper functions, future-compatible exports/model usage.

create table if not exists project_finance.underwriting_exports (
  id uuid primary key default gen_random_uuid(),
  underwriting_run_id uuid not null references project_finance.underwriting_runs(id) on delete restrict,
  calculation_run_id uuid not null references project_finance.calculation_runs(id) on delete restrict,
  export_type text not null check (export_type in ('PDF','XLSX','CREDIT_MEMO','OTHER')),
  storage_path text not null,
  generated_at timestamptz not null default now(),
  generated_by uuid references project_finance.users(id) on delete restrict
);

create table if not exists project_finance.model_usage_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references project_finance.organizations(id) on delete restrict,
  project_id uuid references project_finance.projects(id) on delete restrict,
  scenario_id uuid references project_finance.scenarios(id) on delete restrict,
  provider text not null,
  model text not null,
  operation_type text not null check (operation_type in ('DOCUMENT_EXTRACTION','UNDERWRITING_EXPLANATION','CREDIT_MEMO','MISSING_DATA_ANALYSIS','OTHER')),
  input_tokens bigint not null default 0,
  cached_input_tokens bigint not null default 0,
  output_tokens bigint not null default 0,
  estimated_cost numeric(24,10) not null default 0,
  created_at timestamptz not null default now()
);

create or replace function project_finance.get_latest_successful_calculation(p_scenario_id uuid)
returns project_finance.calculation_runs
language sql stable security definer set search_path=project_finance,public as $$
  select r.* from project_finance.calculation_runs r
  where r.scenario_id=p_scenario_id and r.status='SUCCESS'
  order by r.completed_at desc nulls last, r.created_at desc
  limit 1
$$;

create or replace function project_finance.get_latest_underwriting_run(p_scenario_id uuid)
returns project_finance.underwriting_runs
language sql stable security definer set search_path=project_finance,public as $$
  select r.* from project_finance.underwriting_runs r
  where r.scenario_id=p_scenario_id and r.status='SUCCESS'
  order by r.completed_at desc nulls last, r.created_at desc
  limit 1
$$;

create or replace view project_finance.project_underwriting_summary as
select
  p.id as project_id,
  p.organization_id,
  p.name as project_name,
  p.capacity_mw_ac,
  p.state_code,
  s.id as latest_scenario_id,
  fr.permanent_debt as latest_permanent_debt,
  fr.min_dscr as latest_min_dscr,
  ur.overall_credit_status as latest_credit_status,
  ur.financing_readiness as latest_financing_readiness,
  coalesce(ur.completed_at,cr.completed_at,cr.created_at) as latest_run_date
from project_finance.projects p
left join lateral (
  select s1.* from project_finance.scenarios s1
  where s1.project_id=p.id and s1.archived_at is null
  order by s1.updated_at desc limit 1
) s on true
left join lateral (
  select c.* from project_finance.calculation_runs c
  where c.scenario_id=s.id and c.status='SUCCESS'
  order by c.completed_at desc nulls last,c.created_at desc limit 1
) cr on true
left join project_finance.financing_results fr on fr.calculation_run_id=cr.id
left join lateral (
  select u.* from project_finance.underwriting_runs u
  where u.scenario_id=s.id and u.status='SUCCESS'
  order by u.completed_at desc nulls last,u.created_at desc limit 1
) ur on true;

create or replace view project_finance.scenario_comparison_view as
select
  s.id as scenario_id,
  s.project_id,
  s.organization_id,
  s.name,
  fr.permanent_debt,
  fr.debt_to_capex,
  cs.sponsor_equity,
  fr.min_dscr as minimum_dscr,
  rr.sponsor_cash_irr,
  fr.binding_constraint,
  ur.overall_credit_status
from project_finance.scenarios s
left join lateral (
  select c.* from project_finance.calculation_runs c
  where c.scenario_id=s.id and c.status='SUCCESS'
  order by c.completed_at desc nulls last,c.created_at desc limit 1
) cr on true
left join project_finance.financing_results fr on fr.calculation_run_id=cr.id
left join project_finance.capital_stack_results cs on cs.calculation_run_id=cr.id
left join project_finance.return_results rr on rr.calculation_run_id=cr.id
left join lateral (
  select u.* from project_finance.underwriting_runs u
  where u.calculation_run_id=cr.id and u.status='SUCCESS'
  order by u.completed_at desc nulls last,u.created_at desc limit 1
) ur on true;

create index if not exists pf_model_usage_org_idx on project_finance.model_usage_events(organization_id,created_at desc);
create index if not exists pf_exports_underwriting_idx on project_finance.underwriting_exports(underwriting_run_id);
create index if not exists pf_calc_input_hash_idx on project_finance.calculation_runs(input_hash);

alter table project_finance.underwriting_exports enable row level security;
alter table project_finance.model_usage_events enable row level security;
create policy underwriting_exports_same_org on project_finance.underwriting_exports for select to authenticated
using (project_finance.can_access_underwriting(underwriting_run_id));
create policy model_usage_same_org on project_finance.model_usage_events for select to authenticated
using (organization_id=project_finance.current_organization_id());

-- Object-storage bucket records are additive and safe if Supabase storage exists.
insert into storage.buckets(id,name,public)
values ('project-documents','project-documents',false),('underwriting-exports','underwriting-exports',false)
on conflict (id) do nothing;

-- Storage RLS policies use tenant-scoped paths: organization_id/project_id/...
create policy pf_project_documents_storage_read on storage.objects
for select to authenticated
using (bucket_id='project-documents' and (storage.foldername(name))[1]=project_finance.current_organization_id()::text);
create policy pf_project_documents_storage_write on storage.objects
for insert to authenticated
with check (bucket_id='project-documents' and (storage.foldername(name))[1]=project_finance.current_organization_id()::text);
create policy pf_underwriting_exports_storage_read on storage.objects
for select to authenticated
using (bucket_id='underwriting-exports' and (storage.foldername(name))[1]=project_finance.current_organization_id()::text);
