---
date: 2026-05-23
author: Max
status: 等 William 拍板
related: 2026-05-13-建表-SOP.md / yizhan-erp/CLAUDE.md / 2026-05-20-corner-website ERP 整合 spec v1
goal: 「客戶官網系統」新模組完整規劃、5 維度檢查、5 SSOT + 6 層架構 + 紅線 A-H 全對齊。
---

# Websites Module 完整 Spec — 客戶官網系統（addon）

## TL;DR

> William 拍板新模組 `websites`、addon category（單獨加購、不在套裝）。
> 客戶官網 = 純 Canvas（從 YongchengCanvas 通用化重命名）+ 9 套 component 變體庫、用戶可 mix-and-match。
> 加購 = 能進 design 編輯器自由排版；不加購 = 漫途預設一套組合、只能改內容。
> Reuse 既有 marketing module 70%（tours 9 個欄位 + API + UI 樣板）、Corner 不動。

範圍三句話：

1. 新 `websites` module（addon）、route `/websites/design`（全螢幕）+ `/websites/products`（list 樣板）
2. 子網域 multi-tenant（`{客戶}.venturo.tw`）渲染 Canvas、走 Next.js (public) route group
3. Canvas 從 YongchengCanvas 通用化、改名為 `Canvas`、放 `src/lib/canvas/`、不再 client-specific

工時：**7-10 個工作日**（Day 1-2 DB+SSOT、Day 3-4 design 編輯器、Day 5-6 多租戶渲染、Day 7-8 首版 component variant、Day 9-10 audit+測試+commit）

---

## 一、業務概念對齊（VENTURO 概念 / 不寫 client-specific）

### 命名紀律（紅線 #1 對齊）

| 舊（client-specific）             | 新（通用）              |
| --------------------------------- | ----------------------- |
| `YongchengCanvas` (type)          | `Canvas`                |
| `YongchengRenderer` (component)   | `CanvasRenderer`        |
| `YongchengLayout` (component)     | `CanvasLayout`          |
| `tour-display-yongcheng/` (目錄)  | `canvas-renderer/`      |
| `src/lib/yongcheng/`              | `src/lib/canvas/`       |
| 「Yongcheng / 永成」(註解 / 文案) | 「Canvas」/「客戶官網」 |

**理由**：YongchengCanvas 當初只是給永成做的、現在通用化、不該繼續綁 client 名。

### Corner 不動

`marketing` module + `/marketing/website` 路由 + Corner Astro repo + `corner.venturo.tw` 子網域 = **保留**、純做 Corner 一個客戶。

理由：

- William 2026-05-23 講「砍掉會死人」
- Corner 走 Astro SSG（外部 repo）、跟新 Next.js multi-tenant 模式不相容
- 新模組從零做、不嘗試把 Corner 遷移

### 新舊模組職責分界

| Module              | 目的                          | 對誰                        | 渲染方式             | 主題                              |
| ------------------- | ----------------------------- | --------------------------- | -------------------- | --------------------------------- |
| `marketing`（既有） | Corner 一個客戶的官網行程上架 | Corner workspace            | Astro SSG 外部 repo  | Corner ad-hoc 設計                |
| `websites`（新）    | 多客戶官網（加購）            | 任何有買 addon 的 workspace | Next.js SSR/ISR 內建 | 9 套 component 變體 mix-and-match |

→ 兩條路線並存、新客戶走 `websites`、Corner 走 `marketing`、未來看狀況再考慮 Corner 遷移。

### DB schema reuse

`tours` 表既有 9 個欄位（5/20 加的）**通用、不是 Corner 寫死**、新 module 直接 reuse：

- `is_public_listed` / `marketing_title` / `marketing_subtitle` / `marketing_body`
- `hero_image_url` / `seo_title` / `seo_description`
- `published_at` / `published_by`
- partial index `idx_tours_public_listed`

→ 新 module 不重複加欄位、API 共用 `/api/marketing/website/[code]` 或抽到 `/api/website-listings/[code]` 兩邊都 call。

---

## 二、效能 + UI 設計（地方法律「優先順位 #2」+「五大方向 5」）

### 列表頁效能

- 列表預設 20 筆、分頁固定 15 筆、**不給「每頁筆數」選擇器**
- 走 entity hook（紅線 F）、不直接 `useSWR`
- SWR `revalidateOnFocus: false`、`dedupingInterval: 5min`
- server-side filter / search、跟 PostgREST query string 對齊

