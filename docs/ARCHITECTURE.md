# ARCHITECTURE.md

## 目錄結構

```
.
├── app.js                  # Express app 設定（middleware、路由掛載）
├── server.js               # HTTP server 啟動（含 JWT_SECRET 檢查）
├── database.sqlite         # SQLite 資料庫（WAL mode）
├── vitest.config.js        # 測試配置（測試順序）
├── generate-openapi.js     # OpenAPI JSON 產生器
├── swagger-config.js       # Swagger UI 配置
├── public/
│   ├── css/
│   │   ├── input.css       # Tailwind CSS 入口
│   │   └── output.css      # 編譯後的 CSS（由 npm run css:build 產生）
│   └── js/                 # 前台 JavaScript
├── views/
│   ├── layouts/            # EJS layout（front.ejs）
│   ├── pages/              # 各頁面 EJS（index, product, cart, orders...）
│   └── partials/           # 共用片段（navbar, footer...）
├── src/
│   ├── database.js         # DB 初始化、建表、seed data，匯出 db 實例
│   ├── routes/
│   │   ├── authRoutes.js       # /api/auth/*
│   │   ├── productRoutes.js    # /api/products/*（公開）
│   │   ├── cartRoutes.js       # /api/cart/*（雙模式認證）
│   │   ├── orderRoutes.js      # /api/orders/*（需登入）
│   │   ├── paymentRoutes.js    # /api/payments/*（綠界金流）
│   │   ├── adminProductRoutes.js # /api/admin/products/*（需 admin）
│   │   ├── adminOrderRoutes.js # /api/admin/orders/*（需 admin）
│   │   └── pageRoutes.js       # /* EJS 頁面路由
│   ├── middleware/
│   │   ├── authMiddleware.js    # JWT Bearer 驗證
│   │   ├── adminMiddleware.js   # role=admin 檢查（須接在 authMiddleware 之後）
│   │   ├── sessionMiddleware.js # X-Session-Id 標頭解析
│   │   └── errorHandler.js     # 全域錯誤處理（Express error middleware）
│   └── utils/
│       └── ecpay.js            # CheckMacValue 計算、表單參數組裝、QueryTradeInfo 查詢
└── tests/
    ├── setup.js            # 共用輔助函式（getAdminToken, registerUser）
    ├── auth.test.js
    ├── products.test.js
    ├── cart.test.js
    ├── orders.test.js
    ├── adminProducts.test.js
    └── adminOrders.test.js
```

## 啟動流程

```
server.js
  ├── 檢查 JWT_SECRET（缺少則 process.exit(1)）
  └── app.listen(PORT)
        └── app.js
              ├── require('./src/database') → initializeDatabase()
              │     ├── CREATE TABLE IF NOT EXISTS（5 張表）
              │     ├── seedAdminUser()（如 admin 不存在則建立）
              │     └── seedProducts()（如無商品則植入 8 筆）
              ├── 掛載 global middleware（cors, json, urlencoded, sessionMiddleware）
              ├── 掛載 API routes（/api/auth, /api/products, /api/cart, ...）
              ├── 掛載 page routes（/）
              ├── 404 handler（JSON for /api, EJS for 其他）
              └── errorHandler（全域錯誤）
```

## API 路由總覽

| 方法 | 路徑 | 認證 | 說明 |
|------|------|------|------|
| POST | /api/auth/register | 無 | 註冊（email/password/name） |
| POST | /api/auth/login | 無 | 登入，回傳 JWT |
| GET | /api/auth/profile | JWT | 取得個人資料 |
| GET | /api/products | 無 | 商品列表（分頁：page, limit） |
| GET | /api/products/:id | 無 | 商品詳情 |
| GET | /api/cart | JWT 或 Session | 查看購物車 |
| POST | /api/cart | JWT 或 Session | 加入購物車 |
| PATCH | /api/cart/:itemId | JWT 或 Session | 修改數量 |
| DELETE | /api/cart/:itemId | JWT 或 Session | 移除項目 |
| POST | /api/orders | JWT | 從購物車建立訂單（含扣庫存 transaction） |
| GET | /api/orders | JWT | 個人訂單列表 |
| GET | /api/orders/:id | JWT | 訂單詳情 |
| PATCH | /api/orders/:id/pay | JWT | 模擬付款（action: success/fail，保留供測試） |
| POST | /api/payments/ecpay/create-form | JWT | 產生綠界 AIO 表單參數（含 CheckMacValue） |
| POST | /api/payments/ecpay/query | JWT | 向綠界查詢付款結果，更新訂單狀態 |
| POST | /api/payments/ecpay/notify | 無 | 綠界 ReturnURL stub，回應 1\|OK |
| GET | /api/admin/products | JWT + admin | 後台商品列表（分頁） |
| POST | /api/admin/products | JWT + admin | 新增商品 |
| PUT | /api/admin/products/:id | JWT + admin | 編輯商品 |
| DELETE | /api/admin/products/:id | JWT + admin | 刪除商品（有未完成訂單時拒絕） |
| GET | /api/admin/orders | JWT + admin | 後台訂單列表（支援 status 篩選） |
| GET | /api/admin/orders/:id | JWT + admin | 後台訂單詳情（含 items 和 user） |

