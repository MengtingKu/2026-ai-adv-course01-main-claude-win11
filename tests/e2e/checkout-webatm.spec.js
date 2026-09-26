// @ts-check
/**
 * E2E：登入 → 加入購物車 → 結帳（配送方式）→ 建立訂單 → 綠界網路 ATM（台灣土地銀行）付款 → 返回商店 → 已付款
 *
 * 前置：專案已啟動於 baseURL（預設 http://localhost:3001），且伺服器設定 ECPay staging。
 * 截圖存於 tests/e2e/screenshots/。
 */
const path = require('path');
const { test, expect } = require('@playwright/test');

const ACCOUNT = { email: 'admin@hexschool.com', password: '12345678' };
const RECIPIENT = {
  name: 'E2E 測試收件人',
  email: 'admin@hexschool.com',
  address: '台北市信義區信義路五段7號',
};
const SCREENSHOT_DIR = path.join(__dirname, 'screenshots');

async function snap(page, name, { fullPage = true } = {}) {
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, `${name}.png`), fullPage });
}

// 以頁面上登入後的 JWT 呼叫本站 API
async function api(page, method, url, body) {
  return page.evaluate(
    async ({ method, url, body }) => {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('flower_token')}` },
        body: body ? JSON.stringify(body) : undefined,
      });
      return { status: res.status, body: await res.json() };
    },
    { method, url, body }
  );
}

test('會員結帳並以綠界網路 ATM（台灣土地銀行）付款成功', async ({ page }) => {
  // 1. 登入
  await test.step('登入花卉電商', async () => {
    await page.goto('/login');
    await page.getByPlaceholder('請輸入 Email').fill(ACCOUNT.email);
    await page.getByPlaceholder('請輸入密碼').fill(ACCOUNT.password);
    await page.locator('form').getByRole('button', { name: '登入' }).click();
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole('button', { name: '登出' })).toBeVisible();

    // 清空既有購物車，確保本次訂單內容可預期
    const cart = await api(page, 'GET', '/api/cart');
    for (const item of cart.body.data.items) {
      await api(page, 'DELETE', `/api/cart/${item.id}`);
    }
  });

  // 2. 選擇商品並加入購物車
  await test.step('選擇商品並加入購物車', async () => {
    await page.goto('/');
    await page.getByRole('button', { name: '加入 →' }).first().click();
    await expect(page.getByText('已加入購物車')).toBeVisible();
    await snap(page, '01-add-to-cart', { fullPage: false }); // 首頁全頁含大圖，只截可視範圍
  });

  // 3. 進入結帳頁面
  await test.step('進入結帳頁面', async () => {
    await page.goto('/cart');
    await page.getByRole('button', { name: /前往結帳/ }).or(page.getByRole('link', { name: /前往結帳/ })).first().click();
    await expect(page).toHaveURL(/\/checkout$/);
  });

  // 4. 填寫配送方式與結帳資料
  let expectedTotal;
  await test.step('填寫配送方式與結帳資料', async () => {
    await page.getByPlaceholder('請輸入收件人姓名').fill(RECIPIENT.name);
    await page.getByPlaceholder('請輸入 Email').fill(RECIPIENT.email);
    await page.getByPlaceholder('請輸入收件地址').fill(RECIPIENT.address);

    const quoteResponse = page.waitForResponse(
      (r) => r.url().endsWith('/api/orders/shipping-quote') && r.request().postData()?.includes('"isUrgent":true')
    );
    await page.getByRole('radio', { name: /超商取貨/ }).check();
    await page.getByRole('checkbox', { name: /當日急件/ }).check();
    const quote = await (await quoteResponse).json();

    // 超商取貨 60 + 當日急件 250
    expect(quote.data.shipping_fee).toBe(310);
    expectedTotal = quote.data.total_amount;
    await expect(page.getByText('當日急件附加費')).toBeVisible();
    await expect(page.getByText(`NT$ ${expectedTotal.toLocaleString('en-US')}`)).toBeVisible();
    await snap(page, '02-checkout-form');
  });

  // 5. 建立訂單
  let orderId;
  await test.step('建立訂單', async () => {
    await page.getByRole('button', { name: '確認送出訂單' }).click();
    await expect(page).toHaveURL(/\/orders\/[0-9a-f-]{36}$/);
    orderId = page.url().split('/orders/')[1];
    await expect(page.getByText('待付款')).toBeVisible();

    const detail = await api(page, 'GET', `/api/orders/${orderId}`);
    expect(detail.body.data).toMatchObject({
      status: 'pending',
      shipping_method: 'convenience_store',
      is_urgent: 1,
      shipping_fee: 310,
      total_amount: expectedTotal,
    });
    await snap(page, '03-order-created');
  });

  // 6. 前往綠界測試環境
  await test.step('前往綠界測試環境', async () => {
    await page.getByRole('button', { name: '前往綠界付款' }).click();
    await page.waitForURL(/payment-stage\.ecpay\.com\.tw/);
  });

  // 7–9. 選擇網路 ATM → 台灣土地銀行 → 前往付款
  await test.step('選擇網路 ATM / 台灣土地銀行並前往付款', async () => {
    await page.getByRole('listitem', { name: 'WebATM' }).click();
    await page.locator('#selWebATMBank').selectOption({ label: '台灣土地銀行' });
    await snap(page, '04-ecpay-webatm-land-bank');
    await page.getByRole('link', { name: '前往付款' }).click();
  });

  // 10. 關閉提示視窗
  await test.step('關閉提示視窗', async () => {
    const closeButton = page.getByRole('button', { name: '關閉' }).filter({ visible: true });
    await expect(closeButton).toBeVisible();
    await snap(page, '05-ecpay-webatm-notice');
    await closeButton.click();
  });

  // 11. 在土地銀行測試頁面點擊 Save
  await test.step('土地銀行測試頁面點擊 Save', async () => {
    await page.waitForURL(/LandWebAtm/);
    await snap(page, '06-land-bank-mock');
    await page.getByRole('button', { name: 'Save' }).click();
  });

  // 12. 等待綠界顯示付款成功
  await test.step('等待綠界顯示付款成功', async () => {
    await expect(page.getByRole('heading', { name: '付款成功' })).toBeVisible({ timeout: 30_000 });
    await snap(page, '07-ecpay-payment-success');
  });

  // 13. 點擊返回商店
  await test.step('點擊返回商店', async () => {
    await page.getByRole('link', { name: '返回商店' }).click();
    await page.waitForURL(new RegExp(`/orders/${orderId}`));
  });

  // 14–15. 驗證訂單顯示「已付款」且狀態為 paid
  await test.step('驗證訂單已付款', async () => {
    await expect(page.getByText('付款成功！感謝您的購買。')).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText('已付款', { exact: true })).toBeVisible();
    await snap(page, '08-order-paid');

    const detail = await api(page, 'GET', `/api/orders/${orderId}`);
    expect(detail.status).toBe(200);
    expect(detail.body.data.status).toBe('paid');
    expect(detail.body.data.paid_at).toBeTruthy();
    expect(detail.body.data.total_amount).toBe(expectedTotal);
  });
});
