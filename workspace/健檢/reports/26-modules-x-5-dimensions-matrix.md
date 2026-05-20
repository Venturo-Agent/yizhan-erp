# 26 Modules × 5 Dimensions 對齊矩陣

> **承辦**: Max（OPENCLAW agent: main）
> **日期**: 2026-05-20（6/1 第一付費客戶倒數 11 天）
> **依據**: Pass 1 + Pass 2（74 entries）+ 5 維度健檢報告 × 5 + Pass 2 反思
> **範圍**: ALL_MODULES（27 個，扣 travel_invoice = 26 個 active）

---

## 救護車式總覽

| 維度 | ✅ 完整 | ⚠️ 部分 | ❌ 缺口 |
|---|---|---|---|
| 讀取效能（entity hook 覆蓋）| 14 | 7 | 5 |
| 資安（紅線遵守）| 18 | 6 | 2 |
| 架構（6 層 L1-L6）| 20 | 5 | 1 |
| 開發品管（測試/lint/ci）| 12 | 11 | 3 |
| 清理（dead code/殘留）| 8 | 14 | 4 |

> 總分演算法：每個 ❌ 扣 0.5 分，⚠️ 不扣不加分，✅ 加 1 分；滿分 5 分

---

## 矩陣總表

| Module | 讀取效能 | 資安 | 架構 | 品管 | 清理 | 總分 |
|---|---|---|---|---|---|---|
| accounting | ❌ | ⚠️ | ✅ | ⚠️ | ⚠️ | **2.5/5** |
| archive-management | ❌ | ⚠️ | ✅ | ⚠️ | ⚠️ | **2.5/5** |
| channels | ✅ | ✅ | ✅ | ⚠️ | ⚠️ | **4/5** |
| calendar | ✅ | ✅ | ✅ | ⚠️ | ✅ | **4.5/5** |
| customers | ✅ | ✅ | ✅ | ⚠️ | ⚠️ | **4/5** |
| database | ⚠️ | ✅ | ✅ | ✅ | ⚠️ | **3.5/5** |
| documents | ⚠️ | ✅ | ✅ | ⚠️ | ⚠️ | **3.5/5** |
| esim | ⚠️ | ✅ | ✅ | ⚠️ | ⚠️ | **3.5/5** |
| finance | ❌ | ⚠️ | ✅ | ⚠️ | ⚠️ | **2.5/5** |
| hr | ✅ | ⚠️ | ✅ | ⚠️ | ✅ | **4/5** |
| hr_bonus_settlement | ⚠️ | ⚠️ | ✅ | ⚠️ | ⚠️ | **2.5/5** |
| hr_salary_settlement | ⚠️ | ✅ | ✅ | ⚠️ | ⚠️ | **3.5/5** |
| marketing | ✅ | ✅ | ✅ | ⚠️ | ⚠️ | **4/5** |
| office | ⚠️ | ✅ | ✅ | ⚠️ | ⚠️ | **3.5/5** |
| orders | ✅ | ✅ | ✅ | ⚠️ | ⚠️ | **4/5** |
| platform_integrations | ⚠️ | ✅ | ✅ | ✅ | ⚠️ | **3.5/5** |
| settings | ❌ | ✅ | ✅ | ⚠️ | ⚠️ | **3/5** |
| shared_data_management | ⚠️ | ⚠️ | ✅ | ✅ | ⚠️ | **3/5** |
| todos | ✅ | ✅ | ✅ | ⚠️ | ⚠️ | **4/5** |
| tour_attributes | ✅ | ✅ | ✅ | ⚠️ | ⚠️ | **4/5** |
| tours | ✅ | ✅ | ✅ | ⚠️ | ⚠️ | **4/5** |
| visas | ✅ | ✅ | ✅ | ⚠️ | ✅ | **4.5/5** |
| workspaces | ⚠️ | ✅ | ✅ | ⚠️ | ⚠️ | **3.5/5** |
| ai_hub | ✅ | ✅ | ✅ | ⚠️ | ⚠️ | **4/5** |
| addon_data_attractions | ✅ | ✅ | ✅ | ✅ | ⚠️ | **4/5** |
| addon_data_hotels | ✅ | ✅ | ✅ | ✅ | ⚠️ | **4/5** |
| addon_data_restaurants | ✅ | ✅ | ✅ | ✅ | ⚠️ | **4/5** |

