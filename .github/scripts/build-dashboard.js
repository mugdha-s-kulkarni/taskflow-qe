#!/usr/bin/env node
// Plain Node, zero dependencies — combines the Playwright and k6 JSON
// outputs into one static dashboard site. Runs as the last CI job so a
// red build still updates the published dashboard to show the failure.

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "../..");
const DIST = path.join(ROOT, "dashboard", "dist");

function readJsonSafe(p) {
  try {
    return JSON.parse(fs.readFileSync(p, "utf8"));
  } catch {
    return null;
  }
}

function playwrightSummary(resultsPath) {
  const data = readJsonSafe(resultsPath);
  if (!data) return { available: false };
  const { expected = 0, unexpected = 0, skipped = 0, flaky = 0 } = data.stats || {};
  return {
    available: true,
    passed: expected,
    failed: unexpected,
    skipped,
    flaky,
    total: expected + unexpected + skipped + flaky,
    durationMs: data.stats?.duration ?? 0,
  };
}

function k6Summaries(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".json"))
    .map((f) => {
      const data = readJsonSafe(path.join(dir, f));
      if (!data) return null;
      const name = f.replace(/\.json$/, "");
      const reqs = data.metrics?.http_reqs?.values?.count ?? 0;
      const failRate = data.metrics?.http_req_failed?.values?.rate ?? 0;
      const p95 = data.metrics?.http_req_duration?.values?.["p(95)"] ?? null;
      const checksRate = data.metrics?.checks?.values?.rate ?? null;

      const thresholdEntries = [
        ...Object.entries(data.metrics?.http_req_failed?.thresholds ?? {}),
        ...Object.entries(data.metrics?.http_req_duration?.thresholds ?? {}),
      ];
      const thresholdsOk = thresholdEntries.every(([, v]) => v.ok);

      return { name, reqs, failRate, p95, checksRate, thresholdsOk, hasThresholds: thresholdEntries.length > 0 };
    })
    .filter(Boolean)
    .sort((a, b) => a.name.localeCompare(b.name));
}

function badge(ok, label) {
  const cls = ok ? "badge badge-pass" : "badge badge-fail";
  return `<span class="${cls}">${label}</span>`;
}

function fmtMs(ms) {
  if (ms === null || ms === undefined) return "—";
  return `${ms.toFixed(1)} ms`;
}

function fmtPct(rate) {
  if (rate === null || rate === undefined) return "—";
  return `${(rate * 100).toFixed(2)}%`;
}

function copyIfExists(src, dest) {
  if (fs.existsSync(src)) {
    fs.cpSync(src, dest, { recursive: true });
    return true;
  }
  return false;
}

