export const BASE_URL = __ENV.API_URL || "http://localhost:4000";

// Same bar for every scenario: less than 1% of requests may fail, and 95%
// of requests must complete in under 500ms. k6 exits non-zero if either is
// breached, which is what fails the CI job.
export const THRESHOLDS = {
  http_req_failed: ["rate<0.01"],
  http_req_duration: ["p(95)<500"],
};
