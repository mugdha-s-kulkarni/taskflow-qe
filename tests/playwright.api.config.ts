import { defineConfig } from "@playwright/test";

const API_URL = "http://localhost:4000";

// Separate config from playwright.config.ts on purpose: contract tests only
// need the backend, so CI can run this job without ever building the
// frontend. See tests/contract/README.md.
export default defineConfig({
  testDir: "./contract/specs",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  globalSetup: require.resolve("./global-setup"),
  reporter: [
    ["list"],
    ["html", { outputFolder: "reports/api-html", open: "never" }],
    ["json", { outputFile: "reports/api-results.json" }],
  ],
  use: {
    baseURL: API_URL,
    extraHTTPHeaders: { "Content-Type": "application/json" },
  },
  webServer: {
    command: "npm run dev",
    cwd: "../app/backend",
    url: `${API_URL}/health`,
    reuseExistingServer: !process.env.CI,
    env: { NODE_ENV: "test", PORT: "4000" },
    timeout: 30_000,
  },
});
