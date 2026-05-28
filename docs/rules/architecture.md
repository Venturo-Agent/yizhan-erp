# 架構規範完整版

> 主檔索引在 `CLAUDE.md` § 6 層架構 / § 中央 Module / § 5 SSOT。

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
- **`npm run audit:orphans`** — `scripts/audit-auth-orphans.ts`、抓 `auth.users` 沒對應 `employees` row 的孤兒。加 `-- --clean` 互動式清。需 `source ~/.config/venturo/secrets.env`
- **`npm run audit:realtime`** — `scripts/audit-realtime.ts`、偵測 entity hook 訂閱但 Supabase publication 沒有的 table（realtime 靜默失效）。code grep only 不需 DB；加 `-- --db` 旗標才做 publication 比對。
- 走 psql + `SUPABASE_DB_URL`（不用 PAT）、Mac IPv6 不通自動降級為 code grep only
- CI：`.github/workflows/audit-rls.yml`、PR 自動跑、error 擋 merge、要 `SUPABASE_DB_URL` secret
- 動表 / 動 RLS / 動中央 module 前必跑、新表上線前必綠

---

## 5 SSOT（新功能必動、缺一個就壞）

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
