import { test as base, Page } from '@playwright/test';

// Test credentials from environment variables
const TEST_CREDENTIALS = {
  companyCode: process.env.TEST_COMPANY_CODE || '00000001',
  email: process.env.TEST_USER_EMAIL || 'test@example.com',
  password: process.env.TEST_USER_PASSWORD || 'password123',
};

export interface AuthFixtures {
  authenticatedPage: Page;
}

/**
 * Extended test with authentication fixture
 */
export const test = base.extend<AuthFixtures>({
  authenticatedPage: async ({ page }, use) => {
    // Navigate to login page
    await page.goto('/login');

    // Fill in credentials
    await page.fill('input#companyCode', TEST_CREDENTIALS.companyCode);
    await page.fill('input#email', TEST_CREDENTIALS.email);
    await page.fill('input#password', TEST_CREDENTIALS.password);

    // Submit form
    await page.click('button[type="submit"]');

    // Wait for navigation to home page
    await page.waitForURL('/', { timeout: 15000 });

    await use(page);
  },
});

export { expect } from '@playwright/test';
