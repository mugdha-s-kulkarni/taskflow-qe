import { test, expect } from "@playwright/test";
import { assertMatchesSchema } from "../schema";

test("GET /health reports ok and matches the Health schema", async ({ request }) => {
  const res = await request.get("/health");

  expect(res.status()).toBe(200);
  const body = await res.json();
  assertMatchesSchema("Health", body);
});
