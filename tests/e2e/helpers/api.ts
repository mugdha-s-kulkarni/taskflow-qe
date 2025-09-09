import { APIRequestContext } from "@playwright/test";

const API_URL = process.env.API_URL || "http://localhost:4000";

export interface SeededUser {
  email: string;
  password: string;
  token: string;
}

/**
 * Registers a brand-new user directly against the backend, bypassing the UI.
 * Each test gets its own user, so tasks never leak between tests even
 * though the backend has no per-test database reset.
 */
export async function seedUser(request: APIRequestContext, label: string): Promise<SeededUser> {
  const email = `${label}.${Date.now()}.${Math.random().toString(36).slice(2, 8)}@example.com`;
  const password = "correct-horse-battery-staple";

  const res = await request.post(`${API_URL}/api/auth/register`, {
    data: { email, password },
  });
  const body = await res.json();
  return { email, password, token: body.token };
}

export async function seedTask(
  request: APIRequestContext,
  token: string,
  title: string,
  description = ""
): Promise<string> {
  const res = await request.post(`${API_URL}/api/tasks`, {
    headers: { Authorization: `Bearer ${token}` },
    data: { title, description },
  });
  const body = await res.json();
  return body.id as string;
}
