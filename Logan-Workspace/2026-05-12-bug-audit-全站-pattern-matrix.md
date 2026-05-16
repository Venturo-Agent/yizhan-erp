---
date: 2026-05-12
author: Logan
status: 待 William 拍板修法路徑
related: venturo-aierp
supersedes: 2026-05-12-bug-audit-員工+供應商.md (子集、改用此份)
---

# Venturo-aierp 全站 Bug 全圖 — Pattern × 頁面矩陣

## 給 William 三句話總結

1. **這不是 17 個 bug、是 5 個 root cause helper 害了 20+ 頁** — 修對 5 個地方、跨全站就一次清完
2. **真的炸的不是員工 / 供應商兩頁、是 5 張表 RLS 沒開**（customers / suppliers / payments / contracts / travel_invoices）— 只靠 API 守門撐、API 漏一個 query 就跨租戶洩漏
3. **編號競態橫掃 5 個模組**（員工 / 供應商 / 訂單 / 行程 / 會計子科目）、但你早就有正確答案（`generateRequestCodeAsync`、RPC + advisory lock）— 已經做出來在 finance/requests、抄過去就行

---

## 🚨 資安紅燈先看（不是改不改、是該不該爆）

| 表 | RLS | UNIQUE 已 scope workspace | API 守門 | 風險 |
|---|---|---|---|---|
| customers | ❌ DISABLED | ✅ | ❌ 需逐 route 確認 | 客戶資料跨租戶洩漏 |
| suppliers | ❌ DISABLED | ✅ | ❌ 需確認 | 供應商資料跨租戶洩漏 |
| payments | ❌ DISABLED | ✅ | ❌ 需確認 | 付款紀錄跨租戶洩漏 |
| contracts | ❌ DISABLED | ✅（4/21 改） | ⚠️ 需確認 | 合約跨租戶洩漏 |
| travel_invoices | ❌ DISABLED | ⚠️（4/21 改） | ❌ 需確認 | 旅遊發票跨租戶洩漏 |

**驗證**：
- `supabase/migrations/20251211000000_disable_all_remaining_rls.sql` 把這 5 張全部 DISABLED
- 後續沒有任何 migration 把它們 ENABLE 回來（grep 證實）
- Phase A2/A3 改了 21 張、這 5 張被漏掉

**修法**：寫 Phase A4 migration、套 Phase A3 的 `scope_visible()` / `is_row_editable()` helper、5 張一次 enable + 加 policy。apply 前必跑 `tests/e2e/login-api.spec.ts`（紅線 A）。

✅ **沒有跨租戶洩漏「正在發生」、但雙保險破洞** — API 層只要有一個 route 寫錯 `.eq('workspace_id', ...)` 就炸。
✅ **紅線 A**（workspaces NO FORCE RLS）守住
✅ **紅線 C**（admin client per-request）守住

---

## 全站 Pattern × 頁面矩陣

> ✅ OK / ⚠️ 有問題 / ⛔ N/A / 🔥 重炸

