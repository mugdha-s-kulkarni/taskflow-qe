import { textSummary } from "https://jslib.k6.io/k6-summary/0.1.0/index.js";
import { htmlReport } from "https://raw.githubusercontent.com/benc-uk/k6-reporter/main/dist/bundle.js";

/**
 * Shared handleSummary() for every script: one call produces a colored
 * terminal summary, a machine-readable JSON file (what build-dashboard.js
 * reads), and a standalone HTML report — without duplicating this in every
 * load test file.
 */
export function buildSummary(name, data) {
  return {
    stdout: textSummary(data, { indent: " ", enableColors: true }),
    [`results/${name}.json`]: JSON.stringify(data),
    [`results/${name}.html`]: htmlReport(data, { title: `TaskFlow load test — ${name}` }),
  };
}
