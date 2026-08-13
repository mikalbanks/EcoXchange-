// The benchmark artifact lives at the repo root (`shared/benchmark/`) so that
// www (client/) and demo (this app) publish the same figures. This module is
// the dashboard's door onto it — import from here, never re-read the JSON and
// never re-type a statistic into a component.
export * from "../../../shared/benchmark/index.js";
export { BENCHMARK as default } from "../../../shared/benchmark/index.js";