### Canvas 編輯器效能

- Canvas state 用 React state（不需 SWR、是 local editing state）
- auto-save throttle：30 秒一次 / blur 觸發
- 大圖（hero_image）走 next/image、自動 webp 多 size
- Drag-drop 用 dnd-kit（業界 SOTA、tree-shake 友善）
- undo / redo stack 上限 50 步（記憶體上限 5 MB）

### Public 子網域渲染效能

- 走 Next.js ISR（revalidate 60 秒）、不是純 SSR
- 大圖延遲載入、Hero 圖 priority
- Canvas 內容 + tour listings 一次 query 取齊（不分頁）

### UI 設計紀律（地方法律「五大方向 3」）

- design 編輯器：全螢幕 layout、跳脫 `ContentPageLayout`
- products 列表：沿用 `ListPageLayout` + `EnhancedTable`
- Dialog 必設 `level={1|2|3}`
- 莫蘭迪色 `morandi-*`、不用 Tailwind 預設色
- 防連點：所有寫入按鈕 `disabled={loading}`
- 寫入失敗：client state 還原 + toast、不靜默失敗

### Canvas 樣式策略

- Canvas 內部用 inline style（不吃 ERP Tailwind class、避免 design system 漂移）
- 各 variant 的視覺由 variant 檔自己定義
- 預覽切換 desktop / tablet / mobile 三斷點

---

## 三、資安（地方法律「優先順位 #1」+ 紅線 A-H）

### 紅線對照表

| 紅線                           | 對齊狀況                                                                                  |
| ------------------------------ | ----------------------------------------------------------------------------------------- |
| 0 — 沒有 admin only            | ✅ 用 capability 表達、不寫 `if (isAdmin)`。文案 / commit 不講「admin 限定」              |
| 0.1 — 用詞紀律                 | ✅ 不講「admin 可改主題」、講「有 `website.design.write` capability 的員工可改」          |
| A — workspaces 不 FORCE RLS    | ✅ workspace 加 canvas jsonb 欄位、RLS 不動 FORCE                                         |
| B — 審計欄位 FK 指 employees   | ✅ canvas_updated_by / canvas_published_by FK → `employees(id)` ON DELETE SET NULL        |
| C — admin client per-request   | ✅ 任何 API route 用 `getSupabaseAdminClient()` 每 request 新建                           |
| D — 不開作弊後門               | ✅ 沒有「unlock canvas」「reopen published」這種 API                                      |
| E — DB trigger / API 不雙寫    | ✅ canvas 寫入只走 API、不加 trigger 自動填、`npm run audit:writes` 必跑                  |
| F — 走 entity hook + apiMutate | ✅ canvas / website-tours 都走 entity hook、寫入走 apiMutate                              |
| G — SWR cache per-user         | ✅ 不另外加 cache key、繼承既有 per-user namespace                                        |
| H — 業務表 RLS workspace 守門  | ✅ canvas 欄位掛在 workspaces 表、走既有 RLS；新表 (如有) 走 `setup_workspace_scoped_rls` |

### 額外資安考量

#### XSS：Canvas 內容是 user input、不能直接 innerHTML

- ✅ Canvas 內容是結構化 JSON、不是 HTML 字串
- ✅ Renderer 把 JSON → React element、走 React 防 XSS
- ✅ user 輸入的文字（marketing_title / body）走 React `{value}`、不 `dangerouslySetInnerHTML`
- ⚠️ markdown 內容（marketing_body）若走 react-markdown / unified、要設 sanitize plugin（rehype-sanitize）

#### Public 子網域：跨 workspace 滲透

威脅模型：客戶 A 連 `客戶B.venturo.tw` 想看 B 的 canvas？

- ✅ Middleware resolve subdomain → workspace_id
- ✅ Public API 只回該 workspace_id 的 canvas + public-listed tours
- ✅ RLS policy：`canvas` 是 workspaces.canvas、tours 已有 workspace RLS、`is_public_listed = true` 的 tour 才返
- ✅ 不需要 user login（public 站）、走 anon client、但 server-side query 用 service_role + 強制 filter workspace_id

#### 子網域劫持（subdomain takeover）

