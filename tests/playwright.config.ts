import { defineConfig, devices } from "@playwright/test";

const FRONTEND_URL = "http://localhost:5173";
const API_URL = "http://localhost:4000";

export default defineConfig({
  testDir: "./e2e/specs",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  globalSetup: require.resolve("./global-setup"),
  reporter: [
    ["list"],
    ["html", { outputFolder: "reports/e2e-html", open: "never" }],
    ["json", { outputFile: "reports/e2e-results.json" }],
  ],
  use: {
    baseURL: FRONTEND_URL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  ],
  webServer: [
    {
      command: "npm run dev",
      cwd: "../app/backend",
      url: `${API_URL}/health`,
      reuseExistingServer: !process.env.CI,
      env: { NODE_ENV: "test", PORT: "4000" },
      timeout: 30_000,
    },
    {
      command: "npm run dev",
      cwd: "../app/frontend",
      url: FRONTEND_URL,
      reuseExistingServer: !process.env.CI,
      env: { VITE_API_URL: API_URL },
      timeout: 30_000,
    },
  ],
});
