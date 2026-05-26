# CLAUDE.md — 一棧 ERP（yizhan-erp）

> 最後重寫：2026-05-13；更名記錄：venturo-aierp → venturo-atlas → yizhan-erp（2026-05-18 本地資料夾正式對齊 GitHub）。GitHub repo：Venturo-Agent/yizhan-erp。

---

## 優先順位（William 親口）

**資安 #1 → 效能 #2 → SSOT #3**

- **資安第一**：洞 = 客戶資料外洩 = 商業終結
- **效能第二**：SaaS 化讀取量 = Supabase 成本、列表預設載少、分頁固定 15 筆、不給「每頁筆數」選擇器
- **SSOT 第三**：不是不重要、但跟前兩者衝突時讓位

---

## 🔒 連線強制規則（每個資源只一條路、卡住先停手）

> **過去常犯的錯**：試 A 不行試 B、試 B 不行試 C、燒一堆 token 才發現原來可以用 D（譬如 MCP）。
> **規矩**：第一次連法失敗 → **立刻停手** → 跟 William 報「X 連不上、訊息 Y、建議 Z」、**不准瞎試**。

### Supabase（production: yizhan-erp）

唯一通道：**`mcp__supabase-aierp__*`**

| 場景                   | 工具                                             |
| ---------------------- | ------------------------------------------------ |
| 跑 SQL / 查 schema     | `mcp__supabase-aierp__execute_sql`               |
| Apply migration（DDL） | `mcp__supabase-aierp__apply_migration`           |
| 列 table / 看 RLS      | `mcp__supabase-aierp__list_tables`               |
| 重 generate types      | `mcp__supabase-aierp__generate_typescript_types` |
| 看 logs                | `mcp__supabase-aierp__get_logs`                  |
| 看安全 advisor         | `mcp__supabase-aierp__get_advisors`              |

- project_id（**唯一**）：`aawrgygqgemgqssflfrx`
- MCP server 已配 `$SUPABASE_MCP_AIERP_TOKEN`、Claude 不直接讀 token

**❌ 不准**：SSH Vultr / psql 直連 port 5432 / Supabase Studio 手動跑 SQL / `supabase` CLI（除非 MCP 證實不夠用、且明說）

### GitHub

唯一通道：本機 `git` + `gh` CLI

| 場景                                         | 工具                                         |
| -------------------------------------------- | -------------------------------------------- |
| commit / push / branch                       | `git`                                        |
| open issue / PR / review / merge / 看 checks | `gh`                                         |
| Repo                                         | `Venturo-Agent/yizhan-erp`（`$GITHUB_REPO`） |

- `gh` 已用 `$GITHUB_PAT` 認證

### 部署

唯一方式：

```bash
git push origin main
```

→ GitHub 觸發 Coolify webhook → Coolify 在 Vultr 自動 build + deploy → erp.venturo.tw 上線

- Production server：Vultr（IP 167.179.97.139、Tokyo region）
- Deploy 平台：Coolify（https://coolify.venturo.tw）
- DNS：erp.venturo.tw → Vultr 167.179.97.139

- **❌ 不准**：手動 Docker、手動 SSH 改 production（除非明說）

### Secrets / Token

存放：`~/.config/venturo/secrets.env`（chmod 600、不進 git）
讀法：`source ~/.config/venturo/secrets.env`
文檔規矩：只寫變數名（`$SUPABASE_PROJECT_REF`）、永遠不寫 value。

#### 變數分類索引（只列名、不列值）

- **Supabase**：`SUPABASE_PROJECT_REF`（= `aawrgygqgemgqssflfrx`）、`SERVICE_ROLE_KEY`、`NEXT_PUBLIC_SUPABASE_URL`、`NEXT_PUBLIC_SUPABASE_ANON_KEY`、`DB_PASSWORD`、`DB_HOST`、`DB_URL`、`MCP_AIERP_TOKEN`、`MCP_PERSONAL_TOKEN`
- **GitHub**：`GITHUB_PAT`、`GITHUB_REPO`（= `Venturo-Agent/yizhan-erp`）、`GITHUB_USERNAME`、`GITHUB_REPO_URL_HTTPS`、`GITHUB_REPO_URL_SSH`
- **Vultr**（production server）：`VULTR_API_TOKEN`、`VULTR_SERVER_ID`、`VULTR_SERVER_IPV4`、`VULTR_SERVER_IPV6`、`VULTR_SSH_KEY_ID`、`VULTR_ROOT_PWD`、`VULTR_REGION`、`VULTR_PLAN`
- **Coolify**（deploy 平台、跑在 Vultr 上）：`COOLIFY_URL`、`COOLIFY_API_TOKEN`、`VENTURO_AIERP_COOLIFY_APP_UUID`
- **LINE**：`LINE_CHANNEL_ACCESS_TOKEN`、`LINE_CHANNEL_SECRET`、`LINE_CHANNEL_ID`、`LINE_BOT_USER_ID`、`LINE_OA_BASIC_ID`、`LINE_OA_DISPLAY_NAME`
- **Cloudflare**（DNS）：`CLOUDFLARE_API_TOKEN`、`CLOUDFLARE_ZONE_ID`、`CLOUDFLARE_ACCOUNT_ID`、`CLOUDFLARE_NS1`、`CLOUDFLARE_NS2`
- **Telegram bots**（多個 persona）：`TELEGRAM_*_BOT_TOKEN`、`TELEGRAM_WILLIAM_SENDER_ID`
- **第三方 API**：`GOOGLE_PLACES_API_KEY`、`GODADDY_API_KEY`
- **App internal**：`VENTURO_AIERP_JWT_SECRET`、`VENTURO_AIERP_CRON_SECRET`、`VENTURO_AIERP_QUICK_LOGIN_SECRET`、`VENTURO_AIERP_BOT_API_SECRET`、`VENTURO_AIERP_AMADEUS_KEY`、`PLATFORM_WORKSPACE_ID`、`NEXT_PUBLIC_PLATFORM_WORKSPACE_ID`

### 卡住怎辦

❌ 不准：

- 試 A → B → C → D 連續燒 token
- hack workaround：`--no-verify`、跳 type-check、`as any` 騙過
- mock / fake data 讓 build「看起來能跑」

✅ 要：

- 第一次失敗 → 停手
- 報告：`「X 連不上、訊息：Y、建議走 Z」`
- 等 William 拍板再動

---

## 五大方向（每次動手前審視）

開發任何功能、修任何 bug、只走這五個方向。其他都不重要。

### 1. 路由連結（路由 / HR / 租戶 三層對齊）

動到頁面 / 路由前、確認三個 layer 都對齊：

- **路由本身**（Next.js `app/` 目錄）— 員工看得到的「門牌」
- **HR 顆粒度**（`role_capabilities`、`module.tab.action` 三段式 code）— 每個員工有沒有「鑰匙」
- **租戶開通**（`workspace_features`、租戶有沒有買這個功能）— 這家分店有沒有買這項服務

少一條就會「點下去進不去」「沒權限的人看到了」「沒買的分店也看到」。

關鍵 SSOT：

