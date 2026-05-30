# yizhan-erp（一棧 ERP）架構地圖

> 最後整合：2026-05-30。整合自 9 個架構維度探查（路由 / 資料讀取 / API / 權限 / DB schema / 中央 lib / UI / Module 盤點 / 連線部署）。

---

## 一句話定位

**這是一套以「旅行社 / 旅遊團」為核心、外擴成多租戶 SaaS 的企業營運系統（ERP）**：旅遊團開團 → 客戶下訂報名 → 財務收款請款 → 會計做帳 → 人資算薪結獎金，外圍再掛資料庫主檔、AI 客服、簽證 / eSIM / 客戶官網等加值服務，並用「一套權限系統管所有分店（租戶）平等」。

### 技術棧（白話 + 術語）

| 層        | 用什麼                                                                    | 白話                |
| --------- | ------------------------------------------------------------------------- | ------------------- |
| 前端框架  | Next.js 16（App Router、Turbopack）+ React + TypeScript                   | 網站殼 + 路由       |
| 樣式      | Tailwind v4（純 CSS、無 config 檔）+ shadcn / Radix + 莫蘭迪 design token | 畫面與配色          |
| 資料讀取  | SWR（瀏覽器快取庫）+ IndexedDB（本機資料庫）+ Supabase Realtime           | 讀資料、即時刷新    |
| 後端      | Next.js API Route（158 個）+ Supabase Postgres                            | 業務邏輯 + 資料庫   |
| 資料庫    | Supabase（PostgreSQL + RLS 列級安全 + RPC + Realtime）                    | 真相儲存 + 隱形柵欄 |
| 認證      | Supabase Auth（JWT、本地 JWKS 驗簽 ES256）                                | 識別證查驗          |
| 部署      | git push → GitHub → Coolify webhook → Vultr（Tokyo）                      | 上線通道            |
| 監控 / AI | Sentry（三層）/ MiniMax + Anthropic（per-workspace 分派）                 | 錯誤追蹤 + AI 客服  |

### 規模數字

| 指標                                      | 數量                          |
| ----------------------------------------- | ----------------------------- |
| TypeScript 檔                             | ~1,470                        |
| API Route                                 | 158                           |
| DB Migration 檔                           | 868                           |
| 業務 Module（(main) 資料夾）              | ~25（核心 19 + 系統管理）     |
| Entity（資料表讀取殼）                    | ~50（探查見 54 個 entity 檔） |
| Production DB table                       | ~180                          |
| 員工 / 客戶 / 團 / 訂單（樣本租戶資料量） | 44 / 366 / 74 / 63            |

---

## ① 系統分層全景圖（一個請求從瀏覽器走到 DB 經過哪些門）

**白話**：使用者點一個按鈕，這個請求像「客人進飯店辦事」一樣，要連過好幾道門：大門刷卡（登入驗證）→ 樓層門禁（這個分店有沒有買這層樓）→ 部門門禁（你的職務鑰匙能不能刷）→ 辦公室柵欄（資料庫 RLS 最後一道隱形牆）。前端讀資料另走一條「快取捷徑」（SWR + IndexedDB），不是每次都麻煩資料庫。

```
┌─────────────────────────────────────────────────────────────────────┐
│  瀏覽器 (Browser)                                                     │
│  ┌──────────────┐         ┌─────────────────────────────────────┐   │
│  │ 讀資料 (Read) │         │ 寫資料 (Write)                       │   │
│  │ entity hook   │         │ entity hook CRUD  或  apiMutate      │   │
│  │ (createEntity)│         │ (單表簡單寫)        (跨表/API/上傳)   │   │
│  └──────┬───────┘         └──────────────┬──────────────────────┘   │
│         │ SWR 快取 + IndexedDB 雙層       │ 走 scoped-mutate 刷快取    │
│         │ (per-user cache key 紅線 G)     │ (紅線 F / I)              │
└─────────┼─────────────────────────────────┼─────────────────────────┘
          │                                 │
          ▼ (Realtime 即時推播刷新)          ▼
┌─────────────────────────────────────────────────────────────────────┐
│  L0 — src/proxy.ts（Next 16 改名的 middleware）                       │
│       伺服器端第一道：Supabase session 驗證 + 公開路由白名單 + CSP nonce│
└─────────────────────────────────────────────────────────────────────┘
          │ 頁面請求                          │ API 請求
          ▼                                  ▼
┌──────────────────────────────┐   ┌──────────────────────────────────┐
│ 頁面層 (Page Layout 守門)     │   │ API 層 5 步式守門                 │
│ MainLayout → ModuleGuard      │   │ 1) requireCapability(認證+鑰匙)    │
│  ├ L1 feature gate            │   │ 2) createApiClient(帶 session)    │
│  │  (這分店買了沒)            │   │ 3) recordApiAuditContext(稽核)    │
│  └ L2 capability gate         │   │ 4) validateBody(zod 白名單)       │
│     (你職務有沒有這鑰匙)      │   │ 5) workspace 過濾 + 業務 +        │
│  + 各 module layout.tsx 守門   │   │    dbErrorResponse(錯誤翻中文)    │
└──────────────────────────────┘   └──────────────────────────────────┘
          │                                  │
          └────────────────┬─────────────────┘
                           ▼
┌─────────────────────────────────────────────────────────────────────┐
│  Supabase PostgreSQL（最後一道隱形牆）                                │
│   L3 三維 org scope: scope_visible(module, row)                       │
│   L4 狀態守門:       is_row_editable() / 關帳擋寫(紅線 D)              │
│   L5 RLS 列級安全:   has_capability_for_workspace() +                  │
│                      get_current_user_workspace()（3 個 setup_*_rls）   │
│   L6 防呆/SSOT:      codes.ts advisory lock 編號 / db-error-translate  │
└─────────────────────────────────────────────────────────────────────┘
```

**關鍵認知**：守門是「應用層 + DB 層雙保險」。API 用 admin client（繞 RLS）時完全靠應用層 `requireCapability` 守門；走一般 client 的查詢才有 DB RLS 兜底。**資安押在「每個 API 都記得守門」的紀律**上。

---

## ② 路由與頁面

