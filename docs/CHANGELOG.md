# CHANGELOG.md

## [未發布]

## [1.0.0] - 2026-05-26

### 新增
- 會員系統：註冊、登入、個人資料（JWT 認證）
- 商品瀏覽：列表（分頁）、詳情
- 購物車：新增/修改/刪除，支援 JWT 和 X-Session-Id 雙模式認證
- 訂單管理：建立訂單（含庫存扣減 transaction）、列表、詳情、模擬付款
- 後台商品管理：CRUD（需 admin role）
- 後台訂單管理：列表（支援 status 篩選）、詳情
- EJS 前台頁面
- Swagger UI API 文件
- Vitest + Supertest 完整測試套件
