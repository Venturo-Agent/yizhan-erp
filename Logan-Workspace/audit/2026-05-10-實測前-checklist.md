---
date: 2026-05-10
author: Logan
type: audit
scope: yizhan-erp / feature/onboarding-fix-pack-2026-05-10
purpose: 老大實測前的「預期失敗點 + 測試順序」清單
related:
  - "[[2026-05-10-API-守門普及率盤點]]"
  - "[[2026-05-10-venturo-aierp-architecture-audit]]"
  - "[[2026-05-10-工作交接卡]]"
---

# 實測前 checklist（A）

> [!important] 用法
> 老大實測時拿著這份。「正常 vs 預期會有問題 vs 一定是 bug」三類標清楚、撞牆時知道是哪一類、再決定要不要回報 / 修。

---

## 〇、TL;DR — 實測順序

> 順序設計原則：先解登入 → 再驗 onboarding（最新功能） → 再掃 refactor 受影響頁（最大 regress 風險） → 最後測穩定區。

### 第 1 階段：登入入場
1. **`/login` email 登入**（新功能）
2. **首次登入強制改密**（驗 `must_change_password` 流程）
3. **登入後 `/dashboard` 渲染**（ModuleGuard 第一道驗）

### 第 2 階段：Onboarding 三維（這 14 commits 的核心）
4. **`/workspaces` 列表**（原 /tenants 改名）
5. **建立新 workspace**（驗預設密碼公式 + 三維 backfill + workspace_features）
6. **`/settings/organization` 三維品牌 / 分公司 / 部門**（新子頁、UI 折疊規則）
7. **`/settings/company` 公司資料**（tax_id + 銀行欄位）
8. **`/library/suppliers` 國內 / 國外 + 銀行 combobox**（新欄位）

### 第 3 階段：Refactor 受影響頁（regress 風險高）
9. **`/library`** + 4 個子頁（customers / attractions / suppliers / archive-management）
10. **`/tours`** + `/tours/[code]`（雙倉庫整合）
11. **`/orders`**
12. **`/finance`** 全套（payments / requests / treasury / disbursement / reports / settings）
13. **`/hr`** + `/hr/roles`
14. **`/todos`** / `/calendar`

### 第 4 階段：穩定區（變化少、regress 機率低）
15. **`/accounting`** 全套（11 頁、本輪沒大動）
16. **`/cis`** （守門改 platform.is_admin、要 admin 才看得到）

---

## 一、登入流程涉及的檔 / row

### 涉及檔案

| 角色 | 路徑 |
|---|---|
| 登入頁 UI | `src/app/(main)/login/page.tsx` |
| 登入 labels | `src/app/(main)/login/constants/labels.ts` |
| 登入錯誤頁 | `src/app/(main)/login/error.tsx` |
| Server middleware | `src/middleware.ts` |
| 驗證 API | `src/app/api/auth/validate-login/route.ts` |
| 同步 employee | `src/app/api/auth/sync-employee/route.ts`（解 cookie 雞生蛋）|
| 登出 | `src/app/api/auth/logout/route.ts` |
| 改密碼 | `src/app/api/auth/change-password/route.ts` |
| HR 重設員工密碼 | `src/app/api/auth/reset-employee-password/route.ts` |
| Layout context | `src/app/api/auth/layout-context/route.ts` |
| Server-side auth helper | `src/lib/auth/server-auth.ts` |
| Capability gate | `src/lib/auth/require-capability.ts` |

### 登入需要的 row（DB 資料）

要能登入、DB 必須有：

1. **`workspaces`** 至少 1 筆（你輸入的「公司代號」要對得上 `code`、大小寫不敏感）
2. **`employees`** 至少 1 筆、`workspace_id` 對得上、且：
   - 有 `email` **或** `employee_number`（任一 match 就行）
   - 有 `user_id`（指向 `auth.users.id`）
   - `status` 不是 disabled
   - `login_locked_until` 不是未來時間
3. **`auth.users`** 對應的 `user_id` 要有 `email`（**強制 SSOT**、新版不再用 `username` 欄位 fallback）
4. **`profiles`** 跟著 `auth.users` 走（registration trigger 自動建）

### 登入流程（middleware → API → cookie）