**白話**：整個 app 用「route group（路由群組，括號資料夾不算網址）」切成四大區塊——登入後的桌面後台、不用登入的對外分享頁、手機版殼、後端 API。進後台要連過三道門（proxy 大門 → ModuleGuard 樓層 → module layout 部門）。每個業務 module 是一個資料夾，慣例是 `page.tsx` 只當薄招牌、真正料理全放底線開頭的私有資料夾（`_components` / `_hooks` / `_services`）。

### Route Group 分區

| 群組       | 路徑                | 用途                                                     | 需登入           |
| ---------- | ------------------- | -------------------------------------------------------- | ---------------- |
| `(main)`   | `src/app/(main)/`   | 登入後桌面後台主體（~19 業務 module + 系統管理）         | 是               |
| `(public)` | `src/app/(public)/` | 對外分享：旅遊團展示提案、客戶自助付款、setup token      | 否               |
| `app/`     | `src/app/app/`      | 手機版 PWA 殼（真實網址 `/app`、自帶 TabBar / manifest） | 是（頁面內自驗） |
| `api/`     | `src/app/api/`      | 後端 API Route（60+ 資源資料夾、158 route）              | 各自守門         |
| 根層散頁   | `src/app/`          | `reset-password` / `change-password` / 客戶簽單頁等      | 部分公開         |

### 守門巢狀（三道門）

```
src/proxy.ts（伺服器端：session 驗證 + CSP nonce）
└─ app/layout.tsx（root：字型 / ThemeProvider / SWRProvider / IntlProvider / ErrorBoundary）
   ├─ (main)/layout.tsx → TourProvider → MainLayout → ModuleGuard → {children}
   │    ├ finance/accounting/library：薄守門 layout（canReadAnyInModule + UnauthorizedPage）標準範本
   │    └ channels/ai：重版型 layout（守門 + 自刻沉浸式 fixed 版面）特例
   ├─ (public)/layout.tsx（極簡、無守門）
   └─ app/layout.tsx（手機殼：app-shell + AppTabBar）
```

### 頁面組織慣例

- **薄入口**：`tours/page.tsx` 只 7 行 re-export `_components`；一般頁面 `'use client'` + 頂部中文註解（寫「為什麼這樣設計 / 踩過什麼雷 / 紅線對應」）。
- **底線私有資料夾**（不變網址）：`_components` / `_hooks`（讀寫 hook）/ `_services`（商業邏輯）/ `_types` / `_utils` / `_constants`。大 module 內子 feature 再自帶一整套（如 `tours/_quotes/`）。
- **動態網址**：`[code]`（團 / 合約代碼）、`[id]`（租戶 / 頻道 / 客戶）、`[token]`（付款 / setup 自助頁）。

---

## ③ 業務 Module 清單表

**白話**：這是「一棟旅行社大樓」。一樓做生意（開團、收客、收錢）、二樓做帳算薪、地下室存資料、門口接待（AI / 頻道）、頂樓賣加值服務、管理室管租戶與權限。`src/lib/permissions/features.ts` 是「sidebar 要不要顯示」的單一真相來源（SSOT），分級 basic / premium / enterprise / addon。

### A. 核心業務鏈（開團 → 收客 → 收錢 → 做帳 → 算薪）

| Module              | 業務職責                                                     | 主要頁面                                                                | 核心資料表                                                               |
| ------------------- | ------------------------------------------------------------ | ----------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| **tours** 旅遊團    | 團務核心：開團、設行程、團類型、出團日曆、報價、產 PPTX 簡報 | `/tours`、`/tours/[code]`                                               | `tours`、`tour_itinerary_items`、`tour_bonus_settings`、`quotes`         |
| **orders** 訂單     | 客戶下訂報名、團員名單、業務員、金額、收款狀態               | `/orders`（單頁）                                                       | `orders`、`order_members`（entity 檔名 `members.ts`）、`contracts`       |
| **finance** 財務    | 收款 / 請款 / 出納三大流                                     | `/finance`、`payments`、`requests`、`treasury`、`reports`、`settings`   | `payment_requests`、`receipts`、`disbursement_orders`、`payment_methods` |
| **accounting** 會計 | 傳票、帳務、結算、期末結帳鎖期（紅線 D）                     | `/accounting`、`accounts`、`vouchers`、`checks`、`period-closing`       | `chart_of_accounts`、`checks`、`travel_invoices`                         |
| **hr** 人資         | 員工 + 職務權限、薪資結算、獎金結算、資遣試算                | `/hr`、`organization`、`roles`、`salary-settlement`、`bonus-settlement` | `employees`、`role_capabilities`、`tour_bonus_settings`                  |

### B. 資料庫 / 主檔（給業務鏈查的資料抽屜）

| Module                   | 業務職責                                                                           | 主要頁面                                               | 核心資料表                                        |
| ------------------------ | ---------------------------------------------------------------------------------- | ------------------------------------------------------ | ------------------------------------------------- |
| **library** 資料管理     | 公司「自己的」主檔：客戶 / 供應商 / 景點 / 歸檔（capability code 仍叫 `database`） | `/library` + `customers` / `suppliers` / `attractions` | `customers`、`suppliers`、`attractions`、`hotels` |
| **shared-data** 共用資料 | 跨租戶共用基礎資料：機場 / 銀行 / 國家 / 保險級距                                  | `/shared-data` + `airports` / `banks` / `countries`    | `countries`、`bank_accounts`、`cities`            |

### C. 溝通 / AI（接待客人）

| Module                | 業務職責                                                    | 主要頁面                        | 核心資料表                                        |
| --------------------- | ----------------------------------------------------------- | ------------------------------- | ------------------------------------------------- |
| **channels** 溝通頻道 | 內部訊息、官方公告、專案頻道、HAPPY AI DM                   | `/channels`、`/channels/[id]`   | `channels`、`channel_members`、`channel_messages` |
| **ai** AI Hub         | 多通路統一收件匣 + AI 助理 + 對話復盤 + 訓練佇列 / 知識缺口 | `/ai`（單頁 + `?view=` 切畫面） | `ai_agents`、`ai_products`、`ai_knowledge_gaps`   |
| **calendar** 行事曆   | 出團日曆視覺化                                              | `/calendar`                     | `calendar_events`                                 |
| **todos** 待辦        | 任務管理                                                    | `/todos`                        | `todos`、`notes`                                  |

### D. 加值服務（頂樓賣的，多半 addon / premium）

