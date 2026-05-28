# CLAUDE.md — 一棧 ERP（yizhan-erp）

> 最後重寫：2026-05-29（拆檔版）；更名記錄：venturo-aierp → venturo-atlas → yizhan-erp。GitHub repo：Venturo-Agent/yizhan-erp。
>
> **這份是憲法主檔、只放每次都該記得的事。細節在 `docs/rules/`、需要時去讀。**

---

## 優先順位（William 親口）

**資安 #1 → 效能 #2 → SSOT #3**

- **資安第一**：洞 = 客戶資料外洩 = 商業終結
- **效能第二**：SaaS 化讀取量 = Supabase 成本
- **SSOT 第三**：不是不重要、但跟前兩者衝突時讓位

---

## 🔒 連線強制規則（每個資源只一條路、卡住先停手）

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
- ❌ 不准：SSH Vultr / psql 直連 / Studio 手動 SQL / `supabase` CLI（除非 MCP 證實不夠用）

### GitHub

- commit / push / branch → `git`
- issue / PR / review / merge / checks → `gh`
- Repo：`Venturo-Agent/yizhan-erp`

### 部署

唯一方式：`git push origin main` → GitHub → Coolify webhook → Vultr → erp.venturo.tw

- Production：Vultr 167.179.97.139（Tokyo）
- ❌ 不准手動 Docker / 手動 SSH 改 production

### Secrets / Token

- 存：`~/.config/venturo/secrets.env`（chmod 600、不進 git）
- 讀：`source ~/.config/venturo/secrets.env`
- 文檔規矩：只寫變數名（`$SUPABASE_PROJECT_REF`）、永遠不寫 value
- 完整變數分類索引：`docs/rules/secrets-index.md`（待建、目前查 secrets.env 本身）

### 卡住怎辦

❌ 不准：試 A→B→C→D 燒 token、`--no-verify` 跳 hook、`as any` 騙過、mock 假資料讓 build 看起來能跑
✅ 要：第一次失敗停手、報告「X 連不上、訊息 Y、建議走 Z」、等 William 拍板

---

## 五大方向（每次動手前審視）

開發任何功能、修任何 bug、只走這五個方向。其他都不重要。

1. **路由連結**：路由（門牌）+ HR capability（鑰匙）+ workspace_features（分店有買）三層對齊。少一條就「點下去進不去」「沒權限的人看到了」「沒買的分店也看到」。
2. **影響分析**：動 symbol 前先跑 GitNexus（`gitnexus_impact` / `gitnexus_context` / `gitnexus_query`），HIGH/CRITICAL 先報告。索引可能 stale、先 `npx gitnexus analyze`。
3. **UI 架構**：暫沿用 `EnhancedTable` / `ListPageLayout` / `FormDialog`、Dialog 必設 `level`、走 morandi-\* 色系（細節見 `docs/rules/ui-discipline.md`）。
4. **RLS 資安**：用 `has_capability_for_workspace()`、不准散刻 capability check、動 RLS migration 前必跑 `tests/e2e/login-api.spec.ts`（紅線 A）。
5. **資料讀取連線**：SWR `dedupingInterval: 5min`、entity hook 讀取、`apiMutate` 寫入、列表預設 20 筆 / 分頁 15 筆 / 不給「每頁筆數」、所有寫按鈕 `disabled={loading}`（紅線 F、I）。

---

## 紅線清單（觸發即停手、讀完整版再動）

> **完整論述、範例、audit 指令見 `docs/rules/red-lines.md`**。

| 紅線 | 一句話                                              | 觸發條件                           |
| ---- | --------------------------------------------------- | ---------------------------------- |
| 0    | 系統內沒有「超級管理員」、所有 workspace 平等       | 寫任何權限判斷                     |
| 0.1  | 不准用「admin only / 管理員限定」、走 capability 詞 | 寫 commit / 文檔 / chat            |
| A    | `workspaces` 表絕不能 FORCE RLS（4/20 事故）        | 動 RLS migration                   |
| B    | 審計欄位 FK 指 `employees(id)`、不是 `auth.users`   | 設計 schema 含 created_by 等       |
| C    | Admin client per-request、不准 singleton            | 碰 `getSupabaseAdminClient()`      |
| D    | 不准開「作弊後門」、月結/結團過了就是過了           | 碰 closed period / closed tour     |
| E    | 同表寫入只一處、不准 DB trigger + API 雙寫          | 加 trigger 或 API insert           |
| F    | Client 走 entity hook + `apiMutate`、不准散刻 SWR   | 寫 client 端讀寫                   |
| G    | SWR cache key 帶 user_id、防跨帳號污染              | 動 `src/lib/swr/config.ts`         |
| H    | 業務表 RLS 必過 `workspace_id`、不准 `auth.role()`  | 建新業務表 / 寫 RLS                |
| I    | `globalMutate(key)` 單參數、絕不傳 `undefined`      | 寫 cache 失效                      |
| UI   | 不准 Tailwind 預設色、走 design token（morandi-\*） | 寫任何 UI（細節：`ui-discipline`） |

---

## 6 層架構（每張新表必過）

> 完整 SOP + L1–L6 細節：`docs/rules/architecture.md` § 6 層架構

白話：每個請求要過 6 道門、過去 bug 都來自「沒看完整 6 道門、只蓋了 2-3 道」。

L1 租戶 feature gate → L2 角色 capability → L3 三維 org scope → L4 狀態守門 → L5 DB RLS → L6 防呆/SSOT

**新表必過全 6 層**。`npm run audit:rls` CI 自動擋。

---

## 中央 Module（不准散刻）

> 完整索引：`docs/rules/architecture.md` § 中央 Module

