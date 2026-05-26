# FEATURES.md

## 功能清單

| 功能模組 | 狀態 |
|---------|------|
| 會員認證 | ✅ 完成 |
| 商品瀏覽 | ✅ 完成 |
| 購物車（雙模式）| ✅ 完成 |
| 訂單管理 | ✅ 完成 |
| 模擬付款 | ✅ 完成（保留供測試用） |
| 後台商品管理 | ✅ 完成 |
| 後台訂單管理 | ✅ 完成 |
| EJS 前台頁面 | ✅ 完成 |
| ECPay 綠界金流 | ✅ 完成 |

---

## 會員認證（/api/auth）

### 行為描述
- **註冊** `POST /api/auth/register`：驗證 email 格式（正則）、密碼至少 6 字元、name 必填。Email 重複回 409 CONFLICT。成功回傳 `{ user, token }`，JWT 有效期 7 天。
- **登入** `POST /api/auth/login`：比對 bcrypt hash，成功回傳 `{ user, token }`。Email/密碼錯誤統一回 401（不區分哪個錯）。
- **個人資料** `GET /api/auth/profile`：需 JWT。回傳 `id, email, name, role, created_at`，不含 password_hash。

### 必填欄位
- 註冊：`email`、`password`（≥6字）、`name`
- 登入：`email`、`password`

### 錯誤碼
| 錯誤碼 | 情境 |
|--------|------|
| VALIDATION_ERROR | 格式不正確或必填欄位缺少 |
| CONFLICT | Email 已被註冊 |
| UNAUTHORIZED | 登入失敗或 Token 無效 |
| NOT_FOUND | 用戶已被刪除但 Token 仍有效 |

---

## 商品瀏覽（/api/products）

### 行為描述
- **列表** `GET /api/products`：無需認證。支援分頁查詢（`page` 預設 1，`limit` 預設 10，上限 100）。依 `created_at DESC` 排序。回傳 `{ products, pagination: { total, page, limit, totalPages } }`。
- **詳情** `GET /api/products/:id`：無需認證。商品不存在回 404。

---

## 購物車（/api/cart）

### 行為描述（雙模式認證）
購物車同時支援：
- **已登入用戶**：以 `user_id` 識別購物車，使用 JWT Bearer token
- **訪客**：以 `session_id` 識別購物車，使用 `X-Session-Id` 請求標頭

`dualAuth` 函式優先嘗試 JWT，有 Authorization header 但 token 無效立即回 401（不 fallback 至 session）。

### 加入購物車邏輯
- 商品已在購物車中：`quantity += 新增數量`（累加，非覆蓋）
- 累加後超出庫存：回 400 STOCK_INSUFFICIENT
- 商品不存在：回 404

### 必填欄位
- 加入：`productId`、`quantity`（預設 1，必須為正整數）
- 修改：`quantity`（必須為正整數）

### 錯誤碼
| 錯誤碼 | 情境 |
|--------|------|
| VALIDATION_ERROR | quantity 不是正整數 |
| NOT_FOUND | 商品或購物車項目不存在 |
| STOCK_INSUFFICIENT | 數量超出庫存 |
| UNAUTHORIZED | 無有效 token 或 session_id |

---

## 訂單管理（/api/orders）

### 行為描述
所有訂單 API 需 JWT 認證（只能操作自己的訂單）。

**建立訂單** `POST /api/orders`：
1. 驗證收件人資訊（name、email、address 必填）
2. 取得該用戶的購物車（user_id，非 session）
3. 購物車為空回 400 CART_EMPTY
4. 逐一檢查商品庫存，不足則列出商品名稱回 400
5. 計算總金額
6. 在 SQLite transaction 中：建立 order → 建立 order_items（快照價格/名稱）→ 扣庫存（`stock - quantity`）→ 清空購物車
7. 訂單編號格式：`ORD-YYYYMMDD-XXXXX`（date + uuid前5碼大寫）

**付款模擬** `PATCH /api/orders/:id/pay`：
- `action: "success"` → status 改為 `paid`
- `action: "fail"` → status 改為 `failed`
- 只有 `pending` 狀態的訂單可付款（其他回 400 INVALID_STATUS）

### 訂單狀態流程
```
pending → paid    （action: success）
pending → failed  （action: fail）
paid / failed → （不可再更新）
```

### 錯誤碼
| 錯誤碼 | 情境 |
|--------|------|
| VALIDATION_ERROR | 必填欄位缺少或格式錯誤 |
| CART_EMPTY | 下單時購物車為空 |
| STOCK_INSUFFICIENT | 購物車商品庫存不足 |
| INVALID_STATUS | 訂單狀態不是 pending |
| NOT_FOUND | 訂單不存在或不屬於該用戶 |

---

## 後台商品管理（/api/admin/products）

需 JWT + admin role。

- **列表**：同一般商品列表，但走 admin middleware 保護
- **新增**：`name`（必填）、`price`（必填，正整數）、`stock`（必填，非負整數）、`description`/`image_url`（選填）
- **編輯**（PUT）：傳入的欄位覆蓋，未傳入的保留原值
- **刪除**：商品存在未完成（pending）訂單時回 409 CONFLICT