## 統一回應格式

```json
// 成功
{ "data": { ... }, "error": null, "message": "成功" }

// 失敗
{ "data": null, "error": "VALIDATION_ERROR", "message": "email 為必填欄位" }
```

常用 error code：`VALIDATION_ERROR`、`UNAUTHORIZED`、`FORBIDDEN`、`NOT_FOUND`、`CONFLICT`、`STOCK_INSUFFICIENT`、`CART_EMPTY`、`INVALID_STATUS`

## 認證與授權機制

### authMiddleware（src/middleware/authMiddleware.js）
- 讀取 `Authorization: Bearer <token>` 標頭
- 使用 `jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] })`
- 驗證後確認用戶仍存在於 DB
- 將 `{ userId, email, role }` 附加至 `req.user`
- 失敗回傳 401

### adminMiddleware（src/middleware/adminMiddleware.js）
- 必須接在 authMiddleware 之後
- 檢查 `req.user.role === 'admin'`
- 失敗回傳 403

### sessionMiddleware（src/middleware/sessionMiddleware.js）
- 讀取 `X-Session-Id` 請求標頭
- 附加至 `req.sessionId`（無論是否有值都 next()）

### dualAuth（cartRoutes.js 內的本地函式）
購物車專用，支援兩種認證方式：
1. **有 Authorization 標頭**：嘗試 JWT 驗證，成功設 `req.user`，失敗立即回 401
2. **無 Authorization 標頭，有 X-Session-Id**：以 `req.sessionId` 識別訪客購物車
3. **兩者皆無**：回 401

### JWT 參數
- 演算法：HS256
- 有效期：7 天（`expiresIn: '7d'`）
- Payload：`{ userId, email, role }`

## 資料庫 Schema

### users
| 欄位 | 型別 | 約束 |
|------|------|------|
| id | TEXT PK | UUID |
| email | TEXT | UNIQUE NOT NULL |
| password_hash | TEXT | NOT NULL |
| name | TEXT | NOT NULL |
| role | TEXT | NOT NULL DEFAULT 'user', CHECK IN ('user','admin') |
| created_at | TEXT | NOT NULL DEFAULT datetime('now') |

### products
| 欄位 | 型別 | 約束 |
|------|------|------|
| id | TEXT PK | UUID |
| name | TEXT | NOT NULL |
| description | TEXT | 可為 NULL |
| price | INTEGER | NOT NULL CHECK(price > 0) |
| stock | INTEGER | NOT NULL DEFAULT 0 CHECK(stock >= 0) |
| image_url | TEXT | 可為 NULL |
| created_at | TEXT | NOT NULL DEFAULT datetime('now') |
| updated_at | TEXT | NOT NULL DEFAULT datetime('now') |

### cart_items
| 欄位 | 型別 | 約束 |
|------|------|------|
| id | TEXT PK | UUID |
| session_id | TEXT | 可為 NULL（訪客用） |
| user_id | TEXT | 可為 NULL, FK → users(id)（登入用戶） |
| product_id | TEXT | NOT NULL, FK → products(id) |
| quantity | INTEGER | NOT NULL DEFAULT 1 CHECK(quantity > 0) |

> `session_id` 和 `user_id` 擇一使用，由 dualAuth 的 `getOwnerCondition()` 決定用哪個欄位查詢。

### orders
| 欄位 | 型別 | 約束 |
|------|------|------|
| id | TEXT PK | UUID |
| order_no | TEXT | UNIQUE NOT NULL，格式：ORD-YYYYMMDD-XXXXX |
| user_id | TEXT | NOT NULL, FK → users(id) |
| recipient_name | TEXT | NOT NULL |
| recipient_email | TEXT | NOT NULL |
| recipient_address | TEXT | NOT NULL |
| total_amount | INTEGER | NOT NULL |
| status | TEXT | NOT NULL DEFAULT 'pending', CHECK IN ('pending','paid','failed') |
| merchant_trade_no | TEXT | 可為 NULL，綠界付款時寫入，格式：`EC` + 10位timestamp + 8碼UUID |
| paid_at | TEXT | 可為 NULL，付款成功時由綠界 QueryTradeInfo 回傳的付款時間 |
| created_at | TEXT | NOT NULL DEFAULT datetime('now') |

### order_items
| 欄位 | 型別 | 約束 |
|------|------|------|
| id | TEXT PK | UUID |
| order_id | TEXT | NOT NULL, FK → orders(id) |
| product_id | TEXT | NOT NULL, FK → products(id) |
| product_name | TEXT | NOT NULL（快照，不受後續商品修改影響） |
| product_price | INTEGER | NOT NULL（快照） |
| quantity | INTEGER | NOT NULL |

> `product_name` 和 `product_price` 在建立訂單時複製，避免商品資料變更影響歷史訂單。