| Module                             | 業務職責                                                      | 主要頁面                          | 核心資料表                                                               |
| ---------------------------------- | ------------------------------------------------------------- | --------------------------------- | ------------------------------------------------------------------------ |
| **visas** 簽證代辦                 | 證件代辦進度、客戶證件抽屜、代辦商價目（版本歷史）            | `/visas`                          | `customer_documents`、`customer_document_applications`、`document_types` |
| **documents** 文件中心             | 上傳 / 編輯 / 蓋章 / 合併 PDF/Word/Excel/PPT、PDF 簽名        | `/documents`                      | `workspace_documents`、`workspace_seals`                                 |
| **websites** 客戶官網              | 客戶加購進 design 編輯器排版、發布到 `{subdomain}.venturo.tw` | `/websites`→`design` / `products` | `website_tours`、`brands`                                                |
| **marketing** 行銷管理             | 官網行程上架、SEO、觸發 Astro rebuild                         | `/marketing/website`              | `tours`（`marketing_*` / `seo_*` 欄）、`website_tours`                   |
| **platform** 平台整合              | 第三方 SaaS 整合（AiToEarn，純 iframe）                       | `/platform`、`/platform/aitoearn` | （iframe、無自有表）                                                     |
| **esim**（掛訂單線、無獨立資料夾） | 旅遊 eSIM 訂單（Worldmove）                                   | （feature `esim`）                | `worldmove_orders`、`worldmove_esim_items`                               |

### E. 系統管理

| Module                  | 業務職責                                    | 主要頁面                          | 核心資料表                         |
| ----------------------- | ------------------------------------------- | --------------------------------- | ---------------------------------- |
| **dashboard** 首頁      | 系統儀表板、彙整各模組數據                  | `/dashboard`                      | `finance_summary`（view）          |
| **settings** 系統設定   | 公司與系統配置                              | `/settings`、`settings/company`   | `workspaces`                       |
| **workspaces** 租戶管理 | 多租戶 SaaS 管理：建 / 編租戶、開關 feature | `/workspaces`、`/workspaces/[id]` | `workspaces`、`workspace_features` |

---

## ④ 權限與資安 6 層

**白話**：核心是「三層對齊」——路由門牌（這網址對應哪模組）+ HR 鑰匙（你職務有沒有這能力）+ 分店有買（這公司付錢開通了沒），三者同時對上才放行，少一層就「點下去進不去」「沒權限的人看到」「沒買的分店也看到」。最重要的資安鐵律：**系統內沒有超級管理員，所有 workspace 平等**，連「能管權限的人」也只是擁有一個普通 capability（`hr.roles.write`），不是後門。

### 三層對齊模型

| 層       | 白話                     | SSOT 真相來源                                         |
| -------- | ------------------------ | ----------------------------------------------------- |
| 路由門牌 | 這網址對應哪模組         | `features.ts` 的 `routes[]`（`getModuleFromRoute()`） |
| HR 鑰匙  | 員工職務有沒有這能力     | `role_capabilities` 表 + `capabilities.ts` 常數       |
| 分店有買 | 租戶有沒有開通這 feature | `workspace_features` 表 + `features.ts`               |

### Capability 命名慣例

- 格式：`{module}.{action}`（模組總開關，如 `tours.read`）或 `{module}.{tab}.{action}`（細粒度，如 `tours.orders.write`）。
- action 只有 `read`（看得到）/ `write`（能改）。
- TS 常數：`CAPABILITIES.TOURS_ORDERS_WRITE` → `'tours.orders.write'`，與 `role_capabilities.capability_code` 1:1。

### SOURCE / 衍生紀律（不准手改）

```
src/modules/<code>.ts（唯一 SOURCE、手改這裡 + defineModule）
        │ npm run codegen:permissions
        ▼
capabilities.ts + features.ts + module-tabs.ts（衍生產物、禁手改）
```

### 6 層架構落點（L1–L6）

| 層                       | 守什麼              | 前端                                   | 後端                                  | DB                                            |
| ------------------------ | ------------------- | -------------------------------------- | ------------------------------------- | --------------------------------------------- |
| **L1 租戶 Feature Gate** | 公司有沒有買        | `ModuleGuard` + `isRouteAvailable()`   | `requireWorkspaceFeature(wsId, code)` | 查 `workspace_features`                       |
| **L2 角色 Capability**   | 員工職務有沒有鑰匙  | `ModuleGuard` + `canReadAnyInModule()` | `requireCapability(code)`             | 查 `role_capabilities`                        |
| **L3 三維 Org Scope**    | 員工屬哪分公司      | 前端 hide/disable                      | —                                     | `scope_visible(module, row)` SECURITY DEFINER |
| **L4 狀態守門**          | 這筆現在能不能改    | 前端 disable                           | API 檢查                              | `is_row_editable()` / 關帳擋寫                |
| **L5 DB RLS**            | 資料庫隱形柵欄      | —                                      | —                                     | 3 個 `setup_*_rls` procedure 生 policy        |
| **L6 防呆 / SSOT**       | 編號不撞 / 錯誤翻譯 | —                                      | `@/lib/codes` / `db-error-translate`  | advisory lock                                 |

- **前端 ModuleGuard**：feature gate（`features.length > 0 && !isRouteAvailable`）→ 踢 `/no-access`；capability gate（`!canReadAnyInModule`）→ 踢 `/no-access`。永遠放行 `/`、`/dashboard`、`/settings/personal`。
- **Context 組裝**：`getLayoutContext()`（React.cache）一次抓 user / employee / workspace / capabilities / features，組成 `capabilities: Set` + `features: Set`，前端走 `/api/auth/layout-context`。
- **DB 守門 function**：`has_capability_for_workspace(_ws, _code)`（SECURITY DEFINER STABLE，21+ migration 用），是 RLS policy 裡守 capability 的標準呼叫。

---

## ⑤ 資料讀取層

**白話**：心臟是「一個工廠生所有 entity hook」——~50 個 entity 檔各只寫一份 config（撈哪些欄位、怎麼排序、要不要分店隔離），列表 / 單筆 / 分頁 / 增刪改全由 `createEntityHook` 統一產生。讀走 SWR + IndexedDB 雙層快取、快取鑰匙編進使用者 ID（紅線 G，防同台電腦換帳號看到別人資料）。最關鍵的教訓：**所有刷新快取必須走 `scoped-mutate` 唯一入口**，直接 `import { mutate } from 'swr'` 會打到錯的快取桶、永遠刷不動（5 月一連串「寫完看不到、要 F5」事故的根因與解）。