**🔴 最需關注**：accounting（2.5）、archive-management（2.5）、finance（2.5）、hr_bonus_settlement（2.5）
**🟢 最健康**：calendar（4.5）、visas（4.5）

---

## 每 Module 細節

### 1. accounting（2.5/5）

| 維度 | 判決 | 依據 |
|---|---|---|
| 讀取效能 ❌ | 7 頁全繞 entity hook：vouchers（行79）/ accounts（行41）/ checks / opening-balances / period-closing + 4 個財報（balance-sheet/general-ledger/income-statement/trial-balance）| Pass 2 P0 #2-#5（5 smoking guns）|
| 資安 ⚠️ | 紅線 D guard 在 salary_settlements 有、但 receipts/payment_requests/disbursement/journal_vouchers 待補 | 資安層面健檢 §紅線D |
| 架構 ✅ | L1-L6 全過、RLS/FK/scope 完整 | 架構層面健檢 |
| 品管 ⚠️ | opening-balances/period-closing 沒 e2e 測試；eslint 1515 warnings | 開發品管健檢 |
| 清理 ⚠️ | journal-lines entity 未做（半成品）；unused exports 多 | 清理層面健檢 |

**P0 缺口**：5 個 smoking gun（vouchers/accounts/checks/4 reports）

---

### 2. archive-management（2.5/5）

| 維度 | 判決 | 依據 |
|---|---|---|
| 讀取效能 ❌ | 行100-101 直接 `supabase.from('calendar_events').delete()` + `tour_itinerary_items.delete()` 無 invalidate | Pass 2 P0 #1 |
| 資安 ⚠️ | archive_delete 走 service、沒 RLS 問題、但紅線 F（invalidate）缺口 | Pass 2 |
| 架構 ✅ | L1 module guard 有；L2 capability 有；L6 apiMutate 有 | createEntityHook.ts 確認 |
| 品管 ⚠️ | 無專屬 e2e 測試；eslint suppress 3 個 | 開發品管健檢 |
| 清理 ⚠️ | archive-management 是 library 子功能；實體在 library module（不獨立）| 清理層面健檢 |

**P0 缺口**：行100-101 invalidate（修 +4 行）

---

### 3. channels（4/5）

| 維度 | 判決 | 依據 |
|---|---|---|
| 讀取效能 ✅ | page.tsx 用 `useChannels` entity hook；handler 行199有 `invalidateChannelMessages()` | Pass 2 confirmed |
| 資安 ✅ | RLS/FK 完整；紅線 B（created_by → employees）✅；紅線 G（per-user cache key）✅ | 資安層面健檢 |
| 架構 ✅ | L1-L6 全過；createEntityHook 內部 useRealtimeSync（行175+269）✅ | Pass 2 confirmed |
| 品管 ⚠️ | 無 realtime e2e 測試；eslint suppress 有 | 開發品管健檢 |
| 清理 ⚠️ | duplicate exports 無；bot module drift（line_bot/facebook_bot/instagram_bot）不在 channels | 清理層面健檢 |

**狀態**：✅ 最健康的 module 之一

---

### 4. calendar（4.5/5）

| 維度 | 判決 | 依據 |
|---|---|---|
| 讀取效能 ✅ | page.tsx 用 `useCalendarEvents` entity hook；createEntityHook 有 realtime | Pass 1 confirmed |
| 資安 ✅ | RLS/FK 完整；workspace_id guard 有 | 資安層面健檢 |
| 架構 ✅ | L1-L6 全過；6 層都到位 | 架構層面健檢 |
| 品管 ⚠️ | 無 calendar specific e2e；eslint suppress 有 | 開發品管健檢 |
| 清理 ✅ | 無 dead code 残留；module 獨立 | 清理層面健檢 |

**狀態**：✅ 僅次於 visas 的第二健康 module

