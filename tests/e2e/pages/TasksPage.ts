import { Locator, Page, expect } from "@playwright/test";

export type FilterValue = "all" | "todo" | "in_progress" | "done";
export type TaskStatusValue = "todo" | "in_progress" | "done";

export class TasksPage {
  readonly page: Page;
  readonly titleInput: Locator;
  readonly descriptionInput: Locator;
  readonly addButton: Locator;
  readonly rows: Locator;
  readonly logoutButton: Locator;
  readonly currentUser: Locator;
  readonly emptyState: Locator;

  constructor(page: Page) {
    this.page = page;
    this.titleInput = page.getByTestId("task-title-input");
    this.descriptionInput = page.getByTestId("task-description-input");
    this.addButton = page.getByTestId("add-task-button");
    this.rows = page.getByTestId("task-row");
    this.logoutButton = page.getByTestId("logout-button");
    this.currentUser = page.getByTestId("current-user");
    this.emptyState = page.getByTestId("tasks-empty");
  }

  rowFor(title: string): Locator {
    return this.rows.filter({ has: this.page.getByTestId("task-title").getByText(title, { exact: true }) });
  }

  async addTask(title: string, description = ""): Promise<void> {
    await this.titleInput.fill(title);
    if (description) await this.descriptionInput.fill(description);
    await this.addButton.click();
    await this.rowFor(title).waitFor({ state: "visible" });
  }

  async filterBy(value: FilterValue): Promise<void> {
    await this.page.getByTestId(`filter-${value}`).click();
  }

  async advanceStatus(title: string): Promise<void> {
    await this.rowFor(title).getByTestId("advance-status-button").click();
  }

  async deleteTask(title: string): Promise<void> {
    await this.rowFor(title).getByTestId("delete-task-button").click();
    await this.rowFor(title).waitFor({ state: "detached" });
  }

  async statusOf(title: string): Promise<string | null> {
    return this.rowFor(title).getAttribute("data-status");
  }

  /** Auto-retries: the status update round-trips through a PATCH + a follow-up GET, so a single read can be stale. */
  async expectStatus(title: string, status: TaskStatusValue): Promise<void> {
    await expect(this.rowFor(title)).toHaveAttribute("data-status", status);
  }

  async logout(): Promise<void> {
    await this.logoutButton.click();
  }
}