### 核心檔案分工

| 檔案                                  | 角色                                                                   |
| ------------------------------------- | ---------------------------------------------------------------------- |
| `src/data/core/createEntityHook.ts`   | 主工廠：吃 config 吐 8 個 hook + 5 個寫入函式                          |
| `src/data/core/entityHookCrud.ts`     | create/update/delete/batchRemove/invalidate（樂觀更新 + by-id upsert） |
| `src/data/core/entityHookCache.ts`    | 使用者 context、IDB fallback、`WORKSPACE_SCOPED_TABLES` 名單、編號前綴 |
| `src/data/core/entityHookRealtime.ts` | Realtime 訂閱（先 await token 才 subscribe，防 RLS 擋光 events）       |
| `src/data/entities/*.ts`（~54）       | 各表薄殼：只寫 config + 改名 export                                    |
| `src/lib/swr/config.ts`               | SWR 全域設定 + per-user cache key（紅線 G）                            |
| `src/lib/swr/scoped-mutate.ts`        | **mutate 唯一正確入口（紅線 F SSOT）**                                 |
| `src/lib/swr/api-mutate.ts`           | API 寫入 + 自動失效指定快取（optimistic / rollback）                   |
| `src/lib/swr/createReportHook.ts`     | 財務報表工廠（跨表 join / RPC，不走 entity hook）                      |

### Entity hook 標準寫法

每個 entity 檔不超過 50 行：填 config（`workspaceScoped` 分店隔離、`list/slim/detail` 三層 select、`filterSoftDeleted` 自動加 `.is('deleted_at', null)`、`cache` preset）+ 改名 export。工廠吐出 8 個 hook：`useList`（auto-paginate 撈滿全表）/ `useListSlim`（省 egress）/ `useDetail`（id 為 null 不發請求）/ `usePaginated`（真 server-side 分頁 + count）/ `useDictionary` + `create/update/delete/batchRemove/invalidate`。

### 快取與 dedupe（踩過大雷）

- **鑰匙結構**：`entity:{table}:list:v{select欄位hash}[:{filter}][:limit=N]`。select 欄位變動 → hash 變 → 強制重撈（解「改了欄位卻卡舊資料」）。
- **dedupe 2000ms**（非憲法寫的 5 分鐘）：原本綁 `Infinity` 假設靠 Realtime 推播，實測 Realtime JWT 漏接沒通、revalidate 全被砍 → UI 卡 stale。改 2 秒後解掉。
- **紅線 G**：localStorage 快取鑰匙 = `venturo-swr-cache-v2-{user_id前12碼}`，登入登出 `clearAllSwrCacheKeys()` 全清。

### 寫入兩條路

- **路線 A entity hook CRUD**（單表簡單寫）：client 先 `generateUUID()` 樂觀 push → insert → by-id upsert 真值 → invalidate 全刷。自帶編號生成、自動補 `workspace_id` / `created_by`。
- **路線 B apiMutate**（跨表 / API / 上傳）：`invalidate: [...]` 寫完刷指定快取、`optimistic` 先改 UI 失敗 rollback、失敗回 `{ok:false}` 不 throw。
- **鐵律（紅線 F / I）**：全走 `@/lib/swr/scoped-mutate`，不准直接 `import { mutate } from 'swr'`。

---

## ⑥ API 層

**白話**：158 個 API route 守門骨架收斂成「認證 → capability 鑰匙 → workspace 過濾 → 業務 → DB 錯誤翻中文」五步式，像便當店 5 道出餐關卡。主流守門用 `requireCapability`（106 檔），最完整版 `getApiContext`（含 feature gate + 帳號停用檢查，新方向但僅 3 檔用）。admin client（service_role 繞 RLS）嚴守紅線 C「每次 new、不 singleton」。最大技術債是「三套認證 + 三套錯誤處理 + 兩套 client」新舊並存。

### 中央 helper 用量統計（/ 158 檔基數）

| 關卡                    | helper                          | 用量                | 作用                                                                 |
| ----------------------- | ------------------------------- | ------------------- | -------------------------------------------------------------------- |
| 認證                    | `getServerAuth()`               | 47                  | 本地驗 JWT + 反查 employees 拿 workspace/employee id（只認證不檢權） |
| 認證+檢權               | `requireCapability(code)`       | **106**（主流）     | 登入 + capability 二合一                                             |
| 認證+檢權+feature       | `getApiContext(opts)`           | 3（最完整、新方向） | auth + capability + feature gate + 停用檢查                          |
| try-catch 包裝          | `apiHandler(fn)`                | 37                  | 統一 try-catch                                                       |
| 帶 session client       | `createApiClient()`             | 66                  | RLS 自動生效                                                         |
| workspace 解析          | `getCurrentWorkspaceIdServer()` | 24                  | server 反查、絕不信 client 傳的（紅線 H）                            |
| admin client            | `getSupabaseAdminClient()`      | **98**              | service_role 繞 RLS、每次 new（紅線 C）                              |
| 輸入驗證                | `validateBody(req, schema)`     | 33                  | zod whitelist                                                        |
| 稽核軌跡                | `recordApiAuditContext()`       | 79                  | 寫 actor + reason、靜默失敗不阻斷                                    |
| 錯誤翻譯（回 Response） | `dbErrorResponse(err)`          | **68**（主流）      | Postgres 錯誤碼 → 中文 + HTTP status                                 |

### 標準 5 步式骨架

```ts
export const POST = apiHandler(async request => {
  const guard = await requireCapability(CAPABILITIES.FINANCE_MANAGE_SETTINGS) // 1 守門
  if (!guard.ok) return guard.response
  const supabase = await createApiClient() // 2 連線
  await recordApiAuditContext(supabase, { actorId: guard.employeeId, reason }) // 3 稽核
  const v = await validateBody(request, schema) // 4 驗證
  if (!v.success) return v.error
  const workspaceId = await getCurrentWorkspaceIdServer() // 5 workspace
  const { data, error } = await supabase
    .from('...')
    .insert({ ...v.data, workspace_id: workspaceId })
  if (error) return dbErrorResponse(error) //   錯誤翻譯
  return NextResponse.json(data)
})
```

