-- 017_backfill_savannah_simulated_provenance.sql
--
-- The historical Savannah demo year is a synthetic fixture. Its inverter series
-- was generated from expected production with synthetic noise and annual
-- rescaling; the utility series was then derived from the synthetic inverter
-- series. Backfill explicit per-leg provenance so these records can never be
-- mistaken for three independent measured sources.

INSERT INTO verification_source_legs (
  verification_record_id,
  source,
  basis,
  provider,
  source_record_id,
  retrieved_at,
  depends_on_source,
  lineage,
  expected_intervals,
  observed_intervals,
  coverage_pct
)
SELECT
  r.id,
  s.source::data_source,
  s.basis,
  s.provider,
  concat('savannah-demo:', to_char(r.period_start, 'YYYY-MM'), ':', s.source),
  NULL,
  s.depends_on_source::data_source,
  s.lineage,
  1,
  CASE WHEN s.source = 'utility_meter' AND r.utility_kwh IS NULL THEN 0 ELSE 1 END,
  CASE WHEN s.source = 'utility_meter' AND r.utility_kwh IS NULL THEN 0 ELSE 100 END
FROM verification_records r
JOIN projects p ON p.id = r.project_id
CROSS JOIN LATERAL (
  VALUES
    (
      'inverter',
      'simulated',
      'EcoXchange Savannah demo fixture',
      'satellite',
      jsonb_build_object(
        'fixture', 'savannah_demo',
        'generator', 'ecoxchange-dashboard/scripts/generate-realistic-seed.mjs',
        'derivation', 'expected generation with synthetic monthly noise and annual rescaling',
        'independent_measurement', false
      )
    ),
    (
      'utility_meter',
      'derived',
      'EcoXchange Savannah demo fixture',
      'inverter',
      jsonb_build_object(
        'fixture', 'savannah_demo',
        'generator', 'ecoxchange-dashboard/scripts/generate-realistic-seed.mjs',
        'derivation', 'synthetic inverter output adjusted for line loss and synthetic metering noise',
        'independent_measurement', false
      )
    ),
    (
      'satellite',
      'modeled',
      'EcoXchange demo expected-generation model',
      NULL,
      jsonb_build_object(
        'fixture', 'savannah_demo',
        'role', 'expected_generation_model',
        'independent_measurement', false
      )
    )
) AS s(source, basis, provider, depends_on_source, lineage)
WHERE p.name = 'Savannah Community Solar 5MW'
ON CONFLICT (verification_record_id, source) DO UPDATE SET
  basis = EXCLUDED.basis,
  provider = EXCLUDED.provider,
  source_record_id = EXCLUDED.source_record_id,
  retrieved_at = EXCLUDED.retrieved_at,
  depends_on_source = EXCLUDED.depends_on_source,
  lineage = EXCLUDED.lineage,
  expected_intervals = EXCLUDED.expected_intervals,
  observed_intervals = EXCLUDED.observed_intervals,
  coverage_pct = EXCLUDED.coverage_pct;
