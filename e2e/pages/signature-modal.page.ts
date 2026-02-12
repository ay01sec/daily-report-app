import { Page, Locator } from '@playwright/test';

export class SignatureModalPage {
  readonly page: Page;
  readonly modal: Locator;
  readonly title: Locator;
  readonly closeButton: Locator;
  readonly siteNameInfo: Locator;
  readonly reportDateInfo: Locator;
  readonly signatureCanvas: Locator;
  readonly clearButton: Locator;
  readonly completeButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.modal = page.locator('div.fixed.inset-0');
    this.title = page.locator('text=元請確認サイン');
    this.closeButton = page.locator('button', { hasText: '×' });
    this.siteNameInfo = page.locator('text=/現場名: .+/');
    this.reportDateInfo = page.locator('text=/実施日: .+/');
    this.signatureCanvas = page.locator('div.border-2.border-gray-300 canvas');
    this.clearButton = page.locator('button', { hasText: 'クリア' });
    this.completeButton = page.locator('button', { hasText: 'サイン完了' });
  }

  async isVisible() {
    return this.modal.isVisible();
  }

  async waitForOpen() {
    await this.title.waitFor({ state: 'visible' });
  }

  async close() {
    await this.closeButton.click();
    await this.modal.waitFor({ state: 'hidden' });
  }

  async drawSignature() {
    // Draw a simple signature on the canvas
    const canvas = this.signatureCanvas;
    const box = await canvas.boundingBox();

    if (!box) {
      throw new Error('Canvas not found');
    }

    // Start drawing from the center-left
    const startX = box.x + box.width * 0.2;
    const startY = box.y + box.height * 0.5;

    // Draw a simple curved line (simulating a signature)
    await this.page.mouse.move(startX, startY);
    await this.page.mouse.down();

    // Draw a wavy line
    for (let i = 0; i <= 10; i++) {
      const x = startX + (box.width * 0.6 * i) / 10;
      const y = startY + Math.sin(i * 0.5) * 20;
      await this.page.mouse.move(x, y);
    }

    await this.page.mouse.up();

    // Wait a bit for the canvas to register the drawing
    await this.page.waitForTimeout(200);
  }

  async clearSignature() {
    await this.clearButton.click();
  }

  async completeSignature() {
    await this.completeButton.click();
    // Wait for modal to close and signature to be saved
    await this.page.waitForTimeout(1000);
  }

  async getSiteName() {
    const text = await this.siteNameInfo.textContent();
    return text?.replace('現場名: ', '').trim();
  }

  async getReportDate() {
    const text = await this.reportDateInfo.textContent();
    return text?.replace('実施日: ', '').trim();
  }
}