**特殊 pattern**：OR-gate（reference dropdown 放寬成任一 read 即可、寫入嚴守 manage）；公開 API（`api/public/*` admin client + rate limit 60/min + CORS + sanitized 欄位 + 不暴露 workspace_id）；紅線 D 關帳擋寫回 409 `PERIOD_CLOSED`。

---

## ⑦ DB Schema 分域地圖

**白話**：Supabase Postgres 多租戶 ERP，~180 張表、868 個 migration，按業務域分 8 大類。核心紀律是「中央化 RLS」——3 個 `setup_*_rls` procedure 取代手抄 16 行 CREATE POLICY；審計欄位（`created_by` 等）一律 FK 指 `employees(id)` 不是 `auth.users`（紅線 B）。

### 8 大業務域

| 域                          | 代表表                                                                                                                                          | 重點                                                           |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| **1. HR / 組織**            | `employees`(44)、`workspace_roles`(48)、`role_capabilities`(2094)、`branches`、`brands`、`salary_settlements`                                   | `employees.user_id` → auth.users 是唯一例外（登入帳號）        |
| **2. 旅遊團**               | `tours`(74)、`tour_itinerary_items`(488)、`tour_status_logs`、`tour_display_overrides`、`bonus_pending`                                         | `closed_by`/`locked_by`/`published_by` 對應紅線 D              |
| **3. 訂單 / 帳單 / 金流**   | `orders`(63)→`order_members`(194)→`invoices`(17)→`receipts`(80)、`quotes`(81)、`payment_transactions`                                           | 主鏈 FK 串接、`receipt_invoice_allocations` 一收款分多 invoice |
| **4. 財務 / 會計**          | `payment_requests`(55)、`disbursement_orders`(8)、`journal_vouchers`、`chart_of_accounts`(676)、`accounting_period_closings`、`travel_invoices` | 月結鎖期紅線 D                                                 |
| **5. 客戶 / 證件 / 簽證**   | `customers`(366)、`customer_documents`、`customer_document_applications`、`document_types`(112)、`supplier_pricing`                             | 證件抽屜 is_primary + superseded、改價=插新 row                |
| **6. 通路 / 收件匣 / LINE** | `inbox_conversations`(29)→`inbox_messages`(862)、`line_conversation_messages`(509)、`channels`(16)、各平台 webhook 設定                         | polymorphic thread、10s debounce 後送 AI                       |
| **7. AI / 知識庫**          | `knowledge_documents`(60)→`knowledge_chunks`(476)、`ai_agents`、`customer_memories`、`ai_knowledge_gaps`、`kb_cruise_*`、`llm_usage_logs`(208)  | RAG embedding 暫 null、訓練飛輪                                |
| **8. 平台 / 租戶 / 字典**   | `workspaces`(9)、`workspace_features`(626)、`audit_logs`(427)、`todos`、共用字典 `ref_airports`(6063) / `attractions`(2554) / `ref_banks`(307)  | 紅線 A：workspaces 永遠 NO FORCE RLS                           |

### 中央化 RLS（核心紀律）

定義於 `20260513024000_rls_helper_procedures.sql`，新表 RLS = 1 行 procedure call：

| Procedure                                       | 適用                            | 守門邏輯                                                      |
| ----------------------------------------------- | ------------------------------- | ------------------------------------------------------------- |
| `setup_workspace_scoped_rls(table)`             | 有 `workspace_id` 欄的標準表    | `workspace_id = get_current_user_workspace()`，生 4 條 policy |
| `setup_join_table_rls(table, employee_col)`     | 員工 join 表（無 workspace_id） | EXISTS join employees 比對 `e.workspace_id`                   |
| `setup_inherited_rls(table, parent, parent_id)` | 子表透過父表繼承 scope          | EXISTS join parent 比對 `p.workspace_id`                      |

### Migration SOP

檔名 `YYYYMMDDHHMMSS_purpose.sql`；檔頭寫「為什麼」+ 安全盤點；`BEGIN; ... COMMIT;`；`IF EXISTS` idempotent；破壞性附 rollback SQL 註解；動 column 後 `NOTIFY pgrst, 'reload schema'`。**本地寫檔 → git commit → MCP `apply_migration`**（不在 Studio 手動跑 DDL）。

---

## ⑧ 中央 Module / lib

**白話**：`src/lib` 有 59 項（9 頂層檔 + 50 子資料夾），分兩類——「全站必走的中央 SSOT」（編號 / 錯誤翻譯 / 狀態流 / 認證 / SWR / 軟刪除 / Supabase client）和「業務域 / 第三方整合功能庫」（line / ai / hr / finance 等）。每個中央模組檔頭都寫「為什麼這樣設計 + 不准散刻」。唯一例外：client 讀取 SSOT `createEntityHook` 住在 `src/data/core/` 不在 `src/lib`。

### 中央 SSOT 核心（不准散刻）

| 領域               | 檔案                                                                                                             | 紀律                                                      |
| ------------------ | ---------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| 🔢 編號            | `lib/codes.ts`（11 種 helper，各含 advisory lock RPC）                                                           | 紅線級，批次號用 `nextPaymentRequestItemNumbers` 不可迴圈 |
| 🚦 狀態流          | `lib/status/`（index/financial/tour/labels/tone）                                                                | 2026-05-29 收斂 3 套為一處、消文案漂移                    |
| 🛡 認證守門        | `lib/auth/`（useLayoutContext / get-api-context / require-capability）                                           | API 不准散刻 capability check                             |
| 📡 資料讀寫        | `lib/swr/`（api-mutate / config / scoped-mutate）                                                                | 紅線 F / G / I                                            |
| 🗑 軟刪除+稽核     | `lib/data/`（soft-delete / **filter-active = 唯一 reference `deleted_at` 的地方**）+ `lib/audit/`                | pre-commit 守門擋散刻                                     |
| 🔌 Supabase client | `lib/supabase/`（admin 紅線 C / client / server / api-client 紅線 H）                                            | admin 每次 new                                            |
| 🔑 權限定義        | `lib/permissions/`（capabilities / module-tabs / features，5 SSOT #2/#3/#4）                                     | codegen 衍生                                              |
| 🧩 其他            | `lib/integrations/registry.ts`（加一筆 array 自動長 UI + sensitive 加密）、`validations/` / `errors/` / `cache/` | —                                                         |

### 業務域 / 整合功能庫（非中央 SSOT）