- 路由守門：`src/components/guards/ModuleGuard.tsx`
- Capability 推導：`src/lib/permissions/capability-derivation.ts`
- API 守門：`src/lib/auth/require-capability.ts`

### 2. 修改程式時的影響分析

> 動 symbol（函數 / 類別 / 變數）前必跑影響分析。譬喻：動水管前先看完整管路圖、別只看牆面。

工具：GitNexus（程式碼影響分析）

```
gitnexus_impact({ target: "symbolName", direction: "upstream" })
gitnexus_context({ name: "symbolName" })
gitnexus_query({ query: "概念" })
```

⚠️ **索引狀態前置條件**：yizhan-erp 是新專案、GitNexus 索引可能 stale。**用之前先跑 `npx gitnexus analyze` 確認索引 fresh、或退而用 grep + Read 替代**。

- HIGH / CRITICAL 風險先報告 William、再決定動不動
- rename 用 `gitnexus_rename`、不要 find-and-replace
- commit 前跑 `gitnexus_detect_changes`

### 3. 介面 UI 架構

> 之後會整體重寫、本節暫不規範。先沿用既有：

- 列表用 `EnhancedTable` / `ListPageLayout`
- Dialog 必設 `level={1|2|3}`
- 莫蘭迪色系 `morandi-*`、不准用 Tailwind 預設色（`bg-blue-` 等）

### 4. RLS 資安

> RLS = 資料庫的「個人隱私柵欄」、每個人只能看自己該看的。

- RLS policy 用 `has_capability_for_workspace()`、**不准散刻 capability check**
- API route 守門：`require-capability` + RLS 雙保險（應用層 + DB 層）
- 動 RLS migration 前必跑 `tests/e2e/login-api.spec.ts`（避免 4/20 那種「動完所有人登不進來」事故）
- ⚠️ 詳見「技術紅線 A、C」

### 5. 資料讀取連線（含防連點）

- Client cache：SWR、`revalidateOnFocus: false`、`dedupingInterval: 5min`（5 分鐘內不重新查、節省 Supabase 查詢費）
- Layout context SSOT：`/api/auth/layout-context` 一次抓 user / employee / workspace / capabilities / features
- Hydration race：`useLayoutContext` 必須等 `_hasHydrated`、否則空 capabilities 會誤判 redirect /unauthorized
- 列表預設 20 筆、分頁固定 15 筆、不給「每頁筆數」選擇器
- 列表搜尋 server-side、跟 PostgREST query string 對齊
- **防連點**：所有「儲存 / 刪除 / 確認」按鈕必須 `disabled={loading}`、避免雙擊重複寫入
- 寫入失敗時 client state 還原 + toast、不要靜默失敗

---

## 6 層架構（每張表必過、blueprint 簡版）

> 新表必過 SOP 見 `workspace/_meta/architecture/2026-05-13-建表-SOP.md`。

**白話**：SaaS ERP 每個請求要過 6 道門。過去 bug 都來自「過去寫的人沒看完整 6 道門、有的只蓋了 2-3 道」。

| Layer                    | 守的事                         | 譬喻                                     | 技術                                                      |
| ------------------------ | ------------------------------ | ---------------------------------------- | --------------------------------------------------------- |
| **L1 租戶 Feature Gate** | 這家公司有沒有買這個功能       | 客戶有沒有買「會計」這層樓的鑰匙         | `workspace_features`                                      |
| **L2 角色 Capability**   | 這個員工有沒有這個能力         | 員工識別證有沒有刷「進部門」的權限       | `role_capabilities` + `requireCapability`                 |
| **L3 三維 Org Scope**    | 員工屬哪個品牌 / 分公司 / 部門 | 員工只進自己分公司、自己部門的房間       | `brands` / `branches` / `departments` + `scope_visible()` |
| **L4 狀態守門**          | 這筆資料現在能不能改           | 已付清的訂單上鎖、不能再開               | `is_row_editable()`                                       |
| **L5 DB RLS**            | 資料庫層的隱形柵欄             | 物品櫃的鎖、就算外面警衛失職、櫃子自己擋 | RLS policies（走 3 個 `setup_*_rls` procedure）           |
| **L6 防呆 / SSOT**       | 防連點 / 編號不撞 / 錯誤翻譯   | 收據上有防偽碼、不會雙開                 | `@/lib/codes` / `@/lib/db-error-translate` 等中央 module  |

**每張新表必過全 6 層、缺一道就有 bug 從那層漏出來。**

### 新表上線 SOP（簡版、完整見 SOP 卡）

```
Phase 0  資料屬性 ☐ 分類完（業務主/子/join/ref/系統/個人）

L1  Feature Gate    ☐ workspace_features 對齊 + ModuleGuard 守門 + features.ts
L2  Capability      ☐ capabilities.ts + module-tabs.ts（HR UI）+ requireCapability + seed
L3  三維 Scope      ☐ scope_visible 或標 N/A、不散刻 sales_id=me
L4  狀態守門        ☐ is_row_editable 或標 N/A、前端 hide/disable 對齊
L5  RLS             ☐ 走 setup_*_rls procedure、不 FORCE workspaces、不 0-policy
L6  防呆 SSOT       ☐ 編號走 @/lib/codes、錯誤走 dbErrorResponse、created_by FK → employees、
                       loading prop 傳齊、recordApiAuditContext call

Phase 2  5 SSOT     ☐ 路由 / capabilities / module-tabs / features / seed migration 全動
Phase 3  audit      ☐ npm run audit:rls 必綠 + type-check / lint 必綠
```

### 自動偵測（CI 擋 PR）

- **`npm run audit:rls`** — 6 層 production 偏離自動檢核、PR 跑、error 擋 merge
- 紅線違反例：workspaces FORCE / 散刻 sales_id=me / inline supabase.rpc / created_by FK 錯指 / `|| ''` 空字串 FK
- GitHub Actions：`.github/workflows/audit-rls.yml`（要 SUPABASE_DB_URL secret）
- 本地：Mac IPv6 不通自動降級為 code grep only、CI Linux 跑全套

---

## 中央 Module 索引（2026-05-13 抽象層完工、不准散刻）

> 任何新功能用到下列場景、強制走中央 module、不准 caller 自己 inline 寫 `supabase.rpc(...)` / `supabase.from(...).catch(error.message)`。

### 編號產生

- **`@/lib/codes.ts`** — 11 種編號 helper（員工 / 供應商 / 訂單 / 子科目 / 收款 / 請款 / 出納 / 傳票 / 報價 / 公司請款 / 團號）
- 都有 advisory lock 防競態、workspace scoped
- 新增編號類型流程：寫 RPC migration → 加進 codes.ts → 加進 types.ts Functions

### 錯誤翻譯

- **`@/lib/db-error-translate.ts`** — Postgres 錯誤碼翻中文業務語言
- 涵蓋 23505 / 23503 / 23502 / 23514 / 23P01 / 42501 / PGRST116
- API route catch 一律 `return new Response.../dbErrorResponse(err)`、**不准** `error.message` 直接 return

### RLS 規則

