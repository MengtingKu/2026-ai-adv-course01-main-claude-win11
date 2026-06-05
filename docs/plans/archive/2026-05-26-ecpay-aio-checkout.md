---
feature: ecpay-aio-checkout
status: completed
completed_at: 2026-05-26
---

# ECPay AIO 金流整合計畫

## User Story

身為已登入用戶，我想在完成訂單後透過綠界信用卡付款，這樣就不需要手動進行銀行轉帳。

## Spec

### 技術選型決策

選用 **AIO 全方位金流**（非站內付 2.0）原因：
- 付款頁面由綠界託管，免自行處理信用卡資料（PCI DSS 合規）
- 整合最簡單，只需一次 POST 跳轉
- 適合本機開發驗證

由於本機（localhost）無法接收綠界的 Server Notify callback，採用前端主動查詢替代：
- `ClientBackURL` 導回 `/orders/:id?payment=return`
- 前端偵測到 `?payment=return` 後呼叫 `POST /api/payments/ecpay/query`
- 後端以 `QueryTradeInfo/V5` API 查詢付款結果

### API 端點規格

| 方法 | 路徑 | 認證 | 說明 |
|------|------|------|------|
| POST | /api/payments/ecpay/create-form | JWT | 產生綠界表單參數（含 CheckMacValue） |
| POST | /api/payments/ecpay/query | JWT | 查詢付款結果，更新訂單狀態 |
| POST | /api/payments/ecpay/notify | 無 | ReturnURL stub，固定回應 `1\|OK` |

### DB 異動

`orders` 表新增欄位：
- `merchant_trade_no TEXT` — 綠界交易編號（格式：`EC` + 10位timestamp + 8位UUID）
- `paid_at DATETIME` — 付款完成時間

### CheckMacValue 計算規格

依 ECPay AIO 規格（SHA256）：
1. 移除 CheckMacValue 欄位
2. 參數 key 字母序排序（case-insensitive）
3. 組合：`HashKey={key}&k1=v1&...&HashIV={iv}`
4. PHP urlencode 等效編碼（空格→`+`，補充特殊字元編碼）
5. 全轉小寫
6. 套用 .NET 字元替換（7 組）
7. SHA256 → 大寫 hex

## Tasks

- [x] 新增 `merchant_trade_no` 和 `paid_at` 欄位至 `orders` 資料表（`src/database.js`）
- [x] 實作 `src/utils/ecpay.js`：CheckMacValue 計算、QueryTradeInfo 呼叫
- [x] 實作 `src/routes/paymentRoutes.js`：三支 API 端點
- [x] 掛載路由至 `app.js`（`/api/payments`）
- [x] 更新 `.env.example` 補充 ECPay 環境變數
- [x] 更新 `docs/FEATURES.md` 補充 ECPay 金流段落
- [x] 更新 `docs/ARCHITECTURE.md` 補充 API 路由、DB schema
- [x] 更新 `docs/CHANGELOG.md` 記錄版本更新