通訊（`line` 最大 8+ 檔 / `facebook` / `instagram` / `messaging` / `inbox`）、AI（`ai` / `llm` / `tasks`）、業務域（`hr` 薪資保險資遣 / `finance` / `disbursement` / `pnr-parser`）、金流（`payment-providers/sinopac`）、文件輸出（`print` / `presentation` / `excel` / `canvas`）、工具（`utils` / `crypto` / `cors`）。

---

## ⑨ UI 與設計系統

**白話**：Tailwind v4（純 CSS、沒有 `tailwind.config.js`）+ shadcn/Radix 為底，上面包一層「莫蘭迪 design token 系統」。所有色彩 / 陰影 / 圓角集中在 `src/styles/tokens.css` 一個檔、用 CSS 變數定義 4 套主題，再經 `@theme inline` 推給 Tailwind 變成 `morandi-*` / `status-*` class。共用元件三層：`ui/`（螺絲釘原子件）、`layout/` + `dialog/`（預製牆面骨架）、業務頁面把資料丟進 `ListPageLayout` / `FormDialog` 就組好一頁。

### 共用元件三層

```
ui/      L1 原子件（button cva variants / dialog level 系統 / enhanced-table 引擎）
layout/  L2 頁面骨架（list-page-layout / content-page-layout / responsive-header / sidebar）
dialog/  L2 彈窗骨架（form-dialog / managed-dialog 帶 dirty 偵測 / confirm-dialog）
```

- **列表頁**：`ListPageLayout`（= ResponsiveHeader + EnhancedTable）。前端 / 伺服器雙分頁（列表 20 筆 / 分頁 15 筆 / 不給每頁筆數選項）。`headerActions` 是 escape hatch、不准放 Button（強制主按鈕走 `primaryAction` 保一致）。EnhancedTable 內建排序 / 過濾 / 展開 / 勾選 / loading skeleton。
- **表單彈窗**：`FormDialog`（Header + children + Footer 取消 soft-gold / 提交 morandi-gold）、`maxWidth` 11 級。
- **Dialog level 1-5**：巢狀彈窗 z-index（9000 起跳每層 +100），主彈窗黑 40% 遮罩、子彈窗淡 20% 不疊黑。開彈窗必設 `level`。

### Design Token（核心護城河）

- 單一真相檔 `src/styles/tokens.css`：每套主題在 `[data-theme='xxx']` 定原始變數 → 底部 `@theme inline` 映射成 Tailwind class。切主題 = 切 `<html data-theme>`，全站變色不改元件。
- 4 套主題（變數名都沿用 `morandi-*` 歷史名）：莫蘭迪金（預設）/ iron 鐵灰 / airtable 藍 / klein-blue 克萊因藍。
- **紀律紅線**（`docs/rules/ui-discipline.md`）：禁所有 Tailwind 預設色（`bg-red-*` 等），成功走 `text-status-success`、危險 `status-danger`。唯一例外：社群 channel badge（LINE 綠 / FB 藍 / IG 粉）白名單。`check-standards.sh --strict` 用 baseline 機制——既有違規進 baseline 不擋、新增即 fail。
- **字型**：主字 Noto Sans TC（思源黑體）、襯線 Noto Serif TC（思源宋體）+ Playfair。禁新細明體 / PMingLiU、中文禁偽斜體。

---

## ⑩ 連線 / 部署 / 工具鏈

**白話**：守門鏈三層——本機 husky（存檔 / 推送當下擋）、GitHub Actions（5 條 workflow 擋 merge）、30+ audit 腳本（機械化掃描）。部署走單一路徑 `git push main` → GitHub → Coolify → Vultr（Tokyo），用 Next.js standalone、無自備 Dockerfile。外部整合全走 multi-tenant 加密 token（webhook 驗 HMAC-SHA256、secret 從 workspace DB 反查不從 env）。

### 守門鏈三道關卡

| 層                          | 跑什麼                                                                                                                                                                                                        | 守什麼                             |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------- |
| **L0 husky** pre-commit     | type-check + 禁 @ts-expect-error + 動 modules/ 自動 codegen + check-standards.sh + prettier                                                                                                                   | 型別 / 後門詞 / SSOT 漂移 / 格式債 |
| **L0 husky** pre-push       | vitest run + check-codegen-fresh.sh                                                                                                                                                                           | unit test + codegen drift          |
| **L1 GitHub Actions**       | `ci.yml`（quality→build→bundle、e2e-smoke 已停用）、`audit-rls.yml`（6 層偏離擋 merge）、`standards-check.yml`（11 條憲法）、`pr-supabase-branch.yml`（migration 預演佔位）、`bundle-size.yml`（>600kB fail） | PR / push 擋 merge                 |
| **L2 audit:\* 腳本（30+）** | capability / flow / data / ui / secret / RLS（46KB 主腳本）/ console / any、`nightly-audit.sh` 退步偵測、自訂 ESLint rule（no-direct-useswr / no-direct-supabase-writes）                                     | 機械化掃描                         |

### 部署 / build / 測試

- **部署**：`git push origin main` → GitHub → Coolify webhook → Vultr 167.179.97.139（Tokyo）→ erp.venturo.tw。無 Dockerfile（Coolify Nixpacks + next standalone）。Migration 獨立：本機寫檔 → commit → MCP `apply_migration`。
- **build**：`NODE_OPTIONS=--max-old-space-size=8192 next build`（8GB、next 16 Turbopack）。standalone 輸出 + 安全 header（HSTS / X-Frame DENY）+ CSP nonce-based + Sentry。
- **測試**：vitest 4（jsdom 單元）+ Playwright 1.56（E2E，登入態共用 storageState）。**E2E CI 守門 2026-05-27 停用**，靠 audit:rls 兜底。

### 外部整合（全 multi-tenant 加密 token）

| 整合                   | 簽章 / 認證                                              | token 來源                                                   |
| ---------------------- | -------------------------------------------------------- | ------------------------------------------------------------ |
| LINE / FB / IG webhook | HMAC-SHA256（timingSafeEqual）                           | channel_secret 從 workspace DB 反查、**不從 env**            |
| AI LLM                 | `llm-dispatcher` 依 workspace 設定分派 MiniMax/Anthropic | per-workspace 加密、缺設定 fallback 平台層 `MINIMAX_API_KEY` |
| RAG embedding          | MiniMax embo-01（不碰 OpenAI）                           | —                                                            |
| 監控                   | Sentry（client/server/edge）                             | production 5% 取樣                                           |

