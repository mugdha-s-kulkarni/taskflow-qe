import { test, expect } from "../fixtures/session";
import { LoginPage } from "../pages/LoginPage";
import { TasksPage } from "../pages/TasksPage";

test.describe("Authentication", () => {
  test("registering a new account signs the user in", async ({ page }) => {
    const login = new LoginPage(page);
    const tasks = new TasksPage(page);
    const email = `newuser.${Date.now()}@example.com`;

    await login.goto();
    await login.register(email, "correct-horse-battery-staple");

    await expect(tasks.currentUser).toHaveText(email);
    await expect(tasks.emptyState).toBeVisible();
  });

  test("registering with an already-used email shows an error", async ({ page, seededUser }) => {
    const login = new LoginPage(page);

    await login.goto();
    await login.register(seededUser.email, "another-password-123");

    await expect(login.errorBanner).toContainText(/already exists/i);
  });

  test("logging in with the wrong password shows an error", async ({ page, seededUser }) => {
    const login = new LoginPage(page);

    await login.goto();
    await login.login(seededUser.email, "totally-wrong-password");

    await expect(login.errorBanner).toContainText(/incorrect/i);
  });

  test("logging in with valid credentials reaches the task list", async ({ page, seededUser }) => {
    const login = new LoginPage(page);
    const tasks = new TasksPage(page);

    await login.goto();
    await login.login(seededUser.email, seededUser.password);

    await expect(tasks.currentUser).toHaveText(seededUser.email);
  });

  test("logging out clears the session", async ({ page, seededUser }) => {
    const login = new LoginPage(page);
    const tasks = new TasksPage(page);

    await login.goto();
    await login.login(seededUser.email, seededUser.password);
    await tasks.logout();

    await expect(login.emailInput).toBeVisible();

    await page.reload();
    await expect(login.emailInput).toBeVisible();
  });
});