- **DB procedure：`setup_workspace_scoped_rls(table)`** — 標準 workspace 隔離
- **DB procedure：`setup_join_table_rls(table, employee_col)`** — 員工 join 表
- **DB procedure：`setup_inherited_rls(table, parent_table, parent_id_col)`** — 子表 inherit parent scope
- 新建 table 走這 3 個 procedure、**不准** 散刻 4 條 CREATE POLICY

### Loading state（連點防護）

- ESLint rule `venturo/form-dialog-loading-required` — 強制 `<FormDialog>` 必傳 `loading` prop
- 違反會 warning、不擋 build（漸進 migration）

### 資料讀取與 Cache 失效 SSOT（2026-05-17 William 拍板）

- **`src/data/core/createEntityHook.ts`** — 實體資料讀取工廠（`useList` / `useListSlim` / `useDetail` / `usePaginated` / `useDictionary`）
  - 各實體 export 從 `src/data/entities/*.ts`、統一由 `src/data/index.ts` re-export
  - 規則：頁面 / component 讀資料一律用 entity hook、**不准**直接 `useSWR`
- **`src/lib/swr/createReportHook.ts`** — 財務報表 hook 工廠（跨表 join / RPC view / 不走 entity 框架）
  - 共享工具：`agingBucket()` / `daysBetween()`
  - 可帶參數（`DateRange`）或無參數、支援 `swrOptions` 覆蓋（如 `dedupingInterval`）
  - 適用：應收 / 應付 / 業績排行 / 銀行餘額 / 未結團
- **`src/lib/swr/api-mutate.ts`** — 寫入 + SWR cache 失效 SSOT
  - 支援：`body` / `formData`（multipart）/ `blob`（檔案下載）/ `successFlag` / `optimistic`
  - 規則：任何寫操作完成後必走 `apiMutate` + `invalidate`、**不准**散刻 `mutate(key)` 字串
- **`src/lib/swr/config.ts`** — per-user cache key SSOT
  - `getCurrentCacheKey()` + `clearAllSwrCacheKeys()`（登入 + 登出雙觸發）

### 測試套件位置

- `tests/concurrency/` — 並發撞號測試（4 種編號 RPC）
- `tests/e2e/cross-tenant.spec.ts` — 跨租戶滲透測試
- `tests/cross-tenant.README.md` — 怎麼跑

### audit context

- `recordApiAuditContext(client, { actorId, reason })` — 所有寫操作 API route 都該 call
- 已套用 ~30 route、剩餘漸進清

### audit script（自動偵測偏離 blueprint）

- **`npm run audit:rls`** — `scripts/audit-rls-blueprint.ts`、6 層自動檢核
- **`npm run audit:writes`** — `scripts/audit-write-paths.ts`、抓「DB trigger + API 同表 INSERT」雙寫撞車（2026-05-17 加、解 onboarding trigger × API 撞 unique 那次教訓）
- **`npm run audit:orphans`** — `scripts/audit-auth-orphans.ts`、抓 `auth.users` 沒對應 `employees` row 的孤兒（多步 create rollback 漏清會累積、撞下次同 email 註冊）。加 `-- --clean` 互動式清。需 `source ~/.config/venturo/secrets.env`
- **`npm run audit:realtime`** — `scripts/audit-realtime.ts`、偵測 entity hook 訂閱但 Supabase publication 沒有的 table（realtime 靜默失效）。code grep only 不需 DB；加 `-- --db` 旗標才做 publication 比對。
- 走 psql + `SUPABASE_DB_URL`（不用 PAT）、Mac IPv6 不通自動降級為 code grep only
- CI：`.github/workflows/audit-rls.yml`、PR 自動跑、error 擋 merge、要 `SUPABASE_DB_URL` secret
- 動表 / 動 RLS / 動中央 module 前必跑、新表上線前必綠

---

## 技術紅線（不是業務、是技術正確性、違反會炸）

> 這四條跟「保護資料」無關（那種紅線已經拿掉、新專案沒舊資料）、是「打破登入 / 寫入失敗 / 跨租戶污染 / 概念污染」的技術正確性。

### 0. 系統內沒有「超級管理員」（William 2026-05-10 拍板）

**白話**：所有 workspace 完全平等、沒有任何 user / role 在 code 層擁有「越過 RLS / 越過 features gate」的特權。

- ❌ 不准在 code 寫 `if (isAdmin) { /* 跳過權限 */ }` 這種 user-level 特權判斷
- ❌ 不准在 code 寫 `requireCapability('platform.is_admin')` 之類「萬能 capability」（已廢、別再加回來）
- ❌ 不准 hardcode「漫途 workspace 例外」這種寫死的特權邏輯
- ✅ **唯一的訪問控制路徑**：`workspace_features`（workspace 有沒有開這 feature） + `role_capabilities`（user 有沒有這個具體 capability）+ RLS（DB 層守門）
- ✅ 跨 workspace 能力（如「租戶管理」）走 `workspace_features` 控制：漫途的 workspace 開了 `tenants` feature → 漫途有對應 capability 的 role 能用、別的客戶沒開就看不到、跟一般 feature 一模一樣
- ✅ 「漫途碰巧能管所有 workspace」這件事、由「初始 seed migration 建漫途 workspace + 開 tenants feature + William 在裡面」自然形成（雞生蛋邏輯）、不是 code hardcode

**已廢但 code 留過渡保護的東西**：

- `platform.is_admin` capability — code 層所有引用 2026-05-10 已砍光、DB 重建前不刪 row（避免 PUT roles capabilities 誤刪殘留 row）
- `is_super_admin()` PostgreSQL function — DB 重建時砍、現在不動（DB 是空的、改動風險大於收益）
- `workspaces.type` 欄位（platform_owner / agency 之分）— code 層完全不再 reference（已砍 api/workspaces / auth-store / validate-login / user.types 所有引用）。DB 欄位重建那輪砍。「平台方 vs 租戶方」這個概念在 code 層不存在

**Phase 2（DB 重建必做）**：

- 砍 `is_super_admin()` function
- 所有 RLS policy 改寫吃 `has_capability_for_workspace(...)` + features 檢查、不再用 `OR is_super_admin()` 繞道
- DB 砍 `platform.is_admin` capability row

#### 0.1 文檔 / commit message / chat 用詞紀律（2026-05-13 William 拍板）

> Logan 多次在 commit message / Tg 寫「admin only」「admin 限定」「admin 可配置」、William 抓 3 次。
> 違反紅線 #0 的精神（mind set 錯亂、會 leak 進 code 設計）、立紀律。

**❌ 不准用的詞**：

- `admin only` / `admin 限定` / `admin 可配置` / `僅 admin`
- `manager only` / `super user` / `power user`
- 任何暗示「某種 user 天生有特權」的詞

**✅ 正確說法**：

- ❌「admin 可配置」→ ✅「**有 `hr.roles.write` capability 的員工可配置**」
- ❌「admin only 操作」→ ✅「**需 X capability 的操作**」
- ❌「給 admin 看的頁面」→ ✅「**給有 Y capability 的員工看的頁面**」
- ❌「老闆 / 主管能做」→ ✅「**有 Z capability 的 role 能做**」

**例外（保留為技術名詞、不是業務角色）**：

- `admin client` / `getSupabaseAdminClient()` — 指 service_role client、是技術名詞
- 文件談 4/20 事故講「系統管理員」歷史脈絡 — 是過去描述

