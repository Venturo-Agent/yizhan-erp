---
date: 2026-05-13
author: Logan（William 提案）
status: 設計大樓圖、用來對照施工現場
related: 2026-05-12-修復筆記-夜戰計畫.md / venturo-aierp/CLAUDE.md
---

# venturo-aierp SaaS ERP 概念架構（建築設計圖）

## TL;DR

**就是一句話：SaaS ERP、每個請求要過 6 道門**。
6 道門分層各管一件事、合起來形成完整多租戶 ERP。
為什麼一直挖出 bug → **過去寫的人沒看完整 6 道門、有的只蓋了 2-3 道**。

---

## 比喻：6 道門是什麼

```
你 → 客戶大門 → 樓層大門 → 部門大門 → 房間鎖 → 物品櫃 → 收據（取得 / 寫入資料）
      Layer 1   Layer 2    Layer 3   Layer 4  Layer 5   Layer 6
```

| Layer | 守的事 | 譬喻 | 技術 |
|---|---|---|---|
| **L1 租戶 Feature Gate** | 這家公司有沒有買這個功能 | 客戶有沒有買「會計」這層樓的鑰匙 | `workspace_features` |
| **L2 角色 Capability** | 這個員工有沒有這個能力 | 員工的識別證有沒有刷「進部門」的權限 | `role_capabilities` |
| **L3 三維 Org Scope** | 員工屬哪個品牌 / 分公司 / 部門 | 員工只進自己分公司、自己部門的房間 | `branches` / `brands` / `departments` |
| **L4 狀態守門** | 這筆資料現在能不能改 | 已付清的訂單上鎖、不能再開 | `is_row_editable()` |
| **L5 DB RLS** | 資料庫層的隱形柵欄 | 物品櫃的鎖、就算外面警衛失職、櫃子自己擋 | RLS policies |
| **L6 防呆 / SSOT** | 防連點 / 編號不撞 / 錯誤翻譯 | 收據上有防偽碼、不會雙開 | `@/lib/codes` 等中央 module |

**每一道門都要過**、缺一道就會有 bug 從那道漏出來。

---

## 詳細 6 層架構

### L0: 系統基本假設（紅線）

> 在進 6 層之前、先講系統的世界觀

- **所有 workspace 平等**、沒有 platform_owner / agency 之分
- **跨 workspace 能力** = 「我這 workspace 有買 `tenants` feature」（漫途有買、所以漫途能管所有租戶）
- 沒有 hardcoded「if (isAdmin) { 跳過所有檢查 }」這種東西

### L1: 租戶級 Feature Gate（workspace_features）

**白話**：每家公司付錢買了哪些 module

```
client A 買了：tours + hr
client B 買了：tours + finance + cis
```

**實作**：
- DB 表：`workspace_features` (workspace_id, feature_code, enabled)
- UI 守門：`ModuleGuard` 元件、Sidebar 篩選
- 新功能上 / 下線 → 改 workspace_features

**典型錯誤**：
- ❌ 在 code 寫 `if (workspace.code === '漫途')` — 硬編碼、違反平等原則
- ❌ 用 `workspaces.type === 'agency'` 守門（這個欄位已砍）
- ✅ 用 `workspace_features.feature_code === 'tenants' AND enabled = true`

### L2: 角色級 Capability（role_capabilities）

**白話**：員工的識別證能刷哪幾個門

```
業務角色：tours.read / orders.write / customers.read
會計角色：finance.* / accounting.*
助理角色：tours.read / customers.read / quotes.write
```

**實作**：
- DB 表：`workspace_roles`（角色定義）+ `role_capabilities`（角色×能力）
- API 守門：`requireCapability('hr.employees.write')`
- DB RLS：`has_capability_for_workspace(workspace_id, 'X')` function
- UI：按鈕 disabled by capability、Tab 隱藏 by capability

**Capability 命名規則**：`module.tab.action`
- `hr.employees.read` / `finance.payments.write` / `tours.read`
- 跨界能力：`cross_branch.read` / `cross_department.read`

