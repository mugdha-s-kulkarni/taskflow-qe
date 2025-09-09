import { Locator, Page } from "@playwright/test";

export class LoginPage {
  readonly page: Page;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;
  readonly toggleButton: Locator;
  readonly errorBanner: Locator;

  constructor(page: Page) {
    this.page = page;
    this.emailInput = page.getByTestId("email-input");
    this.passwordInput = page.getByTestId("password-input");
    this.submitButton = page.getByTestId("auth-submit");
    this.toggleButton = page.getByTestId("auth-toggle");
    this.errorBanner = page.getByTestId("auth-error");
  }

  async goto(): Promise<void> {
    await this.page.goto("/");
  }

  async switchToRegister(): Promise<void> {
    if ((await this.submitButton.textContent())?.includes("Sign in")) {
      await this.toggleButton.click();
    }
  }

  async register(email: string, password: string): Promise<void> {
    await this.switchToRegister();
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.submitButton.click();
  }

  async login(email: string, password: string): Promise<void> {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.submitButton.click();
  }
}
