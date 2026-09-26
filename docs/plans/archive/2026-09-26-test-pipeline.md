---
feature: test-pipeline
status: completed
completed_at: 2026-09-26
---

# 完整測試流程計畫（Unit / Integration / E2E / Postman）

## User Story

身為開發者，我想用一組指令驗證前端操作、後端 API、資料庫寫入、庫存更新與綠界付款流程，且測試不會污染開發用資料庫。

## Spec

### 決策
- `src/database.js` 支援 `DB_PATH`；Vitest 全域設定 `DB_PATH=':memory:'`，每個測試檔一個獨立記憶體 DB
- Integration test 直接查詢 DB 驗證寫入；以 TEMP TRIGGER 製造 transaction 中途失敗，驗證 rollback
- E2E 使用 Playwright（`@playwright/test`），連線已啟動的 3001，不設定 `webServer`
- 綠界 `ChoosePayment` 改為預設 `ALL`（`ECPAY_CHOOSE_PAYMENT` 可覆寫），才能選擇網路 ATM
- Postman：`openapi-to-postmanv2` 轉換後補上 `{{baseUrl}}`、`token`、`sessionId`、Bearer 繼承與登入存 token script

## Tasks
- [x] DB_PATH 與 Vitest 記憶體 DB
- [x] tests/unit、tests/integration
- [x] Playwright 設定與網路 ATM E2E
- [x] scripts/generate-postman.js
- [x] package.json 指令：test:unit / test:integration / test:e2e / postman
- [x] 更新 docs、CLAUDE.md、rules
