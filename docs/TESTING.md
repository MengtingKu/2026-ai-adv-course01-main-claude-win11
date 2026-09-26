# TESTING.md

## 測試指令

| 指令 | 範圍 | 需要啟動伺服器 |
|------|------|------|
| `npm run test:unit` | `tests/unit/`：純函式單元測試（Shipping 模組） | 否 |
| `npm run test:integration` | `tests/integration/`：結帳流程整合測試（Supertest + 記憶體 SQLite） | 否 |
| `npm test` | 全部 Vitest 測試（unit + API + integration） | 否 |
| `npm run test:e2e` | `tests/e2e/`：Playwright 前台 + 綠界付款 E2E | **是**（使用已啟動的 http://localhost:3001） |
| `npm run postman` | 產生 `openapi.json` 並轉為 Postman Collection | 否 |

## 測試環境

| 項目 | 說明 |
|------|------|
| 框架 | Vitest 2.x（unit / integration / API）、Playwright（E2E） |
| HTTP 測試 | Supertest 7.x |
| 資料庫 | Vitest 以 `DB_PATH=':memory:'` 執行（`vitest.config.js` 的 `test.env`），**不會讀寫 `database.sqlite`** |
| Node 模組 | CommonJS（require） |
| 並行執行 | 停用（fileParallelism: false） |

### 資料庫隔離

`src/database.js` 讀取 `DB_PATH` 環境變數（未設定時使用專案根目錄的 `database.sqlite`）。Vitest 設定 `DB_PATH=':memory:'`，
每個測試檔在獨立 worker 載入模組，因此各自擁有一個全新的記憶體 SQLite（啟動時建表並 seed 管理員與 8 筆商品），測試結束即釋放。

- 同一個測試檔內的測試共用該檔的記憶體 DB
- 不同測試檔之間**不共享**資料，每個檔案須在 `beforeAll` / `beforeEach` 自行建立所需資料

## 測試檔案

| 檔案 | 說明 |
|------|------|
| tests/setup.js | 共用輔助函式（非測試檔） |
| tests/unit/shipping.test.js | Shipping 模組單元測試（宅配/超商、1,499/1,500 門檻、附加費組合、參數驗證），不需 DB |
| tests/auth.test.js | 註冊、登入、取得 profile |
| tests/products.test.js | 商品列表、商品詳情 |
| tests/cart.test.js | 加入、修改、刪除購物車（JWT + Session 模式） |
| tests/orders.test.js | 建立訂單、列表、詳情、付款模擬、運費試算與訂單總額 |
| tests/adminProducts.test.js | 後台商品 CRUD |
| tests/adminOrders.test.js | 後台訂單列表、詳情 |
| tests/integration/checkout.test.js | 結帳流程整合測試（見下方） |
| tests/e2e/checkout-webatm.spec.js | Playwright E2E：登入 → 結帳 → 綠界網路 ATM 付款 → 已付款 |

## Integration Test（tests/integration/checkout.test.js）

流程：建立測試會員 → 登入 → 取得商品 → 加入購物車 → 建立含配送方式與收件資訊的訂單 → 驗證結果。

| 驗證項目 | 做法 |
|------|------|
| HTTP 狀態碼與回應格式 | 檢查 status 與 `{ data, error, message }` 格式 |
| 訂單 / 訂單品項寫入 | 直接查詢 `orders`、`order_items`（收件資訊、配送欄位、價格快照、數量） |
| 運費與訂單總額 | 超商 + 偏遠 = 260、宅配未滿額 = 120、宅配滿額 + 急件 = 250；`total_amount = subtotal + shipping_fee` |
| 庫存扣除 | 比對下單前後 `products.stock` |
| 購物車清空 | `GET /api/cart` 與 `cart_items` 皆為空 |
| 失敗不留下不完整訂單 / 不扣庫存 | 庫存不足、配送方式不合法、空購物車，以及 **transaction 中途失敗**（以 TEMP TRIGGER 讓第二筆 `order_items` INSERT 失敗）後，確認無訂單、無孤兒品項、庫存不變、購物車保留 |