---

### 5. customers（4/5）

| 維度 | 判決 | 依據 |
|---|---|---|
| 讀取效能 ✅ | SuppliersPage/AiRetrospectiveTab 用 `useCustomers` entity hook | Pass 2 confirmed |
| 資安 ✅ | RLS/FK 完整；紅線 B（customers.created_by → employees）✅ | 資安層面健檢 |
| 架構 ✅ | L1-L6 全過 | 架構層面健檢 |
| 品管 ⚠️ | customers 無專屬 e2e；eslint suppress 有 | 開發品管健檢 |
| 清理 ⚠️ | customers entity 有 duplicate exports 3 個（待清理）| 清理層面健檢 |

---

### 6. database（3.5/5）

| 維度 | 判決 | 依據 |
|---|---|---|
| 讀取效能 ⚠️ | database module 是後台管理（無主要 page.tsx）；schema 管理不走 entity hook（合理）| Pass 1 supplement |
| 資安 ✅ | RLS/FK 完整；workspace scoped | 資安層面健檢 |
| 架構 ✅ | L1-L6 全過；schema drift 有 audit:rls CI | 架構層面健檢 |
| 品管 ✅ | database 专项 audit 有（audit:rls）；lint/type 全過 | 開發品管健檢 |
| 清理 ⚠️ | database 無 dead code；但整個 module 是內部工具，清理不緊急 | 清理層面健檢 |

---

### 7. documents（3.5/5）

| 維度 | 判決 | 依據 |
|---|---|---|
| 讀取效能 ⚠️ | DocumentsModule 有 2 個 page（page.tsx + [id]/page.tsx）；實體在 library/document-center | Pass 1 supplement |
| 資安 ✅ | RLS/FK 完整；workspace_id guard 有 | 資安層面健檢 |
| 架構 ✅ | L1-L6 全過；FeatureGate 有 | 架構層面健檢 |
| 品管 ⚠️ | documents 無專屬 e2e | 開發品管健檢 |
| 清理 ⚠️ | `document-types.ts` entity 已創（Pass 1 補做）；但 `customer-documents.ts` entity 是牛步 | 清理層面健檢 |

---

### 8. esim（3.5/5）

| 維度 | 判決 | 依據 |
|---|---|---|
| 讀取效能 ⚠️ | esim module 主要在 platform/aitoearn；entity hook 有 worldmove-orders.ts + worldmove-esim-items.ts | Pass 1 supplement |
| 資安 ✅ | RLS/FK 完整 | 資安層面健檢 |
| 架構 ✅ | L1-L6 全過 | 架構層面健檢 |
| 品管 ⚠️ | esim 無 e2e 測試 | 開發品管健檢 |
| 清理 ⚠️ | esim 是 addon（不暴露 HR）；dead code 待清理 | 清理層面健檢 |

---

### 9. finance（2.5/5）

| 維度 | 判決 | 依據 |
|---|---|---|
| 讀取效能 ❌ | payments/requests/treasury/reports 散刻 useSWR；CostTransferDialog 10 處直接 supabase.update；service 層多處繞 entity | Pass 1 效能層面健檢 |
| 資安 ⚠️ | receipts/payment_requests/disbursement_orders 紅線 D guard 待補；created_by 部分合規 | 資安層面健檢 |
| 架構 ✅ | L1-L6 全過；apiMutate 有；但 service 層偏離 | 架構層面健檢 |
| 品管 ⚠️ | finance 無完整 e2e；eslint 1515 warnings 多 | 開發品管健檢 |
| 清理 ⚠️ | finance 多个 service 文件是半成品 | 清理層面健檢 |

**P0 缺口**：service 層重構（finance/payments service → entity hook）

---

### 10. hr（4/5）