- ⚠️ Cloudflare DNS 用 wildcard `*.venturo.tw` → 漫途主機（不指向第三方 CDN）
- ⚠️ workspace 砍 / disable 時、subdomain 要回 404、不能繼續解析到別人

#### 防 enumeration

- 子網域 = workspace.subdomain（簽約時定）、不是 workspace.code（內部 ID）
- 攻擊者拿到 subdomain ≠ 拿到 workspace_id（隔一層 mapping）

---

## 四、RLS + 租戶綁定（紅線 H + 6 層架構 L1+L5）

### L1 Feature Gate（workspace_features）

新 feature code：

- `website_builder` — 基礎、付費加購才開
- `website_custom_domain`（保留位、未來自帶域名功能）

`workspace_features` 新增 row：

```sql
-- seed migration
INSERT INTO workspace_features (workspace_id, feature_code, enabled)
SELECT id, 'website_builder', false FROM workspaces
ON CONFLICT (workspace_id, feature_code) DO NOTHING;
-- 預設 false、業務員手動開、或銷售流程簽 addon 後系統自動開
```

ModuleGuard 守門：

```ts
<ModuleGuard requireFeature="website_builder" requireCapability="website.design.read">
```

### L2 Capability（role_capabilities）

新 capability codes：

- `website.design.read` — 看 design 編輯器
- `website.design.write` — 編 design / 發布
- `website.products.read` — 看上架管理
- `website.products.write` — 切換上架 / 編內容

衍生自 `src/modules/websites.ts` 的 tabs：

```ts
defineModule({
  code: 'websites',
  tabs: [
    { code: 'design', name: '版面設計' },
    { code: 'products', name: '產品上架' },
  ],
})
```

seed migration：

- 預設給 admin / manager role 開 design.read+write / products.read+write
- 一般 sales 預設 products.read（看上架狀態、不能改 design）

### L3 三維 Scope（org_scope）

- canvas 是 workspace-level、不分品牌/分公司/部門
- products 上架 = tours 既有 scope（已有）、繼承

### L4 狀態守門（is_row_editable）

- canvas 沒「結案 / 封存」概念、永遠可改（無狀態鎖）
- published_at 是時戳記錄、不影響可編輯性

### L5 RLS

#### canvas（workspaces.canvas jsonb 欄位）

- 既有 workspaces RLS 已守 workspace_id = own workspace
- UPDATE workspaces SET canvas = ... 的 policy：
  ```sql
  -- 需 has_capability('website.design.write') AND has_feature('website_builder')
  -- 走 has_capability_for_workspace() helper
  ```

#### website_canvas_history（新 table、optional）

如果要做版本歷史：

```sql
CREATE TABLE website_canvas_history (
  id uuid PRIMARY KEY,
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  canvas jsonb NOT NULL,
  snapshot_at timestamptz NOT NULL DEFAULT now(),
  snapshot_by uuid REFERENCES employees(id) ON DELETE SET NULL,
  note text
);
-- RLS: setup_workspace_scoped_rls('website_canvas_history')
```

決定：**v1 不做版本歷史**、Canvas 就一個版本、auto-save 蓋掉、簡化。v2 再補。

### L6 防呆 + SSOT

- 編號：N/A（無編號）
- 錯誤翻譯：走 `dbErrorResponse`
- 審計欄位：canvas_updated_by / canvas_published_by FK → `employees(id)` ON DELETE SET NULL
- loading prop：所有 button + switch 對齊
- `recordApiAuditContext` call：canvas 寫入 API 必 call

### Public 站（子網域）的 RLS 特殊處理

Public 站不走 user login、用 anon role。但 anon 不能直接 `SELECT * FROM workspaces`、會違反 RLS。

策略：

1. **不開 anon SELECT policy**（會洩漏所有 workspace）
2. **server-side render 走 service_role**（per-request admin client、強制 filter workspace_id）
3. **API route 提供 public-safe endpoint**：`GET /api/public/sites/[subdomain]` 回 canvas + listed tours

server 端流程：

```
1. Middleware 解 subdomain → 拿 workspace_id（從 workspaces.subdomain 查）
2. server component / API route call admin client
3. WHERE workspace_id = $1 + tours WHERE is_public_listed = true
4. 結果返回給客戶端、純讀、無寫入
```

---