**典型錯誤**：
- ❌ 在 RLS 裡散刻 `sales_id = me` 或 `created_by = me`（紅線：不准）
- ❌ 寫 capability 但沒對應 UI hide（員工看得到按鈕、按下去 403）
- ✅ `has_capability_for_workspace` 統一檢查

### L3: 三維 Org Scope（brand × branch × department）

**白話**：員工屬哪個品牌、哪個分公司、哪個部門 → 預設只看自己的

```
角落旅行社 workspace 內：
├── 品牌：角落旅遊 / 角落郵輪
├── 分公司：台北總部 / 台中分公司
└── 部門：業務部 / OP 部 / 會計部

員工 A：角落旅遊品牌 × 台北分公司 × 業務部 → 預設只看自己的團
員工 B：角落郵輪品牌 × 台北分公司 × OP 部 → 預設只看 OP 接手的團
老闆 / 跨界主管：有 cross_branch.read + cross_department.read → 看全部
```

**實作**：
- DB 表：`brands` / `branches` / `departments`
- Join 表：`employee_brands` / `employee_branches` / `employee_departments`
- DB function：`scope_visible(module, row_id)` 統一守門
- 「自己人」定義：在 row 的 role_assignments 上掛我、或我是該部門主管

**典型錯誤**：
- ❌ 部門主管的「看自己部門」散刻在多處
- ❌ cross_branch.read 寫在 code 但 RLS 沒用
- ✅ 全走 `scope_visible()` function、function 內處理所有 case

### L4: 狀態守門（is_row_editable）

**白話**：已付清的訂單上鎖、已結案的傳票不能改

```
orders.payment_status = 'paid' → 不能改
payment_requests.status = 'approved' → 不能改
receipts.status = 'refunded' → 不能改
journal_vouchers.is_locked = true → 不能改
```

**實作**：
- DB function：`is_row_editable(module, row_id)`
- RLS UPDATE / DELETE policy = `scope_visible AND is_row_editable`
- 雙守門：可看到 + 狀態可改

**典型錯誤**：
- ❌ 前端 hide「編輯」按鈕、但 API 沒擋（API 用 user 改寫資料庫）
- ❌ 編輯狀態邏輯散刻在多處
- ✅ 全走 `is_row_editable()`

### L5: DB RLS（資料庫紅線）

**白話**：應用層警衛失職也守得住的最後一道

```
SELECT  → USING (scope_visible OR workspace_id = mine)
INSERT  → WITH CHECK (workspace_id = mine)
UPDATE  → USING (scope_visible AND is_row_editable) WITH CHECK (same)
DELETE  → USING (scope_visible AND is_row_editable)
```

**3 種標準 pattern**（5/13 抽象層完工）：
- `setup_workspace_scoped_rls(table)` — 表有 workspace_id（customers / suppliers / contracts...）
- `setup_join_table_rls(table, employee_col)` — 員工 join 表（employee_branches...）
- `setup_inherited_rls(table, parent, parent_id_col)` — 子表 inherit parent（payment_request_items...）

**典型錯誤**：
- ❌ FORCE RLS 連 admin 都擋、害寫入炸
- ❌ ENABLE RLS 但 0 policy = 全擋
- ❌ workspace_id IS NULL 的 row 全人都看（policy 寫 OR NULL）
- ✅ 走 3 個 setup procedure、idempotent、自動正確

### L6: 防呆 / SSOT（中央 module 抽象層）

**白話**：所有重複的事、抽到一個地方寫一次

| 重複場景 | 中央 module | 一行替代多行 |
|---|---|---|
| 編號產生 | `@/lib/codes.ts` | `generateOrderNumber(tourId)` 取代前端算碼 |
| 錯誤訊息 | `@/lib/db-error-translate.ts` | `translateDbError(err)` 取代各處英文 raw |
| 防連點 | ESLint `form-dialog-loading-required` | 自動偵測漏 prop |
| audit log | `recordApiAuditContext()` | 一行記錄誰幹了什麼 |
| RLS 套用 | DB procedure × 3 | 1 行 CALL 取代 16 行 CREATE POLICY |

---

## L7: 效能規格（讀寫優化）

> 紅線：**資安 #1 → 效能 #2 → SSOT #3**（CLAUDE.md 優先順位）

