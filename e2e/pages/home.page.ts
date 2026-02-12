import { Page, Locator } from '@playwright/test';

export class HomePage {
  readonly page: Page;
  readonly monthSelector: Locator;
  readonly createNewButton: Locator;
  readonly reportList: Locator;
  readonly submittedBanner: Locator;
  readonly pendingBanner: Locator;
  readonly rejectedBanner: Locator;
  readonly deadlineBanner: Locator;

  constructor(page: Page) {
    this.page = page;
    this.monthSelector = page.locator('select').first();
    this.createNewButton = page.locator('a', { hasText: '+ 新規作成' });
    this.reportList = page.locator('a[href^="/reports/"]');
    this.submittedBanner = page.locator('.bg-green-50');
    this.pendingBanner = page.locator('.bg-blue-50');
    this.rejectedBanner = page.locator('.bg-red-50', { hasText: '差戻し' });
    this.deadlineBanner = page.locator('.bg-orange-50');
  }

  async goto() {
    await this.page.goto('/');
    await this.page.waitForLoadState('networkidle');
  }

  async selectMonth(yearMonth: string) {
    // yearMonth format: "YYYY-MM"
    await this.monthSelector.selectOption(yearMonth);
    await this.page.waitForLoadState('networkidle');
  }

  async getSelectedMonth() {
    return this.monthSelector.inputValue();
  }

  async getReportCount() {
    return this.reportList.count();
  }

  async getReportItems() {
    return this.reportList.all();
  }

  async clickCreateNew() {
    await this.createNewButton.click();
    await this.page.waitForURL('/reports/new');
  }

  async clickReport(index: number = 0) {
    const reports = await this.getReportItems();
    if (reports.length > index) {
      await reports[index].click();
    }
  }

  async hasSubmittedBanner() {
    return this.submittedBanner.isVisible();
  }

  async hasPendingBanner() {
    return this.pendingBanner.isVisible();
  }

  async hasRejectedBanner() {
    return this.rejectedBanner.isVisible();
  }

  async hasDeadlineBanner() {
    return this.deadlineBanner.isVisible();
  }

  async getReportStatuses() {
    const reports = await this.getReportItems();
    const statuses: string[] = [];

    for (const report of reports) {
      // Check for status badge text
      const statusBadge = report.locator('span').filter({
        has: this.page.locator('text=/(下書き|署名済|送信完了|承認済|差戻し)/'),
      });
      const text = await statusBadge.textContent();
      if (text) statuses.push(text.trim());
    }

    return statuses;
  }
}