```
GET /              ← 訪客
↓
middleware.ts     檢查 isPublicPath / isAuthenticated
↓                  失敗 → redirect /login (PUBLIC)
GET /login         登入頁、表單（公司代號 / 帳號 / 密碼）
↓
POST /api/auth/validate-login   ← public route（在 EXACT_PUBLIC_PATHS）
  1. 用 code 找 workspace（找不到回「帳密錯誤」、避免列舉公司代號）
  2. email match → 否則 employee_number fallback（向下相容舊員工）
  3. supabase.auth.admin.getUserById → 拿 auth email
  4. supabase.rpc('verify_auth_password') → bcrypt 驗
  5. 設 session cookie、回員工資料
↓
首次登入：must_change_password=true → redirect /change-password?reason=first_login
↓
POST /api/auth/sync-employee  （解登入時 cookie 尚未就緒、自帶 access_token）
↓
進入 /dashboard
```

### 預設密碼公式（新 workspace）

> 老大用 `/workspaces` → 「建立租戶」流程創新 workspace 時、第一個 admin 員工自動建：

```
密碼 = {WORKSPACE_CODE}-{TAX_ID}
範例 = JINYANG-12345678  （workspace.code = JINYANG、workspaces.tax_id = 12345678）
```

- workspace_code uppercase
- tax_id 必須 8 碼數字（API 強制驗）
- `must_change_password=true` 自動設、登入後跳改密頁

### 已知預期失敗點

> [!warning] 登入會撞的常見點
> 1. **employee 沒 user_id** → 「無法登入」、看 server log `Employee X@Y 缺少 user_id`
> 2. **auth.users 沒 email** → 同上、log `Auth user X 無 email`
> 3. **workspace.code 大小寫** → API 統一 uppercase、輸入 jinyang 也行
> 4. **workspace 不存在** → 回「帳密錯誤」（**不是「公司不存在」**、刻意避免列舉）
> 5. **must_change_password** → 登入後沒進 dashboard、跳改密頁、是預期
> 6. **rate limit** → 連續錯誤多次會被擋、看 `login_locked_until`
> 7. **email 換了沒同步**：employees.email 跟 auth.users.email 不一致、用 employee_number 還可登

---

## 二、14 commits 累計打到的功能

> 範圍：`fe897df..HEAD`、共 18 個 commits、扣 4 個 docs/chore = **14 個實質功能 commits**。

### 2-1 Commit-by-commit 影響表