function main() {
  fs.rmSync(DIST, { recursive: true, force: true });
  fs.mkdirSync(DIST, { recursive: true });

  const e2e = playwrightSummary(path.join(ROOT, "tests", "reports", "e2e-results.json"));
  const contract = playwrightSummary(path.join(ROOT, "tests", "reports", "api-results.json"));
  const k6 = k6Summaries(path.join(ROOT, "tests", "load", "k6", "results"));

  const hasE2eReport = copyIfExists(path.join(ROOT, "tests", "reports", "e2e-html"), path.join(DIST, "e2e"));
  const hasContractReport = copyIfExists(
    path.join(ROOT, "tests", "reports", "api-html"),
    path.join(DIST, "contract")
  );

  const k6Dir = path.join(DIST, "k6");
  fs.mkdirSync(k6Dir, { recursive: true });
  for (const s of k6) {
    const src = path.join(ROOT, "tests", "load", "k6", "results", `${s.name}.html`);
    copyIfExists(src, path.join(k6Dir, `${s.name}.html`));
  }

  const overallOk =
    (!e2e.available || e2e.failed === 0) &&
    (!contract.available || contract.failed === 0) &&
    k6.every((s) => !s.hasThresholds || s.thresholdsOk);

  const generatedAt = new Date().toISOString();

  const html = `<!doctype html>
<html lang="en" data-theme="dark">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>TaskFlow QE Dashboard</title>
<style>
  :root { color-scheme: dark; }
  * { box-sizing: border-box; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    background: #0f1117; color: #e6e8ee; margin: 0; padding: 40px 20px 80px;
  }
  .wrap { max-width: 860px; margin: 0 auto; }
  h1 { margin: 0 0 4px; }
  .meta { color: #8b93a7; font-size: 13px; margin-bottom: 28px; }
  .status-line { display: flex; align-items: center; gap: 12px; margin-bottom: 32px; }
  h2 { font-size: 15px; text-transform: uppercase; letter-spacing: 0.05em; color: #8b93a7; margin: 32px 0 12px; }
  .card { background: #171a23; border: 1px solid #262b38; border-radius: 12px; padding: 20px; margin-bottom: 12px; }
  .row { display: flex; justify-content: space-between; align-items: center; }
  .stat-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-top: 12px; }
  .stat { background: #10131a; border-radius: 8px; padding: 10px 12px; }
  .stat .n { font-size: 20px; font-weight: 700; }
  .stat .l { font-size: 11px; color: #8b93a7; text-transform: uppercase; }
  a { color: #5b8cff; text-decoration: none; font-size: 13px; }
  a:hover { text-decoration: underline; }
  table { width: 100%; border-collapse: collapse; margin-top: 12px; font-size: 13px; }
  th, td { text-align: left; padding: 8px 10px; border-bottom: 1px solid #262b38; }
  th { color: #8b93a7; font-weight: 500; text-transform: uppercase; font-size: 11px; }
  .badge { font-size: 11px; font-weight: 700; padding: 3px 9px; border-radius: 999px; text-transform: uppercase; }
  .badge-pass { background: rgba(75, 214, 143, 0.15); color: #4bd68f; }
  .badge-fail { background: rgba(255, 107, 107, 0.15); color: #ff6b6b; }
  .badge-na { background: rgba(139, 147, 167, 0.15); color: #8b93a7; }
  .empty { color: #8b93a7; font-size: 13px; }
</style>
</head>
<body>
  <div class="wrap">
    <h1>TaskFlow QE Dashboard</h1>
    <div class="meta">Generated ${generatedAt}</div>

    <div class="status-line">
      ${badge(overallOk, overallOk ? "All checks passed" : "Some checks failed")}
    </div>

    <h2>Contract tests (API, no browser)</h2>
    ${renderPlaywrightCard(contract, hasContractReport ? "contract/index.html" : null)}

    <h2>End-to-end tests (browser)</h2>
    ${renderPlaywrightCard(e2e, hasE2eReport ? "e2e/index.html" : null)}

    <h2>Load tests (k6)</h2>
    ${renderK6Table(k6)}
  </div>
</body>
</html>
`;

  fs.writeFileSync(path.join(DIST, "index.html"), html);
  console.log(`Dashboard written to ${path.relative(ROOT, DIST)}/index.html`);
}

function renderPlaywrightCard(summary, reportLink) {
  if (!summary.available) {
    return `<div class="card"><span class="empty">No results found for this run.</span></div>`;
  }
  const ok = summary.failed === 0;
  return `<div class="card">
    <div class="row">
      ${badge(ok, ok ? "passed" : "failed")}
      ${reportLink ? `<a href="${reportLink}">Open full report →</a>` : ""}
    </div>
    <div class="stat-grid">
      <div class="stat"><div class="n">${summary.passed}</div><div class="l">Passed</div></div>
      <div class="stat"><div class="n">${summary.failed}</div><div class="l">Failed</div></div>
      <div class="stat"><div class="n">${summary.skipped}</div><div class="l">Skipped</div></div>
      <div class="stat"><div class="n">${(summary.durationMs / 1000).toFixed(1)}s</div><div class="l">Duration</div></div>
    </div>
  </div>`;
}

function renderK6Table(scenarios) {
  if (scenarios.length === 0) {
    return `<div class="card"><span class="empty">No k6 results found for this run.</span></div>`;
  }
  const rows = scenarios
    .map(
      (s) => `<tr>
      <td>${s.name}</td>
      <td>${s.reqs}</td>
      <td>${fmtPct(s.failRate)}</td>
      <td>${fmtMs(s.p95)}</td>
      <td>${fmtPct(s.checksRate)}</td>
      <td>${s.hasThresholds ? badge(s.thresholdsOk, s.thresholdsOk ? "ok" : "breached") : `<span class="badge badge-na">n/a</span>`}</td>
      <td><a href="k6/${s.name}.html">Report →</a></td>
    </tr>`
    )
    .join("");

  return `<div class="card">
    <table>
      <thead>
        <tr><th>Scenario</th><th>Requests</th><th>Error rate</th><th>p95 latency</th><th>Checks passed</th><th>Thresholds</th><th></th></tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  </div>`;
}

main();
