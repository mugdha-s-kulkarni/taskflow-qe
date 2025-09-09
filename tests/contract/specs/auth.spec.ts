import { test, expect } from "@playwright/test";
import { assertMatchesSchema } from "../schema";
import { uniqueEmail } from "../helpers";

test.describe("POST /api/auth/register", () => {
  test("valid registration returns 201 and an AuthResponse", async ({ request }) => {
    const email = uniqueEmail("register");
    const res = await request.post("/api/auth/register", {
      data: { email, password: "correct-horse-battery-staple" },
    });

    expect(res.status()).toBe(201);
    const body = await res.json();
    assertMatchesSchema("AuthResponse", body);
    expect(body.email).toBe(email);
  });

  test("registering the same email twice returns 409", async ({ request }) => {
    const email = uniqueEmail("duplicate");
    await request.post("/api/auth/register", { data: { email, password: "correct-horse-battery-staple" } });

    const res = await request.post("/api/auth/register", {
      data: { email, password: "another-valid-password" },
    });

    expect(res.status()).toBe(409);
    assertMatchesSchema("Error", await res.json());
  });

  test("a password under 8 characters returns 400", async ({ request }) => {
    const res = await request.post("/api/auth/register", {
      data: { email: uniqueEmail("weakpw"), password: "short" },
    });

    expect(res.status()).toBe(400);
    assertMatchesSchema("Error", await res.json());
  });

  test("a malformed email returns 400", async ({ request }) => {
    const res = await request.post("/api/auth/register", {
      data: { email: "not-an-email", password: "correct-horse-battery-staple" },
    });

    expect(res.status()).toBe(400);
    assertMatchesSchema("Error", await res.json());
  });
});

test.describe("POST /api/auth/login", () => {
  test("valid credentials return 200 and an AuthResponse", async ({ request }) => {
    const email = uniqueEmail("login");
    const password = "correct-horse-battery-staple";
    await request.post("/api/auth/register", { data: { email, password } });

    const res = await request.post("/api/auth/login", { data: { email, password } });

    expect(res.status()).toBe(200);
    assertMatchesSchema("AuthResponse", await res.json());
  });

  test("wrong password returns 401", async ({ request }) => {
    const email = uniqueEmail("wrongpw");
    await request.post("/api/auth/register", { data: { email, password: "correct-horse-battery-staple" } });

    const res = await request.post("/api/auth/login", { data: { email, password: "not-the-right-one" } });

    expect(res.status()).toBe(401);
    assertMatchesSchema("Error", await res.json());
  });

  test("missing password field returns 400", async ({ request }) => {
    const res = await request.post("/api/auth/login", { data: { email: uniqueEmail("nopw") } });

    expect(res.status()).toBe(400);
    assertMatchesSchema("Error", await res.json());
  });
});