### 讀取（SELECT）規格

| 規範 | 說明 | 違反後果 |
|---|---|---|
| 列表預設 **20 筆**、分頁固定 **15 筆** | 不給「每頁筆數」選擇器 | egress 殺手、Supabase 費用爆 |
| SWR `revalidateOnFocus: false` | 切回 tab 不 refetch | 重複 query 浪費 |
| SWR `dedupingInterval: 5min` | 5 分鐘內不重新查 | 同一頁不同 component 各撈一次 |
| **server-side filter** | 列表搜尋必走 PostgREST query string、不全撈再前端 filter | 全撈會 OOM |
| Layout context 一次撈 | `/api/auth/layout-context` 抓 user + employee + workspace + capabilities + features | 每頁各 query 一次 = 多 5 倍 cost |
| Hydration 等 `_hasHydrated` | 不等會空 capabilities → 誤判 unauthorized → redirect 死循環 | 用戶白屏 |
| Realtime 走 `useRealtimeSync()` | entity hook 內建、不自己寫 channel | 重寫的版本通常 leak channel |

**反 pattern**：
- ❌ `useSuppliers({ all: true })` 撈全表客戶（漫途 385 個、再多會炸）
- ❌ 前端 `.filter(s => s.name.includes(q))` 搜尋（query 沒去 DB）
- ❌ 每個 component 自己 `supabase.from('xxx').select('*')`
- ✅ 用 entity hook `useSuppliersPaginated({ search: q, page: 1, pageSize: 15 })`

### 寫入（INSERT/UPDATE）規格

| 規範 | 說明 | 對應 |
|---|---|---|
| **編號走 advisory lock** | DB RPC 自動鎖、防競態 | `@/lib/codes.ts` 全部 |
| **兩步驟操作必 atomic** | INSERT A + INSERT B 要原子（用 RPC / transaction）| 員工 email rollback 教訓 |
| **created_by FK → employees(id)** | 紅線 B、不是 auth.users(id) | 例外見紅線 B 列 |
| **`created_by: currentUser?.id \|\| undefined`** | 不是 `\|\| ''`、空字串會炸 | 紅線 B |
| **儲存按鈕 `disabled={loading}`** | 防連點 | ESLint 強制 |
| **寫入失敗 toast + state 還原** | 不靜默失敗 | UX 防呆 |
| **audit context** | `recordApiAuditContext(client, { actorId, reason })` | 所有寫操作 API |
| **RLS scope_visible + is_row_editable** | UPDATE/DELETE 雙守門 | DB 層 |

### Index 規格

| 表 | 必有 index | 用途 |
|---|---|---|
| 所有有 workspace_id 的表 | `(workspace_id, created_at DESC)` | RLS 過濾 + 列表排序 |
| FK 欄位 | `(<fk_column>)` | join 效能 |
| code / 業務編號 | `(workspace_id, code)` UNIQUE | 防撞 + 查詢 |
| soft delete | `(deleted_at)` partial index | filter 加速 |
| 全文搜尋（之後）| GIN index on `to_tsvector(...)` | 大 dataset search |

### Bundle 優化規格

| 規範 | 對應 |
|---|---|
| 大型 library（jsPDF/xlsx > 100KB）動態 import | `await import('@/lib/...')` |
| 重頁面 `dynamic(() => import('...'), { ssr: false })` | 切 client-only chunk |
| 圖片走 `next/image` | 自動 webp / 多 size |
| 路由 lazy load | Next 自動 |

---

## L8: 撰寫規格（命名 + 結構 + 紅線）

### 命名規範

| 場景 | 規則 |
|---|---|
| **檔案 / 資料夾** | kebab-case (eg. `payment-request.service.ts`) |
| **元件** | PascalCase (eg. `<SuppliersDialog>`) |
| **hooks / functions** | camelCase (eg. `useSuppliers`、`generateOrderNumber`) |
| **常數** | UPPER_SNAKE_CASE (eg. `CAPABILITIES.FINANCE_MANAGE_PAYMENTS`) |
| **DB 表 / 欄位** | snake_case (eg. `payment_requests`、`workspace_id`) |
| **DB RPC / function** | snake_case (eg. `generate_order_number`) |
| **Capability code** | `module.tab.action` (eg. `hr.employees.write`) |
| **Workspace feature code** | 單一 namespace (eg. `tours` / `finance` / `tenants`) |

