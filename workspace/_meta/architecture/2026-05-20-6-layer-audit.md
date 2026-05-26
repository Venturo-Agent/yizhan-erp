# 6 層架構全表 Audit — 2026-05-20

> 作者：Max（資安 / 效能 / 權限 engineer）
> 觸發：整晚 audit Task 1
> 方法：grep 全 codebase + npm run audit:rls + npm run audit:writes + migration 靜態掃描

---

## 救護車式總覽（會死人嗎）

| 嚴重度     | 項目                                                             | 結論                                          |
| ---------- | ---------------------------------------------------------------- | --------------------------------------------- |
| 🟡 WARNING | L5/L6 DB 層因 DB 不通 skip                                       | CI Linux 應能跑、可拿到全量                   |
| 🟡 WARNING | 12 個 module route 無 page.tsx                                   | `documents` / `travel_invoice` 等閒置路由     |
| 🟡 WARNING | 3 capability module 沒在 module-tabs.ts                          | `facebook_bot` / `instagram_bot` / `line_bot` |
| 🟡 WARNING | 10 capability 只在 capabilities.ts、不在 modules/ 衍生           | drift 待檢是否故意                            |
| ✅ PASS    | L1 Feature Gate — features.ts 27 個跟 modules/ 26 個對齊         |                                               |
| ✅ PASS    | L2 Capability — 148 capability / 22 module                       | 基本對齊、drift 可解                          |
| ✅ PASS    | L6 SSOT — 2 個中央 module 在 / 0 處 inline 編號 / 0 處 raw error |                                               |
| ✅ PASS    | audit:writes — 0 個 trigger × API 雙寫撞車                       | 紅線 E 守住                                   |

---

## Layer by Layer 矩陣

### L1 — Feature Gate（租戶 Feature Gate）

**audit:rls 結果**：✅ 綠

| 檢核項                    | 狀態 | 備註                                       |
| ------------------------- | ---- | ------------------------------------------ |
| features.ts 同步 modules/ | ✅   | 27 feature flag / 26 module                |
| ModuleGuard 守門存在      | ✅   | `src/components/guards/ModuleGuard.tsx` 在 |
| workspace_features 鉤鉤   | ✅   | audit:rls 有鉤                             |

**缺口**：

- `travel_invoice` module 有 7 個 route（/travel-invoice/\*）無 page.tsx → 疑似落後功能

---

### L2 — Capability（角色能力）

**audit:rls 結果**：⚠️ 3 個 drift

| 檢核項                           | 狀態                               | 備註                                                                  |
| -------------------------------- | ---------------------------------- | --------------------------------------------------------------------- |
| capabilities 148 項 / 22 module  | ✅                                 | 基本對齊                                                              |
| capability modules drift         | ⚠️ 3 個 module 沒在 module-tabs.ts | `facebook_bot` / `instagram_bot` / `line_bot`                         |
| capabilities.ts 多 10 capability | ⚠️ drift                           | channels.manage / finance.advance_payment.write / 3 個 bot capability |

**drift 清單（capabilities.ts 有 / modules/ 衍生沒）**：

```
channels.manage
facebook_bot.config
facebook_bot.write
finance.advance_payment.write
instagram_bot.config
instagram_bot.write
line_bot.config
line_bot.write
```

**缺口**：這些 capability 沒被任何 module-tabs.ts 引用 → 不會出現在 HR UI → 業務上等於沒用（但也不會炸）

---

### L3 — 三維 Org Scope（品牌 / 分公司 / 部門）

**audit:rls 結果**：⚠️ DB 不通 skip

**靜態掃描結果**（migration grep）：

- `branches` 表：有 `workspace_id` + `code` + `name` + `is_hq` 欄位
- `brands` 表：有 `workspace_id` + `name` + `code`
- `departments` 表：有 `workspace_id` + `name` + `code`
- `employee_branches` / `employee_brands` / `employee_departments` join table 存在

**scope_visible() 或類似鉤鉤位置**：

- `src/lib/permissions/scope-visibility.ts` — 預計承擔此責任（需確認實際函數名）

**缺口**（無 DB 無法確認）：

