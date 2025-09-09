import { Page, test as base, expect } from "@playwright/test";
import { SeededUser, seedUser } from "../helpers/api";

interface Fixtures {
  seededUser: SeededUser;
}

export const test = base.extend<Fixtures>({
  // A fresh, isolated user per test — created directly via the API so the
  // UI test never has to drive the registration form just to get a session.
  seededUser: async ({ request }, use) => {
    const user = await seedUser(request, "e2e");
    await use(user);
  },
});

export { expect };

/** Drops a valid session into localStorage and reloads, skipping the login form. */
export async function loginAsSeededUser(page: Page, user: SeededUser): Promise<void> {
  await page.goto("/");
  await page.evaluate(
    ({ email, token }) => {
      localStorage.setItem("taskflow.session", JSON.stringify({ email, token }));
    },
    { email: user.email, token: user.token }
  );
  await page.reload();
}
