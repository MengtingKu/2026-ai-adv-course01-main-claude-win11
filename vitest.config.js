import { defineConfig, configDefaults } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    fileParallelism: false,
    // 每個測試檔在獨立 worker 中載入 src/database.js，使用記憶體 SQLite（建表 + seed），
    // 測試結束即釋放，不會讀寫專案的 database.sqlite
    env: {
      DB_PATH: ':memory:',
      NODE_ENV: 'test',
    },
    // tests/e2e 為 Playwright 測試，由 npm run test:e2e 執行
    exclude: [...configDefaults.exclude, 'tests/e2e/**'],
    sequence: {
      files: [
        'tests/unit/shipping.test.js',
        'tests/auth.test.js',
        'tests/products.test.js',
        'tests/cart.test.js',
        'tests/orders.test.js',
        'tests/adminProducts.test.js',
        'tests/adminOrders.test.js',
        'tests/integration/checkout.test.js',
      ],
    },
    hookTimeout: 10000,
  },
});