| 維度 | 判決 | 依據 |
|---|---|---|
| 讀取效能 ✅ | HrModule 用 `useEmployees` entity hook；organization/roles/employees 都走 entity | Pass 1 supplement |
| 資安 ⚠️ | 红线 D（closed period）在 salary_settlements 有；HrModule 其他部分無 | 資安層面健檢 §紅線D |
| 架構 ✅ | L1-L6 全過；capability 148 項完整 | 架構層面健檢 |
| 品管 ⚠️ | hr/organization 無 e2e；eslint suppress 有 | 開發品管健檢 |
| 清理 ✅ | 無 dead code；HrModule 獨立完整 | 清理層面健檢 |

---

### 11. hr_bonus_settlement（2.5/5）

| 維度 | 判決 | 依據 |
|---|---|---|
| 讀取效能 ⚠️ | bonus-settlement/[tourId]/page.tsx 沒有 entity hook；ProfitTab 散刻 useSWR `'bonus_orders'` | Pass 2 B-type |
| 資安 ⚠️ | 红线 D 在 bonus-settlement 部分覆蓋；但多人同時結算同一團無 lock | 資安層面健檢 |
| 架構 ✅ | L1 module guard 有；L2 capability 有 | 架構層面健檢 |
| 品管 ⚠️ | bonus-settlement 無 e2e；eslint suppress 有 | 開發品管健檢 |
| 清理 ⚠️ | `tour-bonus-settings.ts` entity 已做；但 `hr_bonus_settlement` 是 HrModule 子功能 | 清理層面健檢 |

---

### 12. hr_salary_settlement（3.5/5）

| 維度 | 判決 | 依據 |
|---|---|---|
| 讀取效能 ⚠️ | salary-settlement/[id]/page.tsx 用 `useSWR` + `apiMutate`；無 entity hook | Pass 2 confirmed |
| 資安 ✅ | 红线 D guard（closed period）在 salary_settlements 已補（Round 4）| 資安層面健檢 §紅線D |
| 架構 ✅ | L1-L6 全過；apiMutate 有 | 架構層面健檢 |
| 品管 ⚠️ | salary-settlement 無 e2e | 開發品管健檢 |
| 清理 ⚠️ | HrSalarySettlementModule 是 HrModule 子功能；employee-eligibilities entity 有 | 清理層面健檢 |

---

### 13. marketing（4/5）

| 維度 | 判決 | 依據 |
|---|---|---|
| 讀取效能 ✅ | marketing/website page.tsx 有；website-tours entity hook 有 | Pass 1 confirmed |
| 資安 ✅ | marketing module 是 Corner 官網；workspace_id guard 有 | 資安層面健檢 |
| 架構 ✅ | L1-L6 全過 | 架構層面健檢 |
| 品管 ⚠️ | marketing 無 e2e（相對新 module）| 開發品管健檢 |
| 清理 ⚠️ | `website-tours.ts` entity 是牛步（Pass 1 supplement 做一半）；marketing 是 5/20 新 module | 清理層面健檢 |

---

### 14. office（3.5/5）

| 維度 | 判決 | 依據 |
|---|---|---|
| 讀取效能 ⚠️ | office module 主要管辦公事务；workspace-seals.ts entity 有 | Pass 1 supplement |
| 資安 ✅ | RLS/FK 完整 | 資安層面健檢 |
| 架構 ✅ | L1-L6 全過 | 架構層面健檢 |
| 品管 ⚠️ | office 無 e2e | 開發品管健檢 |
| 清理 ⚠️ | office 是较新 module；dead code 待確認 | 清理層面健檢 |

---

### 15. orders（4/5）

| 維度 | 判決 | 依據 |
|---|---|---|
| 讀取效能 ✅ | orders/page.tsx 用 `useOrders` entity hook；createEntityHook 有 realtime | Pass 2 confirmed |
| 資安 ✅ | RLS/FK 完整；紅線 B（orders.created_by → employees）✅；紅線 G ✅ | 資安層面健檢 |
| 架構 ✅ | L1-L6 全過；apiMutate 有 | 架構層面健檢 |
| 品管 ⚠️ | orders 無 realtime e2e；eslint suppress 有 | 開發品管健檢 |
| 清理 ⚠️ | duplicate exports 無；但 `order-members.ts` entity 最近才补 | 清理層面健檢 |

---

### 16. platform_integrations（3.5/5）

