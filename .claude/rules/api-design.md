---
paths:
  - "src/routes/**"
---

# API 設計規則

## 回應格式
所有 API 端點必須回傳統一格式：
- 成功：`{ data: <object|array|null>, error: null, message: "成功" }`
- 失敗：`{ data: null, error: "<ERROR_CODE>", message: "<說明>" }`

## HTTP 狀態碼對照
- 200：成功查詢或更新
- 201：成功新增資源
- 400：驗證錯誤（VALIDATION_ERROR）或業務邏輯錯誤（CART_EMPTY、INVALID_STATUS）
- 401：未認證（UNAUTHORIZED）
- 403：無權限（FORBIDDEN）
- 404：資源不存在（NOT_FOUND）
- 409：資源衝突（CONFLICT）

## 路由命名
- 集合資源：複數名詞（`/products`、`/orders`）
- 子動作用路徑段，不用動詞路由：`PATCH /orders/:id/pay`（而非 `/pay-order/:id`）

## JSDoc 標註
每個路由函式上方必須加 `@openapi` JSDoc，包含：summary、tags、security（若需認證）、requestBody（若有）、responses

## 輸入驗證順序
1. 必填欄位缺少 → 400 VALIDATION_ERROR
2. 格式不正確（email、正整數等）→ 400 VALIDATION_ERROR
3. 資源不存在 → 404 NOT_FOUND
4. 業務邏輯錯誤（庫存不足、狀態錯誤）→ 400

## 404 處理
- `/api` 開頭的未知路徑：回傳 JSON 格式 404
- 其他路徑（前台頁面）：渲染 EJS 404 頁面