**為什麼這條重要**：

- 用詞會 leak 進 code 設計（譬如「admin 限定」會變成 `if (isAdmin)` 短路）
- 整套架構是「**權限抽象層**」（role → capability → workspace_features）、不該回退到「角色名單」
- 客戶買 SaaS、他們公司的角色可能跟漫途完全不同（沒有「業務」「會計」、可能叫「sales」「accountant」）、用「admin / manager」鎖死想像力

**Logan 自我校準**：寫 commit / Tg 時、看到 admin 兩個字、停下來重寫。

### A. workspaces 表絕不能 FORCE RLS

**白話**：RLS 是「個人隱私柵欄」、FORCE 是強化版（連系統管理員都被擋）。但是登入流程要用系統管理員身分查 workspace 資料、被擋 = 全員登入失敗。

- `workspaces` RLS 可以 ENABLE、但**永遠 NO FORCE**
- 動 RLS policy 的 migration、apply 前必先跑 `tests/e2e/login-api.spec.ts`
- 歷史 fix：`20260420d_fix_workspaces_force_rls.sql`（4/20 出過事故）

### B. 審計欄位 FK 必指 `employees(id)`、不是 `auth.users(id)`

**白話**：紀錄「誰建這筆」要寫員工編號（E001）、不是 Supabase 帳號編號（uuid）。前端拿到的是員工編號、FK 設錯就 insert 失敗。

- `created_by` / `updated_by` / `performed_by` / `uploaded_by` / `locked_by` / `last_unlocked_by` / `deleted_by` → `REFERENCES public.employees(id) ON DELETE SET NULL`
- 例外（合規、可指 `auth.users`）：`user_id` / `sender_id` / `friend_id`（這些 row 本身就是 Supabase 用戶、不是員工操作紀錄）
- 前端寫入：`created_by: currentUser?.id || undefined`（**不是 `|| ''`**、空字串會炸）

### C. Admin client 必 per-request、不准 singleton

**白話**：Admin client 是「系統管理員萬能鑰匙」（`service_role`、繞過 RLS）。每次借用後必鎖回保險箱、不准放外面共用、否則跨 request 會殘留前一個 request 的 context、導致**跨工作區資料洩漏**。

- `src/lib/supabase/admin.ts` 必須**每個 request 重新建立**
- 不准 export 一個全局 admin variable
- 函數命名：`getSupabaseAdminClient()`、每次 call 都新建

### D. 不准開「作弊後門」（William 2026-05-13 拍板）

**白話**：月結 / 結團 / 任何「已封存」狀態的紀錄、**過了就是過了、要改要走補正交易**。code 出現任何「回頭塗改」的後門 = 紅線違反。

這對應的是會計準則本身（GAAP / IFRS）的「**前期損益調整**」原則 — 跨期事項一律做在當期、不能回頭改舊資料。

**不准做的事**：

- ❌ 月結後該期間能解鎖（不管是 admin / 平台管理 / 任何 capability）
- ❌ 結團後能重開團（沒有 `reopenTour` / `unlockTour` API）
- ❌ 已確認的傳票能改數字（只能開沖正傳票）
- ❌ 任何 `forceUnlock` / `adminOverride` / `bypassPeriodLock` / `reopenClosedXxx` 命名的函式

**正確做法**：

- ✅ 月結後發現前期錯 → 在當月開「**沖正交易**」（一筆負金額抵錯的 + 一筆正金額補對的）
- ✅ 結團後發現錯 → 在當期 / 下期開新交易補正、不動原團
- ✅ 跨團調整走「**對沖**」（用 `transferred_pair_id` 雙負雙正、不改原紀錄）
- ✅ 傳票寫錯 → 開「**沖正傳票**」(reverse voucher) 抵銷、原傳票留著當證據

**業務語意（給 William 看的、不是技術術語）**：

- 「月結了就是月結了、改的話要在下個月做」
- 「結團了就是結團了、要改的話放到下個月、做下個月的帳」
- 「能解鎖 = 公司在作弊、稅務 / 審計都會炸」

**code 層偵測**：

- 任何 function name 含 `unlock` / `reopen` / `override` 關於 closed 狀態的、PR review 必擋
- API route 寫入 receipts / payment_requests / disbursement / journal_vouchers 時、必 check 不在 closed period / closed tour、否則 reject

**為什麼這條重要**：

- 給 SaaS 客戶用：員工想竄改數字（業務員藏私房錢、會計幫老闆做兩本帳）、系統必須擋
- 給漫途自己用：審計 / 報稅時、不准有「上個月某張單我改過」的紀錄
- Sales pitch 賣點：「venturo 結帳後自動鎖、防員工竄改」是強項

### E. 加新 DB trigger / 新 API 寫入前必查同表寫入清單（William 2026-05-17 拍板）

**白話**：同一張表的寫入邏輯**只能放一個地方**、不准 DB trigger 跟 API code 各做一份。
過去踩過：5/14 加的 `trg_workspaces_onboarding_seed` trigger 跟 5/10 寫的 `createDimensions()` API 各建一份 `branches('HQ')`、撞 `branches_workspace_code_unique` → 自 5/14 起無人能成功建租戶。

**為什麼這條重要**：

- 寫 trigger 的人通常不會去翻 API code、寫 API 的人也不會去翻 migration、兩條路各做各的、撞號才知道
- 不只 unique 撞、UPDATE 雙寫會 race condition、刪除互相清也會孤兒
- 跟「沒看完整 6 道門」是同一個病根：**SSOT 散在多處 = 將來必撞**

**動之前必跑**：

```bash
npm run audit:writes     # 列出每張表的 trigger + API 寫入清單、有雙寫就 warn
```

**動之中要選邊**：
| 場景 | 該選誰當 SSOT |
|---|---|
| onboarding seed（建租戶配套） | **API**（彈性、可吃 user 輸入） |
| 純技術 housekeeping（時戳 / audit log） | **Trigger**（不可能漏） |
| 編號產生 / 級聯狀態（已封存判定）| **DB function**（advisory lock / 競態保護）|
| 業務寫入（會計分錄 / 訂單）| **API**（中央化權限檢查 + audit context）|

**例外（合理雙寫、需 review）**：

- `channel_members` — RPC `get_or_create_dm_channel` 建 DM、API `/channels/dm/route.ts` 另加成員（intentional dual-write）
- `journal_lines` — trigger 自動分錄 + API 手動分錄（intentional dual-write）
- 加進 `scripts/audit-write-paths.ts` 的 `ALLOWLIST`、留 comment 寫清楚為什麼

**code 層偵測**：

- `npm run audit:writes` 加進 commit / PR 前必跑清單（跟 `audit:rls` 並列）
- 任何加 `CREATE TRIGGER ... INSERT INTO X` 的 PR、必對照 `src/app/api/**` 有沒有也寫 X
- 任何加 `.from('X').insert` 的 PR、必對照 `supabase/migrations/*.sql` 有沒有 trigger 也寫 X

### F. Client 端資料讀取走 entity hook、cache 失效走 apiMutate（William 2026-05-17 拍板）