**AI 後處理紅線**：`dispatchLLM` 回應強制簡轉繁兜底、fire-and-forget 記 `llm_usage_logs`（自建計費）。

### Cron

LINE flush（GitHub Actions `*/5`、`Bearer CRON_SECRET`）、process-tasks（外部 cron）。全包 `withCronHeartbeat`（UPSERT heartbeat + retry 3 次 exp backoff）。

---

## ⑪ 已知風險與技術債彙整（去重收斂）

> 按「資安 #1 → 效能 #2 → SSOT #3 → 維護性」優先排序。救護車式：先講會不會出大事。

### 🔴 資安 / 守門（最高優先）

| 風險                                                 | 白話後果                                                                                                                                                                                         | 來源維度  |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------- |
| **E2E CI 守門已停用（2026-05-27）**                  | `login-api.spec.ts`（守 FORCE RLS / admin singleton 紅線 A/C）不在 CI 跑，動 RLS 的改動沒自動守門，**紅線 A 最後一道機器防線是空的**。SaaS 化前須開回（`E2E_SMOKE_ENABLED=true` + 隔離 test DB） | 連線部署  |
| **ModuleGuard feature gate 向下相容後門**            | 某 workspace 完全沒有 `workspace_features` row（`features.length===0`）會視為「全開」放行。新 workspace 若 seed 沒跑到 = **沒買也全看**                                                          | 權限      |
| **守門全押應用層紀律、無 DB 兜底**                   | `check-capability` 走 admin client 繞 RLS 直查，某 API route 忘了 `requireCapability` 時 admin client 不會被 RLS 擋。資安押在「每個 API 都記得守門」                                             | 權限、API |
| **散裝表分店隔離靠 fallback 名單**                   | `WORKSPACE_SCOPED_TABLES` 給沒建 entity hook 的散裝 `supabase.from` 表（journal_vouchers / companies / pnrs）兜底，漏寫等於沒分店隔離、只靠 DB RLS                                               | 資料讀取  |
| **next.config 開 `*.supabase.co` 萬用子網域**        | 任何 supabase 子網域圖片都能被 next/image 代理載入，比白名單單一 host 略鬆                                                                                                                       | 連線部署  |
| **getServerAuth 每 request 印含 email 的 debug log** | production 高頻 API 洗 log + 含 PII                                                                                                                                                              | API       |
| **L3 scope_visible 部門邏輯已拔光**                  | 5/18 因 `department_id` 砍掉，現只剩 workspace + branch 二維。`is_dept_manager` column 是 dead artifact，重建部門時要記得補回 `cross_department.read` 雙條件否則部門隔離形同虛設                 | 權限      |

### 🟠 效能

| 風險                                    | 白話後果                                                                                                                                                    | 來源      |
| --------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- |
| **Realtime 失效退化風險**               | Realtime（JWT 漏接歷史 bug）一旦失效，快取刷新退化成只靠寫後 invalidate。若有人把 entity cache 改回 `Infinity` preset 會重蹈「卡 stale 要 F5」覆轍          | 資料讀取  |
| **useList 預設 auto-paginate 撈滿全表** | 大表被當 useList 而非 usePaginated 用，一次拉大量 row = egress 成本 + 前端記憶體壓力。靠開發者自律選對 hook                                                 | 資料讀取  |
| **重複 DB query**                       | `hasCapabilityByCode` 每次跑 2 query、`requireCapability` 又先跑 getServerAuth，同 request employee 被重複查。`getApiContext` 用 Promise.all 合併是正解方向 | API、權限 |
| **EnhancedTable 未虛擬化**              | 前端一次塞 >100 列有渲染效能風險，目前靠 server 15-20 筆分頁緩解                                                                                            | UI        |
| **audit:rls DB 段 Mac 本地 skip**       | 本機跑綠不代表 DB 層 RLS 真對齊，得靠 CI Linux 跑全套                                                                                                       | 連線部署  |

### 🟡 SSOT 破碎 / 雙真相

| 風險                                           | 白話後果                                                                                                                                                                                                                        | 來源             |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------- |
| **route 名稱與 DB capability 名不同步**        | route 改名 `library/` 但 capability code 仍 `database`，grep 容易找錯邊                                                                                                                                                         | 路由、Module     |
| **雙殼並存（(main) 桌面 vs app/ 手機）**       | 同功能（dashboard/orders/calendar）維護兩份，SSOT 分裂                                                                                                                                                                          | 路由             |
| **官網上架真相散兩處**                         | marketing 讀寫 `tours.marketing_*` 欄、websites 又有 `website_tours`，「上架」狀態真相來源待確認                                                                                                                                | Module           |
| **景點資料分兩套**                             | library 與 shared-data 都有 attractions entity，SSOT 是否破碎待確認                                                                                                                                                             | 資料讀取、Module |
| **狀態 SSOT 收斂後殘留**                       | `status/` 已收斂為唯一 SSOT，但 `constants/status-maps.ts` 仍存在，需確認是否待清                                                                                                                                               | 中央 lib         |
| **三套認證 + 三套錯誤處理 + 兩套 client 並存** | `requireCapability`(106)/`getServerAuth`(47)/`getApiContext`(3)；`dbErrorResponse`/`translateDbError`/散刻吞錯（如 contracts/list 回「查詢失敗」）；`createApiClient` vs `createSupabaseServerClient`。新舊風格混雜是主要技術債 | API              |
| **Legacy capability 殘留**                     | `channels.manage` / `line_bot.*` / `settings.env.write` 仍有 caller、modules/ 沒衍生對應，待清                                                                                                                                  | 權限、中央 lib   |

### 🟢 維護性 / 整理