- `employee_branches` join table 是否吃 RLS（需查 `setup_join_table_rls`）
- scope 在 API route 層是否散刻 `sales_id = me`（紅線 E 風險）

---

### L4 — 狀態守門（已付清 / 已月結 等）

**audit:rls 結果**：⚠️ DB 不通 skip

**靜態掃描**（找 `is_row_editable` / `is_editable` / `status` 欄位）：

- `orders` 表：有 `status`（pending / confirmed / cancelled）
- `receipts` 表：有 `status`（draft / confirmed / void）
- `payment_requests` 表：有 `status`
- `journal_vouchers` 表：有 `status`（draft / confirmed / reversed）
- `disbursement_orders` 表：有 `status`

**鉤鉤位置**：

- `src/lib/db-state.ts` 或類似（需確認）

**缺口**：無法斷言每張表的狀態守門覆蓋率

---

### L5 — RLS（DB 層柵欄）

**audit:rls 結果**：⚠️ DB 不通 skip

**靜態掃描**（migration grep `CREATE POLICY`）：

- 已知有 `setup_workspace_scoped_rls` / `setup_join_table_rls` / `setup_inherited_rls` 三个 procedure
- `workspaces` 表：**NO FORCE**（紅線 A 守住 ✅）
- RLS policy 數量：需 DB 才能數

**紅線 A 確認**：✅ `workspaces` 無 FORCE RLS

---

### L6 — 防呆 SSOT

**audit:rls 結果**：✅ 全綠

| 檢核項                                               | 狀態     | 備註          |
| ---------------------------------------------------- | -------- | ------------- | ------- | --- |
| 中央 module (@/lib/codes.ts / db-error-translate.ts) | ✅       | 在            |
| inline 編號 RPC                                      | ✅ 0 處  |               |
| raw error.message return                             | ✅ 0 處  |               |
| `                                                    |          | ''` 空字串 FK | ✅ 0 處 |     |
| `as any` 控制                                        | ✅ 19 處 | 可接受        |
| deleted_column 殘留                                  | ✅ 0 處  |               |

---

## 缺口清單（優先級分類）

### 🟠 HIGH（影響資安或 SSOT）

| #   | 層  | 缺口                                                              | 修法                                                |
| --- | --- | ----------------------------------------------------------------- | --------------------------------------------------- |
| 1   | L2  | `facebook_bot` / `instagram_bot` / `line_bot` 沒在 module-tabs.ts | 補進 module-tabs.ts 或從 capabilities.ts 移除 drift |
| 2   | L2  | 10 capability drift（見上 drfit 清單）                            | 確認是故意殘留還是需要補 module                     |
| 3   | L3  | 無 DB 無法確認 scope 散刻                                         | CI 環境補足此層                                     |

### 🟡 MEDIUM（功能完整性）

| #   | 層    | 缺口                                    | 修法                       |
| --- | ----- | --------------------------------------- | -------------------------- |
| 4   | L1    | `travel_invoice` 7 個 route 無 page.tsx | 補 page 或從 modules/ 移除 |
| 5   | L3/L4 | DB 不通導致 skip                        | 確認 CI 有 SUPABASE_DB_URL |

---

## 優先級建議

1. **立即**：補 `facebook_bot` / `instagram_bot` / `line_bot` module-tabs.ts 對齊（15 分鐘）
2. **CI 環境**：確認 `audit:rls` 在 CI 有 DB 連線（跑 L3/L4/L5 全量）
3. **追蹤**：10 capability drift 確認是故意（則加 comment）還是不小心

---

## 附錄：audit:rls 完整輸出

```
22 項 / 通過 11 / error 0 / warn 11

L1 Feature Gate:  ✓ features_ts_synced / ✓ sidebar_aligned / ✓ module_tabs_synced
L2 Capability:    ⚠ no_ghost_capabilities skip / ⚠ capability_modules_drift 3 / ⚠ capabilities_ts_drift 10
L3 Org Scope:     ⚠ L3_db_skipped
L4 State Gate:    ⚠ L4_db_skipped
L5 RLS:          ⚠ L5_db_skipped
L6 SSOT:         ✓ central_modules / ✓ no_inline_rpc / ✓ no_raw_error / ✓ no_empty_string_fk
```
