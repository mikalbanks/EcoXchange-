-- 003_demo_investor.sql
-- Demo investor + Savannah holding + cash_out preference + 6 months of
-- distribution history (Spec 09). Run AFTER 009_investor_preferences.sql and
-- after the Savannah offering exists (setup-offerings.sql).

INSERT INTO investors (id, email, wallet_address, accreditation_status, kyc_status, account_type)
VALUES (
    'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    'demo-investor@ecoxchange.net',
    '0xDemoWalletAddress1234567890abcdef',
    'verified', 'verified', 'individual'
);

INSERT INTO investor_holdings (investor_id, offering_id, tokens_held, cost_basis)
VALUES (
    'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    (SELECT id FROM offerings WHERE slug = 'savannah-solar-i'),
    100, 10000
);

INSERT INTO distribution_preferences (investor_id, offering_id, preference)
VALUES (
    'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    (SELECT id FROM offerings WHERE slug = 'savannah-solar-i'),
    'cash_out'
);

INSERT INTO distribution_history
    (investor_id, offering_id, period_start, period_end, gross_distribution, platform_fee, net_distribution, action_taken, status)
SELECT
    'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    (SELECT id FROM offerings WHERE slug = 'savannah-solar-i'),
    d::date,
    (d + interval '1 month' - interval '1 day')::date,
    58.33,
    0.00,
    58.33,
    'cash_out',
    'completed'
FROM generate_series('2024-01-01'::date, '2024-06-01'::date, '1 month') AS d;
