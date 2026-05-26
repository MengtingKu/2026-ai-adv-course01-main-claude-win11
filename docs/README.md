# backend-project

花卉電商後端服務，提供完整的 REST API 與 EJS 前台頁面。

## 技術棧

| 類別 | 技術 |
|------|------|
| 框架 | Express.js 4.16 |
| 模板引擎 | EJS 5.0 |
| CSS 框架 | Tailwind CSS 4.2 |
| 資料庫 | better-sqlite3（SQLite，WAL mode） |
| 認證 | JWT（jsonwebtoken）+ bcrypt |
| 測試 | Vitest 2.x + Supertest |
| API 文件 | swagger-jsdoc |
| 其他 | uuid, cors, dotenv |

## 快速開始

```bash
# 1. 安裝依賴
npm install

# 2. 設定環境變數
cp .env.example .env
# 編輯 .env，至少設定 JWT_SECRET

# 3. 啟動開發伺服器
npm run dev:server

# 4. 開啟瀏覽器
# 前台：http://localhost:3001
# API：http://localhost:3001/api
# Swagger UI：http://localhost:3001/api-docs
```

## 常用指令

| 指令 | 說明 |
|------|------|
| `npm start` | 建置 CSS 後啟動（正式環境用） |
| `npm run dev:server` | 直接啟動伺服器 |
| `npm run dev:css` | Tailwind CSS 監視模式 |
| `npm run css:build` | 一次性建置並壓縮 CSS |
| `npm test` | 執行完整測試套件 |
| `npm run openapi` | 產生 OpenAPI JSON |

## 預設帳號

| 角色 | Email | 密碼 |
|------|-------|------|
| 管理員 | admin@hexschool.com | 12345678 |

> 帳號由 `src/database.js` 在首次啟動時自動建立（seed data）。

## 文件索引

| 文件 | 說明 |
|------|------|
| [ARCHITECTURE.md](./ARCHITECTURE.md) | 架構、目錄結構、API 路由總覽、DB schema |
| [DEVELOPMENT.md](./DEVELOPMENT.md) | 開發規範、命名規則、環境變數 |
| [FEATURES.md](./FEATURES.md) | 功能列表與行為描述 |
| [TESTING.md](./TESTING.md) | 測試規範與指南 |
| [CHANGELOG.md](./CHANGELOG.md) | 更新日誌 |
