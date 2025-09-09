import { test, expect } from "../fixtures/session";
import { loginAsSeededUser } from "../fixtures/session";
import { TasksPage } from "../pages/TasksPage";
import { seedTask } from "../helpers/api";

test.describe("Task management", () => {
  test("adding a task shows it in the list as To Do", async ({ page, seededUser }) => {
    await loginAsSeededUser(page, seededUser);
    const tasks = new TasksPage(page);

    await tasks.addTask("Write architecture doc", "Cover why not just Postman");

    await expect(tasks.rowFor("Write architecture doc")).toBeVisible();
    expect(await tasks.statusOf("Write architecture doc")).toBe("todo");
  });

  test("advancing status cycles todo -> in_progress -> done -> todo", async ({ page, seededUser }) => {
    await loginAsSeededUser(page, seededUser);
    const tasks = new TasksPage(page);
    await tasks.addTask("Record k6 baseline");

    await tasks.advanceStatus("Record k6 baseline");
    await tasks.expectStatus("Record k6 baseline", "in_progress");

    await tasks.advanceStatus("Record k6 baseline");
    await tasks.expectStatus("Record k6 baseline", "done");

    await tasks.advanceStatus("Record k6 baseline");
    await tasks.expectStatus("Record k6 baseline", "todo");
  });

  test("deleting a task removes it from the list", async ({ page, seededUser }) => {
    await loginAsSeededUser(page, seededUser);
    const tasks = new TasksPage(page);
    await tasks.addTask("Task to delete");

    await tasks.deleteTask("Task to delete");

    await expect(tasks.rowFor("Task to delete")).toHaveCount(0);
  });

  test("filter tabs show only tasks in the matching status", async ({ page, request, seededUser }) => {
    await seedTask(request, seededUser.token, "Already done task");
    await seedTask(request, seededUser.token, "Still todo task");

    await loginAsSeededUser(page, seededUser);
    const tasks = new TasksPage(page);
    await tasks.advanceStatus("Already done task");
    await tasks.expectStatus("Already done task", "in_progress");
    await tasks.advanceStatus("Already done task");
    await tasks.expectStatus("Already done task", "done");

    await tasks.filterBy("done");
    await expect(tasks.rowFor("Already done task")).toBeVisible();
    await expect(tasks.rowFor("Still todo task")).toHaveCount(0);

    await tasks.filterBy("todo");
    await expect(tasks.rowFor("Still todo task")).toBeVisible();
    await expect(tasks.rowFor("Already done task")).toHaveCount(0);

    await tasks.filterBy("all");
    await expect(tasks.rowFor("Already done task")).toBeVisible();
    await expect(tasks.rowFor("Still todo task")).toBeVisible();
  });

  test("empty state appears when a filter matches nothing", async ({ page, seededUser }) => {
    await loginAsSeededUser(page, seededUser);
    const tasks = new TasksPage(page);
    await tasks.addTask("Only todo task here");

    await tasks.filterBy("done");

    await expect(tasks.emptyState).toBeVisible();
  });
});