<!-- prettier-ignore -->
| 風險                                            | 白話後果                                                                                                                                                                                                           | 來源                   |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------- |
| **type-safety 在資料層被繞過**                  | `createEntityHook` 大量 `as never` 餵 dynamic table name、slim hook 回完整型別但只撈部分欄位、EnhancedTable 大量 `as unknown as`——動態表名 / 缺欄位打錯不會被 type-check 擋、只 runtime 炸                         | 資料讀取、UI           |
| **編號生成雙軌**                                | entity hook 的 auto-code 走 SELECT max + client +1 + 重試 3 次（非 DB advisory lock），跟中央 `@/lib/codes` 的 advisory lock 是兩套，高並發仍可能撞                                                                | 資料讀取               |
| **雙軌稽核/軟刪除依賴未 apply 的 DB 物件**      | `record-audit.ts` / `soft-delete.ts` 檔頭註明「table/function 不存在時呼叫會 fail 屬預期」，這層中央邏輯可能尚未在 production 生效                                                                                 | 中央 lib               |
| **審計 FK 的 ON DELETE 不一致**                 | 多數表 `created_by` 走 SET NULL，但 customers/orders/tours 等核心表沒有，員工硬刪可能 FK RESTRICT 卡住                                                                                                             | DB                     |
| **備份殘留表**                                  | `_shared_data_ownership_backup_20260527`(3332 筆) 留在 public schema 會被當正式表掃到，建議歸檔                                                                                                                    | DB                     |
| **kb*\* / worldmove*_ / ai\__ 半成品表 rows=0** | schema 已建未必有對應 entity hook / RLS 驗證，動到要先確認過 6 層                                                                                                                                                  | DB                     |
| **散刻色 baseline ~20 檔掛帳**                  | check-standards 只擋新增、既有掛 baseline，morandi-red/green 散刻僅 warning，待漸進清                                                                                                                              | UI                     |
| **主題變數命名債**                              | iron/airtable/klein-blue 仍沿用 `morandi-*` 名（airtable 下 `--morandi-gold` 其實是藍），語義不符易誤讀                                                                                                            | UI                     |
| **lint suppressions 白名單**                    | `.eslint-suppressions.json` 含 no-direct-useswr / no-direct-supabase-writes（紅線 F），新增才擋，要靠 lint:swr-prune 持續收緊否則變永久豁免                                                                        | 連線部署               |
| **createEntityHook 位置不一致**                 | client 讀取 SSOT 住 `src/data/core/` 不在 `src/lib`，新人容易找不到中央讀取層                                                                                                                                      | 中央 lib、資料讀取     |
| **慣例未完全收斂**                              | 部分 module 同時有 `_components` 與無底線 `components`（如 hr）；`marketing/` 沒 module 根 page.tsx（點 `/marketing` 可能 404）；entity 檔名 ≠ 表名（members.ts→order_members、website-tours.ts 與 tours.ts 同表） | 路由、Module、資料讀取 |
| **Supabase branch 預演佔位**                    | `pr-supabase-branch.yml` 真正 push migration 兩步被註解（需 Pro plan），仍可能 merge 到 production apply 才爆                                                                                                      | 連線部署               |

---

## 新人 Onboarding 路線圖

> 譬喻：先讀「公司大樓平面圖與門禁規矩」，再從一條完整業務流走一遍（開團→收錢），最後才鑽各層引擎室。按順序讀，別跳。

### 第 0 站：先讀規矩（半天，最重要）

1. `/Users/william/Projects/yizhan-erp/CLAUDE.md` — 憲法主檔（優先順位、連線規則、五大方向、紅線清單）
2. `docs/rules/architecture.md` — 6 層架構 L1–L6 + 中央 Module + 5 SSOT 完整論述
3. `docs/rules/red-lines.md` — 紅線完整版（A FORCE RLS / B 審計 FK / C admin client / D 關帳 / F-I SWR）
4. `docs/rules/ui-discipline.md` — design token 紅線、禁 Tailwind 預設色

### 第 1 站：路由與守門骨架（理解「點進去發生什麼」）

5. `src/proxy.ts` — 第一道伺服器守門
6. `src/app/layout.tsx` + `src/app/(main)/layout.tsx` — root + 桌面後台殼
7. `src/app/(main)/finance/layout.tsx` — 標準守門 layout 範本
8. `src/components/guards/ModuleGuard.tsx` — 前端兩道 gate

### 第 2 站：權限系統（資安核心，搞懂三層對齊）

9. `src/modules/tours.ts` — module SOURCE 範例（defineModule、codegen 真相源）
10. `src/lib/permissions/features.ts` + `capabilities.ts` — feature / capability SSOT
11. `src/lib/auth/get-api-context.ts` + `require-capability.ts` — 後端守門
12. `supabase/migrations/20260501100000_create_capability_system.sql` — `has_capability_for_workspace` + role_capabilities

### 第 3 站：資料讀寫層（每天都會碰）

13. `src/data/core/createEntityHook.ts` — 主工廠（讀取 SSOT）
14. `src/data/entities/customers.ts` — entity 檔範例（三層 select）
15. `src/lib/swr/scoped-mutate.ts` + `api-mutate.ts` — mutate 唯一入口（紅線 F/I）
16. `src/lib/swr/config.ts` — per-user cache key（紅線 G）

### 第 4 站：API 層與中央 module（寫後端必讀）

17. `src/app/api/finance/payment-methods/route.ts` — 5 步式守門最佳範例
18. `src/lib/codes.ts` + `db-error-translate.ts` — 編號 / 錯誤翻譯（紅線級不准散刻）
19. `src/lib/supabase/admin.ts` — admin client 紅線 C 論述

### 第 5 站：UI 與設計系統（寫畫面必讀）

20. `src/styles/tokens.css` — design token 單一真相檔
21. `src/components/layout/list-page-layout.tsx` + `src/components/ui/enhanced-table/EnhancedTable.tsx` — 列表頁組裝
22. `src/components/dialog/form-dialog.tsx` + `src/components/ui/dialog.tsx` — 彈窗 + level 機制

### 第 6 站：DB 與部署工具鏈（動表 / 上線前讀）

23. `supabase/migrations/20260513024000_rls_helper_procedures.sql` — 中央化 RLS 三 procedure
24. `supabase/migrations/20260524120000_add_created_by_fk_employees_27_tables.sql` — migration 寫法範本
25. `package.json`（audit:\* script）+ `scripts/check-standards.sh` + `.husky/pre-commit` — 守門鏈
26. `next.config.ts` — 部署 / 安全 header / Sentry

### 第 7 站：走一條完整業務流（融會貫通）

讀完上面，從 `src/app/(main)/tours/[code]/page.tsx`（開團）→ `src/app/(main)/orders`（報名）→ `src/app/(main)/finance/payments/page.tsx`（收款）跟一遍，把「路由 → 守門 → entity hook 讀 → apiMutate 寫 → DB RLS」串成一條完整路徑。