## 五、HR 權限（地方法律「五大方向 1」+ 5 SSOT 全動）

### 5 SSOT 改動清單

| #   | 檔案                                  | 改動                                                                                                                                                                  |
| --- | ------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `src/modules/websites.ts`（新）       | `defineModule({ code: 'websites', tabs: [design, products], category: 'addon', exposedToHr: true, defaultRoles: ['admin'] })`                                         |
| 2   | `src/modules/_registry.ts`            | import + 加進 ALL_MODULES                                                                                                                                             |
| 3   | `src/lib/permissions/capabilities.ts` | 跑 `npm run codegen:permissions` 自動同步（不手改）                                                                                                                   |
| 4   | `src/lib/permissions/module-tabs.ts`  | 跑 codegen 自動同步                                                                                                                                                   |
| 5   | `src/lib/permissions/features.ts`     | 跑 codegen 自動同步                                                                                                                                                   |
| 6   | seed migration                        | `INSERT INTO workspace_features (workspace_id, feature_code, enabled) SELECT id, 'website_builder', false ...` + `role_capabilities` 給 admin role 開 4 個 capability |

### HR UI 暴露（exposedToHr: true）

- HR /hr/roles 頁面會自動列出 `websites` module（design / products 兩個 tab）
- workspace admin 可勾誰能看 / 改
- 不加購（workspace_features.website_builder = false）= 員工有 capability 也看不到（ModuleGuard L1 擋）

### 為什麼是 addon category（不是 basic / premium）

定義（從 `_define.ts`）：

- basic：月費基本含
- premium：付費加購、同月費 + 加價
- enterprise：限漫途使用、跨 workspace 能力
- **addon：附加服務（資料訂閱、AI 知識庫等可單獨販售的加值包、跟月費 module 分開）** ← 對齊「單獨加購」需求

### sidebar 顯示

- 對齊既有 `sidebar-config.ts` pattern：每個 entry 標 `feature: 'website_builder'`、沒加購自動不顯示
- ERP 慣例 = 乾淨 sidebar、不顯示鎖頭 / 升級 CTA
- 2026-05-23 William 拍板：「原本就沒有的東西、不要顯示鎖」

---

## 六、6 層架構 mapping

| Layer               | websites module 怎麼過                                                |
| ------------------- | --------------------------------------------------------------------- |
| **L1 Feature Gate** | `workspace_features.website_builder` + ModuleGuard `requireFeature`   |
| **L2 Capability**   | `website.{design,products}.{read,write}` 4 個 + `requireCapability`   |
| **L3 Scope**        | workspace-level、不分 brand/branch/dept                               |
| **L4 狀態守門**     | N/A（無狀態鎖）                                                       |
| **L5 RLS**          | workspaces 既有 RLS / public 走 admin client + filter workspace_id    |
| **L6 SSOT**         | dbErrorResponse + recordApiAuditContext + loading prop + employees FK |

---

## 七、DB Schema 改動清單

### Migration 1：workspaces 加 canvas 欄位

```sql
ALTER TABLE public.workspaces
  ADD COLUMN IF NOT EXISTS subdomain text UNIQUE,           -- 客戶子網域（如 'corner', 'yongcheng'）
  ADD COLUMN IF NOT EXISTS canvas jsonb,                    -- Canvas 結構（sections + blocks）
  ADD COLUMN IF NOT EXISTS canvas_updated_at timestamptz,
  ADD COLUMN IF NOT EXISTS canvas_updated_by uuid REFERENCES public.employees(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS canvas_published_at timestamptz,
  ADD COLUMN IF NOT EXISTS canvas_published_by uuid REFERENCES public.employees(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_workspaces_subdomain ON public.workspaces(subdomain) WHERE subdomain IS NOT NULL;

COMMENT ON COLUMN public.workspaces.subdomain IS '客戶官網子網域、{subdomain}.venturo.tw 解到此 workspace';
COMMENT ON COLUMN public.workspaces.canvas IS '官網 Canvas 結構（sections + blocks）、由 design 編輯器寫';
```

### Migration 2：seed websites module 的 feature + capability

```sql
-- 開放 website_builder feature 給所有 workspace（預設 false）
INSERT INTO workspace_features (workspace_id, feature_code, enabled)
SELECT id, 'website_builder', false FROM workspaces
ON CONFLICT (workspace_id, feature_code) DO NOTHING;

-- 開放 4 個 capability、預設給 admin role
-- (具體 SQL 等 codegen:permissions 跑完後對齊)
```

