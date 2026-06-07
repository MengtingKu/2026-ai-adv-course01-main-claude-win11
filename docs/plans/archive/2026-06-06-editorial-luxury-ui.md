# 計畫：Editorial Luxury 前台 UI 重刻

**狀態**：已完成  
**完成日期**：2026-06-06  
**分支**：`feat/add-claude-code-skill`

---

## 目標

將原有 rose-based 圓角設計系統全面替換為 Editorial Luxury 美學，同時保留所有 Vue.js 資料綁定與後端邏輯不變。

## 設計方向

**Editorial Luxury**：仿高端花藝品牌刊物的排版語言。  
核心特徵：深色底英雄面板、非對稱格線、Cormorant Garamond 中文 serif 大標、cherry 紅點綴色、無圓角幾何、文字水印裝飾數字。

## 已完成的工作

### 任務 1：Tailwind token + 字型（`public/css/input.css`, `views/partials/head.ejs`）
- 建立 `@theme {}` 自訂 token 取代舊 rose-*/sage/blush 變數
- Google Fonts 載入：Cormorant Garamond（斜體/字重 300–600）、Inter Tight、Noto Sans TC
- 新增工具類：`.font-display`、`.font-ui`、`.text-overline`

### 任務 2：全域 partials（`views/partials/`）
- **header**：bg-bg-dark 72px sticky 導覽列，保留 `#cart-badge`、`#orders-link`、`#auth-nav` 等所有 JS hook
- **footer**：ink-900 深色，4 欄 + 電子報訂閱
- **head**：標題格式 + 字型載入

### 任務 3：首頁（`views/pages/index.ejs`）
- 分割式英雄（深色左 52% + 右側花卉圖）
- Cherry 橫幅跑馬燈（靜態 EJS 迴圈）
- 非對稱精選格（Vue `products[0]–[4]`）
- 深色場合區塊 4 格（EJS 靜態資料）
- 品牌故事分割
- 全商品 3 欄格 + 分頁（完整保留原始 Vue binding）
- `front.ejs` 新增 `fullWidth` 機制；`pageRoutes.js` 傳入 `fullWidth: true`

### 任務 4：商品詳情（`views/pages/product-detail.ejs`）
- 4:5 比例商品圖（55% 寬）
- Serif 大標 + cherry 價格 + 無圓角數量步進器
- Add-to-cart 按鈕（cherry）+ 次要「前往購物車」鏈結

### 任務 5：其餘 6 頁（保留所有 Vue binding）
| 頁面 | 設計重點 |
|------|---------|
| `cart.ejs` | 欄位格線 + 右側摘要面板 + 無圓角 confirm 對話框 |
| `checkout.ejs` | 左側表單 + sticky 摘要 |
| `login.ejs` | 居中卡片 + cherry 底線 tab 指示器 |
| `orders.ejs` | 表格式列表 + 狀態徽章 |
| `order-detail.ejs` | 兩欄配置（資訊 + 明細表）+ ECPay 按鈕 |
| `404.ejs` | 水印式大字 + serif 標題 + cherry 分隔線 |

## 維護事項

- 移除 58 個 NTFS Zone.Identifier 備用資料流檔案
- `.gitignore` 補充 `*Zone.Identifier`（無前置冒號）

## 未觸及的範圍

- 後台頁面（`views/pages/admin/`）— 保持原樣
- 所有 API 路由、測試、資料庫 — 未更動
- `public/js/pages/*.js` 所有 Vue 邏輯 — 未更動
