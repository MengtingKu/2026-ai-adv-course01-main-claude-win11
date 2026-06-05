---
# 安全性規則（全域，無 paths 限制）

# 安全性規則

## JWT
- 驗證時必須指定 `algorithms: ['HS256']` 防止 alg:none 攻擊
- `JWT_SECRET` 只能從 `process.env.JWT_SECRET` 讀取，禁止硬編碼
- 驗證 token 後需確認用戶仍存在於 DB（防止已刪除用戶的 token 仍有效）

## 密碼
- 正式環境：`bcrypt.hashSync(password, 10)`
- 測試環境（NODE_ENV=test）：`bcrypt.hashSync(password, 1)`（已在 database.js 實作）
- 任何 API 回應禁止包含 `password_hash` 欄位
- 錯誤訊息不區分「email 不存在」和「密碼錯誤」（統一回「Email 或密碼錯誤」）

## SQL Injection
- 所有 SQL 用 `db.prepare('...?...')` prepared statements
- 禁止字串拼接 SQL 語句（即使是 "安全" 的內部值）

## CORS
- `origin` 只允許 `FRONTEND_URL` 環境變數或 `localhost:3001`
- 禁止設定 `origin: '*'`（在正式環境）

## 輸入驗證
- Email：`/^[^\s@]+@[^\s@]+\.[^\s@]+$/`
- 密碼最短 6 字元
- 數量（quantity/price/stock）必須為整數且符合業務邏輯範圍

## 敏感欄位
- 回傳 users 資料時只 SELECT 必要欄位（id, email, name, role, created_at），不用 SELECT *