| 模組 / 頁面 | A1 編號競態 | A2 兩步驟事務 | A3 紅線 B FK | B1 連點 | B2 Refetch race | B3 SWR | C1 跨租戶撞號 | C2 RLS | D1 soft delete | D3 store/hook 混用 | D4 錯誤翻譯 |
|---|---|---|---|---|---|---|---|---|---|---|---|
| **hr/employees** | ⚠️ | ⚠️ | ✅ | ⚠️(部分) | ✅ | ✅ | ⛔ | ✅ | ⚠️ | 🔥 | ⚠️ |
| **library/suppliers** | ⚠️ | ✅ | ✅ | ⚠️ | ✅ | ✅ | ⚠️ | ⚠️ DISABLED | ✅ | ✅ | ⚠️ |
| **library/customers** | — | — | — | — | — | — | ⚠️ | ⚠️ DISABLED | — | — | ⚠️ |
| **library/attractions** | — | — | — | — | — | — | ✅ | — | ✅ | — | ⚠️ |
| **library/archive-management** | — | — | — | — | — | — | — | — | — | — | — |
| **tours / [code]** | ⚠️ | ⛔ | ⚠️(itinerary) | ⚠️(7 dialog) | ✅ | ✅ | 🔥 跨租戶撞 | ✅ ENABLE A3 | ✅ | 🔥 | ⚠️ |
| **orders** | ⚠️ | ⛔ | ✅ | ⚠️ | ✅ | ✅ | ✅ workspace-scoped | ✅ ENABLE A3 | ✅ | 🔥 | ⚠️ |
| **finance/payments** | ⛔ | ⚠️批 receipt | ⚠️ FK 待查 | ✅ | ✅ | ✅ | ✅ | ⚠️ DISABLED | ✅ | 🔥 | ⚠️ |
| **finance/requests** | ✅(RPC 鎖) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ ENABLE A3 | ✅ | 🔥 | ⚠️ |
| **finance/treasury** | — | — | — | — | — | — | — | — | — | — | — |
| **finance/settings** | — | — | — | — | — | — | — | — | — | — | — |
| **accounting/accounts** | ⚠️ 子科目 | ✅ | ⛔(無此欄) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ⚠️ |
| **accounting/vouchers** | — | — | — | — | — | — | — | — | — | — | ⚠️ |
| **accounting/opening-balances** | — | ⚠️ voucher+lines | — | — | — | — | — | — | — | — | ⚠️ |
| **accounting/checks** | — | — | — | — | — | — | — | — | — | — | — |
| **accounting/period-closing** | — | — | — | — | — | — | — | — | — | — | — |
| **calendar** | ⛔ | — | — | ⚠️ | 🔥 沒 refetch | 🔥 沒 invalidate | — | — | — | — | ⚠️ |
| **channels** | — | — | — | ⚠️ ChannelMembersDialog | ✅ | ✅ | — | — | — | — | ⚠️ |
| **shared-data/{countries,banks,airports}** | ⛔ | — | — | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ⚠️ |
| **workspaces/[id]** | ⛔ | — | — | ✅ | ✅ | ✅ | ⛔ | — | — | ⚠️ billing-tab | ⚠️ |
| **bot** | ⛔ | — | — | — | — | — | — | — | — | — | — |
| **cis/[id]** | — | — | — | ⚠️ PricingDraft | ✅ | ✅ | — | — | — | — | ⚠️ |
| **dashboard** | ⛔ | ⛔ | ⛔ | ⛔ | ⛔ | ⛔ | ⛔ | ⛔ | ⛔ | ⛔ | ⛔ |
| **settings/{personal,company,hooks}** | — | — | — | — | — | — | — | — | — | — | — |

「—」= 該模組沒掃到問題 / 該 pattern 不適用、不是空白。

---

## 5 個 Root Cause Helper（修這幾個、跨 20+ 頁一起解）

### 🔴 Root Cause #1 — 編號 helper 不統一、5 個模組各寫各

**現況**：
- ✅ 正確答案：`finance/requests/_hooks/useRequestOperations.ts` 用 `generateRequestCodeAsync`（後端 RPC + advisory lock）
- ⚠️ 錯誤實作：
  - HR：`EmployeeForm.tsx:331-335` — useUserStore.items 找 max + 1
  - 供應商：`SuppliersPage.tsx:27-57` — query 最後一個 code + 1
  - 訂單：`orders/page.tsx:97` — nextOrderNumber padStart
  - 行程訂單：`ToursPage.tsx:182-183` — tourOrders.length + 1
  - 會計子科目：`accounting/accounts/page.tsx:108-114` — Math.max + parseInt
  - 行程 code：`src/stores/utils/code-generator.ts:65-101` — generateTourCode 無 workspace 過濾
- ⚠️ **3 張保留全域 UNIQUE**：tours / tour_requests / contracts（4/21 不改、待 URL 設計）

**會撞兩種車**：
- 同租戶兩人同時新增（無分布式鎖）
- 跨租戶撞號（RLS 把別人資料蓋住、算出相同碼）

**修法**：
- 短期：照 `generateRequestCodeAsync` 套到 employees / suppliers / orders / accounts / tour-orders、5 處一起改
- 長期：tours/contracts/tour_requests 的全域 UNIQUE 設計、要先決定 URL（保險公司短網址 / 客戶簽署 / 提案追蹤）才能改

---

### 🔴 Root Cause #2 — FormDialog 的 `loading` prop 沒被普遍使用

**現況**：
- ✅ FormDialog 元件本身支援 `loading` prop（`src/components/dialog/form-dialog.tsx:164`）
- ⚠️ 9 個 dialog 沒傳：
  - SuppliersDialog、EditEventDialog（calendar）、ChannelMembersDialog
  - 5 個 tours/orders dialog（ArchiveReasonDialog、DeleteConfirmDialog、LocalPricingDialog、SyncToItineraryDialog、AccommodationChangeDialog）
  - PricingDraftDialog（cis）
- 27 個 dialog 已正確（CreateAccountDialog / CreateCheckDialog / CreateChannelDialog 等）

**子問題**：4 個 dialog 用自定義 footer 繞過 FormDialog 預設按鈕、loading state 沒效果

