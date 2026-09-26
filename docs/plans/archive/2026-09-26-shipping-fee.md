---
feature: shipping-fee
status: completed
completed_at: 2026-09-26
---

# 配送運費計算計畫

## User Story

身為已登入用戶，我想在結帳時選擇配送方式與附加服務，並看到正確的運費與訂單總額。

## Spec

### 費用規則
- 宅配基本運費 120 元；商品小計滿 1,500 元免基本運費
- 超商取貨 60 元（不是基本運費，不適用滿額免運）
- 偏遠地區 +200 元、當日急件 +250 元（可疊加，不因滿額減免）

### 設計決策
- 運費邏輯封裝於 `src/utils/shipping.js`，純函式、不依賴 DB，可獨立單元測試
- 配送參數皆為選填，預設一般宅配，舊呼叫端維持相容
- 新增 `POST /api/orders/shipping-quote` 讓前端由後端試算，避免前後端規則分歧
- `orders` 新增 `subtotal`、`shipping_fee`、`shipping_method`、`is_remote_area`、`is_urgent`（冪等 ALTER）
- `total_amount = subtotal + shipping_fee`，綠界付款金額隨之包含運費

## Tasks
- [x] 建立 Shipping 模組
- [x] 整合至建立訂單流程與 DB migration
- [x] 新增運費試算端點
- [x] 結帳頁 / 訂單詳情頁顯示運費
- [x] 單元測試與 API 測試
- [x] 更新 docs、openapi.json
