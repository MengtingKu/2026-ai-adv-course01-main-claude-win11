---
paths:
  - "src/database.js"
  - "src/routes/**"
---

# 資料庫規則

## Parameterized Queries（必須遵守）
所有 SQL 必須使用 better-sqlite3 的 prepared statements：
```js
// 正確
db.prepare('SELECT * FROM products WHERE id = ?').get(id)
db.prepare('UPDATE products SET stock = stock - ? WHERE id = ?').run(qty, id)

// 禁止（SQL Injection 風險）
db.exec('SELECT * FROM products WHERE id = ' + id)
```

## Transactions
涉及多個資料表的原子性操作必須用 `db.transaction()` 包裝：
```js
const op = db.transaction(() => {
  // 建立訂單
  // 建立 order_items
  // 扣庫存
  // 清購物車
});
op();
```

## 欄位命名
- 所有 DB 欄位使用 snake_case
- 主鍵：TEXT UUID（`const { v4: uuidv4 } = require('uuid')`）
- 時間戳：TEXT，使用 SQLite 的 `datetime('now')` 函式
- 更新時間：`updated_at = datetime('now')` 需在 UPDATE 語句中手動更新

## 動態欄位名
`cartRoutes.js` 的 `owner.field` 只會是 `'user_id'` 或 `'session_id'`，由 `getOwnerCondition()` 白名單控制，不是用戶輸入。此模式可接受，但其他地方禁止使用動態欄位名。

## Schema 約束確認
- `price`：CHECK(price > 0)，程式層也需驗證
- `stock`：CHECK(stock >= 0)，程式層也需驗證
- `role`：只能是 'user' 或 'admin'
- `status`（orders）：只能是 'pending'、'paid'、'failed'
