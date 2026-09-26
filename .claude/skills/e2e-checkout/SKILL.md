---
name: e2e-checkout
description: 用 Playwright 對花漾生活前台跑完整 E2E 結帳金流測試（登入→加入購物車→結帳→綠界信用卡 3D 付款→主動查詢驗證已付款），每個關鍵步驟截圖存於 docs/e2e-screenshots/。
user-invocable: true
---

# E2E 結帳金流測試

對本專案前台（http://localhost:3001）執行端到端購物結帳測試，涵蓋登入、購物車、
結帳建單、綠界 staging 信用卡 3D 驗證付款，最後**由本地主動查詢綠界**驗證訂單轉為
「已付款」。**全程用 Playwright MCP，每個關鍵步驟截圖**。

> 本流程已實測驗證可達「已付款」。請嚴格遵守下方兩個「關鍵注意」，否則訂單會卡在待付款。

## 架構說明（為何能在本地達成已付款）
本專案僅運行於本地端，**無法接收綠界 Server Notify（ReturnURL `/api/payments/ecpay/notify`
在 localhost 收不到，固定回 `1|OK`）**。付款結果改由**本地主動呼叫綠界查詢 API** 驗證：
- 綠界付款成功後跳轉 `ClientBackURL`（`/orders/:id?payment=return`）
- 前端 `public/js/pages/order-detail.js` 偵測 `payment=return` → 呼叫 `POST /api/payments/ecpay/query`
- 該 API 由 server **出站**呼叫綠界 `QueryTradeInfo`（localhost 可行），`TradeStatus=1` 時更新訂單為 `paid`

## 🔴 關鍵注意（務必遵守）
1. **綠界信用卡欄位必須「逐字鍵入」**（Playwright `pressSequentially` / `browser_type` 開
   `slowly:true`），**不可用 `fill()`**。綠界表單靠 keyup/change 事件驗證，直接塞 value 會被
   判定為空 → 紅字「請輸入信用卡卡號」→ 無法送出。
2. **不要用右側「測試付款請點此」（綠界支付掃碼 mock）來完成信用卡訂單。** 那是掃碼／綠界Pay
   管道，對 `ChoosePayment=Credit` 的交易只會產生 `TradeStatus=0`（訂單成立但未付款），
   主動查詢永遠是 pending。**必須走信用卡「立即付款 → 3D OTP」真實流程。**

## 預設參數（可由使用者覆寫）
- 帳號 / 密碼：admin@hexschool.com / 12345678
- 商品：商品列表第一個「加入 →」
- 收件資訊：測試用戶 / admin@hexschool.com / 台北市信義區信義路五段7號
- 綠界測試信用卡：**4311-9522-2222-2222**、有效期 **01 / 30**、CVV **222**、持卡人 TEST USER、手機 0912345678
- 綠界 3D OTP 測試密碼：**1234**（驗證頁會顯示「(OTP密碼：1234)」）
- 截圖目錄：`docs/e2e-screenshots/`

## 前置
- Playwright MCP 可用。每步先 `browser_snapshot` 取 ref 再操作（每次 session ref 不同）。
- **截圖路徑用專案絕對路徑**（Playwright MCP 以 `.playwright-mcp/` 為相對基準，相對路徑會被擋）：
  `C:/Users/Jim/Documents/repo/2026-ai-adv-homework-course01-main/docs/e2e-screenshots/<檔名>.png`
  目錄不存在則先建立。

## 步驟

1. **確認伺服器**：`browser_navigate http://localhost:3001`。
   若 ERR_CONNECTION_REFUSED → 背景執行 `npm start`，等約 4 秒後重試直到首頁載入。

2. **登入**：navigate `/login`，填 Email/密碼，送出。回首頁且 header 出現「登出」即成功。
   （本專案前端表單用 `fill()` 即可，只有「綠界」頁面才需逐字鍵入。）

3. **加入購物車**：首頁商品列表點第一個「加入 →」。📸 `step1-add-to-cart.png`

4. **檢視購物車**：navigate `/cart`，確認品項與小計，點「前往結帳」。

5. **結帳建單**：`/checkout` 填收件人姓名 / Email / 收件地址 → 「確認送出訂單」。
   跳轉 `/orders/<uuid>`，**記下 URL 的 orderId 與頁面訂單編號（ORD-…）**。
   📸 `step2-order-created.png`

6. **前往綠界**：點「前往綠界付款」→ 進入 payment-stage.ecpay.com.tw 信用卡頁。
   （ChoosePayment 硬編 `Credit`（`src/utils/ecpay.js:72`），故頁面只有信用卡，無 ATM。
   若要測 ATM 需先改該欄位為 `'ATM'`/`'ALL'`，測後還原。）

7. **逐字鍵入信用卡資料**（用欄位 id，全部 `slowly:true`）：
   - `#CCpart1`=4311　`#CCpart2`=9522　`#CCpart3`=2222　`#CCpart4`=2222
   - `#creditMM`=01　`#creditYY`=30　`#CreditBackThree`=222
   - `#CCHolderTemp`=TEST USER　`#CellPhoneCheck`=0912345678
   📸 `step3-ecpay-form.png`

8. **送出信用卡付款**：
   a. 點「立即付款」。出現 staging 測試環境提示框 → 點「關閉」。
   b. **再點一次「立即付款」** → 出現確認框「您確定使用信用卡，支付此筆訂單金額…」→ 點「確定」。
   c. 跳轉 cc-stage.ecpay.com.tw 3D 驗證頁「交易驗證碼確認」→ 點「取得OTP服務密碼」。
   d. 頁面顯示「(OTP密碼：1234)」→ 於 OTP 輸入框鍵入 `1234` → 點「送出」。
   e. 出現「付款成功」頁（付款方式：信用卡–一次付清）。📸 `step4-ecpay-paid.png`

9. **返回並主動查詢驗證**：
   a. 點付款成功頁的「返回商店」（即 `ClientBackURL` = `/orders/:id?payment=return`）。
      前端自動呼叫 query API，server 向綠界查 `QueryTradeInfo` 並更新訂單。
   b. 等 2–3 秒，頁面應出現綠色橫幅「付款成功！感謝您的購買。」、狀態徽章「已付款」。
      📸 `step5-order-paid.png`
   c. navigate `/orders` 確認該筆訂單列為「已付款」。📸 `step6-orders-list.png`

## 完成後回報
輸出表格：每步驟狀態（✅/❌）、訂單編號、最終訂單狀態、各截圖檔路徑。

## 疑難排解
- **綠界紅字「請輸入信用卡卡號」**：用了 `fill()`。改逐字鍵入（關鍵注意 1）。
- **查詢一直 pending、`paymentType` 為空**：多半是用了掃碼 mock（關鍵注意 2），該管道 `TradeStatus=0`。
  改走步驟 8 真實信用卡 3D 流程。可用下列指令直接查綠界確認：
  ```bash
  node -e "require('dotenv').config(); require('./src/utils/ecpay').queryTradeInfo('<MerchantTradeNo>').then(r=>console.log(r))"
  ```
  `TradeStatus:'1'` 才是已付款；`'0'` 為訂單成立未付款。
- **綠界頁無 ATM**：預期行為（ChoosePayment=Credit），見步驟 6。
- **截圖 File access denied**：用了相對路徑。改專案絕對路徑（見前置）。
- **連線被拒**：伺服器未啟動，回步驟 1。
