import http from "k6/http";
import { check } from "k6";
import { BASE_URL, THRESHOLDS } from "./config.js";
import { buildSummary } from "./report.js";

// A single-VU sanity pass over the whole API surface. Run this before any
// real load test — if smoke fails, the ramping/arrival-rate scripts would
// just be generating noise against a broken backend.
export const options = {
  vus: 1,
  iterations: 5,
  thresholds: THRESHOLDS,
};

export default function () {
  const health = http.get(`${BASE_URL}/health`);
  check(health, { "health is 200": (r) => r.status === 200 });

  const email = `smoke.${__VU}.${__ITER}.${Date.now()}@example.com`;
  const register = http.post(
    `${BASE_URL}/api/auth/register`,
    JSON.stringify({ email, password: "correct-horse-battery-staple" }),
    { headers: { "Content-Type": "application/json" } }
  );
  check(register, { "register is 201": (r) => r.status === 201 });
  const token = register.json("token");

  const headers = { "Content-Type": "application/json", Authorization: `Bearer ${token}` };

  const create = http.post(`${BASE_URL}/api/tasks`, JSON.stringify({ title: "Smoke task" }), { headers });
  check(create, { "create is 201": (r) => r.status === 201 });

  const list = http.get(`${BASE_URL}/api/tasks`, { headers });
  check(list, {
    "list is 200": (r) => r.status === 200,
    "list has the task we just made": (r) => r.json("total") >= 1,
  });
}

export function handleSummary(data) {
  return buildSummary("smoke", data);
}