### 結構規範（前端）

```
src/
├── app/(main)/<module>/           ← 頁面（Next.js App Router）
│   ├── page.tsx
│   ├── _components/               ← 該頁專屬元件（底線開頭、不被 router 看見）
│   ├── _constants/labels.ts       ← 該頁的中文 label（hardcoded 禁止）
│   ├── _hooks/                    ← 該頁專屬 hook
│   └── _services/                 ← 該頁專屬 service
├── app/api/<module>/route.ts      ← API route
├── components/ui/                 ← 共享 UI 元件
├── components/dialog/             ← Dialog 系統元件
├── data/                          ← entity hook（SWR + RLS-aware）
│   └── entities/<table>.ts        ← 標準 entity hook
├── lib/                           ← 中央 module
│   ├── codes.ts                   ← 編號中央
│   ├── db-error-translate.ts      ← 錯誤翻譯
│   ├── auth/                      ← capability / session 守門
│   ├── permissions/               ← capability 常數 + hook
│   └── supabase/                  ← client / types
├── stores/                        ← Zustand store（舊架構、待搬 entity hook）
└── constants/labels.ts            ← 全站共享中文 label
```

### 中文業務語言（CLAUDE.md 哲學 #1）

- William 用中文業務語言講需求 → Claude 翻譯成 code
- 寫 commit / 文件 / chat：**中文業務語言為主、術語必加中文註解**
- 譬喻：客戶跟司機講「載我去市區那家有花園餐廳的飯店」、不講「導航 GPS 經緯度」
- ESLint `venturo/no-hardcoded-chinese-jsx`：JSX 內不准 hardcoded 中文、必抽到 labels constant

### 紅線禁令清單

| 禁忌 | 違反例 | 正確 |
|---|---|---|
| `as any` 蓋 type error | `data as any` | 改 schema / 加 type assertion |
| `: any` 標 type | `(x: any) => ...` | 補正確 type |
| `--no-verify` 跳 hook | `git commit --no-verify` | 修 hook 為什麼擋 |
| `\|\| ''` 空字串 FK | `created_by: user.id \|\| ''` | `\|\| undefined` |
| RLS 散刻 capability | `sales_id = me` 寫進 USING | 走 `scope_visible()` |
| 硬編碼 workspace 特權 | `if (workspace.code === '漫途')` | 走 `workspace_features` |
| platform.is_admin capability | `requireCapability('platform.is_admin')` | 已廢、走 features + capabilities |
| Admin client singleton | `export const admin = ...` | per-request `getSupabaseAdminClient()` |
| FORCE RLS on workspaces | `ALTER TABLE workspaces FORCE` | 紅線 A、會炸登入 |
| hardcoded 中文 JSX | `<Button>儲存</Button>` | `<Button>{L.save}</Button>` |
| 撈全表前端 filter | `.from('x').select('*')` + JS filter | server-side filter |
| 自己 inline supabase.rpc 編號 | `supabase.rpc('generate_x')` | 走 `@/lib/codes` |
| 自己包 error.message return | `return { error: err.message }` | 走 `dbErrorResponse(err)` |
| 散刻 CREATE POLICY | 4 條 CREATE POLICY 重抄 | 走 `setup_*_rls` procedure |

---

## L9: 架構概念（高層思想）

### SSOT 原則

每件事**只有一個地方是真相**：

| 領域 | SSOT |
|---|---|
| 員工 email | `employees.email`（top-level、不 personal_info.email） |
| 訂單編號 | `orders.order_number`（不 orders.code、5/13 砍光） |
| 員工 capability | `role_capabilities` 表（不散刻 if isAdmin） |
| Workspace feature | `workspace_features` 表（不 workspaces.type） |
| 編號規則 | `@/lib/codes.ts`（前端不算） |
| 中文 label | `_constants/labels.ts`（JSX 不 hardcoded） |
| 錯誤翻譯 | `@/lib/db-error-translate.ts` |
| Supabase types | `src/lib/supabase/types.ts` |
| 三維 org | `brands` / `branches` / `departments` + join 表 |