**白話**：讀資料只走 `createEntityHook` 產生的 hook、寫入後只走 `apiMutate` 讓 SWR 失效。這是紅線 E（DB 層寫入 SSOT）的 client 端版本：**client 端的讀取 + cache 失效也只能有一個真相**。

- ❌ 不准在頁面 / component 直接 `useSWR(key, fetcher)` — 用 entity hook 代替
- ❌ 不准寫入後只 `setXxx(newData)` local state 而不讓 SWR 知道 — client state 跟實際資料不同步
- ❌ 不准寫入後手動散刻 `mutate('某個 key 字串')` — SWR key 結構改動後散刻全靜默失效
- ✅ 讀資料：`const { data } = useXxx()` — 走 `createEntityHook` 產出的 hook
- ✅ 寫入後讓 cache 失效：`await apiMutate.xxx(payload)` — 由 `apiMutate` 統一處理 key + optimistic update
- ✅ Realtime 訂閱走 entity hook 內建的 `useRealtimeSync()`、不自己 `supabase.channel()` 散刻

**關鍵 SSOT**：

- 讀取（實體資料）SSOT：`src/data/core/createEntityHook.ts` 的 `createEntityHook` family；再由 `src/data/entities/*.ts` 各實體 export
- 讀取（財務報表）SSOT：`src/lib/swr/createReportHook.ts` 的 `createReportHook`；適用跨表 join / RPC view、不走 entity 框架
- 寫入 + cache 失效 SSOT：`src/lib/swr/api-mutate.ts` 的 `apiMutate`

**為什麼這條重要**：

- `createEntityHook` 統一了 key、TTL、realtime、optimistic update — 散刻等於繞過整套機制
- Realtime 通知到了但 hook 沒訂閱 → 用戶看到 5 分鐘前的舊資料
- SWR key 命名改版 → 散刻的 `mutate(key)` 靜默失效、看不出來（5/17 批次改造的原因）

**code 層偵測（Phase 3 待做）**：

- ESLint rule `venturo/no-direct-useswr-in-pages` — 頁面直接 `useSWR` 報 error
- ESLint rule `venturo/require-api-mutate-for-mutations` — 寫入後沒走 `apiMutate` 報 warning
- `npm run audit:realtime` — 偵測 entity hook vs Supabase publication 差集

### G. per-user SWR cache key 防跨帳號污染（William 2026-05-17 抓出）

**白話**：SWR localStorage cache key 必須帶 user_id 後綴、不同帳號各自 namespace。A 帳號的快取不能讓 B 帳號讀到。

- ❌ 固定 key `venturo-swr-cache-v2`（無 user_id）— A 不登出 B 接手同台電腦、5 分鐘內 hit cache → B 看到 A workspace 資料（資安洞、RLS 完全擋不住）
- ✅ key 帶 `user_id` 前 12 碼後綴：`venturo-swr-cache-v2-{userId_prefix}`（見 `src/lib/swr/config.ts` `getCurrentCacheKey()`）
- ✅ 登入時：`clearAllSwrCacheKeys()`（掃 prefix 全清）→ 再建新 session — 防前一 user 沒明確登出的 cache 殘留
- ✅ 登出時：`clearAllSwrCacheKeys()` 全清 — 防 key 命名改版後、舊 key 孤兒

**SSOT**：`src/lib/swr/config.ts` — `getCurrentCacheKey()` + `CACHE_STORAGE_KEY_PREFIX` + `clearAllSwrCacheKeys()`

**為什麼這條重要**：

- 5/17 William 實際復現：A 登入、B 接手同台電腦、B 在 `/dashboard` 看到 A 的客戶資料（沒有 API 呼叫、純 localStorage 快取）
- RLS 守 DB 層、SWR localStorage cache 在 browser 跑、完全繞過 RLS → 此洞 RLS 擋不住
- SaaS 多租戶場景：共用電腦（前台、學校機房）→ 此洞嚴重

**code 層偵測**：

- 改動 `CACHE_KEY` / `CACHE_VERSION` 前必同步改 `CACHE_STORAGE_KEY_PREFIX`、確保 `clearAllSwrCacheKeys()` 掃到新 prefix
- 升版（v2 → v3）時要讓舊 prefix 的 key 孤兒化：在登入 / 登出時多掃一次舊 prefix

### H. 每張業務表 RLS 必過 workspace_id 守門（William 2026-05-21 拍板）

**白話**：所有業務資料表的 RLS policy 必須過 `workspace_id = get_current_user_workspace()` 過濾、不准用 `auth.role() = 'authenticated'` 充當隔離。

過去 9 條紅線沒明確涵蓋這條基本守則、結果 `expense_categories` 表（早期建的）一直用粗略 RLS、API 還從 client query string 吃 workspace_id → **任何登入者可讀寫任何 workspace 的請款類別**（2026-05-21 抓出）。

**不准做的事**：

- ❌ RLS policy 寫 `using (auth.role() = 'authenticated')` 當隔離（這只擋未登入、不擋跨 workspace）
- ❌ API 從 client `searchParams.get('workspace_id')` / `body.workspace_id` 取值、信 client
- ❌ INSERT policy `with check (true)`（任何登入者可寫任意 workspace_id）

**正確做法**：

- ✅ RLS policy USING：`workspace_id = get_current_user_workspace()`（業務表）或走 3 個 `setup_*_rls` procedure
- ✅ INSERT policy WITH CHECK：`workspace_id = get_current_user_workspace()`
- ✅ API 從 session 取 workspace_id：`const workspaceId = await getCurrentWorkspaceId()`
- ✅ 寫入用 supabase 參數化、不字串拼接 `'.eq.${value}'`（防 SQL injection）

**例外**（合理）：

- 全域 master 表（`ref_banks` / `ref_countries` / `ref_airports`）— 無 workspace_id 欄位、所有租戶共用
- 共享資料表（`attractions` / `hotels` / `restaurants`）— 跨租戶可見、走 `setup_shared_data_rls`

**code 層偵測**：

```bash
# 抓粗略 RLS（auth.role() 當隔離）
npm run audit:rls
# 抓 INSERT policy with check = true
mcp__supabase__execute_sql: "SELECT c.relname, pol.polname FROM pg_policy pol JOIN pg_class c ON c.oid = pol.polrelid WHERE pg_get_expr(pol.polwithcheck, pol.polrelid) = 'true' AND c.relkind = 'r'"
```

**為什麼這條重要**：

- 紅線 0/A/F/G 各自守不同層、沒一條明說「業務表 RLS 必過 workspace」基本守則
- 這條 catch 的是「早期建的表、API 跟 RLS 都還沒對齊紅線」的 grandfather 漏網
- 第一個被抓的：`expense_categories`（2026-05-21）
- 未來 5 維度矩陣涵蓋每張業務表、會自動 catch 這類

---

## 開發品管 8 維度（每次動手前對照 checklist、5/12 William 拍板）

> 動任何功能 / 修任何 bug 前、對照這 8 維度。少一條都會出事。

### 1. 公司的概念（VENTURO 為核心、不天馬行空）

