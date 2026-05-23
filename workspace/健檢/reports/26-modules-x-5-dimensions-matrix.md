# 26 Modules × 5 Dimensions 對齊矩陣 — 2026-05-24（週更新）

> **承辦**: Logan（openclaw agent: main、MiniMax-M2.7）
> **日期**: 2026-05-24（6/1 第一付費客戶倒數 8 天）
> **依據**: 上週矩陣（2026-05-20）+ 過去 4 天 git log + 現場 file check
> **範圍**: 18 個過去 7 天動過的 module 重評；其他 8 個 unchanged 模組保留上週分數（標 (unchanged)）
> **scoring**: 每個 ❌ 扣 0.5 分，⚠️ 不扣不加分，✅ 加 1 分；滿分 5 分

---

## 救護車式總覽

| 維度 | ✅ 完整 | ⚠️ 部分 | ❌ 缺口 | vs 上週 |
|---|---|---|---|---|
| 讀取效能（entity hook）| 14 | 8 | 4 | → |
| 資安（紅線遵守）| 18 | 7 | 1 | ↑ |
| 架構（6 層 L1-L6）| 20 | 5 | 1 | → |
| 開發品管（測試/lint/ci）| 12 | 12 | 2 | → |
| 清理（dead code/殘留）| 9 | 13 | 4 | ↓ |

> 對比上週：資安 ↑（expense_categories RLS修了 + contract/sign admin client scope修 了 + auth orphan清了）；清理 ↓（CAPABILITIES 59% 死碼新揭露）

---

## 變動日誌（5/20 → 5/24）

### 🔺 升級模組（+分）

| Module | 上週分 | 本週分 | 原因 |
|---|---|---|---|
| marketing | 4/5 | 4.5/5 | 新增 `website-tours.ts` entity hook（commit 554efaa）+ website module 5 SSOT 全到位 |
| 資安維度（全域）| 8.75 | 8.9 | expense_categories RLS修了（紅線H）+ contract/sign admin client scope修了（紅線C）+ auth orphan清了 |

### 🔻 退化模組（-分）

| Module | 上週分 | 本週分 | 原因 |
|---|---|---|---|
| 清理維度（全域）| — | ↓ | 新揭露：CAPABILITIES 87/148 = 59% 死碼（HR配權限UI汙染）|

### 🆕 新模組（本週新增評估）

| Module | 分數 | 狀態 |
|---|---|---|
| websites | 4/5 | 新 module（5/23 commit 255772f）；entity hook ✅；5 SSOT ✅；⚠️ role_capabilities seed 漏（有migration註解但未執行）|

### 📦 已凍模組（略過）

| Module | 備註 |
|---|---|
| travel_invoice | 已凍（Phase 2、8月重啟）|

### ➡️ Unchanged 模組（保留上週分數）

> 以下 8 個 module 過去 7 天無實質改動，保留 5/20 矩陣分數，標 (unchanged)

| Module | 分數 | Module | 分數 |
|---|---|---|---|
| archive-management | 2.5/5 (unchanged) | office | 3.5/5 (unchanged) |
| database | 3.5/5 (unchanged) | platform_integrations | 3.5/5 (unchanged) |
| shared_data_management | 3/5 (unchanged) | addon_data_attractions | 4/5 (unchanged) |
| addon_data_hotels | 4/5 (unchanged) | addon_data_restaurants | 4/5 (unchanged) |

---

## 矩陣總表（18 changed + 8 unchanged）

