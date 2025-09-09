import { test, expect } from "@playwright/test";
import { assertMatchesSchema } from "../schema";
import { authHeader, registerUser } from "../helpers";

test.describe("Auth guard", () => {
  test("GET /api/tasks without a token returns 401", async ({ request }) => {
    const res = await request.get("/api/tasks");

    expect(res.status()).toBe(401);
    assertMatchesSchema("Error", await res.json());
  });

  test("a garbage bearer token returns 401", async ({ request }) => {
    const res = await request.get("/api/tasks", { headers: { Authorization: "Bearer not-a-real-token" } });

    expect(res.status()).toBe(401);
    assertMatchesSchema("Error", await res.json());
  });
});

test.describe("POST /api/tasks", () => {
  test("a valid task is created and matches the Task schema", async ({ request }) => {
    const user = await registerUser(request, "create");

    const res = await request.post("/api/tasks", {
      headers: authHeader(user.token),
      data: { title: "Draft the architecture diagram", description: "ASCII is fine" },
    });

    expect(res.status()).toBe(201);
    const body = await res.json();
    assertMatchesSchema("Task", body);
    expect(body.status).toBe("todo");
    expect(body.title).toBe("Draft the architecture diagram");
  });

  test("an empty title returns 400", async ({ request }) => {
    const user = await registerUser(request, "emptytitle");

    const res = await request.post("/api/tasks", {
      headers: authHeader(user.token),
      data: { title: "   " },
    });

    expect(res.status()).toBe(400);
    assertMatchesSchema("Error", await res.json());
  });

  test("a title over 200 characters returns 400", async ({ request }) => {
    const user = await registerUser(request, "longtitle");

    const res = await request.post("/api/tasks", {
      headers: authHeader(user.token),
      data: { title: "x".repeat(201) },
    });

    expect(res.status()).toBe(400);
    assertMatchesSchema("Error", await res.json());
  });
});

test.describe("GET /api/tasks", () => {
  test("lists only the caller's own tasks, newest first, matching TaskPage", async ({ request }) => {
    const owner = await registerUser(request, "owner");
    const other = await registerUser(request, "other");

    await request.post("/api/tasks", { headers: authHeader(owner.token), data: { title: "Owner task 1" } });
    await request.post("/api/tasks", { headers: authHeader(owner.token), data: { title: "Owner task 2" } });
    await request.post("/api/tasks", { headers: authHeader(other.token), data: { title: "Someone else's task" } });

    const res = await request.get("/api/tasks", { headers: authHeader(owner.token) });

    expect(res.status()).toBe(200);
    const body = await res.json();
    assertMatchesSchema("TaskPage", body);
    expect(body.total).toBe(2);
    expect(body.items.map((t: any) => t.title)).toEqual(["Owner task 2", "Owner task 1"]);
  });

  test("filters by status", async ({ request }) => {
    const user = await registerUser(request, "filter");
    const create = (title: string) =>
      request.post("/api/tasks", { headers: authHeader(user.token), data: { title } });

    const t1 = await (await create("Filter task A")).json();
    await create("Filter task B");
    await request.patch(`/api/tasks/${t1.id}`, { headers: authHeader(user.token), data: { status: "done" } });

    const res = await request.get("/api/tasks?status=done", { headers: authHeader(user.token) });

    expect(res.status()).toBe(200);
    const body = await res.json();
    assertMatchesSchema("TaskPage", body);
    expect(body.items).toHaveLength(1);
    expect(body.items[0].title).toBe("Filter task A");
  });

  test("an invalid status filter returns 400", async ({ request }) => {
    const user = await registerUser(request, "badfilter");

    const res = await request.get("/api/tasks?status=nonsense", { headers: authHeader(user.token) });

    expect(res.status()).toBe(400);
    assertMatchesSchema("Error", await res.json());
  });

  test("pageSize caps results and page moves the window", async ({ request }) => {
    const user = await registerUser(request, "pagination");
    for (let i = 0; i < 5; i++) {
      await request.post("/api/tasks", { headers: authHeader(user.token), data: { title: `Page task ${i}` } });
    }

    const firstPage = await (
      await request.get("/api/tasks?pageSize=2&page=1", { headers: authHeader(user.token) })
    ).json();
    const secondPage = await (
      await request.get("/api/tasks?pageSize=2&page=2", { headers: authHeader(user.token) })
    ).json();

    expect(firstPage.items).toHaveLength(2);
    expect(secondPage.items).toHaveLength(2);
    expect(firstPage.total).toBe(5);
    const firstIds = firstPage.items.map((t: any) => t.id);
    const secondIds = secondPage.items.map((t: any) => t.id);
    expect(firstIds.some((id: string) => secondIds.includes(id))).toBe(false);
  });
});

test.describe("GET/PATCH/DELETE /api/tasks/:id", () => {
  test("fetching a task that doesn't exist returns 404", async ({ request }) => {
    const user = await registerUser(request, "missing");

    const res = await request.get("/api/tasks/does-not-exist", { headers: authHeader(user.token) });

    expect(res.status()).toBe(404);
    assertMatchesSchema("Error", await res.json());
  });

  test("patch updates fields and bumps updatedAt", async ({ request }) => {
    const user = await registerUser(request, "patch");
    const created = await (
      await request.post("/api/tasks", { headers: authHeader(user.token), data: { title: "Before" } })
    ).json();

    await new Promise((r) => setTimeout(r, 5));
    const res = await request.patch(`/api/tasks/${created.id}`, {
      headers: authHeader(user.token),
      data: { title: "After", status: "in_progress" },
    });

    expect(res.status()).toBe(200);
    const body = await res.json();
    assertMatchesSchema("Task", body);
    expect(body.title).toBe("After");
    expect(body.status).toBe("in_progress");
    expect(new Date(body.updatedAt).getTime()).toBeGreaterThan(new Date(created.updatedAt).getTime());
  });

  test("patch with an invalid status returns 400", async ({ request }) => {
    const user = await registerUser(request, "patchbad");
    const created = await (
      await request.post("/api/tasks", { headers: authHeader(user.token), data: { title: "Whatever" } })
    ).json();

    const res = await request.patch(`/api/tasks/${created.id}`, {
      headers: authHeader(user.token),
      data: { status: "archived" },
    });

    expect(res.status()).toBe(400);
    assertMatchesSchema("Error", await res.json());
  });

  test("delete removes the task, then GET returns 404", async ({ request }) => {
    const user = await registerUser(request, "delete");
    const created = await (
      await request.post("/api/tasks", { headers: authHeader(user.token), data: { title: "Delete me" } })
    ).json();

    const del = await request.delete(`/api/tasks/${created.id}`, { headers: authHeader(user.token) });
    expect(del.status()).toBe(204);

    const after = await request.get(`/api/tasks/${created.id}`, { headers: authHeader(user.token) });
    expect(after.status()).toBe(404);
  });

  test("one user cannot fetch another user's task", async ({ request }) => {
    const owner = await registerUser(request, "isolated-owner");
    const intruder = await registerUser(request, "isolated-intruder");
    const created = await (
      await request.post("/api/tasks", { headers: authHeader(owner.token), data: { title: "Private task" } })
    ).json();

    const res = await request.get(`/api/tasks/${created.id}`, { headers: authHeader(intruder.token) });

    expect(res.status()).toBe(404);
  });
});
