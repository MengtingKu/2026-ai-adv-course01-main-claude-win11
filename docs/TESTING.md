# TESTING.md

## 測試環境

| 項目 | 說明 |
|------|------|
| 框架 | Vitest 2.x |
| HTTP 測試 | Supertest 7.x |
| 資料庫 | 共用 database.sqlite（不重置） |
| Node 模組 | CommonJS（require） |
| 並行執行 | 停用（fileParallelism: false） |

## 測試檔案

| 檔案 | 說明 |
|------|------|
| tests/setup.js | 共用輔助函式（非測試檔） |
| tests/auth.test.js | 註冊、登入、取得 profile |
| tests/products.test.js | 商品列表、商品詳情 |
| tests/cart.test.js | 加入、修改、刪除購物車（JWT + Session 模式） |
| tests/orders.test.js | 建立訂單、列表、詳情、付款模擬 |
| tests/adminProducts.test.js | 後台商品 CRUD |
| tests/adminOrders.test.js | 後台訂單列表、詳情 |

## 執行順序與依賴關係

測試必須依以下順序執行（定義於 `vitest.config.js`）：

```
auth → products → cart → orders → adminProducts → adminOrders
```

**重要**：所有測試共用同一個 `database.sqlite`，先執行的測試建立的資料（用戶、商品、訂單）會影響後續測試。

例如：`orders.test.js` 依賴 `auth.test.js` 建立的用戶 token 和 `products.test.js` 驗證的商品資料。

## setup.js 輔助函式

```js
const { app, request, getAdminToken, registerUser } = require('./setup');

// 取得管理員 JWT token（seed admin: admin@hexschool.com / 12345678）
const adminToken = await getAdminToken();

// 註冊新用戶（email 自動產生唯一值）
const { token, user } = await registerUser();
const { token, user } = await registerUser({ email: 'custom@test.com', password: 'mypass', name: '測試' });

// 發送 HTTP 請求
const res = await request(app).get('/api/products').set('Authorization', `Bearer ${token}`);
```

## 撰寫新測試步驟

```js
const { app, request, getAdminToken, registerUser } = require('./setup');

describe('功能名稱', () => {
  let token;

  beforeAll(async () => {
    const result = await registerUser();
    token = result.token;
  });

  it('描述預期行為', async () => {
    const res = await request(app)
      .post('/api/some-endpoint')
      .set('Authorization', `Bearer ${token}`)
      .send({ key: 'value' });

    expect(res.status).toBe(200);
    expect(res.body.error).toBeNull();
    expect(res.body.data).toHaveProperty('id');
  });
});
```

## 常見陷阱

1. **不要在測試中 require app 或 database**：直接從 `setup.js` 取得 `app` 和 `request`
2. **bcrypt saltRounds=1**：`NODE_ENV=test` 時自動使用，加快測試速度，勿手動設定
3. **DB 狀態污染**：前面測試建立的資料在後面測試中仍存在；若 id/email 重複會衝突
4. **每次 registerUser() 使用唯一 email**：`test-{Date.now()}-{random}@example.com`，避免 CONFLICT
5. **Session 購物車不需 token**：使用 `.set('X-Session-Id', 'any-unique-string')` 即可操作訪客購物車
6. **測試順序不可改變**：vitest.config.js 的 sequence.files 定義了依賴順序

## 執行測試

```bash
# 執行全部測試
npm test

# 監視模式（開發時）
npx vitest
```