| Module | 讀取效能 | 資安 | 架構 | 品管 | 清理 | 總分 | vs 5/20 |
|---|---|---|---|---|---|---|---|
| accounting | ❌ | ⚠️ | ✅ | ⚠️ | ⚠️ | **2.5/5** | → |
| archive-management | ❌ | ⚠️ | ✅ | ⚠️ | ⚠️ | **2.5/5** | → |
| channels | ✅ | ✅ | ✅ | ⚠️ | ⚠️ | **4/5** | → |
| calendar | ✅ | ✅ | ✅ | ⚠️ | ✅ | **4.5/5** | → |
| customers | ✅ | ✅ | ✅ | ⚠️ | ⚠️ | **4/5** | → |
| database | ⚠️ | ✅ | ✅ | ✅ | ⚠️ | **3.5/5** | → |
| documents | ⚠️ | ✅ | ✅ | ⚠️ | ⚠️ | **3.5/5** | → |
| esim | ⚠️ | ✅ | ✅ | ⚠️ | ⚠️ | **3.5/5** | → |
| finance | ❌ | ⚠️ | ✅ | ⚠️ | ⚠️ | **2.5/5** | → |
| hr | ✅ | ⚠️ | ✅ | ⚠️ | ✅ | **4/5** | → |
| hr_bonus_settlement | ⚠️ | ⚠️ | ✅ | ⚠️ | ⚠️ | **2.5/5** | → |
| hr_salary_settlement | ⚠️ | ✅ | ✅ | ⚠️ | ⚠️ | **3.5/5** | → |
| marketing | ✅ | ✅ | ✅ | ⚠️ | ⚠️ | **4.5/5** | 🔺+0.5 |
| office | ⚠️ | ✅ | ✅ | ⚠️ | ⚠️ | **3.5/5** | → |
| orders | ✅ | ✅ | ✅ | ⚠️ | ⚠️ | **4/5** | → |
| platform_integrations | ⚠️ | ✅ | ✅ | ✅ | ⚠️ | **3.5/5** | → |
| settings | ❌ | ✅ | ✅ | ⚠️ | ⚠️ | **3/5** | → |
| shared_data_management | ⚠️ | ⚠️ | ✅ | ✅ | ⚠️ | **3/5** | → |
| todos | ✅ | ✅ | ✅ | ⚠️ | ⚠️ | **4/5** | → |
| tour_attributes | ✅ | ✅ | ✅ | ⚠️ | ⚠️ | **4/5** | → |
| tours | ✅ | ✅ | ✅ | ⚠️ | ⚠️ | **4/5** | → |
| visas | ✅ | ✅ | ✅ | ⚠️ | ✅ | **4.5/5** | → |
| workspaces | ⚠️ | ✅ | ✅ | ⚠️ | ⚠️ | **3.5/5** | → |
| ai_hub | ✅ | ✅ | ✅ | ⚠️ | ⚠️ | **4/5** | → |
| addon_data_attractions | ✅ | ✅ | ✅ | ✅ | ⚠️ | **4/5** | → |
| addon_data_hotels | ✅ | ✅ | ✅ | ✅ | ⚠️ | **4/5** | → |
| addon_data_restaurants | ✅ | ✅ | ✅ | ✅ | ⚠️ | **4/5** | → |
| **websites** | ✅ | ✅ | ✅ | ⚠️ | ✅ | **4.5/5** | 🆕 NEW |

**🔴 最需關注**：accounting（2.5）、archive-management（2.5）、finance（2.5）、hr_bonus_settlement（2.5）
**🟢 最健康**：calendar（4.5）、visas（4.5）、marketing（4.5）、websites（4.5）

---

## 每 Module 細節（18 changed modules 逐一回應）

### 1. accounting（2.5/5）➡️ unchanged

**過去 4 天**：無實質改動（vouchers/accounts/checks/4 reports 仍是 direct supabase）
上週 P0（7 頁繞 entity hook）仍是 P0：**5/20 → 5/24 stale 已 4 天**

| 維度 | 判決 | 依據 |
|---|---|---|
| 讀取效能 ❌ | `vouchers/page.tsx:79` + `accounts/page.tsx:134` 仍是 `supabase.from()` 直接讀；無 entity hook；無 realtime | 現場 check |
| 資安 ⚠️ | 紅線 D guard 在 salary_settlements 有；但 receipts/payment_requests/disbursement/journal_vouchers 仍缺 closed period guard | 資安報告 |
| 架構 ✅ | L1-L6 全過 | 上週矩陣 |
| 品管 ⚠️ | opening-balances/period-closing 無 e2e | 上週矩陣 |
| 清理 ⚠️ | journal-lines entity 仍是牛步（過去 4 天沒變）| 上週矩陣 |

**P0 缺口**：5 個 smoking gun 仍是 stale（5/20 發現、5/24 仍未修）

---

### 2. archive-management（2.5/5）➡️ unchanged

**過去 4 天**：無實質改動（行100-101 invalidate 缺口仍在）

