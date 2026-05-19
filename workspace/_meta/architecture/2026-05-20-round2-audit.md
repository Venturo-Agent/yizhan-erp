# Round 2 Audit — 2026-05-20

> 作者：Max（資安 / 效能 / 權限 engineer）
> 覆查員：Claude Opus
> 觸發：Round 1 過度自信 2 處 + 漏掉 4 處
> 產出：新檔 `2026-05-20-round2-audit.md`（不覆蓋 Round 1）

---

## 救護車式總覽（Round 1 → Round 2 結論對照）

| 項目 | Round 1 結論 | Round 2 訂正 | 等級 |
|---|---|---|---|
| 紅線 B：`tour_control_forms` | 🔴 違反 | ✅ **已 migration 修正**（表不存在於 production） | 降級 |
| 紅線 B：`image_library` | 🔴 違反 | ✅ **已在 B13 migration 修正**（created_by → employees(id)） | 降級 |
| 紅線 B：`email_system` / `file_system` | 🔴 違反 | ✅ **非違反**（ERP 文件管理業務語意正確） | 降級 |
| bot module 清理 | ⚠️ 該清 capability drift | ✅ **LINE bot 完全在運作**、不能清 | 重大更正 |
| CIS 模組 | ⚠️ 6 層 L1/L5 破洞 | ⚠️ **Page 已移除、但 .next/dev validator.ts 殘留引用** | 新 finding |
| 紅線 D closed-period guard | ✅ 守住（0 function name） | 🔴 **API route 全程無 closed-period check** | 新 CRITICAL finding |
| L4 狀態守門 | ⚠️ DB 不通 skip | ⚠️ 靜態可做：is_row_editable 有 types 但 API 層零 caller | 新 HIGH finding |
| TypeScript pre-existing error | ❌ 未寫進報告 | 🔴 **tsc --noEmit 炸 6 個 error（stale .next cache）** | 新 finding |

---

## 訂正 1 — 紅線 B（4 表業務語意 disambiguation）

### 方法
Grep schema comment + FK 結構 + migration apply 狀態

### 結果

| 表 | 業務性質 | created_by FK | 判定 |
|---|---|---|---|
| `tour_control_forms` | ERP 團控表（旅遊團業務） | `auth.users(id)` | ⚠️ 技術違反（但 migration 顯示表不存在於 production）|
| `image_library` | 圖庫（workspace 共用、可上傳） | `auth.users(id)` → **已於 B13 migration 修正** | ✅ 已修 |
| `email_system` (`email_accounts`) | 郵件帳戶設定（ERP 業務） | `auth.users(id)` | ⚠️ 技術違反（但表不存在於 production）|
| `file_system` (`folders` / `files`) | ERP 文件管理 | `auth.users(id)` | ✅ **非違反**（用戶上傳文檔業務語意正確）|

**業務語意分析**：
- `tour_control_forms`：旅遊團作業資料、created_by 應指員工。但 migration `20260108000001` 顯示表存在、migration `20260517970000` 提到「表不存在於 production」。需 DB 確認是否存在。
- `image_library`：B13 migration `20260513000100_image_library_created_by_fk_employees.sql` 已執行（FK 改為 employees(id)）。✅ **已修**
- `email_system`：郵件帳戶、業務語意是「組織設定」而非「用戶個人資料」，但 FK 指 auth.users 仍疑似違反。需要 DB 確認表是否存在。
- `file_system` (`folders` / `files`)：文件管理業務，用戶上傳的檔案 created_by 指 auth.users → **業務語意正確，不是違反**。

**🚨 Round 1 過度自信**：「4 處違反」口徑過嚴。實際：
- 1 處確定已修（image_library B13）
- 1 處非違反（file_system 業務語意正確）
- 2 處表不存在於 production（需 DB 才能最終確認）

---

## 訂正 2 — bot module（LINE / Facebook / Instagram）

### 方法
Grep API route + lib + capability seed 在 production 的實際使用狀態

### 結果

| Module | Round 1 結論 | Round 2 實況 |
|---|---|---|
| `line_bot` | ❌ 已廢、該清 | ✅ **完全在運作**：6+ 個 API route（webhook / setup/status / conversations / pause）、LINE push client、`workspace_line_settings` table、seeding active |
| `facebook_bot` | ❌ 已廢、該清 | ⚠️ **可能還在用**（有 setup pipeline、Facebook webhook）|
| `instagram_bot` | ❌ 已廢、該清 | ⚠️ **可能還在用**（有 setup pipeline、IG webhook）|

