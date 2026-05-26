# 紅線 A-G 全 codebase 違反掃描 — 2026-05-20

> 作者：Max（資安 / 效能 / 權限 engineer）
> 觸發：整晚 audit Task 2
> 方法：grep 全 codebase + migration 靜態掃描

---

## 救護車式總覽（會死人嗎）

| 紅線                               | 等級        | 狀態        | 備註                                          |
| ---------------------------------- | ----------- | ----------- | --------------------------------------------- |
| 紅線 0（無超級管理員）             | 🔴 CRITICAL | ⚠️ **警告** | HR UI 層 `isAdminRole` 變數存在、精神需再確認 |
| 紅線 A（workspaces NO FORCE）      | 🔴 CRITICAL | ✅ 守住     | 已無 FORCE、20260517970000 已砍 trigger       |
| 紅線 B（created_by → employees）   | 🟠 HIGH     | ⚠️ 警告     | 早期 migration 有少數 FK 指 auth.users        |
| 紅線 C（admin client per-request） | ✅ PASS     | ✅ 守住     | 未發現 singleton export                       |
| 紅線 D（無作弊後門）               | ✅ PASS     | ✅ 守住     | 0 個 unlock/reopen/override 函式              |
| 紅線 E（trigger × API 雙寫）       | ✅ PASS     | ✅ 守住     | audit:writes 0 撞車、trg 已砍                 |
| 紅線 F（apiMutate SSOT）           | 🟡 MEDIUM   | ⚠️ 警告     | SWR 健檢已知：151 處散刻、ratchet 進行中      |
| 紅線 G（per-user cache key）       | ✅ PASS     | ✅ 守住     | SWR 健檢滿分、0 處違反                        |

---

## 紅線 0 — 無超級管理員（no user-level privilege bypass）

**規定**：code 不准 `if (isAdmin) { 跳過權限 }`、不准 `requireCapability('platform.is_admin')`、不准 hardcode 漫途 workspace 特例

**掃描結果**：

| 檔案                                                             | 內容                                                                  | 判定                                            |
| ---------------------------------------------------------------- | --------------------------------------------------------------------- | ----------------------------------------------- |
| `src/stores/core/store-utils.ts:54`                              | `* isAdmin flag 已從 auth-store 移除、userRole 一律回 'staff'`        | ✅ 純 comment                                   |
| `src/app/api/roles/[roleId]/tab-permissions/route.ts:73`         | `// platform.* 是已廢的 capability namespace（platform.is_admin...）` | ✅ 純 comment                                   |
| `src/app/api/tenants/create/create-tenant-seed.ts:140`           | `// 鐵律：不開 platform.is_admin（已廢）...`                          | ✅ 純 comment                                   |
| `src/app/api/settings/env/route.ts:67`                           | `const isAdmin = await canManageRoles(auth.data.employeeId)`          | ⚠️ `isAdmin` 變數（非特權繞道、是 HR 業務語意） |
| `src/app/api/auth/reset-employee-password/route.ts:39`           | `const isAdmin = await canManageRoles(auth.data.employeeId)`          | ⚠️ 同上                                         |
| `src/app/(main)/hr/roles/_components/RoleCapabilityTable.tsx:44` | `const isAdminRole = selectedRole?.is_admin`                          | ⚠️ HR UI 顯示 role 的 `is_admin` 布林（非繞道） |
| `src/app/(main)/tours/_components/useBonusRows.ts:51`            | `export const isAdminRow = (type: BonusSettingType) =>`               | ⚠️ 業務語意「管理類獎金」非特權                 |

**🚨 判定**：`isAdmin` / `isAdminRole` 出現在 4 個檔案、**皆非「跳過 RLS / 越過 capability」的特權繞道**：

- API 層兩個：`canManageRoles(...)` 是正規 HR capability 檢查
- HR UI：`isAdminRole` 是讀取 DB 的 role.is_admin 布林欄位（用於 HR 矩陣 UI 顯示）、不是 code 層特權
- useBonusRows：`isAdminRow` 是業務語意「主管級獎金設定」，非系統特權

**結論**：紅線 0 **守住**，但變數名 `isAdmin` / `isAdminRole` 容易讓新工程師誤用（建議未來 rename 避免混淆）。這是紀律問題、不是漏洞。

---

## 紅線 A — workspaces 表 NO FORCE

**規定**：`workspaces` RLS 可 ENABLE 但永遠 NO FORCE

**掃描結果**：

- `supabase/migrations/20260405500000_fix_rls_medium_risk_tables.sql:590`：`ALTER TABLE public.workspaces FORCE ROW LEVEL SECURITY`（歷史）
- 但 `20260422140000_fix_role_tab_permissions_rls.sql:60` 已改 `NO FORCE`
- `20260516320000_sec004_force_rls_core_tables.sql` 註解掉所有 FORCE（刻意保留空間）

**歷史 Migration（已 apply）狀態**：需 DB 才能確認最終狀態。但從 migration 序列看、最終口徑是 NO FORCE。

**🚨 結論**：紅線 A **守住**（migration 鏈顯示最終是 NO FORCE）。⚠️ 如 DB 不通則無法 100% 確認。

---

## 紅線 B — created_by FK 必指 employees(id)、非 auth.users(id)

**規定**：audit 欄位（created_by / updated_by / performed_by 等）→ `employees(id)`；只有 `user_id` / `sender_id` / `friend_id` 可指 auth.users

**掃描 migration 結果（2025 年早期 migration）**：