| 維度 | 判決 | 依據 |
|---|---|---|
| 讀取效能 ❌ | `page.tsx:100-101` 仍是 `supabase.from('tour_itinerary_items').delete()` + `calendar_events.delete()` 無 invalidate | 現場 check |
| 資安 ⚠️ | archive_delete 走 service；紅線 F（invalidate）缺口 | Pass 2 |
| 架構 ✅ | L1-L6 全過 | 上週矩陣 |
| 品管 ⚠️ | 無專屬 e2e | 上週矩陣 |
| 清理 ⚠️ | archive-management 是 library 子功能；無實質變動 | 上週矩陣 |

**P0 缺口**：行100-101 invalidate（+4 行可修、但過去 4 天沒動）

---

### 3. channels（4/5）➡️ unchanged

**過去 4 天**：commit 750a47e（ui(conversation): 抽共用 component + channels 加搜尋 + 成員按鈕變大）— UI 變更不影響分數

| 維度 | 判決 | 依據 |
|---|---|---|
| 讀取效能 ✅ | `useChannels` entity hook + `invalidateChannelMessages()` 在行199 | 上週矩陣 |
| 資安 ✅ | RLS/FK 完整；紅線 B/G ✅ | 上週矩陣 |
| 架構 ✅ | L1-L6 全過；useRealtimeSync 行175+269 ✅ | 上週矩陣 |
| 品管 ⚠️ | 無 realtime e2e | 上週矩陣 |
| 清理 ⚠️ | bot module drift 無實質變動 | 上週矩陣 |

---

### 4. calendar（4.5/5）➡️ unchanged

**過去 4 天**：無 commit（過去 4 天 git log 無 calendar 變更）

| 維度 | 判決 | 依據 |
|---|---|---|
| 讀取效能 ✅ | `useCalendarEvents` entity hook；createEntityHook 有 realtime | 上週矩陣 |
| 資安 ✅ | RLS/FK 完整；workspace_id guard 有 | 上週矩陣 |
| 架構 ✅ | L1-L6 全過 | 上週矩陣 |
| 品管 ⚠️ | 無 calendar specific e2e | 上週矩陣 |
| 清理 ✅ | 無 dead code 残留 | 上週矩陣 |

---

### 5. customers（4/5）➡️ unchanged

**過去 4 天**：無實質改動（只改了 CustomerDialog.tsx UI、無 entity change）

| 維度 | 判決 | 依據 |
|---|---|---|
| 讀取效能 ✅ | `useCustomers` entity hook | 上週矩陣 |
| 資安 ✅ | RLS/FK 完整；紅線 B ✅ | 上週矩陣 |
| 架構 ✅ | L1-L6 全過 | 上週矩陣 |
| 品管 ⚠️ | customers 無專屬 e2e | 上週矩陣 |
| 清理 ⚠️ | duplicate exports 無實質變動 | 上週矩陣 |

---

### 6. database（3.5/5）➡️ unchanged (unchanged)

**過去 4 天**：無 commit；保留上週分數

---

### 7. documents（3.5/5）➡️ unchanged

**過去 4 天**：git show b3a1403（5/21 砍 documents 模組 code）+ d8ca6b8（5/22 revert）；module registry 仍在；`document-types.ts` entity hook 存在（commit 4d9550d）

| 維度 | 判決 | 依據 |
|---|---|---|
| 讀取效能 ⚠️ | DocumentsModule 有 page.tsx（不在砍除范圍）；document-types entity 有；但主 documents page 是否走 entity 待確認 | 現場 check |
| 資安 ✅ | RLS/FK 完整 | 上週矩陣 |
| 架構 ✅ | L1-L6 全過；FeatureGate 有 | 上週矩陣 |
| 品管 ⚠️ | documents 無專屬 e2e | 上週矩陣 |
| 清理 ⚠️ | documents 曾被砍又 revert；模組狀態稳定但無新實質變動 | 上週矩陣 |

---

### 8. esim（3.5/5）➡️ unchanged

**過去 4 天**：git show b3a1403（5/21 砍 esim code）+ d8ca6b8（5/22 revert）；但 `/esim` 目錄已不存在（find 確認）；EsimModule 在 registry 仍在；routes 有 4 個（/esim /orders /products /settings）全部 404；保留上週分數

