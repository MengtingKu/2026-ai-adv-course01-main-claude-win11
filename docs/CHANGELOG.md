# CHANGELOG.md

## [未發布]

## [1.4.0] - 2026-09-26

### 新增
- **測試指令**：`test:unit`、`test:integration`、`test:e2e`、`postman`
- `tests/integration/checkout.test.js`：結帳流程整合測試（訂單/品項寫入、運費、總額、扣庫存、清空購物車、失敗時 rollback 不扣庫存）
- `tests/e2e/checkout-webatm.spec.js` + `playwright.config.js`：Playwright E2E，登入 → 結帳 → 綠界網路 ATM（台灣土地銀行）付款 → 返回商店驗證已付款，截圖存於 `tests/e2e/screenshots/`
- `scripts/generate-postman.js`：openapi.json → `postman/flower-shop.postman_collection.json`（`{{baseUrl}}`、`token`、`sessionId` 變數，登入自動存 JWT，Bearer 自動套用）
- 環境變數 `DB_PATH`、`ECPAY_CHOOSE_PAYMENT`、`E2E_BASE_URL`

### 變更
- Vitest 改用記憶體 SQLite（`DB_PATH=':memory:'`），測試不再寫入 `database.sqlite`
- `tests/shipping.test.js` 移至 `tests/unit/shipping.test.js`
- 綠界 `ChoosePayment` 由固定 `Credit` 改為預設 `ALL`（可選網路 ATM 等付款方式）
- devDependencies 新增 `@playwright/test`、`openapi-to-postmanv2`

## [1.3.0] - 2026-09-26

### 新增
- **Shipping 運費模組**（`src/utils/shipping.js`）
  - 宅配基本運費 120 元，商品小計滿 1,500 元免基本運費
  - 超商取貨 60 元（非基本運費，不適用滿額免運）
  - 偏遠地區 +200 元、當日急件 +250 元（附加費可疊加，不因免運減免）
- `POST /api/orders/shipping-quote`：依購物車試算運費與訂單總額
- `tests/shipping.test.js`：Shipping 模組單元測試；`tests/orders.test.js` 新增運費 API 測試
- 產出 `openapi.json`（新增 `ShippingOptions`、`ShippingBreakdown` schema）

### 變更
- `POST /api/orders` 接受 `shippingMethod`、`isRemoteArea`、`isUrgent`（皆選填，預設一般宅配）；`total_amount` 改為商品小計 + 運費，回應新增 `subtotal`、`shipping_fee`、`shipping`
- `orders` 資料表新增欄位（啟動時自動 ALTER，冪等）：`subtotal`、`shipping_fee`、`shipping_method`、`is_remote_area`、`is_urgent`
- 結帳頁新增配送方式與附加選項，運費改由後端試算（移除前端寫死的「滿 500 免運 / 運費 150」）
- 訂單詳情頁顯示商品小計與運費明細

## [1.2.0] - 2026-06-06

### 新增
- **Editorial Luxury 設計系統**（`public/css/input.css`）
  - Tailwind CSS v4 `@theme {}` 自訂 token：bg-base/raised/paper/dark、ink-900/600/400、cherry/cherry-press、success/warning/error、line-strong/soft
  - 字型系統：Cormorant Garamond（display，義大利體/字重 300–600）+ Inter Tight + Noto Sans TC（UI）
  - 工具類：`.font-display`、`.font-ui`、`.text-overline`（全大寫 + 字間距）、`.transition-base`
- **首頁（`views/pages/index.ejs`）** — 全新 Editorial 設計
  - 分割式英雄區塊：左側深色面板（Cormorant Garamond 主題、cherry CTA）+ 右側全出血花卉圖片
  - Cherry 橫幅跑馬燈
  - 非對稱精選商品格（大卡 + 2 疊 + 2 底部）—— Vue.js `products.slice()` 動態渲染
  - 深色場合選擇區塊（4 格，帶裝飾性大數字）
  - 品牌故事左圖右文分割
  - 完整商品方格（3 欄）+ 分頁，所有 Vue.js binding 完整保留
- **`front.ejs` layout** 新增 `fullWidth` 模式，跳過 `max-w-7xl` 容器限制（供首頁等全出血頁面使用）

### 變更
- **全域 partials 重刻**
  - `header.ejs`：深色 sticky 導覽列（bg-bg-dark 72px）、Cormorant + BLOOM overline logo、cherry 購物車徽章、所有 JS hook 保留
  - `footer.ejs`：ink-900 深色底，4 欄連結 + 電子報訂閱
  - `head.ejs`：標題格式改為 `— 花漾生活 BLOOM`，載入 Cormorant Garamond / Inter Tight / Noto Sans TC 字型
- **6 個前台頁面重刻**（保留所有 Vue.js 資料綁定與事件處理）
  - `product-detail.ejs`：4:5 比例商品圖 + serif 標題 + cherry 價格 + 極簡數量步進器
  - `cart.ejs`：欄位格線購物車 + 右側摘要面板 + 無圓角 confirm 對話框
  - `checkout.ejs`：左側表單 + 右側 sticky 訂單摘要
  - `login.ejs`：居中卡片、底線 tab 切換（cherry 下劃線指示器）
  - `orders.ejs`：表格式訂單列表 + 狀態徽章
  - `order-detail.ejs`：兩欄配置（訂單資訊 + 商品明細表）+ ECPay 按鈕
  - `404.ejs`：水印式大字 + serif 標題 + cherry 分隔線

### 維護
- 移除所有 Zone.Identifier 備用資料流檔案（58 個，NTFS Windows 下載產生）
- `.gitignore` 新增 `*Zone.Identifier`（無前置冒號）以補充捕捉 Unicode 私用字元版本（U+F03A）

## [1.1.0] - 2026-05-26

### 新增
- ECPay 綠界 AIO 全方位金流串接
  - `POST /api/payments/ecpay/create-form`：產生簽章後的表單參數，前端直接 POST 至綠界
  - `POST /api/payments/ecpay/query`：主動呼叫綠界 QueryTradeInfo/V5 查詢付款結果
  - `POST /api/payments/ecpay/notify`：ReturnURL stub，回應 `1|OK` 避免重試
  - `src/utils/ecpay.js`：CheckMacValue（SHA256）計算、表單參數組裝、HTTPS 查詢工具

### 變更
- `orders` 資料表新增兩個欄位（啟動時自動 ALTER，幂等）：
  - `merchant_trade_no TEXT`：存放送至綠界的交易編號
  - `paid_at TEXT`：付款成功時間（由綠界回傳）
- 訂單詳情頁（`/orders/:id`）：「模擬付款成功/失敗」按鈕改為「前往綠界付款」，導回後自動查詢付款結果並更新狀態顯示

## [1.0.0] - 2026-05-26

### 新增
- 會員系統：註冊、登入、個人資料（JWT 認證）
- 商品瀏覽：列表（分頁）、詳情
- 購物車：新增/修改/刪除，支援 JWT 和 X-Session-Id 雙模式認證
- 訂單管理：建立訂單（含庫存扣減 transaction）、列表、詳情、模擬付款
- 後台商品管理：CRUD（需 admin role）
- 後台訂單管理：列表（支援 status 篩選）、詳情
- EJS 前台頁面
- Swagger UI API 文件
- Vitest + Supertest 完整測試套件