- **編號產生**：`@/lib/codes.ts`（11 種 helper、advisory lock）
- **錯誤翻譯**：`@/lib/db-error-translate.ts`（API 一律 `dbErrorResponse(err)`）
- **RLS 規則**：3 個 `setup_*_rls` DB procedure、不准散刻 4 條 CREATE POLICY
- **資料讀取**：`createEntityHook` / `createReportHook`（紅線 F）
- **寫入 + cache 失效**：`apiMutate`（紅線 F、I）
- **per-user cache key**：`getCurrentCacheKey()` / `clearAllSwrCacheKeys()`（紅線 G）

---

## 5 SSOT（新功能必動、缺一個就壞）

> 完整 checklist：`docs/rules/architecture.md` § 5 SSOT

| #   | SSOT                                  | 缺了會怎樣                 |
| --- | ------------------------------------- | -------------------------- |
| 1   | `src/app/(main)/xxx/`                 | 404                        |
| 2   | `src/lib/permissions/capabilities.ts` | 寫 `CAPABILITIES.XXX` 報錯 |
| 3   | `src/lib/permissions/module-tabs.ts`  | HR /hr/roles 看不到 module |
| 4   | `src/lib/permissions/features.ts`     | sidebar 不顯示             |
| 5   | seed migration                        | 用戶看到 menu 但沒權限     |

---

## Build / Commit 規則

```bash
npm run type-check                       # commit 前必過
npm run lint                             # 不能新增 console.log
npm run audit:rls                        # 動表 / 動 RLS / 動中央 module 必過
./scripts/check-standards.sh --strict    # 憲法守門
```

- ❌ **NEVER** `--no-verify` / `--no-gpg-sign`
- ❌ **NEVER** 新增 `as any` / `: any`
- ❌ **NEVER** push 有 type error 的程式碼
- 不要 amend 已 push 的 commit、永遠新增 commit
- commit 不准 William 沒明說就做

### 多 session 共用工作區紀律

> 4 隻 bot（Alex / Max / Logan / Robin）+ William 共用同一個 `~/Projects/yizhan-erp`、git index 共用。

- ❌ **NEVER** `git add .` / `git add -A` / `git add -u` / `git commit -a`（會掃到別人的活）
- ✅ **永遠列明確檔名**：`git add path/to/file1.ts path/to/file2.ts`
- ✅ commit 前 `git status --short` 確認：第一欄綠（staged）只有自己的檔
- ⚠️ 切 branch 會切整個共用目錄、其他 session 跟著被切走

---

## 8 維度 checklist（動手前對照）

> 完整版：`docs/rules/checklists.md` § 8 維度

每次動功能/修 bug 前對照：① 公司概念（VENTURO、不天馬行空）② 開發品管（type-check / lint / audit）③ 安全 ④ 資料（schema / FK） ⑤ 效能（列表 20 筆 / SWR dedupe） ⑥ 組建（動態 import / 圖片 webp） ⑦ 抽象層（三個重複才抽、不寫 framework） ⑧ 5 SSOT 對齊

## 健檢 5 維度（per-module health check）

> 完整版：`docs/rules/checklists.md` § 5 維度

讀取效能 / 資安 / 架構 / 開發品管 / 清理 — 每個 module 追 5/5、矩陣現況 `workspace/健檢/reports/26-modules-x-5-dimensions-matrix.md`。

---

## Migration SOP（重點）

> 完整 SOP + 範例：`docs/rules/migration-sop.md`

核心紀律：**本地寫檔 → git commit → MCP `apply_migration` apply**。不可在 Studio SQL editor 直接跑 DDL。

- 檔名：`supabase/migrations/YYYYMMDDHHMMSS_<purpose>.sql`
- 標頭寫「為什麼」、`BEGIN; ... COMMIT;`、`IF EXISTS` 讓 idempotent
- 動 column 後：`NOTIFY pgrst, 'reload schema'`
- 破壞性 migration（DROP / 改 NOT NULL）：末尾必附 rollback SQL 註解

---

## 工具參考

| 任務                | 工具                                                                             |
| ------------------- | -------------------------------------------------------------------------------- |
| 路由 / 模組權限改動 | `ModuleGuard` + `role_capabilities` + `workspace_features`                       |
| Schema 真相         | MCP `mcp__supabase-aierp__list_tables` / `execute_sql`（`aawrgygqgemgqssflfrx`） |
| Migration apply     | MCP `mcp__supabase-aierp__apply_migration` + commit migration 檔                 |
| 部署                | `git push` → GitHub → Coolify → Vultr                                            |
| 影響分析            | `gitnexus_impact` / `gitnexus_context`（索引可能 stale、用前先驗）               |
| 列表頁範本          | `ContentPageLayout` + `EnhancedTable`                                            |
| 認證 SSOT           | `src/lib/auth/useLayoutContext.ts`                                               |

---

<!-- gitnexus:start -->

# GitNexus — Code Intelligence（optional）

This project is indexed by GitNexus as **yizhan-erp**.

> ⚠️ **索引狀態前置條件**：索引可能 stale。Use only when index is fresh — first run `npx gitnexus analyze`。If stale, fall back to grep + Read。

**When fresh**：edit symbol 前跑 `gitnexus_impact(target, "upstream")`、commit 前跑 `gitnexus_detect_changes()`、HIGH/CRITICAL 必警告 William、用 `gitnexus_query` 找執行流、用 `gitnexus_rename` 改名。

**Never**：find-and-replace rename（when index fresh）、忽略 HIGH/CRITICAL warning。

**Fallback**：`grep -rn` + `Read`、派 subagent 估算影響、跟 William 報「GitNexus stale、用 grep 替代、可能漏掉動態 call」。

<!-- gitnexus:end -->
