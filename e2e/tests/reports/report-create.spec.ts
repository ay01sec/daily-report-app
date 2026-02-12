import { test, expect } from '@playwright/test';
import { ReportFormPage } from '../../pages/report-form.page';
import { SignatureModalPage } from '../../pages/signature-modal.page';
import { LoginPage } from '../../pages/login.page';

test.describe('日報新規作成機能', () => {
  let reportFormPage: ReportFormPage;

  test.beforeEach(async ({ page }) => {
    // ログイン
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login(
      process.env.TEST_COMPANY_CODE!,
      process.env.TEST_USER_EMAIL!,
      process.env.TEST_USER_PASSWORD!
    );

    await page.waitForURL('/', { timeout: 15000 });

    reportFormPage = new ReportFormPage(page);
    await reportFormPage.gotoNew();
  });

  test('日報作成画面が正しく表示される', async ({ page }) => {
    // ページタイトル確認
    await expect(page.locator('h1', { hasText: '新規日報作成' })).toBeVisible();

    // 日付入力が表示される
    await expect(reportFormPage.reportDateInput).toBeVisible();

    // 現場選択が表示される
    await expect(reportFormPage.siteSelect).toBeVisible();

    // 天候ボタンが表示される
    await expect(reportFormPage.weatherButtons.first()).toBeVisible();

    // 作業員追加ボタンが表示される
    await expect(reportFormPage.addWorkerButton).toBeVisible();

    // 下書き保存ボタンが表示される
    await expect(reportFormPage.saveDraftButton).toBeVisible();

    // サインへ進むボタンが表示される
    await expect(reportFormPage.proceedToSignatureButton).toBeVisible();
  });

  test('日付を選択できる', async () => {
    const today = new Date().toISOString().split('T')[0];
    await reportFormPage.setReportDate(today);

    await expect(reportFormPage.reportDateInput).toHaveValue(today);
  });

  test('現場を選択できる', async ({ page }) => {
    // 現場オプションを取得
    const siteOptions = await reportFormPage.getSiteOptions();

    if (siteOptions.length > 0) {
      // 最初の現場を選択
      await reportFormPage.selectSiteByName(siteOptions[0]);

      // 選択されていることを確認
      const selectedOption = await reportFormPage.siteSelect.locator('option:checked').textContent();
      expect(selectedOption).toBe(siteOptions[0]);
    } else {
      test.skip();
    }
  });

  test('天候を選択できる', async ({ page }) => {
    await reportFormPage.selectWeather('sunny');

    // 選択されたボタンのスタイルを確認
    const sunnyButton = page.locator('button', { hasText: '晴れ' });
    await expect(sunnyButton).toHaveClass(/bg-blue-50/);
  });

  test('作業員を追加できる', async () => {
    // 初期の作業員数を取得
    const initialCount = await reportFormPage.getWorkerCount();

    // 作業員を追加
    await reportFormPage.addWorker();

    // 作業員が増えていることを確認
    const newCount = await reportFormPage.getWorkerCount();
    expect(newCount).toBe(initialCount + 1);
  });

  test('連絡事項を入力できる', async () => {
    const notes = 'テスト連絡事項です';
    await reportFormPage.setNotes(notes);

    await expect(reportFormPage.notesInput).toHaveValue(notes);
  });

  test('戻るボタンでホームに戻れる', async ({ page }) => {
    await reportFormPage.backButton.click();

    await expect(page).toHaveURL('/');
  });
});

test.describe('署名機能', () => {
  let reportFormPage: ReportFormPage;
  let signatureModalPage: SignatureModalPage;

  test.beforeEach(async ({ page }) => {
    // ログイン
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login(
      process.env.TEST_COMPANY_CODE!,
      process.env.TEST_USER_EMAIL!,
      process.env.TEST_USER_PASSWORD!
    );

    await page.waitForURL('/', { timeout: 15000 });

    reportFormPage = new ReportFormPage(page);
    signatureModalPage = new SignatureModalPage(page);
  });

  test('署名モーダルが開く', async ({ page }) => {
    await reportFormPage.gotoNew();

    // 必須項目を入力
    const today = new Date().toISOString().split('T')[0];
    await reportFormPage.setReportDate(today);

    const siteOptions = await reportFormPage.getSiteOptions();
    if (siteOptions.length === 0) {
      test.skip();
      return;
    }
    await reportFormPage.selectSiteByName(siteOptions[0]);

    // サインへ進む
    await reportFormPage.proceedToSignature();

    // 署名モーダルが開く
    await signatureModalPage.waitForOpen();
    await expect(signatureModalPage.title).toBeVisible();
  });

  test('署名キャンバスに描画できる', async ({ page }) => {
    await reportFormPage.gotoNew();

    // 必須項目を入力
    const today = new Date().toISOString().split('T')[0];
    await reportFormPage.setReportDate(today);

    const siteOptions = await reportFormPage.getSiteOptions();
    if (siteOptions.length === 0) {
      test.skip();
      return;
    }
    await reportFormPage.selectSiteByName(siteOptions[0]);

    // サインへ進む
    await reportFormPage.proceedToSignature();
    await signatureModalPage.waitForOpen();

    // 署名を描画
    await signatureModalPage.drawSignature();

    // キャンバスが表示されていることを確認
    await expect(signatureModalPage.signatureCanvas).toBeVisible();
  });

  test('署名をクリアできる', async ({ page }) => {
    await reportFormPage.gotoNew();

    // 必須項目を入力
    const today = new Date().toISOString().split('T')[0];
    await reportFormPage.setReportDate(today);

    const siteOptions = await reportFormPage.getSiteOptions();
    if (siteOptions.length === 0) {
      test.skip();
      return;
    }
    await reportFormPage.selectSiteByName(siteOptions[0]);

    // サインへ進む
    await reportFormPage.proceedToSignature();
    await signatureModalPage.waitForOpen();

    // 署名を描画
    await signatureModalPage.drawSignature();

    // クリアボタンをクリック
    await signatureModalPage.clearSignature();

    // クリアボタンがまだ表示されていることを確認
    await expect(signatureModalPage.clearButton).toBeVisible();
  });

  test('署名モーダルを閉じることができる', async ({ page }) => {
    await reportFormPage.gotoNew();

    // 必須項目を入力
    const today = new Date().toISOString().split('T')[0];
    await reportFormPage.setReportDate(today);

    const siteOptions = await reportFormPage.getSiteOptions();
    if (siteOptions.length === 0) {
      test.skip();
      return;
    }
    await reportFormPage.selectSiteByName(siteOptions[0]);

    // サインへ進む
    await reportFormPage.proceedToSignature();
    await signatureModalPage.waitForOpen();

    // モーダルを閉じる
    await signatureModalPage.close();

    // モーダルが閉じていることを確認
    await expect(signatureModalPage.title).not.toBeVisible();
  });
});