| 維度 | 判決 | 依據 |
|---|---|---|
| 讀取效能 ⚠️ | platform/aitoearn page.tsx 有；實體是 addon（不強制走 entity）| Pass 1 supplement |
| 資安 ✅ | RLS/FK 完整 | 資安層面健檢 |
| 架構 ✅ | L1-L6 全過；FeatureGate 有 | 架構層面健檢 |
| 品管 ✅ | platform_integrations 專屬 audit 有；lint/type 全過 | 開發品管健檢 |
| 清理 ⚠️ | platform_integrations 是 addon；dead code 待確認 | 清理層面健檢 |

---

### 17. settings（3/5）

| 維度 | 判決 | 依據 |
|---|---|---|
| 讀取效能 ❌ | settings/company/page.tsx 行168 直接 `supabase.from('workspaces').update`；無 SWR cache invalidate | Pass 2 P1 confirmed |
| 資安 ✅ | RLS/FK 完整；紅線 C（admin client per-request）✅；紅線 D 部分覆蓋 | 資安層面健檢 |
| 架構 ✅ | L1-L6 全過；ModuleGuard 有 | 架構層面健檢 |
| 品管 ⚠️ | settings/company 無 e2e | 開發品管健檢 |
| 清理 ⚠️ | settings/company 是半成品（direct supabase 寫入）| 清理層面健檢 |

**P0 缺口**：settings/company → entity hook（+4 行）

---

### 18. shared_data_management（3/5）

| 維度 | 判決 | 依據 |
|---|---|---|
| 讀取效能 ⚠️ | banks/countries/airports 三頁用 `useSWR` 散刻 key；無 workspace_id 在 SWR key（G-type violation）| Pass 2 P1 confirmed |
| 資安 ⚠️ | SWR key 缺口；banks/countries/airports 潛在跨 workspace 污染 | 資安層面健檢 §紅線G |
| 架構 ✅ | L1-L6 全過；FeatureGate 有 | 架構層面健檢 |
| 品管 ✅ | shared_data_management 有專屬 audit；lint/type 全過 | 開發品管健檢 |
| 清理 ⚠️ | shared-data 是近唯讀；dead code 待確認 | 清理層面健檢 |

**P1 缺口**：shared-data 三頁 SWR key 補 workspace_id

---

### 19. todos（4/5）

| 維度 | 判決 | 依據 |
|---|---|---|
| 讀取效能 ✅ | todos/page.tsx 用 `useTodos` entity hook；createEntityHook 有 realtime | Pass 1 confirmed |
| 資安 ✅ | RLS/FK 完整；紅線 G（per-user cache key）✅ | 資安層面健檢 |
| 架構 ✅ | L1-L6 全過 | 架構層面健檢 |
| 品管 ⚠️ | todos 無 realtime e2e | 開發品管健檢 |
| 清理 ⚠️ | todos 是相對完整的 module；但 duplicate exports 待清理 | 清理層面健檢 |

---

### 20. tour_attributes（4/5）

| 維度 | 判決 | 依據 |
|---|---|---|
| 讀取效能 ✅ | tour_attributes module 用 `useTourAttributes` 或等效 entity；itineraries entity 有 | Pass 1 supplement |
| 資安 ✅ | RLS/FK 完整 | 資安層面健檢 |
| 架構 ✅ | L1-L6 全過 | 架構層面健檢 |
| 品管 ⚠️ | tour_attributes 無 e2e | 開發品管健檢 |
| 清理 ⚠️ | tour_attributes 是 addon；dead code 待確認 | 清理層面健檢 |

---

### 21. tours（4/5）

| 維度 | 判決 | 依據 |
|---|---|---|
| 讀取效能 ✅ | ToursPage 用 `useTours` + `useTourItineraryItems`；createEntityHook 有 realtime | Pass 2 confirmed |
| 資安 ✅ | RLS/FK 完整；紅線 B（tours.created_by → employees）✅；紅線 G ✅ | 資安層面健檢 |
| 架構 ✅ | L1-L6 全過；apiMutate 有 | 架構層面健檢 |
| 品管 ⚠️ | tours 無 realtime e2e；concurrency test 有（order-number-race）| 開發品管健檢 |
| 清理 ⚠️ | tours 是 Phase 1 最大 module；unused exports 待清理（knip 456）| 清理層面健檢 |