| Commit | 類別 | 主要影響面 | 風險 |
|---|---|---|---|
| `9a2bd21` | fix | suppliers backfill / bank_accounts ALTER 包 EXCEPTION | 低（修 migration 容錯）|
| `2ab66ba` | fix | onboarding-types client cast（types 暫補）| 低（type 編譯）|
| `719c07a` | feat | BankCombobox / supplier is_domestic / 組織管理子頁 | **高** — 新 UI |
| `d0bb766` | feat | 三維 / 多分公司多部門 / 預設密碼公式 / email 登入 | **高** — 核心 |
| `8d0dbf8` | feat | onboarding fix pack schema | **高** — DB 大動 |
| `b97a581` | refactor | /cis 移到平臺側、走 platform.is_admin | 中 — 守門改 |
| `12b1913` | refactor | tours/quotes/itinerary 雙倉庫整合、砍 src/features | **高** — 169 檔 |
| `fd15adb` | refactor | disbursement/orders/finance 雙倉庫整合 | **高** — 121 檔 |
| `21176b2` | refactor | hr/todos/dashboard/calendar 雙倉庫整合 | 中 — 47 檔 |
| `eb38d20` | refactor | tenants→workspaces / unauthorized→no-access 改名 | 中 — link / redirect |
| `5320934` | refactor | /library 新主頁、砍 /database 整個資料夾 | 中 — 路由換家 |
| `c5868e5` | refactor | customers 搬到 /library/customers 子母結構 | 中 |
| `6b320f5` | refactor | archive-management 搬到 /library/* | 中 |
| `dfcd23e` | refactor | attractions 合併雙倉庫到 /library/* | 中 — 33 檔 |
| `fe897df` | refactor | suppliers 合併雙倉庫到 /library/* | 中 |

### 2-2 哪些頁「新版」（重點測新功能、撞 bug 多半是真 bug）

| 頁 | 驗什麼 |
|---|---|
| `/login` | email 登入 + employee_number fallback、首次強制改密 |
| `/workspaces` | 列表（原 /tenants 改名、所有舊 link 應已改）|
| `/workspaces/[id]` | 編輯 workspace、含 tax_id |
| `/settings/organization` | 三維品牌 / 分公司 / 部門、UI 折疊規則（1 筆藏、2+ 展開）|
| `/settings/company` | 加 tax_id 跟 bank_code 欄位 |
| `/library/suppliers` | is_domestic 切換 + BankCombobox（國內顯示銀行下拉）|
| `/no-access` | 原 /unauthorized 改名 |
| `/cis` / `/cis/[id]` / `/cis/pricing` | 守門改 platform.is_admin（要 admin 才進得去）|

### 2-3 哪些頁「可能 regress」（refactor 受影響、要重點掃功能完整）

> 雙倉庫整合 = 把 `src/features/X/` 跟 `src/app/(main)/X/_components/` 合一、砍 src/features。所有 import path 變動、state 共享重新搬、有機率漏東西。

| 頁 | 受影響 commit | 重點掃什麼 |
|---|---|---|
| `/tours`、`/tours/[code]` | 12b1913 | 列表渲染、進團詳細、quote / itinerary tab |
| `/orders` | fd15adb | 列表 + CRUD |
| `/finance` | fd15adb | dashboard、子頁 navigation |
| `/finance/payments` | fd15adb | 收款列表、新增、確認 |
| `/finance/requests` | fd15adb | 請款列表、新增 |
| `/finance/treasury` | fd15adb | 金庫總覽 |
| `/finance/treasury/disbursement` | fd15adb | 出納撥款 |
| `/finance/reports` | fd15adb | 報表 |
| `/finance/settings` | fd15adb | 付款方式 / 科目 |
| `/hr` | 21176b2 | 員工列表、職務管理 |
| `/hr/roles` | 21176b2 | 職務細節、tab 權限 |
| `/todos` | 21176b2 | 看板、column / card |
| `/calendar` | 21176b2 | 行事曆 |
| `/dashboard` | 21176b2 | 首頁 widget |
| `/library`（新主頁）| 5320934 | 子頁進入點 |
| `/library/customers` | c5868e5 | 客戶列表 + CRUD |
| `/library/attractions` | dfcd23e | 景點列表 |
| `/library/archive-management` | 6b320f5 | 檔案管理 |
| `/library/suppliers` | fe897df + 719c07a | 供應商 + is_domestic + bank |

### 2-4 哪些頁「沒打到」（穩定區、撞 bug = 真 bug）

| 頁 | 狀態 |
|---|---|
| `/accounting`（11 頁全套）| 本輪沒大動 |
| `/settings/personal` | 微調、應穩 |

---

## 三、需要設置的 capability / workspace_features

### 3-1 ModuleGuard 兩道 gate

> [!info] 邏輯
> ```
> 路由 → ModuleGuard:
>   ① workspace_features：workspace 沒「買」這個功能 → /no-access
>   ② role_capabilities：role 沒給 module 任一 tab 權限 → /no-access
> 平台路由（/workspaces / /cis）特殊：
>   走 PLATFORM_CAPABILITY_ROUTES、要 platform.is_admin capability、不走 features
> ```

### 3-2 workspace_features 預設值（新建 workspace 時）

`tenants/create` 自動插入：

**免費（預設開）**：
```
dashboard / calendar / workspace / todos / tours / orders / quotes
finance / database / hr / settings / customers / itinerary
```

**Premium（預設關、要付費 / 手動開）**：
```
accounting / office
```

### 3-3 ⚠️ 已發現的 feature / module 不一致

> [!bug] 潛在 onboarding bug — 待 William 拍板
>
> | 來源 | 列表 |
> |---|---|
> | `MODULES`（src/lib/permissions/module-tabs.ts）| calendar / todos / tours / orders / finance / accounting / office / hr / database / settings / **cis** |
> | `freeFeatures`（tenants/create）| dashboard / calendar / workspace / todos / tours / orders / quotes / finance / database / hr / settings / customers / itinerary |
> | `premiumFeatures` | accounting / office |
>
> 不一致：
> 1. **MODULES 有 `cis` 但 free / premium 都沒** → 新建 workspace 不會插入 `cis` 的 workspace_features 記錄
>     - 但 `/cis` 是 `PLATFORM_CAPABILITY_ROUTE`、走 `platform.is_admin` 不走 features → **OK、不影響實測**
> 2. **freeFeatures 有 `quotes / customers / itinerary / workspace / dashboard` 但 MODULES 沒這些** → 這些是「子功能」級別、跟 module 不同階層
>     - 影響面：`useWorkspaceFeatures().isRouteAvailable()` 行為要驗
>     - **實測重點**：`/library/customers` 在新 workspace 進得去嗎？（`customers` feature 預設開、應該 OK）
>
> 老大、這條我不敢直接判定 bug、需要你看一下「workspace_features 跟 MODULES 的階層關係是不是刻意分開」。

### 3-4 實測需要的 capability（最少集合）

要用一個有「全功能」的 admin 帳號實測、role 必須給：

```
platform.is_admin    （/workspaces, /cis 才看得到）
settings.company.read / write
settings.env.write
finance.settings.read / write
+ 各 module 的 read / write tab capabilities
```

**最簡：用 onboarding 流程創出來的「第一個系統主管」帳號** — 它預設掛了 admin role、應有所有 capability。

### 3-5 HR / role 沒設好會撞 /no-access

| 場景 | 表現 |
|---|---|
| Role 沒掛 `platform.is_admin` | `/workspaces`、`/cis` 進不去（`/no-access`）|
| Role 沒給 module 任一 tab 權限 | 該 module 整個 module 進不去 |
| workspace_features 該 module 沒開 | 該 module 整個進不去 |
| 雙條件都過、但 tab 級沒給 | 進得去頁、但 tab 內按鈕 disabled / 隱藏 |

**判別**：撞 `/no-access` 時、看 ModuleGuard 是因為 ① features 還是 ② capabilities — 開 console 看 `useWorkspaceFeatures().isRouteAvailable` 跟 `useMyCapabilities().canReadAnyInModule` 各回什麼。

---

## 四、已知 pre-existing 問題（你會撞、不是我們 commit 造成）

> [!note] 這節 reference 上一輪盤點數字（[[2026-05-10-venturo-aierp-architecture-audit]]）、Logan 本次未實際跑 vitest / lint 驗證。
> **如果數字跟現況有出入、以實際 npm test / npm run lint 為準。**

### 4-1 12 處 audit FK 違規（指 auth.users）
- audit_logs / audit context 一些 column 直接 FK 到 `auth.users`、不過 `profiles`
- 後果：刪 user 時 cascade 行為不一致、查歷史 join 路徑混亂
- **影響實測**：低（不是 runtime error、是 data integrity）

### 4-2 3 處 deleted_at 註解殘留
- 之前砍 soft delete 政策、有 3 處 code / comment 還寫 `deleted_at`
- 影響實測：低（是註解、不影響功能）

### 4-3 36 個 pre-existing vitest fail
- 跑 `npm test` 會看到 36 個紅、不是這次 commit 造成
- **影響實測**：低（測試環境、不影響真實流程）
- 想驗的話：`npm test 2>&1 | tail -20` 看 summary、跟「36」對得上就是 pre-existing

### 4-4 368 個 lint warnings
- 跑 `npm run lint` 會看到一堆黃
- 以 `unused-vars` / `any` / `prefer-const` 為主
- **影響實測**：零（lint 不擋 build）

### 4-5 不在這 14 commits 範圍但要注意
- `withAudit` wrapper 普及率 0%（**0 / 58 個 API**、是設計做了沒落地、不是 regress）
- 詳見 [[2026-05-10-API-守門普及率盤點]]

---

## 五、Onboarding 三維流程預期失敗點

新建 workspace 跑完 `tenants/create`、會自動：
1. 建 workspaces row（含 tax_id、is_multi_branch、is_multi_department 等）
2. 建第一個 employee（admin）+ 對應 auth.users（密碼 = 公式）+ profile
3. 建三維 default：`brands` / `branches` / `departments` 各 1 筆 placeholder（is_default=true）
4. 把 admin 員工掛三維 default（`employee_brands` / `_branches` / `_departments`、is_primary=true）
5. 預設 workspace_features 全套（free 開、premium 關）
6. 預設 modules / tabs 的 workspace_features `${module}.${tab}`

### 預期失敗點

> [!warning] 可能撞到的點
> 1. **tax_id 不是 8 碼數字** → API 400 `公司統編必須為 8 碼數字`
> 2. **adminEmail 已被 auth.users 用過** → 撞 unique（同 workspace email unique 由 `employee_email_unique` 約束守）
> 3. **workspace_code 重複** → 撞 unique
> 4. **三維 backfill migration 對 existing workspace 沒跑乾淨** → 老的 workspace 可能沒 default brand/branch/department、會出錯
>     - 驗法：DB 看 `SELECT workspace_id, COUNT(*) FROM brands GROUP BY 1`、每個 workspace 都至少 1 筆
> 5. **employee_email_unique 約束** → 同 workspace 兩個 employee 同 email 會撞、新增員工要驗

### `/settings/organization` UI 折疊規則

| 該維度資料 | UI 行為 |
|---|---|
| 1 筆 placeholder（is_default=true）| section 折疊、藏住 |
| 2+ 筆 | section 預設展開、可 CRUD |

**實測**：
- 新 workspace 進去 → 三 section 都折疊（每維度 1 筆）✓
- 點「我要管理 X」展開新增第二筆 → 該 section 變展開狀態
- 重新整理頁 → 應記得展開狀態（如果是按資料量判定、就會展開）

---

## 六、Migration 對帳（D 的範圍、本次無法驗）

8 個 onboarding fix pack migrations：

```
20260510120000_onboarding_fix_pack_workspaces_extras.sql
20260510120100_onboarding_fix_pack_three_dimensions.sql
20260510120200_onboarding_fix_pack_employee_dimensions.sql
20260510120300_onboarding_fix_pack_ref_banks.sql
20260510120400_onboarding_fix_pack_suppliers_is_domestic.sql
20260510120500_onboarding_fix_pack_backfill_dimensions.sql
20260510120600_onboarding_fix_pack_employee_email_unique.sql
20260510120700_onboarding_fix_pack_workspaces_bank_code.sql
```

> [!todo] 必須驗
> 這 8 個 migrations **必須先 apply 到 yizhan-erp Supabase（ref=aawrgygqgemgqssflfrx）才能實測**。
> - MCP 看不到這個專案（agency@venturo.tw 帳號）→ 要 source `secrets.env` 用 service_role 直連 REST
> - 詳見 `~/.claude/INFRASTRUCTURE.md`
> - **這部分等 D 跑得了、再回頭驗**

實測前先確認（最低）：
- `workspaces.tax_id` column 存在
- `brands` / `branches` / `departments` table 存在、且每個 workspace 至少 1 筆
- `ref_banks` 有 INSERT 預設值
- `suppliers.is_domestic` column 存在
- `employee_email_unique` 約束存在

---

## 七、實測路線推薦（精簡版、貼上 Telegram）

```
Phase 1 登入 ────────────
  /login → 用 admin 帳號（公司代號 / email or 工號 / 密碼）
  首次登入 → /change-password?reason=first_login
  改完 → /dashboard 渲染

Phase 2 Onboarding ────────────
  /workspaces → 建新 workspace（驗 tax_id 8 碼 / 預設密碼公式）
  /settings/organization → 三維折疊規則
  /settings/company → tax_id + bank_code 欄位
  /library/suppliers → is_domestic 切換 + BankCombobox（國內）

Phase 3 Refactor 區（regress 風險）────────────
  /library + 4 子頁
  /tours / /tours/[code]
  /orders
  /finance 全套（payments/requests/treasury/disbursement/reports/settings）
  /hr / /hr/roles
  /todos / /calendar / /dashboard

Phase 4 穩定區 ────────────
  /accounting 全套
  /cis（要 admin）
```

每個頁面遇到問題、對照本檔判斷類別：
- 「**新版頁撞**」→ 多半真 bug、回報
- 「**refactor 頁撞**」→ 先看是不是 import path / state 沒接好
- 「**穩定區撞**」→ 真 bug、優先回報
- 「**401 / 403**」→ 對照 [[2026-05-10-API-守門普及率盤點]] 第三節 quick reference

---

> [!note] 產出
> Logan / 2026-05-10
> 範圍：14 個 functional commits（fe897df..HEAD）+ 登入流程 + workspace_features 設置
> 限制：未實際跑 npm test / lint、未連 Supabase 驗 schema runtime
> 後續：D（Migration 對帳）等 secrets.env + REST 通了再補
