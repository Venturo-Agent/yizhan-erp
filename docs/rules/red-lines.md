# 技術紅線完整版

> 主檔索引在 `CLAUDE.md` § 紅線清單。違反會炸、踩到 stop。

---

## 0. 系統內沒有「超級管理員」（William 2026-05-10 拍板）

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

---

## 0.1 文檔 / commit message / chat 用詞紀律（2026-05-13 William 拍板）

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

---

## A. workspaces 表絕不能 FORCE RLS

**白話**：RLS 是「個人隱私柵欄」、FORCE 是強化版（連系統管理員都被擋）。但是登入流程要用系統管理員身分查 workspace 資料、被擋 = 全員登入失敗。

- `workspaces` RLS 可以 ENABLE、但**永遠 NO FORCE**
- 動 RLS policy 的 migration、apply 前必先跑 `tests/e2e/login-api.spec.ts`
- 歷史 fix：`20260420d_fix_workspaces_force_rls.sql`（4/20 出過事故）

---

## B. 審計欄位 FK 必指 `employees(id)`、不是 `auth.users(id)`

**白話**：紀錄「誰建這筆」要寫員工編號（E001）、不是 Supabase 帳號編號（uuid）。前端拿到的是員工編號、FK 設錯就 insert 失敗。

- `created_by` / `updated_by` / `performed_by` / `uploaded_by` / `locked_by` / `last_unlocked_by` / `deleted_by` → `REFERENCES public.employees(id) ON DELETE SET NULL`
- 例外（合規、可指 `auth.users`）：`user_id` / `sender_id` / `friend_id`（這些 row 本身就是 Supabase 用戶、不是員工操作紀錄）
- 前端寫入：`created_by: currentUser?.id || undefined`（**不是 `|| ''`**、空字串會炸）

---

## C. Admin client 必 per-request、不准 singleton

**白話**：Admin client 是「系統管理員萬能鑰匙」（`service_role`、繞過 RLS）。每次借用後必鎖回保險箱、不准放外面共用、否則跨 request 會殘留前一個 request 的 context、導致**跨工作區資料洩漏**。

- `src/lib/supabase/admin.ts` 必須**每個 request 重新建立**
- 不准 export 一個全局 admin variable
- 函數命名：`getSupabaseAdminClient()`、每次 call 都新建

---

## D. 不准開「作弊後門」（William 2026-05-13 拍板）

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

**業務語意**：

- 「月結了就是月結了、改的話要在下個月做」
- 「結團了就是結團了、要改的話放到下個月、做下個月的帳」
- 「能解鎖 = 公司在作弊、稅務 / 審計都會炸」

**code 層偵測**：

- 任何 function name 含 `unlock` / `reopen` / `override` 關於 closed 狀態的、PR review 必擋
- API route 寫入 receipts / payment_requests / disbursement / journal_vouchers 時、必 check 不在 closed period / closed tour、否則 reject

**為什麼這條重要**：

- 給 SaaS 客戶用：員工想竄改數字、系統必須擋
- 給漫途自己用：審計 / 報稅時、不准有「上個月某張單我改過」的紀錄
- Sales pitch 賣點：「venturo 結帳後自動鎖、防員工竄改」

---

## E. 加新 DB trigger / 新 API 寫入前必查同表寫入清單（William 2026-05-17 拍板）

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

| 場景                                    | 該選誰當 SSOT                               |
| --------------------------------------- | ------------------------------------------- |
| onboarding seed（建租戶配套）           | **API**（彈性、可吃 user 輸入）             |
| 純技術 housekeeping（時戳 / audit log） | **Trigger**（不可能漏）                     |
| 編號產生 / 級聯狀態（已封存判定）       | **DB function**（advisory lock / 競態保護） |
| 業務寫入（會計分錄 / 訂單）             | **API**（中央化權限檢查 + audit context）   |

**例外（合理雙寫、需 review）**：

- `channel_members` — RPC `get_or_create_dm_channel` 建 DM、API `/channels/dm/route.ts` 另加成員
- `journal_lines` — trigger 自動分錄 + API 手動分錄
- 加進 `scripts/audit-write-paths.ts` 的 `ALLOWLIST`、留 comment 寫清楚為什麼

**code 層偵測**：

- `npm run audit:writes` 加進 commit / PR 前必跑清單
- 任何加 `CREATE TRIGGER ... INSERT INTO X` 的 PR、必對照 `src/app/api/**` 有沒有也寫 X
- 任何加 `.from('X').insert` 的 PR、必對照 `supabase/migrations/*.sql` 有沒有 trigger 也寫 X

---

## F. Client 端資料讀取走 entity hook、cache 失效走 apiMutate（William 2026-05-17 拍板）

**白話**：讀資料只走 `createEntityHook` 產生的 hook、寫入後只走 `apiMutate` 讓 SWR 失效。這是紅線 E（DB 層寫入 SSOT）的 client 端版本：**client 端的讀取 + cache 失效也只能有一個真相**。

- ❌ 不准在頁面 / component 直接 `useSWR(key, fetcher)` — 用 entity hook 代替
- ❌ 不准寫入後只 `setXxx(newData)` local state 而不讓 SWR 知道 — client state 跟實際資料不同步
- ❌ 不准寫入後手動散刻 `mutate('某個 key 字串')` — SWR key 結構改動後散刻全靜默失效
- ✅ 讀資料：`const { data } = useXxx()` — 走 `createEntityHook` 產出的 hook
- ✅ 寫入後讓 cache 失效：`await apiMutate.xxx(payload)` — 由 `apiMutate` 統一處理 key + optimistic update
- ✅ Realtime 訂閱走 entity hook 內建的 `useRealtimeSync()`、不自己 `supabase.channel()` 散刻

