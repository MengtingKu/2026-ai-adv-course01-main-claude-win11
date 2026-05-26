# CHANGELOG.md

## [未發布]

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