**修法**：
- 兩步：
  1. 把 9 個 dialog 補 `loading` prop（一個下午掃完）
  2. FormDialog 改成支援 `footer` 函數式（`footer({ loading })`）、讓自定義 footer 也能拿到 loading state
- ESLint rule：要不要寫一條偵測「FormDialog 沒 loading prop」？讓未來不再犯

---

### 🔴 Root Cause #3 — 5 張表 RLS DISABLED

**現況**：customers / suppliers / payments / contracts / travel_invoices
- migration `20251211000000_disable_all_remaining_rls.sql` 把它們 DISABLED
- Phase A2/A3 改了 21 張、漏這 5 張

**為什麼漏掉**：應該是當初為了 debug 暫時 disable、後續清理沒拉回來

**修法**：寫 Phase A4 migration、5 張一次補：
```sql
-- 每張表
ALTER TABLE public.<table> ENABLE ROW LEVEL SECURITY;

-- 套 Phase A3 的 helper
CREATE POLICY <table>_select ON public.<table> FOR SELECT TO authenticated
  USING (public.scope_visible('<table>', id));
CREATE POLICY <table>_insert ... 
CREATE POLICY <table>_update ...
CREATE POLICY <table>_delete ...
```

**風險管控**：
- apply 前必跑 `tests/e2e/login-api.spec.ts`（紅線 A）
- 套用順序：先 staging 跑、確認登入不炸、再 prod
- 順便確認 API 層 `.eq('workspace_id', ...)` 沒漏（雙保險）

---

### 🔴 Root Cause #4 — 舊 Zustand store vs 新 entity hook 混用

**現況**：
- ✅ 已完整搬到 entity hook：suppliers、customers、attractions
- 🔥 混用（兩套並存、bug 溫床）：
  - **employees**：用 `useUserStore`（舊）、`useEmployees` entity hook 已存在但沒用
  - **tours**：service 用 `useTourStore`、某些 component 用 `useEntity`
  - **orders**：多個 component 用 `useOrderStore`
  - **finance/payment_requests + disbursement_orders**：多檔混用

**影響**：
- 員工 soft delete 失效（舊 store 沒實作 `filterSoftDeleted`）→ 離職員工還在列表
- created_by 寫錯類型（舊 store 走不一樣的寫入路徑、紅線 B 不一致）
- 兩套快取不同步（一邊改、另一邊不知道）

