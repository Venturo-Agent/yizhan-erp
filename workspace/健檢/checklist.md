# 健檢核查清單 — VENTURO ERP 全方位架構品質健檢

> 用法：每個檢查點對應一個核查結果，通過 = ✅ / 未通過 = ❌ / 待確認 = ⏳

---

## 架構層面

### 6 層架構（L1-L6）

- [ ] L1 Feature Gate：features.ts 與 modules/ 完全同步
- [ ] L1 Feature Gate：ModuleGuard 在所有 module route 存在
- [ ] L1 Feature Gate：workspace_features 表鉤鉤正常
- [ ] L2 Capability：capabilities.ts 無 ghost capability（不在 modules/ 衍生）
- [ ] L2 Capability：module-tabs.ts 列出所有需要 HR UI 勾選的 module
- [ ] L2 Capability：每個 capability 都有對應的 requireCapability 守門
- [ ] L3 Org Scope：三維 scope（brands / branches / departments）無散刻 `sales_id = me`
- [ ] L3 Org Scope：scope_visible() 或等效鉤鉤存在且被調用
- [ ] L4 狀態守門：closed period guard 在所有相關模組（salary / receipt / voucher / disbursement）
- [ ] L4 狀態守門：is_row_editable() 或等效鉤鉤存在
- [ ] L5 RLS：workspaces 表 NO FORCE（非 FORCE）
- [ ] L5 RLS：所有業務表有 RLS policy
- [ ] L5 RLS：RLS policy 走 setup_*_rls procedure、不散刻 CREATE POLICY
- [ ] L5 RLS：join table 有對應 RLS（setup_join_table_rls）
- [ ] L6 SSOT：codes.ts 中央編號產生、0 處 inline 編號
- [ ] L6 SSOT：db-error-translate.ts 中央錯誤翻譯、0 處 raw error.message return
- [ ] L6 SSOT：audit context recordApiAuditContext 在所有 API 寫入 route

### SSOT 對齊

- [ ] SSOT 1（路由）：modules/ 定義的模組都有對應 app/(main)/ page.tsx（或合理缺少說明）
- [ ] SSOT 2（Capabilities）：codegen:permissions 衍生正常、0 drift
- [ ] SSOT 3（Module-tabs）：module-tabs.ts 與 modules/ 對齊（3 個已廢 bot module drift 需確認）
- [ ] SSOT 4（Features）：features.ts 與 modules/ 對齊
- [ ] SSOT 5（Seed migration）：seed migration 為所有現存 workspace 建預設 feature / capability

### 抽象層採用

- [ ] entity hook 覆蓋率 > 80%（有 CRUD 的 table 都對應有 hook）
- [ ] apiMutate 有 caller（非 0）
- [ ] invalidate helper export 完整（所有 entity 都 export invalidate）
- [ ] 頁面 / component 無直接 useSWR（新犯為 0）

---

## 資安層面

### 紅線遵守

- [ ] 紅線 0：無 `if (isAdmin)` 繞道權限檢查
- [ ] 紅線 0：無 `requireCapability('platform.is_admin')` 引用
- [ ] 紅線 0：無 hardcode 漫途 workspace 特例
- [ ] 紅線 A：workspaces RLS NO FORCE
- [ ] 紅線 B：所有 created_by / updated_by / performed_by FK 指 employees(id)
- [ ] 紅線 B：無 `|| ''` 空字串 FK
- [ ] 紅線 C：admin client per-request、新建非 singleton
- [ ] 紅線 D：無 unlock / reopen / override 函式名
- [ ] 紅線 D：closed period 已確認的記錄不能改數字
- [ ] 紅線 E：audit:writes 0 撞車
- [ ] 紅線 F：散刻 `mutate('字串')` 為 0
- [ ] 紅線 F：ESLint rule `no-direct-supabase-writes` 存在且 active
- [ ] 紅線 G：SWR cache key 帶 user_id 後綴
- [ ] 紅線 G：登入 / 登出時 clearAllSwrCacheKeys()

### RLS 覆蓋

- [ ] 所有業務表有至少 1 個 RLS policy
- [ ] RLS policy 使用 has_capability_for_workspace() 或對應 scope 檢查
- [ ] 無散刻 `auth.uid()` 或未包裝的 session 檢查
- [ ] cross-tenant 滲透測試能通過

### 滲透測試

- [ ] login-api.spec.ts 能跑過（防「動 RLS 全員登不進去」事故）
- [ ] cross-tenant.spec.ts 有執行記錄
- [ ] RLS audit workflow 在 CI 存在且正常

---

## 效能層面

### SWR Cache

- [ ] 散刻 `mutate('字串')` 為 0（已有修復）
- [ ] 頁面 / hook 直接 useSWR 統計 = 0（新犯）
- [ ] per-user cache key 防污染：0 處污染
- [ ] realtime 訂閱與 Supabase publication 對齊（無「訂了白訂」）
- [ ] todos / cis_* 等需要 realtime 的 table 已在 publication

### 列表效能

- [ ] 預設 20 筆、分頁 15 筆一致性（無例外）
- [ ] 無「每頁筆數」選擇器
- [ ] server-side filter vs client-side filter 使用正確（無過度讀取）
- [ ] 列表搜尋走 PostgREST query string

### 連線策略

- [ ] Layout context SSOT：useLayoutContext 一次抓所有
- [ ] Hydration race 防護：_hasHydrated 等到才 redirect/use data
- [ ] 防連點：所有「儲存 / 刪除 / 確認」按鈕有 disabled={loading}
- [ ] 寫入失敗時 client state 還原 + toast

---

## 開發品管

### 測試覆蓋

- [ ] 單元測試在關鍵路徑存在（utils / service / entity hook）
- [ ] E2E login-api.spec.ts 能跑且通過
- [ ] E2E cross-tenant.spec.ts 有執行記錄
- [ ] 並發測試（編號撞號）有執行記錄

### CI/CD

- [ ] audit:rls workflow 存在
- [ ] audit:writes workflow 存在（或在 audit:rls 內）
- [ ] audit:realtime workflow 存在
- [ ] `SUPABASE_DB_URL` secret 在 GitHub 設定
- [ ] pre-commit hook 存在且綠燈
- [ ] PR 會擋 merge（有 error 等於 fail）

### Lint / Typecheck

- [ ] `npm run type-check` 全綠（0 error）
- [ ] `npm run lint` 全綠（無新 console.log）
- [ ] ESLint rule `no-direct-useswr-in-pages` active
- [ ] ESLint rule `no-direct-supabase-writes` active
- [ ] Baseline ratchet 機制正常（修一個少一個）

---

## 優先修復

### P0（立即）

- [ ] 紅線 B migration apply（tour_control_forms / image_library / file_system）
- [ ] SUPABASE_DB_URL secret 設定到 GitHub

### P1（一週內）

- [ ] SWR baseline ratchet：151 處散刻寫入分批清理
- [ ] 已廢 bot module drift 清理（facebook_bot / instagram_bot capability drift）
- [ ] travel_invoice 模組決策與執行

### P2（兩週內）

- [ ] 紅線 D 其他模組 closed period guard
- [ ] CIS 模組決策（補 schema 或移除前端）
- [ ] ESLint rule 升 'error'（已完成 baseline）

---

## 核查說明

- ✅ = 完全通過
- ❌ = 未通過、需要修復
- ⏳ = 待確認（需 DB 連線或 William 決策）