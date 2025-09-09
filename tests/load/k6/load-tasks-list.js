import http from "k6/http";
import { check, sleep } from "k6";
import { BASE_URL, THRESHOLDS } from "./config.js";
import { buildSummary } from "./report.js";

// Models the read-heavy path: a task board that many users have open at
// once, each one re-fetching its list periodically. setup() seeds one
// account with tasks; every VU hammers GET /api/tasks against it, which is
// the endpoint the UI calls on every filter click and page load.
export const options = {
  scenarios: {
    tasks_list_ramp: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { duration: "10s", target: 10 },
        { duration: "20s", target: 25 },
        { duration: "10s", target: 0 },
      ],
    },
  },
  thresholds: THRESHOLDS,
};

export function setup() {
  const email = `load-list.${Date.now()}@example.com`;
  const register = http.post(
    `${BASE_URL}/api/auth/register`,
    JSON.stringify({ email, password: "correct-horse-battery-staple" }),
    { headers: { "Content-Type": "application/json" } }
  );
  const token = register.json("token");
  const headers = { "Content-Type": "application/json", Authorization: `Bearer ${token}` };

  for (let i = 0; i < 20; i++) {
    http.post(`${BASE_URL}/api/tasks`, JSON.stringify({ title: `Seed task ${i}` }), { headers });
  }

  return { token };
}

export default function (data) {
  const headers = { Authorization: `Bearer ${data.token}` };
  const res = http.get(`${BASE_URL}/api/tasks?pageSize=20`, { headers });

  check(res, {
    "status is 200": (r) => r.status === 200,
    "body has items": (r) => Array.isArray(r.json("items")),
  });

  sleep(1);
}

export function handleSummary(data) {
  return buildSummary("load-tasks-list", data);
}