test.describe('日報提出機能', () => {
  let reportFormPage: ReportFormPage;
  let signatureModalPage: SignatureModalPage;

  test.beforeEach(async ({ page }) => {
    // ログイン
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login(
      process.env.TEST_COMPANY_CODE!,
      process.env.TEST_USER_EMAIL!,
      process.env.TEST_USER_PASSWORD!
    );

    await page.waitForURL('/', { timeout: 15000 });

    reportFormPage = new ReportFormPage(page);
    signatureModalPage = new SignatureModalPage(page);
  });

  test('署名完了後に送信確認画面が表示される', async ({ page }) => {
    await reportFormPage.gotoNew();

    // 必須項目を入力
    const today = new Date().toISOString().split('T')[0];
    await reportFormPage.setReportDate(today);

    const siteOptions = await reportFormPage.getSiteOptions();
    if (siteOptions.length === 0) {
      test.skip();
      return;
    }
    await reportFormPage.selectSiteByName(siteOptions[0]);

    // サインへ進む
    await reportFormPage.proceedToSignature();
    await signatureModalPage.waitForOpen();

    // 署名を描画
    await signatureModalPage.drawSignature();

    // 署名完了
    await signatureModalPage.completeSignature();

    // 送信確認画面が表示される（編集ページに遷移）
    await page.waitForURL(/\/reports\/[a-zA-Z0-9]+\/edit$/, { timeout: 10000 });

    // 送信ボタンが表示される
    await expect(reportFormPage.submitButton).toBeVisible({ timeout: 5000 });
    await expect(reportFormPage.submitLaterButton).toBeVisible();
  });

  test('日報を送信できる', async ({ page }) => {
    await reportFormPage.gotoNew();

    // 必須項目を入力
    const today = new Date().toISOString().split('T')[0];
    await reportFormPage.setReportDate(today);

    const siteOptions = await reportFormPage.getSiteOptions();
    if (siteOptions.length === 0) {
      test.skip();
      return;
    }
    await reportFormPage.selectSiteByName(siteOptions[0]);

    // サインへ進む
    await reportFormPage.proceedToSignature();
    await signatureModalPage.waitForOpen();

    // 署名を描画
    await signatureModalPage.drawSignature();

    // 署名完了
    await signatureModalPage.completeSignature();

    // 編集ページに遷移
    await page.waitForURL(/\/reports\/[a-zA-Z0-9]+\/edit$/, { timeout: 10000 });

    // 送信ボタンをクリック
    await reportFormPage.submitReport();

    // 詳細ページに遷移（または成功メッセージ）
    await page.waitForURL(/\/reports\/[a-zA-Z0-9]+$/, { timeout: 15000 });
  });

  test('あとで送信を選択できる', async ({ page }) => {
    await reportFormPage.gotoNew();

    // 必須項目を入力
    const today = new Date().toISOString().split('T')[0];
    await reportFormPage.setReportDate(today);

    const siteOptions = await reportFormPage.getSiteOptions();
    if (siteOptions.length === 0) {
      test.skip();
      return;
    }
    await reportFormPage.selectSiteByName(siteOptions[0]);

    // サインへ進む
    await reportFormPage.proceedToSignature();
    await signatureModalPage.waitForOpen();

    // 署名を描画
    await signatureModalPage.drawSignature();

    // 署名完了
    await signatureModalPage.completeSignature();

    // 編集ページに遷移
    await page.waitForURL(/\/reports\/[a-zA-Z0-9]+\/edit$/, { timeout: 10000 });

    // あとで送信ボタンをクリック
    await reportFormPage.submitLater();

    // ホームに戻る
    await expect(page).toHaveURL('/');
  });
});