### 不新增 table（v1）

- ❌ 不加 `tour_website_listings` 表（tours 既有 is_public_listed 已夠用）
- ❌ 不加 `website_canvas_history` 表（v1 不做版本歷史）
- ❌ 不加 `website_themes` 表（9 主題 component 變體用 SSOT file 存、不入 DB）

### v2 才考慮加的

- `website_canvas_history` — 版本歷史 / undo redo across sessions
- `website_assets` — 客戶上傳的圖片資產管理（v1 暫用 Supabase Storage `website-assets` bucket、不入 DB）

---

## 八、Component Variant SSOT

### 目錄結構

```
src/lib/canvas/
├─ types.ts                  # Canvas / Section / Block 通用 types
├─ utils.ts                  # 從 yongcheng/canvas-from-tour 改名通用化
├─ enrich.ts                 # 從 yongcheng/enrich-itinerary 改名通用化
└─ variants/
   ├─ hero/
   │  ├─ index.ts            # 列出 hero 的所有 variant
   │  ├─ minimal.tsx         # 主題 1：極簡 hero
   │  ├─ bold.tsx            # 主題 2：粗體 hero
   │  └─ ...
   ├─ about/
   ├─ services/
   ├─ tour_listings/
   ├─ testimonials/
   ├─ contact/
   └─ footer/
```

### Variant interface

```ts
interface ComponentVariant<TProps = unknown> {
  id: string // 'hero_minimal_v1'
  type: ComponentType // 'hero' | 'about' | ...
  themeId: string // 'theme_1' | 'theme_2' ...
  name: string // 「極簡 Hero」
  description?: string
  previewImage?: string // 縮圖
  defaultProps: TProps // 預設參數
  Component: React.ComponentType<TProps>
}
```

### 8 個 component type（v1）

- `hero` — 封面 banner
- `header` — 導航列
- `about` — 公司介紹
- `services` — 服務說明 / 套裝
- `tour_listings` — 行程上架列表（吃 is_public_listed = true 的 tours）
- `testimonials` — 客戶評價
- `contact` — 聯絡 / 地圖
- `footer`

每個 type v1 至少 1 個 variant、上線後逐個補。

---

## 九、工時拆解（7-10 個工作日）

### Day 1：DB schema + 5 SSOT 起步

- [ ] Migration 1：workspaces 加 subdomain + canvas + 4 個審計欄位
- [ ] Migration 2：feature + capability seed
- [ ] `src/modules/websites.ts` 定義
- [ ] `src/modules/_registry.ts` 加 import
- [ ] `npm run codegen:permissions` 同步 3 個 SSOT 檔
- [ ] apply migration via MCP
- [ ] 驗證 schema、跑 audit:rls

### Day 2：路由 skeleton + sidebar + ModuleGuard

- [ ] `src/app/(main)/websites/page.tsx` 重定向到 /websites/design
- [ ] `src/app/(main)/websites/design/layout.tsx` 全螢幕 layout
- [ ] `src/app/(main)/websites/design/page.tsx` skeleton
- [ ] `src/app/(main)/websites/products/page.tsx` skeleton（list 樣板）
- [ ] sidebar entry（addon 分類）
- [ ] ModuleGuard 守門 `requireFeature='website_builder'`

### Day 3：Canvas 改名（YongchengCanvas → Canvas）

- [ ] `gitnexus_impact({ target: 'YongchengCanvas' })` 查影響
- [ ] 用 `gitnexus_rename` 改名（不准 find-and-replace）
- [ ] 對齊命名表（type / component / file / dir / comment）
- [ ] type-check 通過

### Day 4：Canvas SSOT 通用化 + variant 基礎建設

- [ ] `src/lib/canvas/types.ts` 通用化 Canvas types（從 Yongcheng types 抽）
- [ ] `src/lib/canvas/utils.ts` 通用 helpers
- [ ] `src/lib/canvas/variants/` 目錄 + 8 個 component type 骨架
- [ ] 每個 type 寫 1 個 placeholder variant

### Day 5-6：design 全螢幕編輯器