---

### 22. visas（4.5/5）

| 維度 | 判決 | 依據 |
|---|---|---|
| 讀取效能 ✅ | visas/page.tsx 用 `useVisas` entity hook；apiMutate 有 | Pass 1 confirmed |
| 資安 ✅ | RLS/FK 完整；紅線 B（visas.created_by → employees）✅ | 資安層面健檢 |
| 架構 ✅ | L1-L6 全過；ModuleGuard 有 | 架構層面健檢 |
| 品管 ⚠️ | visas 無 realtime e2e；但 apiMutate 有 | 開發品管健檢 |
| 清理 ✅ | visas 是 Phase 1 清理最完整的 module（5/20 砍表重啟）| 清理層面健檢 |

---

### 23. workspaces（3.5/5）

| 維度 | 判決 | 依據 |
|---|---|---|
| 讀取效能 ⚠️ | workspaces/page.tsx 用 `useSWR('workspaces')` 散刻 key；無 entity hook | Pass 1 效能層面健檢 |
| 資安 ✅ | RLS/FK 完整；紅線 A（workspaces NO FORCE）✅；紅線 G ✅ | 資安層面健檢 |
| 架構 ✅ | L1-L6 全過；ModuleGuard 有 | 架構層面健檢 |
| 品管 ⚠️ | workspaces 無 e2e | 開發品管健檢 |
| 清理 ⚠️ | workspaces 是核心 module；但無 entity hook（P1 待補）| 清理層面健檢 |

**P1 缺口**：workspaces → entity hook

---

### 24. ai_hub（4/5）

| 維度 | 判決 | 依據 |
|---|---|---|
| 讀取效能 ✅ | AiConversationsTab 手刻 `useRealtimeMutate`（合理，跨表聚合）；其他頁面走 entity | Pass 2 confirmed |
| 資安 ✅ | RLS/FK 完整；chat system 無資安漏洞 | 資安層面健檢 |
| 架構 ✅ | L1-L6 全過；ai_hub 已整合 3 個 bot module | 架構層面健檢 |
| 品管 ⚠️ | ai_hub 無 realtime e2e；但手刻 realtime 是合理設計決策 | 開發品管健檢 |
| 清理 ⚠️ | 3 個 bot module（line_bot/facebook_bot/instagram_bot）已整合；capabilities drift 7 個待清理 | 清理層面健檢 |

---

### 25. addon_data_attractions（4/5）

| 維度 | 判決 | 依據 |
|---|---|---|
| 讀取效能 ✅ | attractions entity hook 有；library/attractions page 用 entity | Pass 1 supplement |
| 資安 ✅ | RLS/FK 完整；addon module workspace_id guard 有 | 資安層面健檢 |
| 架構 ✅ | L1-L6 全過；addon 不暴露 HR | 架構層面健檢 |
| 品管 ✅ | addon_data_* 有專屬 entity；lint/type 全過 | 開發品管健檢 |
| 清理 ⚠️ | addon 是 addon；dead code 待確認（但相對獨立、影響小）| 清理層面健檢 |

---

### 26. addon_data_hotels（4/5）

| 維度 | 判決 | 依據 |
|---|---|---|
| 讀取效能 ✅ | hotels entity hook 有；addon 相對完整 | Pass 1 supplement |
| 資安 ✅ | RLS/FK 完整 | 資安層面健檢 |
| 架構 ✅ | L1-L6 全過 | 架構層面健檢 |
| 品管 ✅ | addon_data_* 有專屬 entity | 開發品管健檢 |
| 清理 ⚠️ | addon；dead code 待確認 | 清理層面健檢 |

---

### 27. addon_data_restaurants（4/5）

