# 花漾生活 — Design System｜Modern Minimal 現代極簡花室

> 視覺方向：**Aēsop 式建築感極簡**。大量留白、近乎單色基底、單一鮮明重點色、
> grotesque 無襯線緊排、極細分隔線、超大圖片、克制的互動。
> 目標：跳脫「粉色漸層＋圓角卡片」的通用 AI 風格，呈現當代精品感。

---

## 1. 色彩 Tokens（Pencil Variables → collection: `color`）

### 1.1 基底（中性）
| Token | Hex | 用途 |
|-------|-----|------|
| `bg/base` | `#E9E7E2` | 全站底色（霧灰，取代原 cream） |
| `bg/raised` | `#F4F2EE` | 卡片 / 區塊微抬升 |
| `bg/paper` | `#FCFBF9` | 表單 / 浮層最高層 |
| `ink/900` | `#1A1917` | 主文字 / 標題（炭黑） |
| `ink/600` | `#56524C` | 次文字 |
| `ink/500` | `#6B665E` | 淺底上的輔助文字（base 4.6:1 / paper 5.5:1） |
| `ink/400` | `#8C877F` | 線條 / 裝飾 / 深底上的輔助文字（淺底僅 2.9:1，不可當文字） |
| `line/strong` | `#1A1917` | 重點細線（1px 黑線，極簡語言核心） |
| `line/soft` | `#D6D2CA` | 一般分隔線 |

### 1.2 重點色（單一品牌色 + 機能色）
| Token | Hex | 用途 |
|-------|-----|------|
| `accent/cherry` | `#B8354C` | 唯一品牌重點色：CTA、價格、強調、選中態（白字 5.75:1、壓 base 4.65:1） |
| `accent/cherry-press` | `#962A3E` | 按壓 / hover |
| `accent/cherry-light` | `#EE8294` | 深底 / 圖片暗角上的 cherry 文字（bg-dark 7.35:1） |
| `state/success` | `#3F7A55` | 已付款 / 成功 |
| `state/warning` | `#C07A2C` | 待付款 |
| `state/error` | `#C23B3B` | 失敗 / 錯誤 |
| `state/*-ink` | success `#2F6343` · warning `#8A5314` · error `#A12C2C` | 狀態標籤**文字**（10% 淡底上 ≥5.5:1） |

> 規則：**全站只有一個鮮色（cherry）**。所有「動作」與「金額」用它，其餘一律中性。
> 機能色僅出現在狀態標籤，面積極小。

> **對比（WCAG AA，全站文字 ≥4.5:1）**：cherry 由原 `#D6435B`（白字 4.36、壓 base 3.53，不達標）加深為 `#B8354C`。
> 深底 / 圖片上的 cherry 小字用 `cherry-light`；淺底輔助文字用 `ink/500`，`ink/400` 只用於深底文字或線條。
> 機能色文字一律用 `*-ink`，`state/warning` 本色（3.35:1）只用於圓點 / 邊框。

---

## 2. 字體 Typography（Pencil Variables → collection: `type`）

- **主字體（全站）**：`Inter Tight` ／ 後備 `Helvetica Neue` ／ 中文 `Noto Sans TC`
  - 選用 grotesque 緊排，字距收緊(-0.02em)，呈現建築感。
- **不使用襯線體**（與原 Noto Serif TC 區隔，貫徹極簡單一字體系統）。

| Token | Size / LH / Weight / Tracking | 用途 |
|-------|------------------------------|------|
| `display` | 64 / 1.02 / 600 / -0.03em | 首頁 Hero 大標 |
| `h1` | 40 / 1.08 / 600 / -0.02em | 頁標題 |
| `h2` | 28 / 1.15 / 600 / -0.02em | 區塊標題 |
| `h3` | 20 / 1.25 / 500 / -0.01em | 卡片 / 小標 |
| `body-lg` | 17 / 1.6 / 400 | 導言 / 商品描述 |
| `body` | 15 / 1.6 / 400 | 內文 |
| `caption` | 13 / 1.4 / 400 | 輔助 / 標籤 |
| `overline` | 12 / 1.2 / 500 / +0.18em / UPPERCASE | 編號 / 分類標（字距放大） |
| `price` | 20 / 1.0 / 500 / -0.01em | 價格（cherry 色） |

> Mobile 縮放：`display`→40、`h1`→28、`h2`→22，其餘 -1～2px。

---

## 3. 間距 / 圓角 / 陰影（Pencil Variables → collection: `layout`）

### 3.1 間距尺度（8pt 基準）
`space/1=4 · 2=8 · 3=12 · 4=16 · 5=24 · 6=32 · 7=48 · 8=64 · 9=96 · 10=128`
> 極簡風格特徵：區塊間距偏大（多用 7–10）。

### 3.2 圓角（極小，趨近方正）
| Token | 值 | 用途 |
|-------|----|----|
| `radius/none` | 0 | 圖片 / 卡片 / 大區塊（預設方正） |
| `radius/sm` | 2px | 輸入框 / 標籤 |
| `radius/pill` | 999px | 僅次要 chip / 篩選膠囊 |

> 主要按鈕採**方正直角**（非圓角膠囊），是本風格與原設計最大的視覺區隔。