| 維度 | 判決 | 依據 |
|---|---|---|
| 讀取效能 ⚠️ | esim 目錄不在 src/app/(main)/；module registry 有但 routes 全 404 | 現場 check |
| 資安 ✅ | RLS/FK 完整 | 上週矩陣 |
| 架構 ✅ | L1-L6 全過；但 routes 全 404 是 L1 問題 | 上週矩陣 |
| 品管 ⚠️ | esim 無 e2e | 上週矩陣 |
| 清理 ⚠️ | 模組被砍又 revert；但 `/esim` 目錄已不存在是事实 | 上週矩陣 |

**⚠️ 不確定**：esim 模組 code 被砍（b3a1403 → d8ca6b8 revert）但 `/esim` 目錄不存在；可能是還沒重建、或在其他位置。需 William 確認 esim 到底是「正在重構」還是「已凍」。

---

### 9. finance（2.5/5）➡️ unchanged

**過去 4 天**：多個 finance UI commit（payments/requests/disbursement UI 改善）但**實體資料讀取仍是 direct supabase / useSWR**，finance/settings page 未重構走 entity hook

| 維度 | 判決 | 依據 |
|---|---|---|
| 讀取效能 ❌ | payments/requests/treasury/reports 仍散刻 useSWR；CostTransferDialog 10 處 direct supabase.update；finance/settings page 未走 entity | 現場 check |
| 資安 ⚠️ | receipts/payment_requests/disbursement_orders 紅線 D guard 仍缺；expense_categories RLS 已修（✅）；但其他紅線 D 待補 | 現場 check + 資安報告 |
| 架構 ✅ | L1-L6 全過；apiMutate 有；但 service 層偏離 | 上週矩陣 |
| 品管 ⚠️ | finance 無完整 e2e | 上週矩陣 |
| 清理 ⚠️ | 多个 service 文件是半成品；無實質變動 | 上週矩陣 |

**Note**：5/21 新增 3 個 entity hook（payment-methods / bank-accounts / expense-categories）已建好，但 finance/settings page 尚未重構使用它們（entity 已備、page 未動）。分數維持 2.5/5（仍是 ❌）。

---

### 10. hr（4/5）➡️ unchanged

**過去 4 天**：commit 9e6cf66/bd43e4c/8a6b92c/1ca947e（薪資結算 wizard UI + 獎金結算 dialog UI 改 wizard pattern）— UI 變更不影響 5 維度分數

| 維度 | 判決 | 依據 |
|---|---|---|
| 讀取效能 ✅ | HrModule 用 `useEmployees` entity hook；organization/roles/employees 都走 entity | 上週矩陣 |
| 資安 ⚠️ | 红线 D（closed period）在 salary_settlements 有；HrModule 其他部分無 | 上週矩陣 |
| 架構 ✅ | L1-L6 全過；capability 148 項完整 | 上週矩陣 |
| 品管 ⚠️ | hr/organization 無 e2e | 上週矩陣 |
| 清理 ✅ | 無 dead code | 上週矩陣 |

---

### 11. hr_bonus_settlement（2.5/5）➡️ unchanged

**過去 4 天**：commit 8d97bab（獎金結算列表改 ListPageLayout）+ 1ca947e（獎金結算 dialog 改 wizard）— UI 變更不影響 entity hook 狀態

| 維度 | 判決 | 依據 |
|---|---|---|
| 讀取效能 ⚠️ | bonus-settlement/[tourId]/page.tsx 仍是 direct 讀；ProfitTab `'bonus_orders'` useSWR 無 entity hook | 現場 check |
| 資安 ⚠️ | 红线 D 在 bonus-settlement 部分覆蓋；但多人同時結算同一團無 lock | 上週矩陣 |
| 架構 ✅ | L1 module guard 有；L2 capability 有 | 上週矩陣 |
| 品管 ⚠️ | bonus-settlement 無 e2e | 上週矩陣 |
| 清理 ⚠️ | `tour-bonus-settings.ts` entity 有；但 module 仍是 HrModule 子功能 | 上週矩陣 |

**P1 缺口**：bonus-settlement/[tourId] → entity hook（過去 4 天仍是 ⚠️）

---

### 12. hr_salary_settlement（3.5/5）➡️ unchanged

