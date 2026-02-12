import { Page, Locator } from '@playwright/test';

export class ReportFormPage {
  readonly page: Page;
  readonly pageTitle: Locator;
  readonly backButton: Locator;
  readonly reportDateInput: Locator;
  readonly siteSelect: Locator;
  readonly weatherButtons: Locator;
  readonly notesInput: Locator;
  readonly photoUploadInput: Locator;
  readonly addWorkerButton: Locator;
  readonly saveDraftButton: Locator;
  readonly proceedToSignatureButton: Locator;
  readonly submitButton: Locator;
  readonly submitLaterButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.pageTitle = page.locator('h1');
    this.backButton = page.locator('button', { hasText: '戻る' });
    this.reportDateInput = page.locator('input[type="date"]');
    this.siteSelect = page.locator('select').filter({ has: page.locator('option', { hasText: '選択してください' }) });
    this.weatherButtons = page.locator('button[type="button"]').filter({ hasText: /(晴れ|曇り|雨|雪)/ });
    this.notesInput = page.locator('textarea[placeholder*="連絡事項"]');
    this.photoUploadInput = page.locator('input#photo-upload');
    this.addWorkerButton = page.locator('button', { hasText: '+ 作業員を追加' });
    this.saveDraftButton = page.locator('button', { hasText: '下書き保存' });
    this.proceedToSignatureButton = page.locator('button', { hasText: '元請サインへ進む' });
    this.submitButton = page.locator('button', { hasText: '送信する' });
    this.submitLaterButton = page.locator('button', { hasText: 'あとで送信する' });
  }

  async gotoNew() {
    await this.page.goto('/reports/new');
    await this.page.waitForLoadState('networkidle');
  }

  async gotoEdit(reportId: string) {
    await this.page.goto(`/reports/${reportId}/edit`);
    await this.page.waitForLoadState('networkidle');
  }

  async setReportDate(date: string) {
    // date format: "YYYY-MM-DD"
    await this.reportDateInput.fill(date);
  }

  async selectSite(siteId: string) {
    await this.siteSelect.selectOption(siteId);
  }

  async selectSiteByName(siteName: string) {
    await this.siteSelect.selectOption({ label: siteName });
  }

  async selectWeather(weather: 'sunny' | 'cloudy' | 'rainy' | 'snowy') {
    const weatherMap: Record<string, string> = {
      sunny: '晴れ',
      cloudy: '曇り',
      rainy: '雨',
      snowy: '雪',
    };
    await this.page.locator('button', { hasText: weatherMap[weather] }).click();
  }

  async setNotes(notes: string) {
    await this.notesInput.fill(notes);
  }

  async addWorker() {
    await this.addWorkerButton.click();
  }

  async setWorkerInfo(
    index: number,
    data: {
      employeeId?: string;
      name?: string;
      startTime?: string;
      endTime?: string;
      noLunchBreak?: boolean;
      remarks?: string;
    }
  ) {
    // Find the worker section by index
    const workerSections = this.page.locator('div').filter({ hasText: `作業員 ${index + 1}` });
    const workerSection = workerSections.first();

    if (data.employeeId) {
      const employeeSelect = workerSection.locator('select').first();
      await employeeSelect.selectOption(data.employeeId);
    }

    if (data.name) {
      // For "その他" (free input)
      const nameInput = workerSection.locator('input[placeholder="氏名を入力"]');
      if (await nameInput.isVisible()) {
        await nameInput.fill(data.name);
      }
    }

    if (data.startTime) {
      const timeSelects = workerSection.locator('select');
      const startTimeSelect = timeSelects.nth(1); // Second select after employee
      await startTimeSelect.selectOption(data.startTime);
    }

    if (data.endTime) {
      const timeSelects = workerSection.locator('select');
      const endTimeSelect = timeSelects.nth(2); // Third select
      await endTimeSelect.selectOption(data.endTime);
    }

    if (data.noLunchBreak !== undefined) {
      const checkbox = this.page.locator(`input#noLunch-${index}`);
      if (data.noLunchBreak && !(await checkbox.isChecked())) {
        await checkbox.click();
      } else if (!data.noLunchBreak && (await checkbox.isChecked())) {
        await checkbox.click();
      }
    }

    if (data.remarks) {
      const remarksInput = workerSection.locator('input[placeholder*="作業内容"]');
      await remarksInput.fill(data.remarks);
    }
  }

  async saveDraft() {
    await this.saveDraftButton.click();
    await this.page.waitForLoadState('networkidle');
  }

  async proceedToSignature() {
    await this.proceedToSignatureButton.click();
    // Wait for signature modal
    await this.page.waitForSelector('text=元請確認サイン');
  }

  async submitReport() {
    await this.submitButton.click();
    await this.page.waitForLoadState('networkidle');
  }

  async submitLater() {
    await this.submitLaterButton.click();
    await this.page.waitForLoadState('networkidle');
  }

  async getSiteOptions() {
    const options = await this.siteSelect.locator('option').all();
    const siteNames: string[] = [];
    for (const option of options) {
      const text = await option.textContent();
      if (text && text !== '選択してください') {
        siteNames.push(text);
      }
    }
    return siteNames;
  }

  async getWorkerCount() {
    const workerSections = this.page.locator('div').filter({ hasText: /^作業員 \d+$/ });
    return workerSections.count();
  }
}