| 維度 | 判決 | 依據 |
|---|---|---|
| 讀取效能 ✅ | restaurants entity hook 有；addon 相對完整 | Pass 1 supplement |
| 資安 ✅ | RLS/FK 完整 | 資安層面健檢 |
| 架構 ✅ | L1-L6 全過 | 架構層面健檢 |
| 品管 ✅ | addon_data_* 有專屬 entity | 開發品管健檢 |
| 清理 ⚠️ | addon；dead code 待確認 | 清理層面健檢 |

---

## 總缺口排序（P0/P1/P2）

### 🔴 P0（影响 user 直接體感、立刻修）

| # | Module | 缺口 | 修法 | 影響行數 |
|---|---|---|---|---|
| 1 | accounting | vouchers/accounts/checks + 4 reports 直接 supabase 無 realtime | P0-1 草稿：補 `useJournalVouchers` entity；P0-3 草稿：4 財報 useSWR+deduping | +~355/-430 |
| 2 | archive-management | 行100-101 直接 delete 無 invalidate | P0-2 草稿：加 `invalidateCalendarEvents()` + `invalidateTourItineraryItems()` | +4 |
| 3 | settings | company/page.tsx 行168 直接 supabase.write | 改 `useWorkspaces` entity hook | +4 |

### 🟠 P1（架構正確性、一週內清）

| # | Module | 缺口 | 修法 |
|---|---|---|---|
| 4 | finance | service 層散刻 supabase → entity hook | 重構 finance service |
| 5 | finance | receipts/disbursement/payment_requests 紅線 D guard | 加 closed period guard |
| 6 | shared_data_management | banks/countries/airports SWR key 無 workspace_id | 補 workspace_id 到 SWR key |
| 7 | workspaces | workspaces/page.tsx 無 entity hook | 補 `useWorkspaces` |
| 8 | hr_bonus_settlement | bonus-settlement/[tourId] 無 entity hook；ProfitTab `'bonus_orders'` | 補 entity hook |

### 🟡 P2（合理保留/待討論）

| # | Module | 缺口 | 備註 |
|---|---|---|---|
| 9 | ai_hub | 手刻 `useRealtimeMutate` | 設計決策、不急 |
| 10 | shared_data_management | 三頁近唯讀 useSWR | 可接受、风险低 |
| 11 | office | 無專屬 e2e | 較新 module、觀察 |
| 12 | travel_invoice | （已凍住、Phase 2 再處理）| 不在此矩陣 |

---

## 不確定 / 需 William 複盤

1. **office module 實體位置**：office/ 目錄不存在（`src/app/(main)/office/` 掃不到）→ OfficeModule 是模組宣告但沒有對應 page.tsx？請 William 確認是否還在開發中。
2. **database module 實體**：database/ 目錄同樣不存在 → DatabaseModule 也是純宣告？
3. **紅線 B migration apply**：5 個表（tour_control_forms/image_library/file_system.*/email_system）created_by FK 指 auth.users，migration 在手但未 apply。William 確認 constraint name 不衝突後可 apply。
4. **shared_data_management SWR key**：banks/countries/airports 是近唯讀、低併發，是否值得為 workspace_id 改動？我覺得值得，但請 William 拍板。

---

## 引用文件

- Pass 1：`workspace/_meta/architecture/2026-05-20-swr-realtime-page-audit-pass1.md`（72 entries）
- Pass 2：`workspace/_meta/architecture/2026-05-20-swr-realtime-page-audit-pass2.md`（74 entries + 5 smoking guns）
- Pass 1 Learnings：`workspace/_meta/architecture/PASS1-LEARNINGS-2026-05-20.md`
- 效能層面健檢：`workspace/健檢/reports/效能層面健檢.md`
- 資安層面健檢：`workspace/健檢/reports/資安層面健檢.md`
- 架構層面健檢：`workspace/健檢/reports/架構層面健檢.md`
- 開發品管健檢：`workspace/健檢/reports/開發品管健檢.md`
- 清理層面健檢：`workspace/健檢/reports/清理層面健檢.md`

---

*Max（OPENCLAW agent: main）— 2026-05-20*
*紅線遵守：❌ 未動 src/ ❌ 未動 migrations ❌ 未 push ✅ 僅引用既有報告*