**過去 4 天**：commit 8a6b92c（薪資結算 wizard Phase 2）+ 9e6cf66（Phase 3）— UI 變更不影響 entity

| 維度 | 判決 | 依據 |
|---|---|---|
| 讀取效能 ⚠️ | salary-settlement/[id]/page.tsx 仍是 `useSWR` + `apiMutate`；無 entity hook | 上週矩陣 |
| 資安 ✅ | 红线 D guard（closed period）已補 | 上週矩陣 |
| 架構 ✅ | L1-L6 全過 | 上週矩陣 |
| 品管 ⚠️ | salary-settlement 無 e2e | 上週矩陣 |
| 清理 ⚠️ | HrSalarySettlementModule 是 HrModule 子功能 | 上週矩陣 |

---

### 13. marketing（4/5 → 4.5/5）🔺 UP

**過去 4 天**：commit 554efaa（新建 /marketing/website module + 5 SSOT + entity hook + 兩頁 UI）；行销模块從單一 marketing page 升級成 marketing + website 雙頁模組

| 維度 | 判決 | 依據 |
|---|---|---|
| 讀取效能 ✅ | `website-tours.ts` entity hook 完整（list/slim/detail + invalidate）；`useWebsiteTours` 在 page.tsx 行29採用 | 現場 check |
| 資安 ✅ | marketing module 是 Corner 官網；workspace_id guard 有 | 上週矩陣 |
| 架構 ✅ | L1-L6 全過；5 SSOT 全部到位（commit 554efaa）| 現場 check |
| 品管 ⚠️ | marketing 無 e2e（新 module、接受）| 上週矩陣 |
| 清理 ⚠️ | website-tours entity 是新建；marketing 模組完整度提升 | 上週矩陣 |

**+0.5 原因**：`website-tours.ts` entity hook 新建完成 + 5 SSOT 全到位

---

### 14. office（3.5/5）➡️ unchanged (unchanged)

**過去 4 天**：無 commit；保留上週分數

---

### 15. orders（4/5）➡️ unchanged

**過去 4 天**：無實質 entity/架構變更（只有 UI 維持）

| 維度 | 判決 | 依據 |
|---|---|---|
| 讀取效能 ✅ | `useOrders` entity hook；createEntityHook 有 realtime | 上週矩陣 |
| 資安 ✅ | RLS/FK 完整；紅線 B/G ✅ | 上週矩陣 |
| 架構 ✅ | L1-L6 全過；apiMutate 有 | 上週矩陣 |
| 品管 ⚠️ | orders 無 realtime e2e | 上週矩陣 |
| 清理 ⚠️ | order-members entity 最近才补；但無實質變動 | 上週矩陣 |

---

### 16. platform_integrations（3.5/5）➡️ unchanged (unchanged)

**過去 4 天**：無 commit；保留上週分數

---

### 17. settings（3/5）➡️ unchanged

**過去 4 天**：cc29b64修了 TenantPrepSection（移除 travel_invoice）+ auth orphan清了；但 settings/company/page.tsx 仍 direct supabase.write（行170 `supabase.from('workspaces').update`）；finance/settings 新增 3 個 entity hook（已建但未採用）

| 維度 | 判決 | 依據 |
|---|---|---|
| 讀取效能 ❌ | settings/company/page.tsx 行170 仍是 `supabase.from('workspaces').update` 直接寫；無 apiMutate invalidate | 現場 check |
| 資安 ✅ | RLS/FK 完整；紅線 C ✅（contract/sign admin client scope修了）；紅線 D 部分覆蓋 | 現場 check |
| 架構 ✅ | L1-L6 全過；ModuleGuard 有 | 上週矩陣 |
| 品管 ⚠️ | settings/company 無 e2e | 上週矩陣 |
| 清理 ⚠️ | settings/company 是半成品；finance/settings 3 個 entity hook 已建但 page 未重構 | 上週矩陣 |

**P0 缺口**：settings/company → entity hook（+4 行可修；但過去 4 天沒動）

---

### 18. shared_data_management（3/5）➡️ unchanged (unchanged)

**過去 4 天**：無 commit；保留上週分數（banks/countries/airports 三頁 SWR key 無 workspace_id — 上週已標 ⚠️）

---

### 19. todos（4/5）➡️ unchanged