- [ ] 左欄 component 庫 UI（type × variant 雙維）
- [ ] 中央 canvas 拖拉 + 排序（dnd-kit）
- [ ] 右欄 properties 編輯
- [ ] auto-save throttle
- [ ] undo / redo stack
- [ ] preview 切換 desktop / tablet / mobile

### Day 7：products 上架管理

- [ ] 沿用 marketing/website list page 樣板、複製改通用
- [ ] tour list + toggle is_public_listed
- [ ] 編輯 marketing\_\* 欄位（複用 marketing/website/[code] 樣板）

### Day 8：子網域 routing + public render

- [ ] `src/middleware.ts` 加 subdomain detection
- [ ] `src/app/(public)/sites/[subdomain]/layout.tsx`（完全脫 ERP 框）
- [ ] `src/app/(public)/sites/[subdomain]/page.tsx`（首頁、render Canvas）
- [ ] `src/app/(public)/sites/[subdomain]/tours/[code]/page.tsx`（個別行程頁）
- [ ] `/api/public/sites/[subdomain]/route.ts`（server 端拉 canvas + tours）

### Day 9：audit + 整合測試

- [ ] `npm run audit:rls` 全綠
- [ ] `npm run audit:writes` 全綠
- [ ] `npm run audit:realtime` 全綠
- [ ] `npm run type-check` / `npm run lint` 全綠
- [ ] e2e：登入 → /websites/design → 改 → 發布 → 子網域看到變更

### Day 10：文件 + commit + push

- [ ] 更新此 spec status: 已上線
- [ ] CLAUDE.md 加 websites module 索引
- [ ] CHANGELOG.md 記錄
- [ ] 分批 commit（schema / sidebar / canvas / design / public / audit）
- [ ] push → Coolify deploy

---

## 十、待 William 拍板項目

### 動工前必答

1. **websites module 進 sidebar 嗎？**
   - 進、走既有 sidebar feature gate pattern：`feature: 'website_builder'`、沒加購 = 不顯示（對齊 finance._ / accounting._ 既有作法、不顯示鎖頭、ERP 慣例 = 乾淨 sidebar）
   - 2026-05-23 William 拍板：原本就沒有的東西、不要顯示「鎖」、不 tease 用戶

2. **subdomain 命名規則？**
   - 自動從 workspace.code 衍生（譬如 CORNER → corner）
   - 手動設定（簽約時填、可以非 code）
   - 推薦：手動、code 是內部 ID 不適合對外

3. **public 站 SEO 怎麼處理？**
   - workspace.subdomain 唯一一台站
   - 同個 page 有 indexability 設定（custom seo_title / description per page）
   - tour 詳情頁 SEO 走 tours 既有 seo\_\* 欄位
   - 推薦：v1 用 workspace 級的 SEO defaults + tour 級 override

4. **9 主題的設計時程？**
   - v1 上線只有 placeholder variant（漫途預設一套）
   - 9 主題你之後逐個設計、設計完 import 進 variants/ 上架
   - 推薦：對的、不擋 v1 上線

5. **Canvas 改名是否同步做？**
   - 同步做（Day 3 排程）= 一次性大改、commit 乾淨
   - 分開做（先做新 module、Canvas 之後 rename）= 短期共存兩個名字、混亂
   - 推薦：同步做、用 gitnexus_rename 安全 rename

6. **API 路徑 reuse 還是 alias？**
   - 沿用 `/api/marketing/website/[code]`（marketing + websites 都 call）
   - 抽到 `/api/website-listings/[code]`（marketing route 改 alias）
   - 推薦：暫時沿用、v2 再抽（避免動 marketing 影響 Corner）

---

## 十一、紀律保險（commit / merge 前必跑）

```bash
npm run type-check
npm run lint
npm run audit:rls
npm run audit:writes
npm run audit:realtime
npm run audit:orphans  # 如有動 employees FK
./scripts/check-standards.sh --strict
```

CI（GitHub Actions）跑相同清單、error 擋 merge。

---

## 十二、回滾預案

每個 migration 末尾附 rollback SQL（紅線「破壞性 migration 必附反向 SQL」對齊）。

緊急回滾：

1. 砍 `workspace_features.website_builder` row → 所有客戶看不到 design 編輯器
2. revert commit → 路由消失 / sidebar entry 消失
3. canvas 欄位保留（純加欄位不影響既有）

無資料破壞風險。
