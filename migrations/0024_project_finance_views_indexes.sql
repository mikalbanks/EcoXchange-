-- TICKET 08 / SPEC 04: read models, indexes, and private storage policies.

create or replace view project_finance.project_underwriting_summary
with (security_invoker = true)
as
select
  p.id as project_id,
  p.organization_id,
  p.name as project_name,
  latest_calc.id as latest_successful_calculation_run_id,
  latest_underwriting.id as latest_underwriting_run_id,
  fr.permanent_debt,
  fr.debt_to_capex,
  csr.sponsor_equity,
  latest_calc.completed_at as latest_calculation_at,
  latest_underwriting.overall_status as latest_underwriting_status
from project_finance.projects p
left join lateral (
  select r.*
  from project_finance.calculation_runs r
  where r.project_id = p.id and r.organization_id = p.organization_id and r.status = 'SUCCESS'
  order by r.completed_at desc nulls last, r.created_at desc
  limit 1
) latest_calc on true
left join project_finance.financing_results fr on fr.calculation_run_id = latest_calc.id
left join project_finance.capital_stack_results csr on csr.calculation_run_id = latest_calc.id
left join lateral (
  select u.*
  from project_finance.underwriting_runs u
  where u.project_id = p.id and u.organization_id = p.organization_id and u.status = 'SUCCESS'
  order by u.completed_at desc nulls last, u.created_at desc
  limit 1
) latest_underwriting on true;

create or replace view project_finance.scenario_comparison_summary
with (security_invoker = true)
as
select
  s.id as scenario_id,
  s.organization_id,
  s.project_id,
  s.name as scenario_name,
  latest_calc.id as latest_run_id,
  fr.permanent_debt,
  fr.debt_to_capex,
  csr.sponsor_equity,
  fr.minimum_dscr,
  rr.levered_sponsor_cash_irr,
  fr.binding_constraint
from project_finance.scenarios s
left join lateral (
  select r.*
  from project_finance.calculation_runs r
  where r.scenario_id = s.id and r.organization_id = s.organization_id and r.status = 'SUCCESS'
  order by r.completed_at desc nulls last, r.created_at desc
  limit 1
) latest_calc on true
left join project_finance.financing_results fr on fr.calculation_run_id = latest_calc.id
left join project_finance.capital_stack_results csr on csr.calculation_run_id = latest_calc.id
left join project_finance.return_results rr on rr.calculation_run_id = latest_calc.id;

create index if not exists pf_projects_org_status_idx
  on project_finance.projects(organization_id, development_status, created_at desc);
create index if not exists pf_documents_checksum_idx
  on project_finance.project_documents(organization_id, checksum)
  where checksum is not null;
create index if not exists pf_scenarios_status_idx
  on project_finance.scenarios(organization_id, status, updated_at desc);
create index if not exists pf_calc_status_created_idx
  on project_finance.calculation_runs(organization_id, status, created_at desc);
create index if not exists pf_underwriting_status_created_idx
  on project_finance.underwriting_runs(organization_id, status, created_at desc);

-- Supabase Storage is optional in local PostgreSQL test environments. When present,
-- create a private project-finance bucket and tenant-path policies. Paths must begin
-- organization_id/project_id/... and are never public.
do $$
begin
  if to_regclass('storage.buckets') is not null and to_regclass('storage.objects') is not null then
    execute $sql$
      insert into storage.buckets(id, name, public)
      values ('project-finance-documents', 'project-finance-documents', false)
      on conflict (id) do update set public = false
    $sql$;

    if not exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'pf_documents_storage_read') then
      execute $sql$
        create policy pf_documents_storage_read on storage.objects
        for select to authenticated
        using (
          bucket_id = 'project-finance-documents'
          and (storage.foldername(name))[1] = project_finance.current_organization_id()::text
        )
      $sql$;
    end if;

    if not exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'pf_documents_storage_insert') then
      execute $sql$
        create policy pf_documents_storage_insert on storage.objects
        for insert to authenticated
        with check (
          bucket_id = 'project-finance-documents'
          and (storage.foldername(name))[1] = project_finance.current_organization_id()::text
        )
      $sql$;
    end if;
  end if;
end $$;

comment on view project_finance.current_project_facts is 'Current accepted fact rows only; scenario/policy precedence is intentionally resolved in application code.';
comment on view project_finance.project_underwriting_summary is 'Read model over persisted results only; contains no finance or underwriting formulas.';
comment on view project_finance.scenario_comparison_summary is 'Read model over latest persisted successful calculations; contains no scenario-resolution logic.';
