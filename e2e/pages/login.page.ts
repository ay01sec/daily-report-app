import { Page, Locator } from '@playwright/test';

export class LoginPage {
  readonly page: Page;
  readonly companyCodeInput: Locator;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;
  readonly errorMessage: Locator;
  readonly forgotPasswordLink: Locator;

  constructor(page: Page) {
    this.page = page;
    this.companyCodeInput = page.locator('input#companyCode');
    this.emailInput = page.locator('input#email');
    this.passwordInput = page.locator('input#password');
    this.submitButton = page.locator('button[type="submit"]');
    this.errorMessage = page.locator('.bg-red-50');
    this.forgotPasswordLink = page.locator('a[href="/forgot-password"]');
  }

  async goto() {
    await this.page.goto('/login');
  }

  async login(companyCode: string, email: string, password: string) {
    await this.companyCodeInput.fill(companyCode);
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.submitButton.click();
  }

  async getErrorMessage(): Promise<string | null> {
    try {
      return await this.errorMessage.textContent({ timeout: 3000 });
    } catch {
      return null;
    }
  }
}
