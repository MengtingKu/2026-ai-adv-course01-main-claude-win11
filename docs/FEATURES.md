# FEATURES.md

## 功能清單

| 功能模組 | 狀態 |
|---------|------|
| 會員認證 | ✅ 完成 |
| 商品瀏覽 | ✅ 完成 |
| 購物車（雙模式）| ✅ 完成 |
| 訂單管理 | ✅ 完成 |
| 模擬付款 | ✅ 完成 |
| 後台商品管理 | ✅ 完成 |
| 後台訂單管理 | ✅ 完成 |
| EJS 前台頁面 | ✅ 完成 |
| ECPay 整合 | 🔲 未完成（.env 有相關變數） |

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
