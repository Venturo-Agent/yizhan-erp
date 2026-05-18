---
date: 2026-05-13
author: Logan（cctl session、context 滿前 handoff）
status: 整夜 session、約 50 個 commit、約 40 個 fix
related: 2026-05-12-修復筆記-夜戰計畫.md / 2026-05-13-venturo-aierp-上線戰略地圖.md / yizhan-erp/CLAUDE.md
---

# 2026-05-13 夜戰 session retro + handoff

## TL;DR

整夜 session、推 ~50 個 commit、~40 個 production bug / UX / schema 修。
William 從 03:00 → 13:00 一直丟問題、Logan 一直修、節奏亂但全 cover。

**剩 2 個 task pending**（不偷做、留下次）：
- EmployeeForm 加「資格設定」section（eligibility Phase 2 UI）
- 訂單 / 請款下拉 caller 改讀 employee_eligibilities（subagent）

下次 cctl session 開門讀本卡 5 分鐘上手。

---

## 今晚 commit 高峰（按主題分類）

### 🏗 Module SSOT framework（凌晨 Phase 1-4）
- `src/modules/<code>.ts` × 19 個 module 檔（一個檔生 5 個 SSOT）
- codegen-permissions.ts 自動同步 features.ts / module-tabs.ts / capabilities.ts
- codegen-fresh check pre-push / CI 防 drift
- husky pre-commit / pre-push 三層守門

### 🔧 紀律
- 加紅線 #0.1：不准用 admin / manager / super user 等字

### 🛡 audit:rls L6.7 + L6.8 detector
- L6.7：DELETED_COLUMNS watch list（orders.code / personal_info.email / suppliers.category_id）
- L6.8：entity hook SELECT vs DB schema 自動 diff
- 抓 1 處 Logan 漏改（contracts/members/route.ts:35 `.order('code')`）

### 🔧 早晨 dev 環境連環修（William 開 dev server 抓 bug、Logan 一個個修）

1. **A1 orders.code 漏改 7 次補修**：
   - `useOrdersListView.ts` LIST_SELECT
   - `customer-orders/route.ts` SELECT
   - `useTourOperations.ts` INSERT/UPDATE
   - `useListSlim.ts` ORDERS_LIST_FIELDS
   - `createEntityHook.ts` TABLE_CODE_PREFIX 漏移除（**真正 root cause、新增訂單炸 42703**）
   - `contracts/members/route.ts` `.order('code')`

2. **suppliers schema drift 大幅清理**：
   - entity hook SELECT 17 個欄位跟 DB 不對齊
   - `category_id` / `bank_code_legacy` 砍掉
   - `filterSoftDeleted: false`（DB 沒 deleted_at column）

3. **restaurants / hotels / attractions 改非 workspace_scoped**：
   - DB 沒 workspace_id（是 shared reference data）
   - entity hook 加 `workspaceScoped: false`

4. **itineraries.status enum 中文 → 英文（SSOT 對齊紀律）**：
   - DB CHECK constraint 從 '草稿/已發布' 改 'draft/published'
   - backfill 3 + 16 = 19 row
   - Itinerary type / caller 全對齊

5. **tour.country_id backfill**：
   - 392 個 tour、388 個空、1 個 dangling
   - 用 tour.code IATA 反查、backfill 23 個（IATA 格式）
   - 369 個保留 NULL（舊團號 / 外丟團 / 外交簽證團、合理）

6. **attractions/restaurants/hotels.country_id 對齊 countries.id**：
   - **真實 root cause**（之前 Logan 一直 patch、研究後挖出）
   - countries.id = 'jp' / 'cn'（短代碼）
   - 3 表 country_id = 'japan' / 'china'（長英文名、不對齊）
   - Migration backfill 2476 attractions + 470 restaurants/hotels 對齊到短代碼

### 🎨 UI 修補（William 在 dev 抓出）