### 3.3 陰影（幾乎不用，改用線條表達層級）
| Token | 值 | 用途 |
|-------|----|----|
| `shadow/none` | 無 | 預設（以 `line/soft` 邊框分層） |
| `shadow/overlay` | `0 8px 40px rgba(26,25,23,.12)` | 浮層 / 抽屜 / Modal 才使用 |

### 3.4 格線
- 容器最大寬：**1280px**（內距 Desktop 48 / Tablet 32 / Mobile 20）。
- 12 欄格線，gutter 24。

---

## 4. 共用元件規範（Pencil Components）

> 命名：`cmp/<元件>/<變體>`。建立為 component，頁面用 instance。

### 4.1 Button `cmp/button`
| 變體 | 樣式 |
|------|------|
| `primary` | 底 `accent/cherry`、字白、**直角**、高 48、左右 padding 28、`body` 500、hover→`cherry-press` |
| `secondary` | 透明底、`line/strong` 1px 黑框、字黑、直角、hover 底淡灰 |
| `ghost` | 無框、字 `ink/900`、附底線動畫（文字連結用） |
| `disabled` | 底 `line/soft`、字 `ink/400`、不可點 |
- 尺寸：`lg=48` / `md=40` / `sm=32`。

### 4.2 Input `cmp/input`
- 高 48、底 `bg/paper`、`line/soft` 1px、`radius/sm`、focus→框變 `ink/900` 1.5px。
- Label：`caption` `ink/600` 置上；錯誤：框 `state/error` + 下方紅字 `caption`。

### 4.3 Product Card `cmp/product-card`（核心）
```
┌────────────────┐
│                │
│   [img 4:5]    │  ← 直角、object-cover、hover 圖微放大(scale 1.03)
│           (♡)  │  ← 右上收藏 icon(hover 顯示)
├────────────────┤  ← 1px line/soft 分隔
│ 商品名稱        │  body 500 ink/900
│ NT$ 1,680      │  price cherry
│ ─────────────  │
│  加入購物車 →   │  ghost 文字鈕 + 箭頭(hover 箭頭右移)
└────────────────┘
```
> 無圓角、無陰影；以線與留白分層。售完：圖片加灰罩 + 「售完」overline。

### 4.4 Badge / Status `cmp/badge`
- 直角小標、`caption` 12、padding 4×8。
  - `pending`→warning 字 + 淡底；`paid`→success；`failed`→error。
- 分類標 chip：`radius/pill`、1px line、hover 反白。

### 4.5 Navbar `cmp/navbar`
```
花漾生活 BLOOM      商品  場合▾  關於        🔍   購物車(2)   登入
─────────────────────────────────────────────────────────── 1px line/soft
```
- 透明 / sticky；底部 1px line/soft；scroll 後底色 `bg/paper`。
- Logo：文字標 `h3` 600 + 英文 overline「BLOOM」。
- 購物車角標：cherry 小圓點 + 數字。

### 4.6 Footer `cmp/footer`
- `ink/900` 深底 + `bg/base` 淺字（反白），4 欄；底部版權 `caption`。
- 含電子報訂閱 input（直角 + cherry 送出鈕）。

### 4.7 Step Bar `cmp/stepbar`（結帳）
`①收件 ──── ②付款 ──── ③完成`，當前 cherry、已完成 ink、未到 line/soft。

### 4.8 Mobile Bottom Bar `cmp/mobile-tabbar`
`🏠 首頁 ｜ 🔍 探索 ｜ 🛒 購物車 ｜ 👤 會員`，固定底部、1px 上邊框、選中 cherry。

### 4.9 Quantity Stepper `cmp/qty`
`[ − ]  2  [ + ]`，直角、1px 黑框、中間數字。

---

## 5. 互動 / 動效原則（克制）
- 預設 transition：`160ms ease-out`。
- Hover：圖片 scale 1.03、文字鈕箭頭位移、線條由 soft→strong。
- 頁面載入：商品卡 `staggered fade-up`（delay 40ms 遞增），僅一次。
- 不使用：彩色漸層、發光、彈跳、過度陰影。

---

## 6. 高保真畫板清單（待 Pencil 連線後建立）

> 在一份文件中分頁/分區建立。命名 `page/<裝置>/<頁面>`。

### Desktop（1280 寬）— 全頁
1. `01-home` 首頁
2. `02-product-detail` 商品詳情
3. `03-cart` 購物車
4. `04-checkout` 結帳
5. `05-login` 登入/註冊
6. `06-orders` 我的訂單
7. `07-order-detail` 訂單詳情
8. `08-404`

### Mobile（390 寬）— 關鍵轉換路徑
9. `m-01-home`
10. `m-02-product-detail`
11. `m-03-cart`
12. `m-04-checkout`

### 元件畫板
13. `ds-foundations` 色彩 / 字級 / 間距樣本
14. `ds-components` 元件總覽（含各狀態）

> Tablet 不另建完整稿，以第 5 節「響應式規範」＋ Desktop/Mobile 兩端推導（中欄流體）。

---

## 7. 建置順序（Pencil 連線後）
1. 建文件 → 建 variables collections（color / type / layout）。
2. 建 `ds-foundations` + `ds-components` 元件畫板（component）。
3. 以 component instance 組裝 Desktop 8 頁。
4. 組裝 Mobile 關鍵 4 頁。
5. `render` 輸出預覽 → 向使用者展示頁面清單與設計方案。
