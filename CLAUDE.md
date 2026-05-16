# CLAUDE.md — venturo-atlas（一棧 ERP）

> 最後重寫：2026-05-13；更名記錄：venturo-aierp → 一棧 ERP（yizhan-erp on GitHub）→ venturo-atlas（local folder）。同一個連續專案、GitHub repo 是 Venturo-Agent/yizhan-erp。

---

## 🔒 戰略凍結中（2026-05-13 William 拍板）

**venturo-atlas 進入「修復 + 測試 + 上線」階段、凍結新功能開發**。
詳細戰略地圖：`Logan-Workspace/2026-05-13-venturo-aierp-上線戰略地圖.md`

**🚩 當前戰場（可做）**：
- Pooler URL 換完（CI DB-side audit）
- DBA monitoring SOP / CSP headers
- Preset Role / Onboarding wizard（解 HR 學習成本）
- 業務 e2e 全流程（要 staging）
- 試用客戶 1-2 家
- 上線後 bug 除錯

**🔒 凍結戰場（一律不准動）**：
- AI 整合（aitoearn / xhs / capture bot / LINE OA AI）
- Billing 系統 / 多語言 / 多 region
- Sidebar Phase 4B 真實衍生（用 audit detector 守、不重寫 551 行）
- 新 audit detector / 新規範文件（既有夠用）
- 「順手優化」/「再乾淨一點」/「nice-to-have」

**目標**：3 個月內第一個付費客戶（2026-08-13）。

**Logan 守線**：
- 任何 cctk session 想做「凍結戰場」項 = 立即提醒「凍結中」+ 回頭看戰略地圖
- 例外：真實 bug / 紅線違反 / 資安洞 / William 明確拍板新優先
- 紀律契約：少做、做對、做完

---

## 優先順位（William 親口）

**資安 #1 → 效能 #2 → SSOT #3**

- **資安第一**：洞 = 客戶資料外洩 = 商業終結
- **效能第二**：SaaS 化讀取量 = Supabase 成本、列表預設載少、分頁固定 15 筆、不給「每頁筆數」選擇器
- **SSOT 第三**：不是不重要、但跟前兩者衝突時讓位

---

## 寫程式哲學（協作原則）

> William 用中文跟我講「怎麼寫程式」、我把中文業務語言翻成 code。這套協作方式累積了快一年、定型成下面 6 條。

### 1. 中文業務語言為主、術語加註解

- William 用中文業務語言描述需求、我（Claude）翻譯成 code
- 寫文件 / 寫 commit / 寫 chat：**中文業務語言為主、術語必加中文註解**
- 譬喻：客戶跟司機講「載我去市區那家有花園餐廳的飯店」、不講「導航 GPS 經緯度」

### 2. William 不看 code、所以每件事要說清楚為什麼

- 不只說「我改了 X」、要說「**為什麼改、改了什麼、有什麼風險、為什麼這個方法最好**」
- 譬喻：醫生不能只說「我給你開了藥」、要說「你血壓高、所以開降壓藥、副作用是 X、為什麼選這款」

### 3. 分進度讓 Subagent 跑、主對話只做檢測 + 拍板對接

- 大批 grep / 跨多檔改寫 / 跑命令 → 派 subagent
- Claude 主對話只負責：**派任務 / 檢測結果 / 整理回報 / commit**
- 不在主對話裡跑大量命令（會讓對話量爆掉、之後被壓縮會失去脈絡）
- 譬喻：老闆指派專員去查、專員回來報告、老闆才出面拍板

### 4. 紅線錯誤時必先派分身查、不憑單一字串下結論

- 看到 `grep` 不到、不能直接說「沒做」
- 要派分身查 **所有可能變體 / 替代 helper / 手動實現**、給具體 file:line 證據
- 連續錯誤模式（不要再犯）：只 grep 一個固定字串就下「普及率 0%」結論
- 譬喻：找不到員工不能直接說「他離職了」、要先查請假表、出差表、輪班表

### 5. 不寫 secret value、只寫位置

- 所有 token / URL / key 都集中在 **`~/.config/venturo/secrets.env`**（chmod 600、export 格式）
- 文件 / memory / 對話只寫變數名（`$NEXT_PUBLIC_SUPABASE_URL`）、**永遠不寫實際值**
- 用的時候 `source secrets.env`、進 process env、用完不留
- 完整索引：**`~/.claude/INFRASTRUCTURE.md`**

### 6. MCP 不是第一手、先讀 INFRASTRUCTURE.md

- venturo-aierp 的 Supabase 是 agency@venturo.tw 帳號、**MCP 看不到**（PAT 是 William 個人帳號、scope 不對）
- 動 venturo-aierp 任何 Supabase 資源 → 走 `source secrets.env` + REST API 或 SSH 到 Vultr 跑 psql
- Mac 沒 IPv6、不能直連 Supabase db host、必須走 REST 或 Vultr
- 動 Vultr / Coolify / Cloudflare / GitHub / LINE 等任何資源前 → 先 read `~/.claude/INFRASTRUCTURE.md`

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