- 個人設定 layout 改造 v3（顯示偏好放照片右邊、不獨立卡片）
- TourEditDialog 開啟瞬間空白（等 countries 載入卡住、改不等）
- Tour tab 順序：訂單為預設、總覽移最右（業務最常看訂單）
- Tab 切換不 reset formData（保留之前選的旅遊團 / 訂單）
- 收款 dialog 移除「旅遊團」「訂單」上方 label
- SimpleDateInput / DateInput 加 min-w-fit（父層擠時超出 border）
- PaymentItemRow 金額 input 全形 → 半形（中文輸入法踩到）
- Dialog scroll：DialogContent 加 max-h-[90vh] + overflow-y-auto
- HTML hydration mismatch（suppressHydrationWarning）
- 景點庫 ResourcePanel 加 tourCode IATA fallback + isResolving race fix
- 行程儲存 CHECK constraint 違反（status enum 從 'proposal' 改 'draft'）

### 🧹 紅線 / 認錯紀錄

- Logan 違反紅線 #0「沒有特權」3 次（commit message 寫 admin only）、William 抓 3 次、立紀律 #0.1
- Logan 一直 patch 沒研究 root cause（景點 schema drift）、William 推 Logan 研究、才挖到真因
- A1 砍欄位 7 次補修是真實教訓、所以 L6.8 detector 立起來

---

## ⏳ 剩餘 pending task（不偷做、留下次）

### Task #41：EmployeeForm 加資格 section

**Context**：
- 5/13 凌晨 William 拍板：「資格」（可當業務 / 助理 / 團控 / 代墊）從 role 拆出來、改員工編輯頁勾選
- 已完成：DB 建 `employee_eligibilities` 表 / entity hook / API route / modules/_define 過濾 isEligibility tab
- HR /hr/roles 已不再顯示資格 tab

**還沒做**：
- EmployeeForm 加「資格設定」section
- 從 modules/ 衍生資格清單（用 `deriveEligibilityList()` helper）
- 4 個 checkbox：可當承辦業務 / 可當助理 / 可當團控 / 可代墊款
- 對 `/api/employees/[id]/eligibilities` PUT 寫操作

### Task #42：訂單 / 請款 dropdown caller migration

**Context**：
- 訂單下拉「業務 / 助理 / 團控」+ 請款下拉「代墊人」目前讀 role_capabilities
- 應該改讀 employee_eligibilities

**還沒做**：
- subagent grep 全 caller、改用 `useEligibleEmployees('tours.as_sales')` 等
- 既有的「業務 / 助理」欄位 caller 在 ToursPage / 訂單頁 / 請款頁
- 改完跑 type-check / lint

### William 後續要做（不在 Logan scope）

- Share Data 擁有權機制（restaurants/hotels/attractions 加 workspace_id nullable + use_shared_data feature）— 等資料整理好
- 漫途資料整理（哪些景點 / 餐廳是錯的、哪些要對外賣為 Share Data）
- 加 audit detector「3 表 country_id 必對齊 countries.id」（防 regression）
- 49 個 attractions 仍 misaligned country_id 人工清理

---

## 下次 cctl session 開門讀

1. 本檔（5 分鐘看完狀況）
2. `yizhan-erp/CLAUDE.md`（紅線 + 6 層架構）
3. `git log --oneline -30`（看今晚 ~50 commit 軌跡）

—

## Logan 結尾

今晚 session 抓出多個「Logan patch 不解 root」的 anti-pattern：
1. A1 砍欄位 7 次補修（沒做 caller 全 audit）
2. 景點 schema 對不齊（一直 patch race / fallback、沒研究 DB）
3. eligibility 改架構卻沒解資料層

教訓：**遇到 bug 連續修同類、停下來研究 root**、別一直 patch。

William 紀律：「研究、不憑直覺」、Logan 認、之後對齊。

剩 2 個 task 不偷做、handoff 完整、下次 5 分鐘接得上。睡了。

— Logan 2026-05-13 13:50