- 英文一律 **VENTURO**、不准 MANTU / Mantu / mantu-\* 變體
- 設計扣回 ERP 業務流程、不要照搬 Slack / Notion / 各家 SaaS 全部功能
- 業務面思考優先：先問「對員工 / 客戶 / 老闆有什麼價值」、再問「技術怎麼做」
- 不天馬行空：v1 留 schema 欄位、UI 第一版做最關鍵 1-2 個入口、其他 v2 補

### 2. 開發品管概念（commit / PR 前必跑）

- `npm run type-check` 通過、無 type error
- `npm run lint` 通過、無新增 `console.log`
- `./scripts/check-standards.sh --strict` 通過
- 動完 schema → 更新 type → UI 對齊 → 全套 type check
- ❌ 不准 `as any` / `: any` 蓋 type error、要 fix root cause
- ❌ 不准 `--no-verify` 跳 hook、要查為什麼擋
- 動 RLS migration → 跑 `tests/e2e/login-api.spec.ts`（4/20 那種「全員登不進去」事故避開）
- 大改動完一輪 → 自己 audit（grep 對 spec 拍板項、確認沒漏）、不要等 William 抓

### 3. 安全（資安第一）

對齊「優先順位 #1」+「技術紅線 A」、動手前確認：

- 動 RLS：誰能看、誰能改、跨 workspace 漏不漏（`workspace_id = get_current_user_workspace()`）
- user input 在 API 層先驗證、不靠 RLS 當最後一道
- secret 走 `~/.config/venturo/secrets.env`、不寫死、不放 git
- SQL 用 parameterized query、不字串拼接（防 SQL injection）
- service_role admin client per-request 新建、不能 singleton（紅線 C）

### 4. 資料（schema / FK / 對齊）

對齊「技術紅線 B」：

- 審計欄位（created_by / updated_by / etc）FK 指 `employees(id)`、不是 `auth.users(id)`
- 例外：`user_id` / `sender_id`（這幾欄本來就是 Supabase 帳號）
- 寫入時 `created_by: currentUser?.id || undefined`、**不要** `|| ''`（空字串會炸）
- 軟刪走 `deleted_at`、不真 DELETE
- composite PK 影響 entity hook → 加 surrogate `id uuid PK` + 對 composite 加 UNIQUE
- schema 改先寫 migration 草稿到 `migrations-pending/`、William review 後才 apply

### 5. 效能（資料讀取 / 列表 / 連線）

對齊「優先順位 #2」+「五大方向 5」：

- 列表預設 20 筆、分頁 15 筆、**不**給「每頁筆數」選擇器
- SWR `revalidateOnFocus: false`、`dedupingInterval: 5min`
- entity hook 走 server-side filter（`filter: { tour_id: x }`）、不全撈再前端 filter（egress 殺手）
- 訊息列表 scroll up infinite load、不一次撈全部
- Realtime 走 `createEntityHook` 內建 `useRealtimeSync()`、不自己重寫
- 防連點：所有「儲存 / 刪除 / 確認」按鈕 `disabled={loading}`
- Layout context SSOT：`useLayoutContext`（一次抓 capabilities + features）、不每頁 query

### 6. 組建優化（bundle / load 時間）

- 大型 library（jsPDF / xlsx > 100KB）動態 import（`await import('@/lib/...')`）
- 頁面用 `dynamic(() => import('...'), { ssr: false })` 切 client-only chunk
- 圖片走 `next/image`、自動 webp / 多 size
- icon 從 lucide-react 個別 import、不要 `import *`
- Tailwind 自動 purge、不亂寫 safelist
- Sentry sample rate 設低（0.1 / 0.01）、production 不要 1.0 燒錢
- Next.js route 預設 server component、需要互動才加 `'use client'`

### 7. 抽象層（不過度抽象、不寫 framework）

- **三個重複才抽**：兩個一樣的、複製貼上；第三個出現再抽 function / component
- 不寫「未來可能用到」的 generic helper、現在不用就刪
- 抽象層厚度：撞牆能不能 escape？厚 → 鎖死、薄 → 能逃
  - 厚（Wasp / 高階 ORM）→ 撞牆難 escape、debug 沒救
  - 薄（Drizzle / Supabase RPC / Next.js raw API）→ Claude 寫得穩
- 不寫 framework / DSL / 配置語言、直接寫 code
- Repository pattern / Service layer 等 enterprise 抽象、yizhan-erp 不適用
- 已存在的抽象（`createEntityHook` / `ContentPageLayout` / `FormDialog`）走得通就用

### 8. 租戶 / HR / 路由 對齊（新功能必跑 5 個 SSOT、缺一個就壞）

> 對齊「五大方向 1」。Channels 系統 5/12 踩過「以為 3 個 SSOT、實際 5 個」的坑、列完整 checklist。

**每加一個新功能、5 個 SSOT 全部都要動**：

| #   | SSOT 檔案 / 表                        | 用途                                                      | 缺了會怎樣                                                     |
| --- | ------------------------------------- | --------------------------------------------------------- | -------------------------------------------------------------- |
| 1   | `src/app/(main)/xxx/`                 | 路由本身（門牌）                                          | 點下去 404                                                     |
| 2   | `src/lib/permissions/capabilities.ts` | capability 常數（給 code reference 用）                   | 寫 `CAPABILITIES.XXX` 報錯                                     |
| 3   | `src/lib/permissions/module-tabs.ts`  | **HR UI 列出可勾項目的 SSOT**                             | **HR /hr/roles 頁面看不到此 module、admin 沒地方勾權限給員工** |
| 4   | `src/lib/permissions/features.ts`     | 租戶 feature 常數 + sidebar `requiredPermission` 對齊     | sidebar 不顯示 menu                                            |
| 5   | seed migration                        | DB 層自動啟用：`workspace_features` + `role_capabilities` | user 看到 menu 但沒權限、或租戶沒開通                          |

**新功能 seed migration 必含**：

- `workspace_features` 為現存 workspace 預設啟用（`INSERT ... ON CONFLICT DO UPDATE SET enabled = true`）
- `role_capabilities` 預設給適當 role 開該功能 capability
- ❌ **不留**「user 自己去 /workspaces / /hr/roles 開通才能用」的隱性步驟

**自我 audit 必跑**（commit 前）：

```bash
# 確認 5 個 SSOT 都動了
grep -n "新功能 code" src/lib/permissions/capabilities.ts        # 2
grep -n "code: '新功能 code'" src/lib/permissions/module-tabs.ts # 3 ← 5/12 踩這坑
grep -n "code: '新功能 code'" src/lib/permissions/features.ts    # 4
grep -n "workspace_features\|role_capabilities" supabase/migrations*/*新功能*.sql # 5
```

連續錯誤模式（不要再犯）：

- ❌ 5/12 Channel：做了 1/2/4/5、漏了 3 → admin 在 HR 頁找不到 channels 可勾
- ❌ 自我 audit 只 grep `features.ts` / `capabilities.ts`、沒對照 HR UI 怎麼長清單
- ❌ 自己寫的鐵律當天就破、commit 前沒對照 checklist

---

## 健檢框架 5 維度（2026-05-20 加、每個 module 都該對齊）

> 「8 維度」是**動手前** checklist（per-feature）。「5 維度」是**回頭審視**框架（per-module health check）。
> 兩者並行：寫新功能對 8 維度、做 audit 看 5 維度。

