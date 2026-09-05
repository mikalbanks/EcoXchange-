# Ticket 17 preflight

Ticket 17 proceeds as stacked implementation work even though Ticket 16 and earlier stacked tickets remain formally unvalidated because GitHub Actions is failing before runner allocation.

The authoritative Ticket 06 sensitivity function is independently callable from immutable `ProjectFinanceInput` and supports only PPA_PRICE, INTEREST_RATE, PROJECT_CAPEX, CAPACITY_FACTOR, and ITC_RATE. Ticket 08 already defines `sensitivity_runs` and `sensitivity_points`, including `base_calculation_run_id` and `child_calculation_run_id`. Ticket 13 deferred sensitivity execution/retrieval endpoints, so Ticket 17 may add narrow service/API orchestration only.

No finance formulas, underwriting rules, database schema, AI, external data, or frontend authoritative calculations may be added.