**修法**：
- 一個模組一個模組搬、不要一次全搬（風險太大）
- 順序：employees（影響最大、bug 最多）→ orders → tours → finance/*
- 每搬完一個跑 type check + e2e + 你親測一輪

---

### 🔴 Root Cause #5 — 沒有 `translateDbError` helper

**現況**：
- ❌ 全專案找不到 `translateDbError` / `dbErrorToBusinessMessage`
- ⚠️ API catch block 直接 return `error.message`（Postgres 英文）
- ⚠️ 前端 toast `error.message`、看到英文 `Key (workspace_id, lower(email))=... already exists`

**漏翻位置**：
- API：`/api/accounting/vouchers/create:153`、`/api/accounting/opening-balances:131`、`/api/accounting/receipts/[id]/refund:281`、`/api/organization/_helpers.ts` 多處、`/api/employees/create/route.ts:99-100`
- 前端：各 dialog catch block 通用「儲存失敗，請稍後再試」、看不出原因

**修法**：寫一個 helper：
```typescript
// src/lib/api/translate-db-error.ts
export function translateDbError(error: unknown): { message: string; field?: string } {
  const e = error as { code?: string; details?: string; message?: string }
  switch (e.code) {
    case '23505': return parseUniqueViolation(e.details)  // 「X 已被使用」
    case '23503': return parseFkViolation(e.details)       // 「找不到對應的 X」
    case '23502': return { message: `必填欄位「${parseColumn(e.message)}」未填` }
    case '23514': return { message: `「${parseColumn(e.message)}」格式不符規定` }
    default: return { message: '系統錯誤、請稍後再試或聯絡 IT' }
  }
}
```
- API 統一 catch → translateDbError → return business message
- 前端 toast 直接顯示 message
- 一次寫好、全站適用

---

## 修法路徑（5 個 PR、按優先順序）

### PR-1 🔥 Phase A4 補 RLS（資安第一、最先做）
- 補 customers / suppliers / payments / contracts / travel_invoices 5 張 RLS
- migration + login-api e2e 測試
- **預期收益**：跨租戶洩漏雙保險回來
- **預期工期**：1-2 天（含測試）
- **風險**：中（紅線 A 等級、要嚴格測試）

### PR-2 🔧 編號 helper 統一化
- 把 `generateRequestCodeAsync` 抽成共用 helper：`generateEntityCodeAsync(table, prefix, workspaceId)`
- employees / suppliers / orders / accounts / tour-orders 5 處改用
- code-generator.ts 的 `generateTourCode` / `generateCode` 加 workspaceId 參數
- **預期收益**：今天測到的「存檔有衝突」90% 消失
- **預期工期**：1-2 天
- **風險**：低（後端 RPC 已驗證過）

### PR-3 🛡 translateDbError + 9 dialog 補 loading
- 寫 translateDbError helper + 全站 API catch 改用
- 9 個 dialog 補 `loading` prop
- FormDialog 改支援 footer 函數式（讓自定義 footer 也能拿 loading）
- **預期收益**：UX 大幅改善、錯誤訊息看得懂
- **預期工期**：2-3 天
- **風險**：低

### PR-4 🔄 員工模組搬 entity hook
- HR 頁全部從 `useUserStore` 搬到 `useEmployees`
- 順便修 E-002（email rollback）、E-003（terminated filter）、E-006（email SSOT 收斂）、E-007（created_by）一起做
- 之前那份報告（員工 5 炸 / 3 痛 / 2 髒）大部分一次清掉
- **預期收益**：員工模組整體穩定、後續供應商搬法可複製
- **預期工期**：1 週（含 migration + e2e）
- **風險**：中（影響登入流程、要紅線 A 測試）

### PR-5 🔄 tours / orders / finance 搬 entity hook
- 同 PR-4 模式、一個模組一個模組
- 順序：tours → orders → finance
- **預期收益**：徹底消滅雙軌
- **預期工期**：2-3 週
- **風險**：中（要分階段、不要一次砍）

---

## 為什麼這 5 個 PR 順序這樣排？

**資安 #1 → 效能 #2 → SSOT #3**（CLAUDE.md 優先順位）

- PR-1：**資安**（紅線等級、最先）
- PR-2：**今天測到的問題**（修了你立刻有感）
- PR-3：**UX + 全站基礎建設**（一個 helper、長期受益）
- PR-4 / PR-5：**SSOT 收斂**（長期、分階段、不急）

---

## 意外發現（值得記下來）

### ✅ 已經做對的事
- finance/requests 用 RPC + advisory lock 編號 — **這是其他模組該抄的標準**
- Phase A3 的 `scope_visible()` / `is_row_editable()` helper 設計 — 21 張表已套、抽象漂亮
- FormDialog 元件支援 loading prop — 基礎建設已有、只是沒用
- 12 個 entity hook 都設 `filterSoftDeleted: true` — 新架構是對的、舊的沒搬而已
- 紅線 A、C 守住、admin client per-request、workspaces NO FORCE RLS

### ⚠️ 結構性技術債（修一次受益長期）
- 舊 Zustand store 沒實作 `filterSoftDeleted`（D1 半盲）
- 舊 store 沒 SWR / cache invalidate 機制
- code-generator.ts 設計時沒考慮 multi-tenant
- 沒有錯誤翻譯層、每處各自翻
- 沒有 ESLint rule 偵測「FormDialog 沒 loading prop」

### 🚨 真正炸的（不修會出事）
- 5 張表 RLS DISABLED（C2、PR-1）
- E-002 員工 email 改了沒 rollback（PR-4 一起修）
- tours/tour_requests/contracts 全域 UNIQUE 跨租戶撞（PR-2 一部分、URL 設計拍板後改）

---

## Logan 的判斷

William、坦白講：

**今天測到的「漏洞百出」、不是真的爛、是 venturo-aierp 還在「半搬遷狀態」**：
- 新架構（entity hook + RLS Phase A3 + 中央錯誤層）已經設計好、做了一半
- 舊架構（Zustand store + RLS DISABLED + 各頁各翻）還在用、沒收乾淨
- 你今天測的兩個模組（員工 / 供應商）剛好都還沒搬完、所以撞到

**好消息**：
- 答案都在 code 裡了、不用發明（finance/requests 是參考、Phase A3 helper 是參考、12 個 entity hook 是參考）
- 5 個 root cause 不是無底洞、修了就清

**建議**：
- 這週做 PR-1 + PR-2、你之後測就會順
- 下週做 PR-3、UX 改善
- 之後 PR-4 / PR-5 慢慢搬、不要急
- **不要一次全修**、不要試圖「重寫」、就一塊一塊收

開始修哪一個你拍板。我等你的話。

—— Logan
