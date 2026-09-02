-- TICKET 08 / SPEC 04: versioned underwriting-policy storage only.
-- No policy defaults or credit rules are activated here; Ticket 09 owns policy logic.

create table if not exists project_finance.underwriting_policies (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references project_finance.organizations(id) on delete restrict,
  policy_code text not null,
  policy_version text not null,
  status text not null default 'DRAFT' check (status in ('DRAFT','ACTIVE','RETIRED')),
  effective_date date,
  retired_at timestamptz,
  description text,
  source_reference text,
  policy_hash text,
  created_by varchar references public.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  unique (id, policy_version)
);

create unique index if not exists pf_policy_scope_code_version_unique
  on project_finance.underwriting_policies(coalesce(organization_id, '00000000-0000-0000-0000-000000000000'::uuid), policy_code, policy_version);
create index if not exists pf_policy_active_idx
  on project_finance.underwriting_policies(organization_id, policy_code, effective_date desc)
  where status = 'ACTIVE';

create table if not exists project_finance.underwriting_policy_values (
  id uuid primary key default gen_random_uuid(),
  policy_id uuid not null references project_finance.underwriting_policies(id) on delete restrict,
  field_key text not null,
  value_json jsonb not null,
  unit text,
  applicability_json jsonb,
  source_reference text,
  created_at timestamptz not null default now()
);

create unique index if not exists pf_policy_value_applicability_unique
  on project_finance.underwriting_policy_values(
    policy_id,
    field_key,
    md5(coalesce(applicability_json::text, 'null'))
  );
create index if not exists pf_policy_values_idx on project_finance.underwriting_policy_values(policy_id, field_key);

alter table project_finance.scenario_assumptions
  add constraint scenario_assumptions_policy_fk
  foreign key (policy_id) references project_finance.underwriting_policies(id) on delete restrict;

alter table project_finance.policy_overrides
  add constraint policy_overrides_policy_fk
  foreign key (policy_id) references project_finance.underwriting_policies(id) on delete restrict;

alter table project_finance.underwriting_policies enable row level security;
alter table project_finance.underwriting_policy_values enable row level security;

create policy policies_read_scope on project_finance.underwriting_policies
for select to authenticated
using (organization_id is null or organization_id = project_finance.current_organization_id());

create policy policy_values_read_scope on project_finance.underwriting_policy_values
for select to authenticated
using (exists (
  select 1 from project_finance.underwriting_policies p
  where p.id = policy_id
    and (p.organization_id is null or p.organization_id = project_finance.current_organization_id())
));

-- No authenticated write policies. Policy versions are administered by trusted backend processes.