⚠️ **索引狀態前置條件**：venturo-aierp 是新專案、GitNexus 索引可能 stale。**用之前先跑 `npx gitnexus analyze` 確認索引 fresh、或退而用 grep + Read 替代**。

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

## 動工前必看的卡

新 session 接手 venturo-aierp、按順序看：

1. 這份 CLAUDE.md（紅線 + 哲學 + 6 層架構）
2. `Logan-Workspace/2026-05-13-venturo-aierp-概念架構-blueprint.md` — **581 行設計大樓圖 / 6 層藍圖**（5/13 新作、本檔下面是簡版）
3. `Logan-Workspace/2026-05-13-建表-SOP.md` — **新表必過 6 層 checklist + migration / API route / entity hook 範本**（5/13 新作）
4. `Logan-Workspace/audit/2026-05-10-圓桌會議-開發方向方針規範.md` — 7 souls 圓桌結論
5. `CornerVenturo-Vault/01-Active-Projects/ERP/三維（品牌／分公司／部門）架構重建/01-架構決定.md` — 三維架構決定
6. `CornerVenturo-Vault/01-Active-Projects/Shared/2026-05-10-ERP-使用流程與教學脈絡.md` — 完整 sitemap
7. `Logan-Workspace/2026-05-12-修復筆記-夜戰計畫.md` — 5/12-5/13 夜戰整理（含兩次 retro、Tier B 全清完）
8. `~/.claude/INFRASTRUCTURE.md` — secrets / 連線
9. `docs/db-state-snapshot-2026-05-13.md` — production DB 真實狀態（Markdown 給人讀）
10. `docs/api-capability-audit-2026-05-13.md` — 76 API route 守門 audit 結果（0 缺）

看完這 10 份就懂全貌、不用花一個 session 重新摸索。

---

## 6 層架構（每張表必過、blueprint 簡版）

> 完整版見 `Logan-Workspace/2026-05-13-venturo-aierp-概念架構-blueprint.md`（581 行）。新表必過 SOP 見 `Logan-Workspace/2026-05-13-建表-SOP.md`。

**白話**：SaaS ERP 每個請求要過 6 道門。過去 bug 都來自「過去寫的人沒看完整 6 道門、有的只蓋了 2-3 道」。

| Layer | 守的事 | 譬喻 | 技術 |
|---|---|---|---|
| **L1 租戶 Feature Gate** | 這家公司有沒有買這個功能 | 客戶有沒有買「會計」這層樓的鑰匙 | `workspace_features` |
| **L2 角色 Capability** | 這個員工有沒有這個能力 | 員工識別證有沒有刷「進部門」的權限 | `role_capabilities` + `requireCapability` |
| **L3 三維 Org Scope** | 員工屬哪個品牌 / 分公司 / 部門 | 員工只進自己分公司、自己部門的房間 | `brands` / `branches` / `departments` + `scope_visible()` |
| **L4 狀態守門** | 這筆資料現在能不能改 | 已付清的訂單上鎖、不能再開 | `is_row_editable()` |
| **L5 DB RLS** | 資料庫層的隱形柵欄 | 物品櫃的鎖、就算外面警衛失職、櫃子自己擋 | RLS policies（走 3 個 `setup_*_rls` procedure）|
| **L6 防呆 / SSOT** | 防連點 / 編號不撞 / 錯誤翻譯 | 收據上有防偽碼、不會雙開 | `@/lib/codes` / `@/lib/db-error-translate` 等中央 module |

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

### 測試套件位置
- `tests/concurrency/` — 並發撞號測試（4 種編號 RPC）
- `tests/e2e/cross-tenant.spec.ts` — 跨租戶滲透測試
- `tests/cross-tenant.README.md` — 怎麼跑

### audit context
- `recordApiAuditContext(client, { actorId, reason })` — 所有寫操作 API route 都該 call
- 已套用 ~30 route、剩餘漸進清

### audit script（自動偵測偏離 blueprint）
- **`npm run audit:rls`** — `scripts/audit-rls-blueprint.ts`、6 層自動檢核
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

---

## 開發品管 8 維度（每次動手前對照 checklist、5/12 William 拍板）

> 動任何功能 / 修任何 bug 前、對照這 8 維度。少一條都會出事。

### 1. 公司的概念（VENTURO 為核心、不天馬行空）

- 英文一律 **VENTURO**、不准 MANTU / Mantu / mantu-* 變體（見 `~/.claude/CLAUDE.md` 鐵律 #7）
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
- Repository pattern / Service layer 等 enterprise 抽象、venturo-aierp 不適用
- 已存在的抽象（`createEntityHook` / `ContentPageLayout` / `FormDialog`）走得通就用

### 8. 租戶 / HR / 路由 對齊（新功能必跑 5 個 SSOT、缺一個就壞）

