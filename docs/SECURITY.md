---
created: 2026-05-08
expires_after: 2027-05-08
review_owner: william
status: active
upgrade_target: ESLint rule + RLS detector + audit trigger
---

# Venturo ERP 資安規範

**資安 #1、效能 #2、SSOT #3**（依 CLAUDE.md 優先順位）

---

## 紅線（違反 = 客戶資料外洩 / 商業終結）

### 1. 多租戶隔離雙重 enforcement
- 應用層：所有 query 走 `enforceWorkspaceScope`（`src/lib/auth/enforce-workspace-scope.ts`）
- DB 層：RLS policies 用 `has_capability_for_workspace()`
- **兩者缺一不可**。RLS 設錯也要應用層擋、應用層漏寫也要 RLS 擋。
- ESLint `venturo/no-direct-supabase-in-feature-layer` 守門

### 2. Workspaces 表不准 FORCE RLS
- service_role 也被 policy 擋 → 登入 API 全炸
- 紅線 #1（CLAUDE.md）已有
- pattern detector P004 / P016 自動偵測

### 3. Admin client 必 per-request、不准 singleton
- `src/lib/supabase/admin.ts`
- 跨 request 共用 = 權限污染

### 4. 不准刪資料、不准 DROP TABLE 有資料的表
- 紅線（CLAUDE.md 技術紅線 A：六大模組整體不可砍 / CORNER row 不可刪）
- 軟刪除走 `softDelete()`、留回收桶 + audit log

---

## Capability Gate

每個 API endpoint 必須走 `requireCapability('module.tab.action')`：
- 集中在 `src/lib/auth/require-capability.ts`
- 95 處使用、capability 三段式編碼
- pattern detector P022 / API_UNGUARDED 自動偵測無守門 endpoint
- 失敗時 401（未登入）/ 403（無權限）

**鐵律：系統內沒有「超級管理員」**（2026-05-10 William 拍板、見 CLAUDE.md 紅線 0）：
- ❌ 不准 `requireCapability('platform.is_admin')` 之類萬能 capability（已廢）
- ❌ 不准 code 裡 `if (isAdmin)` user-level 特權判斷
- ✅ 訪問控制只有兩道 gate：`workspace_features`（workspace 有沒有開這 feature）+ `role_capabilities`（user 有沒有這個具體 capability）

**Cross-workspace 操作必加額外 capability**：
- `enforceWorkspaceScope(query, ctx, { allowCrossWorkspace: true })` 
- 必伴隨 `requireCapability('admin.cross_workspace.X')`
- code review 看到 `allowCrossWorkspace` 自動觸發討論

---

## 共用資料層（Venturo 平台共用 ref data）

**概念**（2026-05-10 William 拍板）：

`ref_*` 系列表是「Venturo 平台共用知識庫」、不歸任何 workspace 私有：
- 全平台共有的客觀事實（金融機構代號、機場代號、國家、行業分類…）
- 所有 workspace 都能 **讀**
- 沒有人能在 app 層 **寫**（更新只能透過 migration）
- 未來各 workspace 的 AI agent 可透過 RPC / MCP 介面查詢這層共用資料

**命名 convention**：
- 表名一律 `ref_*` 前綴（`ref_banks` / `ref_airports` / `ref_countries`…）
- RLS：`SELECT` 給所有 authenticated user、`INSERT/UPDATE/DELETE` 全部 deny

**「共用資料管理」feature**（`shared_data_management`）：
- 為「漫途自家派員工維護共用資料」的場景預留
- 開了這個 feature 的 workspace、有對應 capability 的 role 才能透過 UI 改 ref 資料
- 這次 2026-05-10 改造只 stub 了 feature code、UI 入口未開放
- 未來實作要對齊「沒有特權」鐵律：DB 層改寫 RLS、不靠 super_admin

---

## Audit Log

ERP 動的是錢、所有業務 mutation 必須有軌跡：

- DB trigger 兜底：`fn_record_audit()` 自動寫所有 INSERT / UPDATE / DELETE
- 應用層補 reason：[`recordAudit()`](../src/lib/audit/record-audit.ts) / [`setAuditContext()`](../src/lib/audit/set-audit-context.ts)
- API route 統一入口：[`withAudit()` middleware](../src/lib/api/with-audit.ts) — 一次包 auth 守門 + per-request supabase + audit context + try-catch + Sentry
- audit_logs 是 append-only、UPDATE / DELETE policy 不寫 = deny
- partition 保留：付款 / 員工**永久不刪**、其他 90 天

詳見 [ADR-0003](./adr/0003-audit-log.md)。

---

## 軟刪除政策

- 業務 UI「刪除」走 `softDelete()`、不能直接 DELETE
- `deleted_at` IS NULL = 活、IS NOT NULL = 在回收桶
- `enforceWorkspaceScope` 預設加 `.is('deleted_at', null)`（搬完 schema apply 後啟用）
- 永久刪除（`forceDelete`）只限 admin + 過 N 天 cron