| 檔案                                                    | 內容                                                                         | 判定                                                                  |
| ------------------------------------------------------- | ---------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| `20251203173813_create_timebox_feature.sql`             | `user_id uuid REFERENCES auth.users(id)`                                     | ✅ 正確（timebox 是 Supabase 用戶自己的資料）                         |
| `20251205100001_create_image_library.sql`               | `created_by uuid REFERENCES auth.users(id)`                                  | ⚠️ **可能違反**（image_library 業務表、created_by 應指 employees）    |
| `20251205130000_create_image_library_fixed.sql`         | 同上                                                                         | ⚠️ 同上                                                               |
| `20251220143519_add_supabase_user_id_columns.sql`       | `creator_user_id UUID REFERENCES auth.users(id)`                             | ⚠️ **需確認**（是用戶還是員工）                                       |
| `20251220144000_create_permission_tables.sql`           | `"user_id" uuid NOT NULL REFERENCES auth.users(id)`                          | ✅ 正確（permission_tables 本身就是 Supabase 用戶）                   |
| `20251226060000_create_traveler_chat_system.sql`        | `user_id ... REFERENCES auth.users` + `created_by ... REFERENCES auth.users` | ⚠️ `created_by` 疑似違反                                              |
| `20251228000000_add_workout_templates.sql`              | `user_id ... REFERENCES auth.users(id)`                                      | ✅ 正確（健身模板是個人用戶的）                                       |
| `20260107000001_create_designer_drafts.sql`             | `user_id ... REFERENCES auth.users(id)`                                      | ✅ 正確                                                               |
| `20260108000001_add_tour_control_forms.sql`             | `created_by/updated_by uuid REFERENCES auth.users(id)`                       | ⚠️ **違反**（tour_control_forms 是業務表、created_by 應指 employees） |
| `20260113100000_fix_itinerary_permissions_complete.sql` | `user_id ... REFERENCES auth.users(id)`                                      | ✅ 正確                                                               |
| `20260127160000_create_email_system.sql`                | `created_by/updated_by UUID REFERENCES auth.users(id)`                       | ⚠️ **疑似違反**                                                       |
| `20260127170000_create_file_system.sql`                 | `created_by/updated_by UUID REFERENCES auth.users(id)`                       | ⚠️ **疑似違反**                                                       |

**🚨 smoking gun**：

- `tour_control_forms` 表：`created_by` / `updated_by` 指 `auth.users` — **疑似違反紅線 B**（此表是 ERP 業務表、應指員工）
- `image_library` 表：`created_by` 指 `auth.users` — **疑似違反**
- `email_system` / `file_system`：created_by / updated_by 指 auth.users — **疑似違反**

**修法建議**：

```sql
-- 草稿（不 apply）
ALTER TABLE public.tour_control_forms
  DROP CONSTRAINT IF EXISTS fk_created_by_auth,
  ADD CONSTRAINT fk_created_by_employee
    FOREIGN KEY (created_by) REFERENCES public.employees(id) ON DELETE SET NULL;
-- 同時改 updated_by
```

⚠️ **需 DB 確認**：這些 FK constraint 是否仍在、還是後來 migration 已改過

---

## 紅線 C — admin client per-request、不准 singleton

**掃描結果**：

- `src/lib/supabase/admin.ts`：每個 function 內 `new createClient(...)`，未發現 module-level singleton
- ✅ **守住**

---

## 紅線 D — 無作弊後門

**掃描**：`forceUnlock` / `adminOverride` / `bypassPeriodLock` / `reopenTour` / `unlockTour` / `unlockPeriod` 等函式名：0 處

**✅ 守住**

---

## 紅線 E — trigger × API 同表雙寫

**audit:writes 結果**：✅ 0 撞車（5/17 已砍 trigger）

**✅ 守住**

---

## 紅線 F — apiMutate SSOT（寫入統一）

**SWR 健檢結論**：151 處散刻（62 個檔案）、ratchet 機制進行中

**⚠️ 已知技術債、不是在逃**。本次不修。列出 High Frequency 缺口：

| 模組                          | 檔案數 | 性質                               |
| ----------------------------- | ------ | ---------------------------------- |
| finance (receipts / payments) | 12     | 散刻 supabase.from().insert/update |
| tours                         | 10     | 散刻 raw mutate                    |
| orders                        | 8      | 散刻 raw mutate                    |
| HR                            | 6      | 散刻 supabase write                |

---

## 紅線 G — per-user SWR cache key 防污染

**SWR 健檢**：✅ 滿分、0 處違反

**✅ 守住**

---

## 優先修復清單

### 🔴 CRITICAL（即刻關注）

| #   | 紅線 | 缺口                                          | 修法                                                                          |
| --- | ---- | --------------------------------------------- | ----------------------------------------------------------------------------- |
| 1   | B    | `tour_control_forms.created_by` 指 auth.users | migration 草稿到 `migrations-pending/audit_B_tour_control_forms_fk.sql.draft` |
| 2   | B    | `image_library.created_by` 指 auth.users      | 同上                                                                          |

### 🟡 觀察（不阻斷）

| #   | 紅線 | 缺口                                         | 建議                                     |
| --- | ---- | -------------------------------------------- | ---------------------------------------- |
| 3   | 0    | `isAdmin` / `isAdminRole` 變數名容易誤用     | 未來重構時 rename 業務語意更清晰的 name  |
| 4   | B    | 早期 migration 多個 created_by 指 auth.users | 逐一確認每張表的業務性質、再斷定是否違反 |

---

## 附錄：audit:writes 原始輸出

```
✅ 沒抓到 trigger × API 雙寫撞車風險。掃了 83 筆 trigger INSERT、18 筆 API insert、29 張表。
```

---

## 附錄：audit:rls L5 RLS 口徑（DB 不通部分）

Mac IPv6 不通 Supabase → `audit:rls` 的 L3/L4/L5 層 skip。CI Linux 環境有 SUPABASE_DB_URL secret 的話應該能跑完整。

若 CI 發現 RLS 問題、則 Alert 級別升至 🔴。