> 對齊「五大方向 1」。Channels 系統 5/12 踩過「以為 3 個 SSOT、實際 5 個」的坑、列完整 checklist。

**每加一個新功能、5 個 SSOT 全部都要動**：

| # | SSOT 檔案 / 表 | 用途 | 缺了會怎樣 |
|---|---|---|---|
| 1 | `src/app/(main)/xxx/` | 路由本身（門牌） | 點下去 404 |
| 2 | `src/lib/permissions/capabilities.ts` | capability 常數（給 code reference 用） | 寫 `CAPABILITIES.XXX` 報錯 |
| 3 | `src/lib/permissions/module-tabs.ts` | **HR UI 列出可勾項目的 SSOT** | **HR /hr/roles 頁面看不到此 module、admin 沒地方勾權限給員工** |
| 4 | `src/lib/permissions/features.ts` | 租戶 feature 常數 + sidebar `requiredPermission` 對齊 | sidebar 不顯示 menu |
| 5 | seed migration | DB 層自動啟用：`workspace_features` + `role_capabilities` | user 看到 menu 但沒權限、或租戶沒開通 |

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

---

## Migration SOP（2026-05-13 黒羽 + William 拍板）

**核心紀律：本地寫檔 → git commit → 才能 apply 到 production**。
不可 SSH 直接 psql 跑 SQL 而不 commit 檔案 — 會造成 code repo 跟 production 漂移、未來人 git pull 不知道 schema 真實狀況。

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

4. **Apply**（venturo-aierp Supabase 因 IPv4-only 從 Mac 連不上、走 Vultr SSH）：
   ```bash
   source ~/.config/venturo/secrets.env
   cat supabase/migrations/XXX.sql | ssh -i ~/.ssh/venturo-hetzner root@167.179.97.139 \
     "PGPASSWORD='$SUPABASE_DB_PASSWORD' psql 'postgresql://postgres@db.${SUPABASE_PROJECT_REF}.supabase.co:5432/postgres'"
   ```

4.5. **如果動了 column（加/刪/改名）必跑 schema cache reload**（不然 client 查新欄位炸「column does not exist」、要等 PostgREST 下一分鐘 auto-reload）：
   ```bash
   ssh -i ~/.ssh/venturo-hetzner root@167.179.97.139 \
     "PGPASSWORD='$SUPABASE_DB_PASSWORD' psql 'postgresql://...' -c \"NOTIFY pgrst, 'reload schema';\""
   ```

5. **驗證 apply 結果**：
   - count + expected rows
   - 對 RLS migration、用 service_role 模擬 user 視角 `BEGIN; SET LOCAL ROLE authenticated; SET LOCAL request.jwt.claims TO '{"sub":"..."}'; <query>; ROLLBACK;`

6. **Push**：apply 成功 + 驗證過後再 `git push`、讓 Coolify 同步部署

### 例外：緊急 hotfix

緊急修 production（user 現場壞、不能等 commit）：
- 直接 SSH apply 救命
- **救完當天必補 migration 檔 commit**（不可超過 24h、不然 audit 跑不到）
- commit message 寫 `fix(hotfix): <what> — already applied to production at <time>`

### 違規模式（不要再犯）

- ❌ SSH psql 跑完一條 SQL、檔案沒進 repo → production 動了但 code 不知道
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

| 任務 | 工具 |
|------|------|
| 路由 / 模組權限改動 | `src/components/guards/ModuleGuard.tsx` + `role_capabilities` + `workspace_features` |
| Schema 真相（venturo-aierp）| `source ~/.config/venturo/secrets.env` + REST API 或 SSH Vultr `psql`（**MCP 看不到**、見哲學原則 6）|
| Schema 真相（舊 venturo-erp）| Supabase MCP（William 個人帳號、`mcp__supabase__list_tables`）|
| Migration | `npm run db:migrate` |
| 影響分析 | `gitnexus_impact` / `gitnexus_context`（**索引可能 stale、用前先驗證**）|
| 列表頁範本 | `src/components/layout/list-page-layout.tsx` + `EnhancedTable` |
| 認證 SSOT | `src/lib/auth/useLayoutContext.ts` |
| 連 venturo-aierp Supabase（任何 SQL）| 走 REST（service_role）或 SSH Vultr `167.179.97.139` 跑 psql |

---

<!-- gitnexus:start -->
# GitNexus — Code Intelligence（optional）

This project is indexed by GitNexus as **venturo-aierp**.

> ⚠️ **索引狀態前置條件**：venturo-aierp 從 venturo-erp fork、索引可能 stale。Use only when index is fresh — first run `npx gitnexus analyze` to confirm。If index unavailable / stale、fall back to grep + Read。

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

- Use `grep -rn` + `Read` to trace dependencies manually
-派 subagent 做 impact 估算（給具體 file:line 證據）
- Report to William: 「GitNexus stale、用 grep 替代、可能漏掉動態 call」

<!-- gitnexus:end -->