**反 SSOT 警訊**：
- 兩處欄位存同一件事（orders.code + order_number 是經典反例）
- Frontend 算邏輯、backend 也算（員工編號競態）
- Code 散刻邏輯、規範 doc 也寫一份（兩邊會 drift）

### 三維 vs workspace 邊界

```
┌─────────────────────────────────────────────────┐
│  Workspace（一家公司、買 SaaS 的客戶）              │
│                                                  │
│  ┌─────────┐   ┌─────────┐                       │
│  │ Brand A │   │ Brand B │  ← 品牌、行銷導向      │
│  └────┬────┘   └────┬────┘                       │
│       │             │                            │
│  ┌────┴───┐    ┌────┴────┐                       │
│  │Branch X│    │Branch Y │  ← 分公司、實體據點   │
│  └────┬───┘    └────┬────┘                       │
│       │             │                            │
│  ┌────┴───┐    ┌────┴────┐                       │
│  │ Dept M │    │ Dept N  │  ← 部門、業務分工     │
│  └────┬───┘    └────┬────┘                       │
│       │             │                            │
│  ┌────┴───┐    ┌────┴────┐                       │
│  │Emp 1, 2│    │Emp 3, 4 │  ← 員工               │
│  └────────┘    └─────────┘                       │
└─────────────────────────────────────────────────┘
```

- 跨 workspace 邊界：**強隔離**（不准穿透、唯一例外是 `tenants` feature）
- 跨 brand / branch / dept：**軟隔離**（預設不看、有 `cross_*.read` 能跨）

### 中央 module 索引（5/13 完工）

| Module / Procedure | 解決 |
|---|---|
| `@/lib/codes.ts` | 11 種編號 RPC |
| `@/lib/db-error-translate.ts` | 錯誤翻譯 |
| `setup_workspace_scoped_rls(table)` | 標準 RLS |
| `setup_join_table_rls(table, employee_col)` | 員工 join 表 RLS |
| `setup_inherited_rls(table, parent, parent_id)` | 子表 inherit RLS |
| ESLint `form-dialog-loading-required` | 連點防護 |
| `recordApiAuditContext()` | audit trail |
| `scope_visible(module, row_id)` | 三維 row 守門 |
| `is_row_editable(module, row_id)` | 狀態守門 |
| `has_capability_for_workspace(ws_id, cap)` | capability 檢查 |
| `get_current_user_workspace()` | 拿 user workspace |
| `useLayoutContext()` | 一次拿 user/employee/workspace/capabilities/features |
| `useWorkspaceId()` | 拿當前 workspace id |
| `useMyCapabilities()` | 檢查自己的能力 |

### 戰略連動（黒羽戰略卡）

venturo 長線 = **AI 代理公司 + Super App**：
- ERP 是平台基底
- 之後加 `/platform/X` route 串 AiToEarn / xhs / capture bot
- 員工 SSO 串 ERP ↔ 工具
- 數據打通三維（brand × branch × dept）

→ 本 blueprint 的 6 層**都符合**這個戰略：
- L1 workspace_features 可以未來新增 `aitoearn` / `xhs` 之類 feature
- L2 capability 可以未來加 `platform.X` 之類能力
- L3 三維可以未來變成「跨工具排程」（業務員的內容發佈 + 訂單同視圖）
- L4-6 都是 SaaS 必備、戰略外不變

---

## 99 個 table 對照 6 層（樓層平面圖）

按 RLS pattern 分類：

### 🏢 業務主表（workspace_scoped）— 約 40 個

直接有 `workspace_id` 欄位、套 `setup_workspace_scoped_rls`：