測試資料：`beforeEach` 以唯一 email 建立會員；`afterEach` 刪除該會員的訂單、品項、購物車與帳號，並還原所有商品庫存。

## E2E Test（Playwright）

**前置**：專案必須已啟動（`npm start` 或 `npm run dev:server`），E2E 不會自行啟動伺服器（`playwright.config.js` 未設定 `webServer`）。
可用 `E2E_BASE_URL` 指向其他位址。首次執行需安裝瀏覽器：`npx playwright install chromium`。

流程（admin@hexschool.com / 12345678）：

1. 登入 → 清空既有購物車
2. 首頁第一個商品「加入 →」
3. 購物車 → 前往結帳
4. 填寫收件資訊，選擇「超商取貨」+「當日急件」（驗證試算運費 310）
5. 確認送出訂單（驗證 API 回傳 pending、配送欄位、總額）
6. 前往綠界付款（staging）
7. 選擇「網路ATM」→ 8. 「台灣土地銀行」→ 9. 「前往付款」
10. 關閉提示視窗 → 11. 土地銀行模擬頁點 `Save`
12. 等待綠界「付款成功」→ 13. 「返回商店」
14. 訂單頁顯示「已付款」→ 15. `GET /api/orders/:id` 的 `status` 為 `paid`

截圖存於 `tests/e2e/screenshots/`（`08-order-paid.png` 為返回站點後的付款成功畫面）。失敗時的 trace / 截圖在 `test-results/`，HTML 報告在 `playwright-report/`。

> 綠界頁面需出現「網路ATM」，伺服器的 `ECPAY_CHOOSE_PAYMENT` 需為 `ALL`（預設）或 `WebATM`。

## Postman Collection

`npm run postman` 會先執行 `npm run openapi` 產生最新 `openapi.json`，再以 `scripts/generate-postman.js`（openapi-to-postmanv2）轉換為
`postman/flower-shop.postman_collection.json`：

- 變數 `baseUrl`（預設 `http://localhost:3001`）、`token`、`sessionId`；所有 URL 使用 `{{baseUrl}}`
- Collection 層級 Bearer `{{token}}`，需要登入的 API 自動套用；公開 API 設為 No Auth
- 購物車 API 另帶 `X-Session-Id: {{sessionId}}`（訪客模式）
- 「登入」/「註冊」成功後以 test script 自動把 JWT 存入 `token`
- 產生時會驗證 JSON 有效、變數齊全、URL 皆使用 `{{baseUrl}}`

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

子目錄中的測試使用 `require('../setup')`。

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

1. **app 從 `setup.js` 取得**：需要直接驗證 DB 時（如 integration test）可 `require('../../src/database')`，會取得與 app 相同的記憶體 DB 實例
2. **bcrypt saltRounds=1**：`NODE_ENV=test` 時自動使用，加快測試速度，勿手動設定
3. **測試檔之間不共享資料**：每個檔案各自一個記憶體 DB，勿依賴其他測試檔建立的資料
4. **每次 registerUser() 使用唯一 email**：`test-{Date.now()}-{random}@example.com`，避免 CONFLICT
5. **Session 購物車不需 token**：使用 `.set('X-Session-Id', 'any-unique-string')` 即可操作訪客購物車
6. **E2E 會寫入實際資料庫**：E2E 透過已啟動的伺服器操作，訂單會寫入該伺服器使用的 DB
7. **綠界欄位**：信用卡欄位需逐字鍵入（見 `.claude/skills/e2e-checkout`）；網路 ATM 流程無需輸入

## 執行測試

```bash
npm run test:unit          # 單元測試
npm run test:integration   # 整合測試
npm test                   # 全部 Vitest 測試
npm run test:e2e           # E2E（需先啟動伺服器）
npx vitest                 # 監視模式（開發時）
```
