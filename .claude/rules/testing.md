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
所有測試共用 `database.sqlite`，不重置。測試之間有狀態依賴，須考慮執行順序影響。

## 不要修改的設定
- 不要修改 `vitest.config.js` 的 sequence.files 順序
- 測試環境 NODE_ENV 設為 'test'，bcrypt rounds 自動為 1