### 5 維度定義

| 維度         | 評估什麼                                                            | 報告檔                                   |
| ------------ | ------------------------------------------------------------------- | ---------------------------------------- |
| **讀取效能** | 每頁讀資料走 entity hook？有無散刻 useSWR / 直接 supabase.from？    | `workspace/健檢/reports/效能層面健檢.md` |
| **資安**     | 紅線 0-G 守了？特別查 created_by FK / closed period / SWR cache key | `workspace/健檢/reports/資安層面健檢.md` |
| **架構**     | 6 層架構過全？L1-L6 各層對齊？                                      | `workspace/健檢/reports/架構層面健檢.md` |
| **開發品管** | 測試覆蓋？lint suppress？type 完整？                                | `workspace/健檢/reports/開發品管健檢.md` |
| **清理**     | unused exports？dead code？已廢 module 殘留？                       | `workspace/健檢/reports/清理層面健檢.md` |

### 滿分 5/5 紀律（William 拍板）

每個 module 都要追 5/5、沒滿分等於沒進步。
27 個 module × 5 維度 = 135 個判決、目標全綠。

矩陣現況：`workspace/健檢/reports/26-modules-x-5-dimensions-matrix.md`
每 module 升 5/5 計劃：`workspace/健檢/pending/upgrades/{module}-to-5of5.md`

### Ratchet baseline 機制（已落地）

- 凍結 145 個 baseline 違規（127 supabase-writes + 18 useswr）
- `npm run lint` 用 `.eslint-suppressions.json` 過濾、新違規 → CI 擋
- `npm run lint:swr-prune` 自動清已修好的
- 詳：`workspace/健檢/decided/ratchet-baseline.md`

### 夜間自動健檢（launchd）

- 00:00 daily：git pull main（com.venturo.yizhan-erp-autopull）
- 00:10 daily：跑 9 個 audit、產報告到桌面（com.venturo.yizhan-erp-nightly-audit）
- 報告位置：`~/Desktop/yizhan-erp-nightly-{日期}.md`
- 設定檔：`~/Library/LaunchAgents/com.venturo.*.plist`

### 收工複盤紀律（cleanup pollution sources）

任何 audit 跑完、發現錯誤判斷 → 回頭把污染源清掉：

1. 加 ✏️ 修正註記到原 audit 報告（保留 audit trail）
2. 過期清單 / drift 條目從清單刪
3. 不留誤導下個工程師的訊息

詳：`~/.claude/CLAUDE.md` § 收工複盤紀律。

### 已凍 / 半成品 module（不算 active）

- `travel_invoice`：2026-05-20 凍住、DB+entity 保留、Phase 2（8 月後）補 UI/API
- `office`：routes:[]、待 William 拍板凍或補完

凍住 pattern：comment out `_registry.ts` 的 import + ALL_MODULES、跑 `codegen:permissions`、不 rm 檔（鐵律 #8）。

---

## UI 紀律紅線（2026-05-23 William 拍板）

**所有新 UI 必比照公司 venturo CIS、不准用 Tailwind 預設色**。

### ❌ 禁用

- `bg-red-*` / `bg-green-*` / `bg-blue-*` / `bg-yellow-*` / `bg-purple-*` 等 Tailwind 預設色
- `text-red-{50..900}` / `text-green-{50..900}` / `text-blue-{50..900}` 等預設色
- `border-red-200` / `border-green-200` 等預設色 border
- 永豐 / 第三方品牌色（譬如 EPOS 紅 `bg-red-600`）— 即使是品牌色、要走 venturo 主色 `morandi-gold`

### ✅ 強制走 design token

| 用途        | Token                                                                    | 範例                |
| ----------- | ------------------------------------------------------------------------ | ------------------- |
| 主品牌色    | `morandi-gold` / `morandi-gold-hover` / `morandi-gold-light`             | 主要按鈕、強調區塊  |
| 次品牌色    | `morandi-primary` / `morandi-secondary` / `morandi-muted`                | 文字                |
| 中性 / 背景 | `morandi-container` / `morandi-cream` / `bg-card` / `bg-background`      | 卡片 / 區塊         |
| **成功**    | `text-status-success` / `bg-status-success-bg`                           | 付款成功 / 審核通過 |
| **危險**    | `text-status-danger` / `bg-status-danger-bg` / `border-status-danger/30` | 錯誤 / 拒絕 / 退款  |
| **警告**    | `text-status-warning` / `bg-status-warning-bg`                           | 過期 / 待補資料     |
| **資訊**    | `text-status-info` / `bg-status-info-bg`                                 | 一般提示            |

Token 定義：`src/styles/tokens.css`（不要散刻、改 token 自動影響全站）。

### Status badge 對應

舊 code 散落 status 寫法 → 改成 design token：

- 成功 `bg-green-50/100 text-green-600/700` → `bg-status-success-bg text-status-success`
- 危險 `bg-red-50 text-red-600/700` → `bg-status-danger-bg text-status-danger`
- 資訊 `bg-blue-50/100 text-blue-700` → `bg-status-info-bg text-status-info`
- 警告 `bg-yellow-* text-yellow-*` → `bg-status-warning-bg text-status-warning`
- 未讀紅點 `bg-red-500` → `bg-status-danger`

### Channel badge **例外**（保留品牌色、不算硬編碼）

W 拍板 2026-05-23：社群通訊軟體的品牌色是用戶熟悉的辨識色、屬於「**識別色**」不是「**狀態色**」、保留：

- LINE badge：`bg-green-100 text-green-700`（綠）
- FB badge：`bg-blue-100 text-blue-700`（藍）
- IG badge：`bg-pink-100 text-pink-700`（粉）
- 未來新 channel（WhatsApp / Telegram / Discord）也走自己品牌色

⚠️ 例外**僅限**社群 / 通訊產品 channel badge、其他「品牌色借當主色」（譬如永豐紅當付款頁主色）仍違規。

### audit / 偵測

加進 `scripts/check-standards.sh`（未來）：grep `bg-(red|green|blue|yellow|purple)-` / `text-(red|green|blue|yellow|purple)-[0-9]` 散落、commit 前擋。

### 違反成本

跟 type error 同級、commit 前自己 audit、不准 PR 帶這種變動上 main。

譬喻：每件衣服都要送公司 CIS 部門過審、不是隨便買花襯衫穿來上班。

---

## Build / Commit 規則

```bash
npm run type-check    # commit 前必過
npm run lint          # 不能新增 console.log
npm run audit:rls     # 動表 / 動 RLS / 動中央 module 必過（CI 也跑）
./scripts/check-standards.sh --strict   # 憲法守門
```

- ❌ **NEVER** `--no-verify` / `--no-gpg-sign` 跳過 hook
- ❌ **NEVER** 新增 `as any` / `: any`
- ❌ **NEVER** push 有 type error 的程式碼
- 不要 amend 已 push 的 commit、永遠新增 commit
- commit 不准 William 沒明說就做（協作紀律、不是技術問題）

### 多 session 共用工作區紀律（2026-05-26 William 拍板）

