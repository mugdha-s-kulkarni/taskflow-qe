import http from "k6/http";
import { check } from "k6";
import { BASE_URL, THRESHOLDS } from "./config.js";
import { buildSummary } from "./report.js";

// Models the write path: a burst of task creation, e.g. a team importing a
// backlog or several users adding tasks in the same window. Fixed arrival
// rate (not ramping VUs) so throughput is the independent variable — k6
// adds VUs as needed to sustain the target rate.
export const options = {
  scenarios: {
    task_creation_burst: {
      executor: "constant-arrival-rate",
      rate: 20,
      timeUnit: "1s",
      duration: "20s",
      preAllocatedVUs: 20,
      maxVUs: 50,
    },
  },
  thresholds: THRESHOLDS,
};

export function setup() {
  const email = `load-create.${Date.now()}@example.com`;
  const register = http.post(
    `${BASE_URL}/api/auth/register`,
    JSON.stringify({ email, password: "correct-horse-battery-staple" }),
    { headers: { "Content-Type": "application/json" } }
  );
  return { token: register.json("token") };
}

export default function (data) {
  const headers = { "Content-Type": "application/json", Authorization: `Bearer ${data.token}` };
  const res = http.post(
    `${BASE_URL}/api/tasks`,
    JSON.stringify({ title: `Load task ${__VU}-${__ITER}`, description: "Created during load-task-creation.js" }),
    { headers }
  );

  check(res, {
    "status is 201": (r) => r.status === 201,
    "task has an id": (r) => !!r.json("id"),
  });
}

export function handleSummary(data) {
  return buildSummary("load-task-creation", data);
}