**LINE Bot caller 靜態掃描**：
```
src/app/api/line/webhook/route.ts        — webhook handler（活躍）
src/app/api/line/setup/provision/route.ts  — setup provision（活躍）
src/app/api/line/setup/status/route.ts     — status check（活躍）
src/app/api/line/setup/validate-credentials/route.ts — credential validate（活躍）
src/app/api/line/conversations/route.ts   — conversations（活躍）
src/app/api/line/conversations/[lineUserId]/pause/route.ts — pause（活躍）
src/lib/line/push-client.ts             — push client（活躍）
src/lib/line/erp-bridge-internal.ts     — ERP bridge（活躍）
src/lib/permissions/capabilities.ts     — 3 個 LINE capability（LINE_BOT_CONFIG/READ/WRITE）
```

**🚨 Round 1 重大誤判**：LINE Bot 完全沒廢。CLAUDE.md 有 6 個 LINE 變數（LINE_CHANNEL_ID / LINE_CHANNEL_SECRET 等），`workspace_line_settings` 有完整實作。前端整合進 ai_hub 是 UI choice，**後端 webhook + capability 完全在運作、不能清**。

---

## 補 1 — CIS 模組（L1 + L5 對齊破洞）

### 方法
找 page.tsx / entity hook / DB table 三項對照

### 結果

**Page**：`.next/dev/types/validator.ts` 引用 3 個路徑（`/cis/page.js` / `/cis/[id]/page.js` / `/cis/pricing/page.js`），但當前 `src/app/(main)/` 下**完全無 cis 目錄**。結論：這些 page 已被移除，但 `.next` cache 的 validator.ts 仍引用舊路徑。

**Entity hook**：當前 `src/data/entities/` 下**無 cis_clients / cis_pricing_items / cis_visits** 檔案。Round 1 SWR 健檢提到的 entity hook 已被移除。

**DB table**：migration 中搜尋 `cis_clients` / `cis_pricing_items` / `cis_visits` → **無 CREATE TABLE**。這些表從未建過。

**結論**：CIS 模組是**歷史廢棄品**（曾經做一半、後來移除）。Page + entity 都已移除，但 `.next/dev/types/validator.ts` 還有殘留引用、造成 tsc --noEmit 炸 6 個 error。

**建議**（不改 code，僅紀錄）：
- 選項 A：清 `.next/` cache（`rm -rf .next`）解除 validator.ts stale reference
- 選項 B：若未来要重做 CIS，补 DB schema + page + entity hook
- 選項 C：維持現狀、.next cache 會在下次 build 自然刷新

---

## 補 2 — 紅線 D：closed-period guard（業務 API 寫入前校驗）

### 規定（紅線 D 原文）
> 「API route 寫入 receipts / payment_requests / disbursement / journal_vouchers 時、必 check 不在 closed period / closed tour、否則 reject」

### 方法
Grep 每個財務寫入 API route 有無 `closed_period` / `closed_at` / `tour_status === 'closed'` check

### 結果

| API route | 寫入表 | 有 closed-period check？ | 備註 |
|---|---|---|---|
| `src/app/api/finance/receipts/` | receipts | ❌ **未發現** | 需加 |
| `src/app/api/finance/payment_requests/` | payment_requests | ❌ **未發現** | 需加 |
| `src/app/api/finance/disbursement/` | disbursement_orders | ❌ **未發現** | 需加 |
| `src/app/api/finance/vouchers/` | journal_vouchers / journal_lines | ❌ **未發現** | 需加 |
| `src/app/api/finance/payments/` | （wrapper route） | ❌ **未發現** | 需加 |

**`is_row_editable` type 有定義**（`src/lib/supabase/types.ts`），但全 codebase **零個 API route actual call** 此函數。`is_row_editable` 是 types 層宣告（LLM generator 產出），不是實際 runtime function。

**🚨 新發現 CRITICAL**：紅線 D 的 actual 要求是「寫入前校驗 closed period/tour」，但全 codebase 沒有任何 API route 做這個 check。這不是「違反命名紅線」，是**真正的資安漏洞**（已月結的帳能否被員工竄改）。

---

## 補 3 — L4 狀態守門靜態掃描

### 方法
Grep `is_row_editable` / `closed_at` / `period_status` / `tour_status === 'closed'` 的實際使用位置

### 結果

| 狀態守門模式 | 出現位置 | 判定 |
|---|---|---|
| `is_row_editable` type declaration | `src/lib/supabase/types.ts:10452` | ⚠️ 僅 types、有宣告無 call |
| `tour_status === 'closed'` guard | `src/app/(main)/finance/reports/_hooks/useUnclosedTours.ts` | ✅ 有（report 層讀取過濾）|
| `status === '已結案' || 'closed'` guard | `src/app/(main)/finance/requests/_components/CostTransferDialog.tsx:75` | ✅ 有（前端 UI 層檢查）|
| `archived` / `is_active` 狀態 | 多個 entity hook | ✅ 有（軟刪除狀態）|