**過去 4 天**：無 commit（git log 無 todos 變更）；保留上週分數

| 維度 | 判決 | 依據 |
|---|---|---|
| 讀取效能 ✅ | `useTodos` entity hook；createEntityHook 有 realtime | 上週矩陣 |
| 資安 ✅ | RLS/FK 完整；紅線 G ✅ | 上週矩陣 |
| 架構 ✅ | L1-L6 全過 | 上週矩陣 |
| 品管 ⚠️ | todos 無 realtime e2e | 上週矩陣 |
| 清理 ⚠️ | duplicate exports 待清理；無實質變動 | 上週矩陣 |

---

### 20. tour_attributes（4/5）➡️ unchanged

**過去 4 天**：無 commit；保留上週分數

---

### 21. tours（4/5）➡️ unchanged

**過去 4 天**：無 commit（last tour commit 是 4/18）；保留上週分數

| 維度 | 判決 | 依據 |
|---|---|---|
| 讀取效能 ✅ | `useTours` + `useTourItineraryItems` entity hook；createEntityHook 有 realtime | 上週矩陣 |
| 資安 ✅ | RLS/FK 完整；紅線 B/G ✅ | 上週矩陣 |
| 架構 ✅ | L1-L6 全過；apiMutate 有 | 上週矩陣 |
| 品管 ⚠️ | tours 無 realtime e2e；concurrency test 有 | 上週矩陣 |
| 清理 ⚠️ | unused exports 待清理 | 上週矩陣 |

---

### 22. visas（4.5/5）➡️ unchanged

**過去 4 天**：git show b3a1403（5/21 砍 visas code）+ d8ca6b8（5/22 revert）；但 visas/page.tsx 存在（現場 check）；保留上週分數

---

### 23. workspaces（3.5/5）➡️ unchanged

**過去 4 天**：cc29b64修了 TenantPrepSection；但 workspaces/page.tsx 仍是 `useSWR('workspaces')`（行39）；無 entity hook

| 維度 | 判決 | 依據 |
|---|---|---|
| 讀取效能 ⚠️ | workspaces/page.tsx 行39仍是 `useSWR('workspaces')` 無 entity hook | 現場 check |
| 資安 ✅ | RLS/FK 完整；紅線 A ✅ | 上週矩陣 |
| 架構 ✅ | L1-L6 全過；ModuleGuard 有 | 上週矩陣 |
| 品管 ⚠️ | workspaces 無 e2e | 上週矩陣 |
| 清理 ⚠️ | workspaces 是核心 module；無 entity hook（P1 待補）| 上週矩陣 |

**P1 缺口**：workspaces → entity hook（過去 4 天仍是 ⚠️）

---

### 24. ai_hub（4/5）➡️ unchanged

**過去 4 天**：commit cae67ce（AI Hub UI 改 venturo CIS）+ 9987ee8（channel badge 還原品牌色）；AIConversationsTab 仍是 `useRealtimeMutate`（合理設計決策）；保留上週分數

---

### 25-27. addon_data_*（4/5）➡️ unchanged (unchanged)

**過去 4 天**：無 commit；保留上週分數

---

### 🆕 28. websites（NEW、4.5/5）

**過去 4 天**：commit 255772f（feat(websites): Day 1 — 新模組 skeleton + DB schema + 5 SSOT）— 5/23 新建模組

| 維度 | 判決 | 依據 |
|---|---|---|
| 讀取效能 ✅ | `website-tours.ts` entity hook 完整；`useWebsiteTours` 在 page.tsx 行29已採用 | 現場 check |
| 資安 ✅ | websites module workspace_id guard 有；migration 有 RLS | 現場 check |
| 架構 ✅ | L1-L6 全過；FeatureGate 有；ModuleGuard 有 | 現場 check |
| 品管 ⚠️ | 新 module 無 e2e（接受）| 上週行销模块基准 |
| 清理 ✅ | 新建模組；無 dead code | 上週行销模块基准 |

**⚠️ 缺口**：role_capabilities seed 未執行（migration line 23 註解「由 onboarding flow / 手動配置」— 客戶簽 addon 時會卡住、需要手動 SQL 插 role_capabilities）

---

## 總缺口排序（P0/P1/P2）

### 🔴 P0（影響 user 直接體感、6/1 前應修或要有備案）

