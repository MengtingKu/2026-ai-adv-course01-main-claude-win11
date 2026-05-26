# DEVELOPMENT.md

## 命名規則對照表

| 類型 | 規則 | 範例 |
|------|------|------|
| 檔案名稱（路由） | camelCase + Routes | `authRoutes.js`、`adminProductRoutes.js` |
| 檔案名稱（middleware） | camelCase + Middleware | `authMiddleware.js`、`sessionMiddleware.js` |
| 資料庫欄位 | snake_case | `password_hash`、`created_at`、`total_amount` |
| API 請求 body | camelCase | `productId`、`recipientName`、`recipientAddress` |
| 環境變數 | SCREAMING_SNAKE_CASE | `JWT_SECRET`、`FRONTEND_URL` |
| 主鍵 | TEXT UUID（`uuidv4()`） | `"550e8400-e29b-41d4-a716-446655440000"` |
| 路由 prefix | 複數名詞 | `/api/products`、`/api/orders` |

## 模組系統

使用 CommonJS（`require/module.exports`），除了 `vitest.config.js` 使用 ES Modules（`import/export`）。

混用注意：測試檔案（`tests/*.test.js`）使用 CommonJS。

## 新增 API 端點步驟

1. 在 `src/routes/` 對應檔案加入路由處理函式
2. 加上 `@openapi` JSDoc 標註（參考既有格式）
3. 使用 `db.prepare('...').get/all/run()` 操作資料庫
4. 回傳格式：`res.status(xxx).json({ data, error, message })`
5. 在 `tests/` 對應測試檔加入測試案例

## 新增 Middleware 步驟

1. 在 `src/middleware/` 建立新檔案
2. 函式簽名：`function myMiddleware(req, res, next) {...}`
3. 在 `app.js` 或路由檔的 `router.use()` 掛載

## 新增資料表步驟

1. 在 `src/database.js` 的 `initializeDatabase()` 函式中加入 `CREATE TABLE IF NOT EXISTS`
2. 加入必要的 CHECK constraints 和 FOREIGN KEY
3. 如需 seed data，加入對應的 seed 函式並在 `initializeDatabase()` 呼叫

## 環境變數

| 變數 | 用途 | 必要 | 預設值 |
|------|------|------|--------|
| `JWT_SECRET` | JWT 簽名密鑰 | **必要**（伺服器啟動時強制檢查） | 無 |
| `PORT` | 伺服器埠號 | 否 | 3001 |
| `FRONTEND_URL` | CORS 允許來源 | 否 | http://localhost:3001 |
| `BASE_URL` | 伺服器基礎 URL | 否 | http://localhost:3001 |
| `ADMIN_EMAIL` | Seed admin 帳號 | 否 | admin@hexschool.com |
| `ADMIN_PASSWORD` | Seed admin 密碼 | 否 | 12345678 |
| `NODE_ENV` | 執行環境 | 否 | 無（`test` 時 bcrypt rounds=1） |
| `ECPAY_MERCHANT_ID` | 綠界商店代號 | 否（未整合） | 3002607 |
| `ECPAY_HASH_KEY` | 綠界 HashKey | 否（未整合） | （staging 測試值） |
| `ECPAY_HASH_IV` | 綠界 HashIV | 否（未整合） | （staging 測試值） |
| `ECPAY_ENV` | 綠界環境 | 否（未整合） | staging |

> ECPay 相關變數目前已在 .env.example 中定義但尚未整合至業務邏輯。

## JSDoc 格式說明

每個 API 路由必須加上 @openapi 標註（用於 swagger-jsdoc 自動產生文件）：

```js
/**
 * @openapi
 * /api/resource:
 *   get:
 *     summary: 功能說明
 *     tags: [TagName]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *     responses:
 *       200:
 *         description: 成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: object
 *                 error:
 *                   type: string
 *                   nullable: true
 *                 message:
 *                   type: string
 */
router.get('/', (req, res) => { ... });
```

## 計畫歸檔流程

1. 計畫檔案命名格式：`YYYY-MM-DD-<feature-name>.md`（放至 `docs/plans/`）
2. 計畫文件結構：User Story → Spec → Tasks
3. 功能完成後：移至 `docs/plans/archive/`
4. 更新 `docs/FEATURES.md`（標記完成）和 `docs/CHANGELOG.md`
