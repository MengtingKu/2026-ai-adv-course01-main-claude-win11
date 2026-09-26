# 計畫：Noir 風格動效層（Motion Design）

**狀態**：已完成  
**完成日期**：2026-09-26
**建立日期**：2026-09-26
**分支**：`feat/shipping-and-test-pipeline`

---

## 目標

在**不更動現有版型**（以目前 `views/` 實作視為 Stitch layout 基準）的前提下，參考
TemplateMo 599 Noir Fashion 的動效語彙，只強化：motion、transitions、interactions、perceived performance。

## 現況比對（實作 vs `docs/design/02-design-system.md`）

| # | 設計規範 | 目前實作 | 處理 |
|---|---------|---------|------|
| 1 | 商品卡載入 staggered fade-up（40ms 遞增） | 無 | 實作（M2） |
| 2 | Navbar scroll 後狀態改變 | 永遠同一狀態 | 捲動後加深底色 + 陰影，不改高度（M1） |
| 3 | 文字鈕 hover 箭頭位移 / ghost 底線動畫 | 只有變色 | 實作（M4） |
| 4 | 首頁「跑馬燈」 | 靜態文字列 | 無限捲動，hover 暫停（M3） |
| 5 | 登入後 `#auth-nav` 應為深色直角樣式 | `header-init.js` 注入舊 `rose-*`/`rounded-full` 類別（token 已不存在，按鈕無底色） | 改用現有 token，保持原位置與尺寸 |
| 6 | Toast 應為直角、機能色 | `notification.js` 使用不存在的 `bg-sage`/`bg-apricot`、`rounded-xl` → 成功提示背景透明 | 改用 token + 滑入動效（M5） |

## Noir Fashion 動效語彙 → 花漾生活轉譯

| Noir 原始手法 | 轉譯（克制版，貼合 Aēsop 極簡） |
|--------------|-------------------------------|
| navbar `slideDown` 進場 | header 內容 480ms 下滑淡入 |
| hero 標題逐行 `slideUp` 遮罩 | h1 逐行遮罩上推 + overline/CTA 依序淡入 |
| cherry 裝飾線 | 由左向右 `scaleX` 描繪 |
| hero `kenburns` | 右側大圖 1.12→1 緩慢拉近，之後極慢呼吸 |
| hero parallax（0.5） | 文字面板 0.18 視差（桌機、rAF） |
| 卡片 `fadeInUp` stagger | IntersectionObserver 捲動揭示，`--i` 控制 60ms 遞增 |
| 圖片 hover 光澤掃過（`translateX(-100%→100%)`） | 極淡白色斜光掃過 + 圖片 1.04 放大（900ms 緩出） |
| 按鈕 ripple 圓形擴散 | 方正「填色擦入」（cherry → cherry-press / 線框 → ink 實心） |
| nav link skew 底線 | 1px 底線由左生長 |
| scroll 指示彈跳 | 「↓ Scroll」細線往下流動 |

## 效能 / 感知速度（Perceived performance）

- 跨頁 View Transitions（`@view-transition { navigation: auto }`）：頁面淡出淡入，不支援的瀏覽器自動略過。
- 圖片載入：`bg-raised` 佔位 + 載入後淡入，避免空白閃爍。
- 商品列表 loading：以與最終格線相同尺寸的 skeleton shimmer 取代 spinner（不改變最終版型）。
- 商品卡 hover / touchstart 預先 `prefetch` 商品頁。
- 購物車角標數字變動時彈跳回饋。
- 全部動效只動 `transform` / `opacity`；`prefers-reduced-motion` 一律關閉。

## 任務拆分

- **M1 基礎層**：`input.css` motion tokens + keyframes；新增 `public/js/motion.js`（reveal observer、header scrolled、parallax、prefetch、badge bump、圖片淡入）；`front.ejs` 載入。
- **M2 首頁**：hero 開場編排、Ken Burns、區塊標題 / 卡片捲動揭示、skeleton。
- **M3 跑馬燈**：無縫循環。
- **M4 互動**：按鈕填色、連結底線、卡片光澤、箭頭位移、數量步進器。
- **M5 全域元件**：toast、`#auth-nav` 修正、其餘頁面（商品詳情 / 購物車 / 訂單 / 登入 / 404）進場。
- **M6 驗證**：`npm run css:build`、`npm test`、瀏覽器檢查 + reduced-motion。

## 不在範圍

- 任何尺寸、間距、欄位、字級、配色、文案的變更。
- 後台（`layouts/admin.ejs`）。