| 表 | L1 feature | L2 capability | L3 scope_visible | L4 is_row_editable | L5 RLS pattern |
|---|---|---|---|---|---|
| customers | (隱含 hr/orders) | customers.read/write | N/A（無 branch scope）| - | workspace_scoped |
| suppliers | library | suppliers.read/write | N/A | - | workspace_scoped |
| contracts | orders | contracts.read/write | N/A | - | workspace_scoped |
| **tours** | tours | tours.read/write | ✅ scope_visible('tours', id) | (待加結團狀態) | scope_helper |
| **orders** | tours | tours.read/write | ✅ 繼承 tours | payment_status='paid' | scope_helper |
| **quotes** | orders | quotes.read/write | ✅ created_by=me OR scope_visible('tours') | status='draft' | scope_helper |
| **payment_requests** | finance | finance.requests.* | ✅ created_by=me OR scope_visible('tours') | status NOT IN approved/paid | scope_helper |
| **receipts** | finance | finance.payments.* | ✅ created_by=me OR scope_visible('orders') | status NOT IN confirmed/refunded | scope_helper |
| **disbursement_orders** | finance | finance.disbursement.* | ✅ created_by/approved OR scope_visible('payment_requests') | status='pending' | scope_helper |
| brands | (三維) | (待加 brands.write?) | - | - | workspace_scoped |
| branches | (三維) | (待加) | - | - | workspace_scoped |
| departments | (三維) | (待加) | - | - | workspace_scoped |
| employees | hr | hr.employees.* | - | - | workspace_scoped |
| chart_of_accounts | accounting | finance.settings.* | - | is_system_locked | workspace_scoped |
| journal_vouchers | accounting | accounting.* | - | is_locked | workspace_scoped |
| checks | accounting | accounting.* | - | status | workspace_scoped |
| payment_methods | finance | finance.settings.* | - | - | workspace_scoped |
| bank_accounts | finance | finance.settings.* | - | - | workspace_scoped |
| expense_categories | finance | finance.settings.* | - | - | workspace_scoped |
| airports / banks / countries（custom） | (basic) | (基礎 ref) | - | - | workspace_scoped |
| calendar_events | calendar | calendar.* | - | - | workspace_scoped |
| channels / messages | channels | channels.* | - | - | workspace_scoped |
| todos / todo_columns | (basic) | - | - | - | workspace_scoped |
| tasks | (basic) | tasks.* | - | - | workspace_scoped |
| attractions / hotels / restaurants | library | library.* | - | - | workspace_scoped |

### 🏗 業務子表（inherited）— 約 20 個

無 workspace_id、透過 parent 對應、套 `setup_inherited_rls`：

| 表 | Parent | Parent ID | 應走 pattern |
|---|---|---|---|
| order_members | orders | order_id | inherited (orders) |
| payment_request_items | payment_requests | request_id | inherited (payment_requests) ✅ 5/13 修 |
| journal_lines | journal_vouchers | voucher_id | inherited (journal_vouchers) |
| tour_itinerary_items | tours | tour_id | inherited (tours) |
| tour_role_assignments | tours | tour_id | inherited (tours) |
| tour_departure_data | tours | tour_id | inherited (tours) |
| tour_documents | tours | tour_id | inherited (tours) |
| tour_meal_settings | tours | tour_id | inherited (tours) |
| tour_member_fields | tours | tour_id | inherited (tours) |
| tour_bonus_settings | tours | tour_id | inherited (tours) |
| tour_custom_cost_fields | tours | tour_id | inherited (tours) |
| company_contacts | companies | company_id | inherited |
| ...（其他子表） | | | |

### 👥 員工關係表（join）— 3 個

員工 × X 多對多、套 `setup_join_table_rls`：

- employee_brands （employee_id, brand_id）
- employee_branches （employee_id, branch_id）
- employee_departments （employee_id, department_id）

✅ 5/13 補 policy

### 🌐 全租戶共享 reference data — 約 15 個

所有人讀、admin 寫：

- ref_airlines / ref_airports / ref_banks / ref_countries / ref_destinations
- countries / regions / cities
- kb_cruise_lines / kb_cruise_ships / kb_sailings / kb_fees / kb_pricing / kb_cancellation_policies / kb_agencies / kb_sailing_agencies / kb_cruise_agency_relations / kb_cabin_types

Pattern：SELECT TO authenticated USING (true)、寫操作走 admin client。

### 🔧 系統表（admin / cron / webhook only）— 約 10 個

