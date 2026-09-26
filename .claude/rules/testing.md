---
paths:
  - "tests/**"
---

# 測試規則

## 框架
Vitest 2.x + Supertest，CommonJS 格式（`require`）

## 執行順序（不可更改）
```
auth → products → cart → orders → adminProducts → adminOrders
```
定義於 `vitest.config.js`，`fileParallelism: false`。

## 共用輔助函式
永遠從 `tests/setup.js` 取得 app 和 request，不要在測試檔中重複 require：
```js
const { app, request, getAdminToken, registerUser } = require('./setup');
```

## 唯一性
`registerUser()` 每次產生唯一 email（含 timestamp + random），不會重複。需要特定 email 時使用 `registerUser({ email: '...' })`。

## 資料庫狀態
Vitest 以 `DB_PATH=':memory:'` 執行（vitest.config.js 的 `test.env`），每個測試檔各自一個全新的記憶體 SQLite（含 seed），
不會讀寫 `database.sqlite`。測試檔之間不共享資料；同檔內測試共用，需自行建立並清除測試資料。

## 目錄
- `tests/unit/`：純函式單元測試（`npm run test:unit`）
- `tests/integration/`：整合測試（`npm run test:integration`），子目錄使用 `require('../setup')`
- `tests/e2e/`：Playwright（`npm run test:e2e`），連線已啟動的 3001，Vitest 已排除此目錄

## 不要修改的設定
- 不要修改 `vitest.config.js` 的 sequence.files 順序
- 測試環境 NODE_ENV 設為 'test'，bcrypt rounds 自動為 1
