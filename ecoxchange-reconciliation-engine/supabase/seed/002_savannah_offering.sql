-- 002_savannah_offering.sql
-- Seeds the "Savannah Solar I ESN" offering + its documents (Spec 06). FKs to
-- the seeded Savannah project (001_savannah_backtest.sql). Run after migration
-- 008_offerings_and_documents.sql.

INSERT INTO offerings (
    project_id, offering_name, slug, status,
    target_raise, minimum_investment, total_subscribed,
    token_price, total_tokens, tokens_remaining,
    target_annual_yield, target_irr, distribution_frequency,
    ppa_term_years, ppa_counterparty, ppa_escalator_pct,
    itc_eligible, srec_eligible,
    developer_name, developer_bio, developer_track_record,
    headline, description, investment_thesis,
    risk_factors,
    backtest_mean_deviation, backtest_months_within_10pct,
    target_cod_date, first_distribution_date
) VALUES (
    (SELECT id FROM projects WHERE name LIKE '%Savannah%' LIMIT 1),
    'Savannah Solar I ESN',
    'savannah-solar-i',
    'open',
    2500000, 10000, 750000,
    100, 25000, 17500,
    0.07, 0.12, 'monthly',
    20, 'Georgia Power', 0.02,
    true, false,
    'Lightstar Renewables',
    'Lightstar Renewables is a U.S.-based independent power producer specializing in distributed solar projects in the 1–20 MW range across the Southeast.',
    '1 GW pipeline across 45+ projects; 12 operational plants totaling 38 MW',
    '5 MW Ground-Mount Solar — Savannah, GA',
    'A 5 MW (DC) ground-mount solar installation in Savannah, Georgia, interconnected to Georgia Power under a 20-year PPA with 2% annual escalator. The project sits on 25 leased acres with excellent irradiance (4.8 kWh/m²/day annual average) and is production-verified by EcoXchange''s three-source reconciliation engine.',
    'Savannah offers top-decile irradiance for the Southeast, a credit-worthy utility counterparty in Georgia Power, and a locked-in 20-year revenue stream with built-in inflation protection. The 1–20 MW segment remains structurally underserved by institutional capital — this project fills that gap.',
    ARRAY[
        'Solar production varies with weather conditions and may underperform projections in any given period',
        'Georgia Power PPA is subject to utility credit risk over the 20-year term',
        'Regulatory changes to net metering or solar incentives could affect project economics',
        'Equipment degradation may exceed projected 0.75%/year rate',
        'EcoXchange is a pre-revenue platform; this is among its first offerings',
        'ESN tokens are illiquid — no secondary market is currently available',
        'Past performance of similar projects does not guarantee future results'
    ],
    5.2, 0.92,
    '2024-03-15', '2024-05-01'
);

INSERT INTO project_documents (offering_id, doc_type, title, description, file_url, is_public) VALUES
    ((SELECT id FROM offerings WHERE slug = 'savannah-solar-i'),
     'financial_memo', 'Financial Summary', 'Pro-forma cash flow projections and target returns',
     '/documents/savannah-solar-i/financial-memo.pdf', true),
    ((SELECT id FROM offerings WHERE slug = 'savannah-solar-i'),
     'ppa_summary', 'PPA Summary', 'Key terms of the Georgia Power power purchase agreement',
     '/documents/savannah-solar-i/ppa-summary.pdf', true),
    ((SELECT id FROM offerings WHERE slug = 'savannah-solar-i'),
     'verification_report', 'Verification Backtest Report', '12-month historical production backtest results',
     '/documents/savannah-solar-i/verification-report.pdf', true),
    ((SELECT id FROM offerings WHERE slug = 'savannah-solar-i'),
     'ppm', 'Private Placement Memorandum', 'Full offering documents — available after subscription',
     '/documents/savannah-solar-i/ppm.pdf', false);
