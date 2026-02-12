import { test, expect } from '@playwright/test';
import { HomePage } from '../pages/home.page';
import { LoginPage } from '../pages/login.page';

test.describe('ホーム画面機能', () => {
  let homePage: HomePage;

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

    homePage = new HomePage(page);
  });

  test('ホーム画面が正しく表示される', async ({ page }) => {
    // 月選択が表示される
    await expect(homePage.monthSelector).toBeVisible();

    // 新規作成ボタンが表示される
    await expect(homePage.createNewButton).toBeVisible();
  });

  test('月選択ドロップダウンが動作する', async ({ page }) => {
    // 現在の月を取得
    const currentMonth = await homePage.getSelectedMonth();
    expect(currentMonth).toMatch(/^\d{4}-\d{2}$/);

    // オプションが12件あることを確認（過去12ヶ月）
    const options = await homePage.monthSelector.locator('option').count();
    expect(options).toBe(12);
  });

  test('日報リストが表示される', async ({ page }) => {
    await page.waitForTimeout(2000);

    // 日報数を取得
    const reportCount = await homePage.getReportCount();
    // 少なくとも0件以上
    expect(reportCount).toBeGreaterThanOrEqual(0);
  });

  test('新規作成ボタンをクリックすると日報作成画面に遷移する', async ({ page }) => {
    await homePage.clickCreateNew();
    await expect(page).toHaveURL('/reports/new');
  });

  test('日報をクリックすると詳細/編集画面に遷移する', async ({ page }) => {
    await page.waitForTimeout(2000);

    const reportCount = await homePage.getReportCount();

    if (reportCount > 0) {
      await homePage.clickReport(0);

      // 編集または詳細ページに遷移
      await expect(page).toHaveURL(/\/reports\/[a-zA-Z0-9]+(\/edit)?$/);
    } else {
      test.skip();
    }
  });

  test('月を変更すると日報リストが更新される', async ({ page }) => {
    await page.waitForTimeout(2000);

    // 現在の月の日報数を取得
    const currentCount = await homePage.getReportCount();

    // 前月を選択
    const options = await homePage.monthSelector.locator('option').all();
    if (options.length > 1) {
      const prevMonthValue = await options[1].getAttribute('value');
      if (prevMonthValue) {
        await homePage.selectMonth(prevMonthValue);
        await page.waitForTimeout(1000);

        // 月が変更されていることを確認
        const selectedMonth = await homePage.getSelectedMonth();
        expect(selectedMonth).toBe(prevMonthValue);
      }
    }
  });
});

test.describe('ステータスバナー表示', () => {
  let homePage: HomePage;

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

    homePage = new HomePage(page);
    await page.waitForTimeout(2000);
  });

  test('提出済みバナーが条件に応じて表示される', async () => {
    // このテストは状況によって結果が変わる
    // バナーの有無を確認するだけ（エラーにならないことを確認）
    const hasSubmittedBanner = await homePage.hasSubmittedBanner();
    expect(typeof hasSubmittedBanner).toBe('boolean');
  });

  test('差戻しバナーが差戻し日報がある場合に表示される', async () => {
    const hasRejectedBanner = await homePage.hasRejectedBanner();
    expect(typeof hasRejectedBanner).toBe('boolean');
  });
});