無 user-facing、admin 寫 / 讀：

- api_usage / audit_logs
- cron_execution_logs / cron_heartbeats
- webhook_idempotency_keys
- background_tasks
- customer_service_conversations（LINE / 客服）

Pattern：通常不需 user policy、走 admin client。

### 👤 個人化表（user-scoped、非 workspace）— 約 5 個

每個 user 自己的東西、workspace 不切：

- user_preferences
- notes
- tasks (個人 task)
- personal_expenses
- line_user_profiles / line_conversation_overrides

Pattern：`user_id = auth.uid()`、不是 `workspace_id = mine`

### 🚧 其他特殊表

- workspaces（全租戶看自己 + tenants feature 看全部）
- workspace_features / workspace_roles / role_capabilities（HR 系統表）

---

## 為什麼一直挖出 bug（覆盤）

### 根因 1：6 層沒同時規劃、是堆積式長出來的

```
時間軸：
1. 早期：只有 workspace_id 隔離（L1+L5 部分）
2. 加 HR：加 role_capabilities（L2）
3. 加三維：加 brands/branches/departments（L3）
4. 加狀態守門：加 is_row_editable（L4）
5. 加防呆：加 @/lib/codes 等（L6、5/12-13）
```

每階段加新層、舊表 / 舊 code 沒同步補上。所以有：
- 表 A 只有 L1
- 表 B 有 L1+L2、漏 L3
- 表 C 有 L1+L2+L3、漏 L4 狀態
- 表 D 5 層都有、漏 L6 防呆

### 根因 2：沒有「建表 SOP」

過去新建一張表：
- 寫 migration 建表
- 寫 frontend hook
- 寫 API route
- **沒 checklist 對照 6 層**

所以漏 RLS、漏 capability、漏 ModuleGuard 都常見。

### 根因 3：手改 Dashboard 沒留 migration

幾次發現「migration files 講的 ≠ production reality」、害判斷錯：
- 5 張表 RLS 已 ENABLED、但 migration 沒紀錄（5/12 PR-1 踩到）
- payment_request_items FORCE 沒紀錄怎來的（5/13 踩到）

### 根因 4：半搬遷狀態

新 entity hook 架構引入後、舊 store 沒搬完。一張表可能有：
- 舊 store fetchAll（沒 soft delete filter）
- 新 entity hook（有 filter）
- 兩個共存 → 行為不一致 → bug

---

## 未來怎麼避免

### 1. 建表 SOP 卡（William 拍板後寫）

新表上線前必過清單：
- [ ] L1 對應 feature 有沒有定義 / 開通？
- [ ] L2 需要的 capability 有沒有定義？
- [ ] L3 三維 scope 是否適用？
- [ ] L4 狀態守門需要嗎？
- [ ] L5 走哪個 `setup_*_rls` procedure？
- [ ] L6 編號 / loading / 錯誤 / audit 有沒有走中央 module？
- [ ] CLAUDE.md 中央 module 索引有沒有加？

### 2. CI 自動 audit script（之後寫）

每次 PR / 每日跑：
- 比對 production RLS policies vs 預期 pattern
- 比對 capability 是否齊全
- 偵測「有 frontend writer 但 RLS 0 policy」
- 偵測「FORCE RLS 但 application 用 user client」
- 警告 / fail PR

### 3. CLAUDE.md 加 6 層 checklist

把 6 層守則寫進專案 CLAUDE.md、新 session 都讀得到。

### 4. 「半搬遷」清理計畫

員工 / 訂單 / 行程 / 財務 4 個模組分階段搬到新 entity hook、每階段跑 6 層自檢。

---

## Logan 自己的判斷

**這份藍圖如果早 3 個月寫**、今晚就不用「挖完一個冒一個」。
**現在寫**、之後新 session 接手、5 分鐘看懂整套架構、寫新功能不會破。

夠戰略、夠 SSOT、夠像「設計大樓圖」。

下個 session 該做：
1. 寫「建表 SOP」短檔（基於本 blueprint）
2. 寫 CI audit script 草稿
3. 把 99 個表逐個按本 blueprint 對照、產生 mismatch 清單

但今晚就到這。

睡了。
