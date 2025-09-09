const API_URL = process.env.API_URL || "http://localhost:4000";

// Runs once before the whole run (not per worker) — clears any state left
// over from a previous local run so counts/pagination assertions start clean.
export default async function globalSetup(): Promise<void> {
  await fetch(`${API_URL}/api/test/reset`, { method: "POST" }).catch(() => {
    // Backend may take a moment to come up under webServer; tests that
    // depend on a clean slate will still pass since each test uses its
    // own randomly generated user.
  });
}