---

## 後台訂單管理（/api/admin/orders）

需 JWT + admin role。

- **列表**：支援 `status` 篩選（pending/paid/failed），支援分頁（page, limit）
- **詳情**：包含訂單資訊、`items` 陣列、`user`（name, email）

---

## 前台 EJS 頁面

路由由 `src/routes/pageRoutes.js` 處理，使用 `views/layouts/front.ejs` 作為 layout。

---

## ECPay 綠界金流（/api/payments）

### 技術選型
採用 **AIO 全方位金流**（非站內付 2.0），流程最簡單，付款頁面由綠界提供，以瀏覽器表單 POST 跳轉。

由於本專案運行於本機（localhost），無法接收綠界的 Server Notify（ReturnURL callback），因此付款結果改為由前端導回後**主動呼叫 QueryTradeInfo API** 查詢，取代被動接收 callback。

### 付款流程
1. 使用者在訂單詳情頁點擊「前往綠界付款」
2. 前端呼叫 `POST /api/payments/ecpay/create-form`，取得簽章後的表單參數
3. 後端產生唯一的 `MerchantTradeNo`，存入 `orders.merchant_trade_no`，計算 CheckMacValue
4. 前端動態建立隱藏表單並 POST 至綠界 AIO 端點
5. 使用者在綠界完成付款，綠界將瀏覽器導回 `ClientBackURL = /orders/:id?payment=return`
6. 前端偵測到 `?payment=return` 後，自動呼叫 `POST /api/payments/ecpay/query`
7. 後端以 `merchant_trade_no` 呼叫 QueryTradeInfo/V5 API 取得付款結果
8. TradeStatus === '1' 時更新 `orders.status = 'paid'`，記錄 `paid_at`

### API 端點

| 方法 | 路徑 | 認證 | 說明 |
|------|------|------|------|
| POST | /api/payments/ecpay/create-form | JWT | 產生綠界表單參數（含 CheckMacValue） |
| POST | /api/payments/ecpay/query | JWT | 向綠界查詢付款結果，更新訂單狀態 |
| POST | /api/payments/ecpay/notify | 無 | ReturnURL stub，固定回應 `1\|OK` |

### create-form 業務邏輯
- 訂單必須屬於當前用戶且 `status === 'pending'`，否則回 400/403
- `MerchantTradeNo` 格式：`EC` + Unix timestamp 後 10 碼 + UUID 前 8 碼大寫（共 20 字元）
- `ItemName`：`商品名稱 x數量` 以 `#` 分隔，超過 400 字自動截斷（防止 CheckMacValue 失效）
- `ChoosePayment` 固定為 `Credit`（信用卡）
- `ClientBackURL` 設為 `/orders/:id?payment=return`

### query 業務邏輯
- 訂單無 `merchant_trade_no` 時回 400 PAYMENT_NOT_INITIATED
- 呼叫綠界 QueryTradeInfo/V5，解析 URL-encoded 回應字串
- `TradeStatus === '1'` 視為付款成功，更新訂單狀態為 `paid` 並記錄 `paid_at`
- `TradeStatus !== '1'` 時訂單狀態維持 `pending`，不改寫為 `failed`（避免誤判）

### CheckMacValue 計算（src/utils/ecpay.js）
依照 ECPay AIO 規格（SHA256）：
1. 移除 CheckMacValue 欄位（若存在）
2. 參數 key 按字母序（case-insensitive）排序
3. 組合字串：`HashKey={key}&k1=v1&...&HashIV={iv}`
4. 對整串進行 PHP urlencode 等效編碼（空格→`+`，`!~*'()` 補充編碼）
5. 全部轉小寫
6. 套用 .NET 字元替換（`%21→!`, `%2a→*`, `%28→(`, `%29→)` 等 7 組）
7. SHA256 雜湊 → 轉大寫 hex

### 錯誤碼
| 錯誤碼 | 情境 |
|--------|------|
| VALIDATION_ERROR | 缺少 orderId |
| NOT_FOUND | 訂單不存在 |
| FORBIDDEN | 訂單不屬於當前用戶 |
| INVALID_STATUS | 訂單非 pending 狀態 |
| PAYMENT_NOT_INITIATED | 尚未建立付款（無 merchant_trade_no） |
| ECPAY_ERROR | 呼叫綠界 API 失敗 |

### 環境變數
| 變數 | 說明 | 測試值 |
|------|------|--------|
| ECPAY_MERCHANT_ID | 特店編號 | `3002607` |
| ECPAY_HASH_KEY | 加密金鑰 | `pwFHCqoQZGmho4w6` |
| ECPAY_HASH_IV | 加密向量 | `EkRm7iFT261dpevs` |
| ECPAY_ENV | 環境切換 | `staging`（正式改 `production`） |
| BASE_URL | 本機或部署網址（用於 ReturnURL / ClientBackURL） | `http://localhost:3001` |
