// @ts-check
const { defineConfig, devices } = require('@playwright/test');

/**
 * E2E 測試直接連線已啟動的專案（預設 http://localhost:3001），不另外啟動測試伺服器，
 * 因此這裡刻意不設定 webServer。可用 E2E_BASE_URL 指向其他位址。
 */
module.exports = defineConfig({
  testDir: './tests/e2e',
  timeout: 120_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report' }]],
  use: {
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:3001',
    locale: 'zh-TW',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