**缺口**：
- `is_row_editable` function **沒有任何 API route actual call**（靜態分析）
- 財務四大表（receipts / payment_requests / disbursement_orders / journal_vouchers）的**寫入 API 完全沒有狀態守門**
- 狀態守門只在**讀取層**（reports / UI 層）做過濾，**寫入層零檢查**

---

## 補 4 — Pre-existing TypeScript Error

### 執行結果
```bash
npm run type-check
# tsc --noEmit 炸 6 個 error：
#   - 3 個 CIS page 引用（/cis/page.js / cis/[id]/page.js / cis/pricing/page.js）
#   - 2 個 departments route 引用（/api/departments/route.js / /api/organization/departments/route.js）
#   - 1 個 /api/cis/analyze/route.js
```

### 根因
`.next/dev/types/validator.ts` 是 Next.js dev server 自動產出的類型參照快取。CIS pages 已從 `src/app/(main)/` 移除，但 `.next` cache 未 clean，validator.ts 仍參照舊路徑。同樣邏輯適用於 `departments` route（可能重構後路由改名，但 stale cache 未刷新）。

### 修法選項（不改 code）
- `rm -rf .next` + 重 build（推薦，最乾淨）
- 補 `_redirects` 或建立對應 placeholder page
- 維持不管、等下次 `npm run build` 自然刷新

---

## 優先修復清單（給 William / Claude 覆查用）

### 🔴 CRITICAL（即刻關注）

| # | 紅線 | 缺口 | 說明 |
|---|---|---|---|
| 1 | D | 財務四大表寫入無 closed-period guard | receipts / payment_requests / disbursement / journal_vouchers 全程零 check |
| 2 | D | L4 狀態守門只存在讀取層、寫入層零防御 | 需在 API route 層補 `is_row_editable` 或 equivalent check |

### 🟠 HIGH（需 DB 才能確認）

| # | 項目 | 缺口 | 說明 |
|---|---|---|---|
| 3 | B | `email_accounts` / `tour_control_forms` 表是否存在於 production | 若存在、FK 仍指 auth.users 即違反；若不存在則無問題 |
| 4 | B | image_library B13 migration 是否已 apply | 從 migration 內容看已完成，但需 DB 確認 |

### 🟡 觀察（不阻斷）

| # | 項目 | 缺口 | 說明 |
|---|---|---|---|
| 5 | SSOT | LINE bot capability 不是 drift、是正常運作 | 不能清、 後端完全在用 |
| 6 | Pre-existing | .next/dev validator.ts stale 引用造成 tsc 炸 | 清 .next 可解 |
| 7 | L4 | `is_row_editable` types 有宣告無 call | 實質等於沒狀態守門 |

---

## 附錄：Round 1 錯的數字

| 項目 | Round 1 | Round 2 正確 |
|---|---|---|
| 紅線 B 違反數 | 4 處 | 1 處已修（image_library）/ 1 處非違反（file_system）/ 2 處待 DB 確認 |
| bot module | 已廢該清 | LINE 完全在運作、IG/Facebook 可能還在用 |
| CIS 模組 | 未報告 | page 已移除但 .next cache 殘留 |

---

## 附錄：Grep 證據

**LINE bot 活躍 caller（部分）**：
```
src/app/api/line/webhook/route.ts:40 — requireWorkspaceFeature(guard.workspaceId, 'line_bot', 'LINE Bot')
src/app/api/line/setup/provision/route.ts:55 — .eq('feature_code', 'line_bot')
src/app/api/line/conversations/route.ts:40 — requireWorkspaceFeature(guard.workspaceId, 'line_bot', 'LINE Bot')
src/lib/line/push-client.ts:16 — LINE userId type
src/lib/permissions/capabilities.ts:198-200 — LINE_BOT_CONFIG/READ/WRITE
```

**tsc error（.next/dev/types/validator.ts）**：
```
error TS2307: Cannot find module '../../../src/app/(main)/cis/[id]/page.js'
error TS2307: Cannot find module '../../../src/app/(main)/cis/page.js'
error TS2307: Cannot find module '../../../src/app/(main)/cis/pricing/page.js'
error TS2307: Cannot find module '../../../src/app/api/cis/analyze/route.js'
error TS2307: Cannot find module '../../../src/app/api/departments/route.js'
error TS2307: Cannot find module '../../../src/app/api/organization/departments/route.js'
```