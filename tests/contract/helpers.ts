import { APIRequestContext } from "@playwright/test";

export function uniqueEmail(label: string): string {
  return `${label}.${Date.now()}.${Math.random().toString(36).slice(2, 8)}@example.com`;
}

export interface RegisteredUser {
  email: string;
  password: string;
  token: string;
}

export async function registerUser(request: APIRequestContext, label: string): Promise<RegisteredUser> {
  const email = uniqueEmail(label);
  const password = "correct-horse-battery-staple";
  const res = await request.post("/api/auth/register", { data: { email, password } });
  const body = await res.json();
  return { email, password, token: body.token as string };
}

export function authHeader(token: string): { Authorization: string } {
  return { Authorization: `Bearer ${token}` };
}