**白話**：4 隻 bot（Alex / Max / Logan / Robin）+ William 直連 session **共用同一個工作目錄** `~/Projects/yizhan-erp`。git 的暫存區（index）跟工作區是**共用的**——誰一個 `git add .` 就會把別人沒做完的活也掃進自己的 commit。

譬喻：4 個師傅同一張工作檯做不同的活、誰伸手「全部收進箱子」就把別人的料也收走了。

- ❌ **NEVER** `git add .` / `git add -A` / `git add -u`（全量 staging、會掃到別人的活）
- ❌ **NEVER** `git commit -a`（同理、跳過 staging 直接全量）
- ✅ **永遠列明確檔名**：`git add path/to/file1.ts path/to/file2.ts`（只加自己這次 session 動過的檔）
- ✅ commit 前先 `git status --short` 確認：第一欄綠（staged）的**只有**自己的檔、別人的改動留第二欄紅（working tree、不進我的 commit）
- ✅ 自己這次動了哪些檔自己要清楚（從 Edit/Write 紀錄回推）、不確定就只加有把握的、寧可漏不可多
- ⚠️ 切 branch（`git checkout -b`）會切換**整個共用目錄**、別的 session 會跟著被切到你的 branch → 切 branch 前先確認沒人正在 commit、commit 完盡快切回 main（或 William 拍板上 worktree 隔離後就無此問題）

> 物理根治方案（worktree 隔離、各 bot 一個獨立目錄）待 William 拍板；在那之前、上面紀律是底線。

---

## Migration SOP（2026-05-13 黒羽 + William 拍板）

**核心紀律：本地寫檔 → git commit → MCP `apply_migration` apply 到 production**。
不可在 Supabase Studio SQL editor 直接跑 DDL 而不留檔 — 會造成 code repo 跟 production 漂移、未來人 git pull 不知道 schema 真實狀況。

### 標準流程

1. **寫**：`supabase/migrations/YYYYMMDDHHMMSS_<purpose>.sql`
   - 命名：時間戳排序（避免 ordering 衝突）
   - 內容：標頭註解寫「為什麼」（不只是「做什麼」）、加 `BEGIN; ... COMMIT;` 包圍
   - 用 `IF EXISTS` / `IF NOT EXISTS` / `ON CONFLICT` 讓 idempotent、可重跑

2. **驗證 SQL 語法**（不 apply）：

   ```bash
   # local dry-run
   cat supabase/migrations/XXX.sql | psql --variable=ON_ERROR_STOP=1 --dry-run  # 如果支援
   ```

3. **Commit**：先 git add migration 檔 + 相關 code 改動 → git commit

4. **Apply**：用 MCP `mcp__supabase-aierp__apply_migration`（project_id `aawrgygqgemgqssflfrx`、name 用 migration 檔名去 `.sql`、query 貼 SQL 內容）

4.5. **動 column 後 reload schema cache**（不然 client 查新欄位炸「column does not exist」、要等 PostgREST 下一分鐘 auto-reload）：

```
mcp__supabase-aierp__execute_sql query="NOTIFY pgrst, 'reload schema';"
```

5. **驗證 apply 結果**：用 `mcp__supabase-aierp__execute_sql` 跑 count / SELECT 確認；RLS migration 額外用 service_role 模擬 user 視角驗。

6. **Push**：apply 成功 + 驗證過後 `git push` → **GitHub → Coolify 自動部署到 Vultr**

### 例外：緊急 hotfix

緊急修 production（user 現場壞、不能等 commit）：

- 用 MCP `apply_migration` 立刻 apply 救命
- **救完當天必補 migration 檔 commit**（不可超過 24h、不然 audit 跑不到）
- commit message 寫 `fix(hotfix): <what> — already applied to production at <time>`

### 違規模式（不要再犯）

- ❌ MCP `execute_sql` 跑完 DDL、檔案沒進 repo → production 動了但 code 不知道（DDL 必走 `apply_migration`、留 migration 檔）
- ❌ Migration 檔在 code repo、但忘了 apply → 下個 dev 跑 `db push` 撞 collision
- ❌ 直接 SQL editor 在 Supabase Studio 手動跑 → 沒檔案、沒 trace

### 破壞性 migration：必附反向 SQL

砍欄位 / DROP POLICY / DROP TABLE / 改 NOT NULL → 必在 migration 末尾用註解寫 reverse SQL：

```sql
COMMIT;

-- ════ Rollback（萬一爆炸、複製貼上跑）════
-- BEGIN;
-- DROP TRIGGER IF EXISTS trg_attractions_set_created_by ON public.attractions;
-- DROP FUNCTION IF EXISTS public.set_shared_data_created_by();
-- -- 還原 5/11 policy（從備份 SQL 抓）
-- COMMIT;
```

非破壞性的（純加欄位、加 index、seed 資料）不強制寫 reverse。

---

## 工具參考

| 任務                      | 工具                                                                                        |
| ------------------------- | ------------------------------------------------------------------------------------------- |
| 路由 / 模組權限改動       | `src/components/guards/ModuleGuard.tsx` + `role_capabilities` + `workspace_features`        |
| Schema 真相（yizhan-erp） | MCP `mcp__supabase-aierp__list_tables` / `execute_sql`（project_id `aawrgygqgemgqssflfrx`） |
| Migration apply           | MCP `mcp__supabase-aierp__apply_migration`、配套 commit migration 檔                        |
| 部署                      | `git push` → GitHub → Coolify webhook → Vultr 自動部署                                      |
| 影響分析                  | `gitnexus_impact` / `gitnexus_context`（**索引可能 stale、用前先驗證**）                    |
| 列表頁範本                | `src/components/layout/list-page-layout.tsx` + `EnhancedTable`                              |
| 認證 SSOT                 | `src/lib/auth/useLayoutContext.ts`                                                          |

---

<!-- gitnexus:start -->

# GitNexus — Code Intelligence（optional）

This project is indexed by GitNexus as **yizhan-erp**.

> ⚠️ **索引狀態前置條件**：yizhan-erp 從 venturo-erp fork（中間經 venturo-aierp → venturo-atlas → yizhan-erp 多次更名）、索引可能 stale。Use only when index is fresh — first run `npx gitnexus analyze` to confirm。If index unavailable / stale、fall back to grep + Read。

## When index is fresh — Should Do

- **Run impact analysis before editing any symbol**：`gitnexus_impact({target: "symbolName", direction: "upstream"})`
- **Run `gitnexus_detect_changes()` before committing** to verify changes only affect expected symbols
- **Warn the user** if impact analysis returns HIGH or CRITICAL risk
- Use `gitnexus_query({query: "concept"})` to find execution flows instead of grepping
- Use `gitnexus_context({name: "symbolName"})` for full callers / callees / processes

## Never Do

- NEVER rename symbols with find-and-replace if GitNexus available — use `gitnexus_rename`
- NEVER ignore HIGH or CRITICAL risk warnings

## Fallback when GitNexus unavailable

- Use `grep -rn` + `Read` to trace dependencies manually -派 subagent 做 impact 估算（給具體 file:line 證據）
- Report to William: 「GitNexus stale、用 grep 替代、可能漏掉動態 call」

<!-- gitnexus:end -->