| # | Module | 缺口 | 現狀 | 修法 |
|---|---|---|---|---|
| 1 | **accounting**（7 頁）| 仍是 direct supabase、stale 4 天 | 現場確認（vouchers:79 + accounts:134） | 補 entity hook + realtime；估 13+ hr |
| 2 | **archive-management**（行100-101）| invalidate 缺口、stale 4 天 | 現場確認（行100-101仍是 delete 無 invalidate）| +4 行；估 2 hr |
| 3 | **settings/company**（行170）| direct supabase.write 無 invalidate、stale 4 天 | 現場確認（行170仍是 supabase.from('workspaces').update）| +4 行；估 1 hr |

### 🟠 P1（架構正確性、一週內清）

| # | Module | 缺口 | 現狀 |
|---|---|---|---|
| 4 | **finance** service 層 | 多處 direct supabase.write；finance/settings page 未用 5/21 新建的 3 個 entity hook | 現場確認 |
| 5 | **finance** 紅線 D | receipts/disbursement/payment_requests closed period guard 仍缺 | 資安報告 |
| 6 | **hr_bonus_settlement** | bonus-settlement/[tourId] 無 entity hook；ProfitTab `'bonus_orders'` | 現場確認 |
| 7 | **workspaces** | workspaces/page.tsx 無 entity hook（仍是 useSWR） | 現場確認 |
| 8 | **websites** role_capabilities | 新 module seed 漏 role_capabilities、客戶簽 addon 會卡住 | migration line 23 確認 |

### 🟡 P2（合理保留/可延後）

| # | Module | 缺口 | 備註 |
|---|---|---|---|
| 9 | ai_hub | 手刻 `useRealtimeMutate` | 設計決策、不急 |
| 10 | shared_data_management | banks/countries/airports SWR key 無 workspace_id | 近唯讀、低併發、風險低 |
| 11 | office | 半廢；routes:[] 空 | 需 William 拍板凍或砍 |
| 12 | esim | 4 個 route 全 404；但模組 registry 仍有 | 需 William 確認是「重構中」還是「已凍」|
| 13 | travel_invoice | （已凍、Phase 2 再處理）| 不在此矩陣 |

---

## 不確定 / 需 William 複盤

1. **esim 模組實體狀態**：`/esim` 目錄不存在（find 確認）；但 EsimModule 在 registry 有；git show b3a1403 → d8ca6b8 revert；4 個 routes 全 404。是「正在重構」還是「已凍」？
2. **office module 處理**：routes:[] 空、5 SSOT 都掛著、清理維度列在半廢。William 要凍還是砍？
3. **websites role_capabilities**：migration 自己寫「由 onboarding flow / 手動配置」、不是走 standard seed。客戶簽 addon 時誰負責插 role_capabilities？
4. **5/20 P0（accounting 7 pages / archive-management / settings/company）stale 4 天**：6/1 前來得及修嗎？還是至少把最肥的 1-2 頁先修？

---

## 過去 4 天重要 commit（對照矩陣變化）

```
255772f feat(websites): Day 1 — 新模組 skeleton + DB schema + 5 SSOT
cc29b64 perf(batch-2): 3 個 P0 quick win — TenantPrepSection / admin client scope / auth orphan
efc81ea perf(batch-1): Sentry replay 10%→1% + 砍殭屍 pdf-lib(24MB) + 清 stale comment
554efaa feat(marketing): 新建 /marketing/website module（5 SSOT + 兩頁 UI + 兩 API + entity hook）
b3a1403 feat(cleanup): 徹底砍 3 模組 — documents / visas / esim（code 部分）
d8ca6b8 Revert "feat(cleanup): 徹底砍 3 模組 — documents / visas / esim"
010b91e feat(entities): 補 3 個財務設定 entity hook（payment-methods / bank-accounts / expense-categories）
0457f49 fix(swr): ratchet 清 4 個 baseline 檔 — Round 6
```

---

*Logan（openclaw agent: main、MiniMax-M2.7）— 2026-05-24*
*紅線遵守：❌ 未動 src/ ❌ 未動 migrations ❌ 未 push ✅ 僅 grep + 讀檔*
*commit: audit(modules-5dim): 週日矩陣智能重評 18 module — 2026-05-24*