詳見 [ADR-0002](./adr/0002-soft-delete-policy.md)。

---

## Cross-Workspace 攻擊測試清單

每個 entity 至少要有 E2E 測試：

- [ ] 用 workspace A 的 token 訪問 workspace B 的資源 → 必 403 或空
- [ ] Admin token 加 `allowCrossWorkspace` → 過
- [ ] 沒 admin capability 但帶 `allowCrossWorkspace` → 必擋

實作位置：[`tests/e2e/security/cross-workspace.spec.ts`](../tests/e2e/security/cross-workspace.spec.ts)（**stub 已就位、describe.skip**）

stub 列出 15 個 entity × 4 種攻擊（GET / LIST / UPDATE / DELETE）+ admin opt-out + RLS 直連 + 軟刪除 + realtime
搬完伺服器後依 stub 實作、改 it.skip → it。

---

## Pattern detector + ESLint 自動守門

### Pattern detector（實際在 `scripts/pattern-detectors/check-all.mjs`）

跑：`npm run check:patterns`

| 守門 | 編號 | 類型 |
|---|---|---|
| isAdmin 短路全站盤 | P001 | hard-fail（hook 短路 / layout 大鎖會 fail；API 守門合法） |
| FORCE RLS 違反 | P004 | hard-fail |
| Workspaces policy USING:true | P016 | hard-fail |
| 系統表 RLS 沒開 | P017 | hard-fail |
| `employee_permission_overrides` USING:true | P018 | hard-fail |
| 多 policy 重疊（ALL + cmd-specific） | P020 | hard-fail |
| permission-overrides API 雙層裸奔 | P022 | hard-fail |
| 無守門 API 清單 | API_UNGUARDED | informational |

> **註**：P100-P109（多租戶散落 / realtime / select-star / hardcoded labels / silent catch 等）目前**未實裝**、為計畫項目、有需要再補。

### ESLint custom rules（實際啟用 2 條 venturo plugin rule + 2 條 no-restricted-*）

定義在 [`eslint-rules/venturo-design-system.js`](../eslint-rules/venturo-design-system.js)、設定在 [`eslint.config.mjs`](../eslint.config.mjs)：

| Rule | 用途 | level |
|---|---|---|
| `venturo/no-forbidden-classes` | 擋 `gray-*` / 硬編碼顏色 / shadow / rounded、走 design token | warn |
| `venturo/no-hardcoded-chinese-jsx` | JSX 內不准 hardcoded 中文、應抽到 labels constant | warn |
| `no-restricted-imports` | 擋 `@/hooks/usePermissions`（已廢棄、繞過 HR）+ `useRolePermissions` 空殼 hook | error |
| `no-restricted-syntax` | 擋 `*.permissions.{includes,some,find,filter,map}()`（繞過 HR SSOT） | error |

> 其他 venturo plugin rule（`no-custom-modal` / `button-requires-icon` / `consistent-form-label`）目前 `warn`、屬設計系統範疇、不在資安層。
>
> `no-direct-supabase-in-feature-layer` / `no-select-star` / `no-realtime-without-filter` / `no-silent-catch` 為**未實裝計畫項目**、有需要再補。

跑：`npm run lint`

---

## 緊急應變：發現資料洩漏 / 越權

### 1. 立刻
- 停止對外服務（Vercel maintenance mode）
- snapshot DB（`pg_dump`）保留證據
- 通知影響的客戶（合規 / 商譽）

### 2. 排查
- 跑 `audit_logs` 查跨 workspace 訪問軌跡
- 跑 Sentry 看 error pattern
- 跑 `node scripts/pattern-detectors/check-all.mjs` 全部過

### 3. 修補
- 應用層：補 `enforceWorkspaceScope`
- DB 層：修 RLS policy
- 測試：加 cross-workspace E2E 測試
- pattern detector：加新 rule 防回歸

### 4. 復盤
- 寫 ADR 記錄發現過程
- 加 ESLint rule / detector 自動偵測
- post-mortem 寫進 `docs/incidents/YYYY-MM-DD-{title}.md`

---

## 啟動觀測（D-Day 之後立刻做）

- [ ] 設 Sentry DSN（`sentry.client.config.ts` / `sentry.server.config.ts`）
- [ ] 掛 `<SpeedInsights />` 在 root layout
- [ ] 訂 SLO：API p99 < 500ms、錯誤率 < 0.1%、列表頁 LCP < 2.5s
- [ ] Supabase advisor 定期跑（每週）
- [ ] 啟用 [cross-workspace E2E 測試](../tests/e2e/security/cross-workspace.spec.ts)（stub 已就位、改 `it.skip` → `it`、加進 CI）

---

## 相關文件

- [CLAUDE.md](../CLAUDE.md) — 五大方向 + 紅線 + GitNexus
- [PATTERNS.md](./PATTERNS.md) — 拆遷時的標準 pattern
- [ADR](./adr/) — 架構決策（多租戶 / 軟刪除 / audit log / 測試 / cache、若存在）
