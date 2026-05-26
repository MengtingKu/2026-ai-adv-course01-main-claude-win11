# CLAUDE.md

## 專案概述
backend-project — 花卉電商後端，Express.js REST API + EJS 前台頁面，搭配 better-sqlite3（WAL mode）、JWT 認證（雙模式）與 Vitest 測試套件。

## 常用指令
- `npm start` — 建置 CSS 後啟動伺服器（PORT=3001）
- `npm run dev:server` — 直接啟動伺服器（不建置 CSS）
- `npm run dev:css` — Tailwind CSS 監視模式
- `npm run css:build` — 一次性建置並壓縮 CSS
- `npm test` — 執行 Vitest 測試（依固定順序）
- `npm run openapi` — 產生 OpenAPI JSON（輸出至 stdout）

## 關鍵規則
- API 回應統一格式：`{ data, error, message }`，成功時 error 為 null
- 購物車支援雙模式認證：`Authorization: Bearer <token>`（登入用戶）或 `X-Session-Id` 標頭（訪客）
- 建立訂單使用 SQLite transaction，同時扣庫存與清空購物車
- 測試依 vitest.config.js 順序執行：auth → products → cart → orders → adminProducts → adminOrders
- 功能開發使用 docs/plans/ 記錄計畫；完成後移至 docs/plans/archive/

## 詳細文件
- ./docs/README.md — 項目介紹與快速開始
- ./docs/ARCHITECTURE.md — 架構、目錄結構、資料流、API 路由總覽
- ./docs/DEVELOPMENT.md — 開發規範、命名規則、環境變數、計畫歸檔流程
- ./docs/FEATURES.md — 功能列表與完成狀態
- ./docs/TESTING.md — 測試規範與指南
- ./docs/CHANGELOG.md — 更新日誌

## 必要遵守項目
- 所有 SQL 查詢使用 `db.prepare('...?').get/all/run()` parameterized statements，禁止字串拼接
- `JWT_SECRET` 環境變數為必要設定，伺服器啟動時強制檢查（server.js 第 7 行）
- 測試環境 bcrypt saltRounds=1，正式環境 saltRounds=10（已由 `process.env.NODE_ENV === 'test'` 控制）
- 新增 API 路由需加上 `@openapi` JSDoc 標註以維護 Swagger 文件