**關鍵 SSOT**：

- 讀取（實體資料）：`src/data/core/createEntityHook.ts` 的 `createEntityHook` family；再由 `src/data/entities/*.ts` 各實體 export
- 讀取（財務報表）：`src/lib/swr/createReportHook.ts` 的 `createReportHook`；適用跨表 join / RPC view、不走 entity 框架
- 寫入 + cache 失效：`src/lib/swr/api-mutate.ts` 的 `apiMutate`

**為什麼這條重要**：

- `createEntityHook` 統一了 key、TTL、realtime、optimistic update — 散刻等於繞過整套機制
- Realtime 通知到了但 hook 沒訂閱 → 用戶看到 5 分鐘前的舊資料
- SWR key 命名改版 → 散刻的 `mutate(key)` 靜默失效

**code 層偵測（Phase 3 待做）**：

- ESLint rule `venturo/no-direct-useswr-in-pages` — 頁面直接 `useSWR` 報 error
- ESLint rule `venturo/require-api-mutate-for-mutations` — 寫入後沒走 `apiMutate` 報 warning
- `npm run audit:realtime` — 偵測 entity hook vs Supabase publication 差集

---

## G. per-user SWR cache key 防跨帳號污染（William 2026-05-17 抓出）

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

---

## H. 每張業務表 RLS 必過 workspace_id 守門（William 2026-05-21 拍板）

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

---

## I. 失效快取只走「單參數 revalidate」、永不把 cache 寫成 undefined（William 2026-05-26 拍板）

**白話**：刷新清單只能用 `globalMutate(key)`（單參數、保留現值邊背景刷新）。**絕不准** `globalMutate(key, undefined, …)` — 第 2 參數傳 `undefined` 會把 SWR cache 清成 undefined、畫面瞬間 fallback 到 idb「載入時讀一次」的舊快照 → **已刪/已改的資料整批閃現一輪**。

**不變式**：畫面資料永遠不會在 session 中途變成 undefined。唯一能清空 cache 的時機是登入/登出（`clearAllSwrCacheKeys`、紅線 G）。

- ❌ `globalMutate(key, undefined, { revalidate: true })` / `mutate(key, undefined, …)`（清空 footgun）
- ✅ `globalMutate(key)`（純刷新）／要寫 cache 一定傳真實 data 或 updater function（樂觀更新、登入預寫 layout-context 都合法）
- ✅ realtime handler、entityHookCrud、apiMutate 全部對齊單參數

**為什麼這條重要**：

- 這個 footgun 是「刪除/新增後閃舊資料、反覆修了又復發」的根因 — 它被複製貼上散在 8 處（2026-05-26 全盤盤點抓出 countries/dashboard/useOrderMembers×4/core-table-adapter/AiRetrospectiveTab、已全清）
- 過去只修撞到的那一個、沒立不變式 → 換個畫面又踩到

**code 層偵測（已落地）**：

- `npm run lint` → `venturo/no-mutate-clear`（error）：擋 `mutate/globalMutate(key, undefined, …)`、放行單參數 / function / object
- 全盤盤點 + 收斂計畫（A/B/C 層）：`workspace/健檢/pending/2026-05-26-讀取快取同步-全盤盤點.md`
- ⚠️ 注意：讀取側其實還不是單一 SSOT（4–6 套引擎、見盤點 doc）；本紅線先守「失效行為」這一條不變式

---

## UI 紀律紅線（2026-05-23 William 拍板）

**所有新 UI 必比照公司 venturo CIS、不准用 Tailwind 預設色**。

完整 design token 對照表見 `docs/rules/ui-discipline.md`。

### ❌ 禁用

- `bg-red-*` / `bg-green-*` / `bg-blue-*` / `bg-yellow-*` / `bg-purple-*` 等 Tailwind 預設色
- `text-red-{50..900}` / `text-green-{50..900}` 等預設色
- `border-red-200` / `border-green-200` 等預設色 border
- 永豐 / 第三方品牌色（即使是品牌色、要走 venturo 主色 `morandi-gold`）

### ✅ 強制走 design token

- 主色 → `morandi-gold` / `morandi-gold-hover` / `morandi-gold-light`
- 文字 → `morandi-primary` / `morandi-secondary` / `morandi-muted`
- 卡片背景 → `morandi-container` / `morandi-cream` / `bg-card`
- 狀態（成功/危險/警告/資訊）→ `text-status-*` / `bg-status-*-bg`

Token 定義：`src/styles/tokens.css`。

### Channel badge **例外**（保留品牌色）

社群通訊軟體的品牌色屬識別色、非狀態色、保留：LINE 綠 / FB 藍 / IG 粉 / 未來 WhatsApp / Telegram / Discord 也走自己品牌色。

⚠️ 例外**僅限**社群 / 通訊產品 channel badge、其他「品牌色借當主色」仍違規。

### 違反成本

跟 type error 同級、commit 前自己 audit、不准 PR 帶這種變動上 main。
譬喻：每件衣服都要送公司 CIS 部門過審。
