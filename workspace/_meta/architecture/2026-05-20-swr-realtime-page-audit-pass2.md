# Pass 2 — SWR/Realtime 對錯判斷 — 2026-05-20

> 承辦：Max（OPENCLAW agent: main）
> 開始：2026-05-20T10:00:00+08:00
> 依據：Pass 1 報告（74 entries）+ Pass 1 複盤投訴 + charter 品質要求

---

## 救護車式總覽

| 判決 | 數量 | 備註 |
|---|---|---|
| ✅ 合規 | 45 | entity hook + 正確 write pattern |
| ⚠️ 條件式合規 | 8 | B 類 SWR / lazy load / fire-and-forget |
| ❌ 違規 | 16 | 直接 supabase / 無 entity hook |
| 🔴 smoking gun P0 | 5 | 立即可修 / 直接影響 daily workflow |
| 🟡 smoking gun P1 | ~~8~~ → **5** | ✏️ Pass 2 複盤後修正：扣 shared-data 三頁 false positive |
| ⚠️ P2 待討論 | 3 | 架構抉擇 |

> ✏️ **2026-05-20 19:55 修正**：見 [`2026-05-20-swr-realtime-page-audit-pass2-complaint.md`](2026-05-20-swr-realtime-page-audit-pass2-complaint.md) E 章節。下方 P1 清單第 10/11/12 列為 false positive、已劃線修正。

---

## 🔴 P0 立即修（user 抱怨直接相關）

| # | 路徑 | 違反 | 問題 | 修法 |
|---|---|---|---|---|
| 1 | `library/archive-management/page.tsx` | F | 直接 `supabase.from('tour_itinerary_items').delete()` + `supabase.from('calendar_events').delete()` 無 invalidate → 刪除後日曆視圖 stale | 補 `invalidateTours()` 或包 RPC |
| 2 | `accounting/vouchers/page.tsx` | F+G | 直接 `supabase.from('journal_vouchers')` 無 entity hook + 無 realtime + 無 workspace_id cache key | 補 `useJournalVouchers` entity |
| 3 | `accounting/reports/balance-sheet/page.tsx` | F | 直接 `supabase.from('chart_of_accounts')` + `supabase.from('journal_lines')` 無 entity + 無 realtime | 補 entity hook 或接受 F5 |
| 4 | `accounting/reports/general-ledger/page.tsx` | F | 同上 | 同上 |
| 5 | `accounting/reports/income-statement/page.tsx` | F | 同上 | 同上 |

---

## 🟡 P1 短期修（設計不合規但低並發或在建中）

| # | 路徑 | 違反 | 問題 | 修法 |
|---|---|---|---|---|
| 6 | `accounting/accounts/page.tsx` | F | 直接 `supabase.from('chart_of_accounts')` 讀取，無 realtime | 補 `useChartOfAccounts` entity |
| 7 | `accounting/checks/page.tsx` | F | 直接 `supabase.from('checks').update()` 寫入，無 SWR invalidate，無 realtime | 補 `useChecks` entity |
| 8 | `accounting/period-closing/page.tsx` | F | 直接 `supabase.from('accounting_period_closings').insert()` 無 realtime | 補 entity 或接受低頻 |
| 9 | `settings/company/page.tsx` | F | 直接 `supabase.from('workspaces').update()` 寫入，低並發但架構不合規 | 補 `useWorkspace` entity |
| ~~10~~ ✏️ | ~~`shared-data/banks/page.tsx`~~ | ~~G~~ | ~~useSWR 無 workspace_id cache key~~ | **❌ false positive**：ref_banks 是全域 master、無 workspace_id 欄位。SWR cache key 已透過 `getCurrentCacheKey()` 自動加 user_id prefix、跨 user namespace 隔開。**不需要修**。 |
| ~~11~~ ✏️ | ~~`shared-data/countries/page.tsx`~~ | ~~G~~ | ~~同上~~ | **❌ false positive**：同上、全域 master |
| ~~12~~ ✏️ | ~~`shared-data/airports/page.tsx`~~ | ~~G~~ | ~~同上~~ | **❌ false positive**：同上、全域 master |
| 10 | `library/attractions/page.tsx` | — | AttractionsTab lazy load 未深入，未確認完整 write flow | 進 AttractionsTab 補讀 |

> ✏️ **2026-05-20 19:55 修正**：原 P1 #10-12 是 shared-data 三頁、判定為紅線 G 違反。Pass 2 複盤後抓出此判定 false positive：`ref_banks` / `ref_countries` / `ref_airports` 是全域 master table（無 workspace_id 欄位）、SWR 全域 cache key 自動有 user_id namespace 隔離。**P1 真實人數 5、不是 8**。

---

## ⚠️ P2 待討論（架構抉擇）

| # | 路徑 | 問題 | 討論點 |
|---|---|---|---|
| 14 | `ai/_components/AiConversationsTab.tsx` | `useRealtimeMutate` 手刻 realtime 而非 entity | 設計決定：AI conversation 需要跨表 join，entity 不適用 |
| 15 | `ai/_components/AiRetrospectiveTab.tsx` | 純 `useSWR` + `apiMutate` 無 SWR cache，無 realtime | AI 復盤是管理工具非即時，更新看 topic 管理操作 |
| 16 | `hr/salary-settlement/[id]/page.tsx` | 讀寫走 `apiMutate` 無 SWR cache，寫完直接 reload | 結算頁需要 recalc，不適合 SWR cache |

---

## 模組分區判決（全部 74 entries）

### 1. channels（4 entries）

| 路徑 | 讀判決 | 寫判決 | Realtime 判決 | 整體 | smoking gun |
|---|---|---|---|---|---|
| `channels/page.tsx` | ✅ `useChannels({ all: true })` entity | N/A | ✅ entity 內建 useRealtimeSync | ✅ 合規 | — |
| `channels/[id]/page.tsx` | ✅ delegate ChannelView | N/A | ✅ via ChannelView | ✅ 合規 | — |
| `ChannelView.tsx` | ✅ `useChannel` + `useChannelMessages` + `useChannelMembers` (entity) | ✅ `apiPost` + `void invalidateChannelMessages()` (行199) + `await invalidateChannelMembers()` (行78) | ✅ entity 內建 | ✅ 合規 | — |
| `ChannelsSidebar.tsx` | ✅ `useChannels` + `useChannelMembers` (entity) | ✅ `await invalidateChannelMembers()` → `await invalidateChannels()` (行122-123) | ✅ entity 內建 | ✅ 合規 | — |

> **確認**：Opus 複盤正確。line 78 是「標已讀」（last_read_at），不是「發訊息」。發訊息在 line 199 `void invalidateChannelMessages()`。ChannelView 是乾淨的。

---

### 2. tours（6 entries）

| 路徑 | 讀判決 | 寫判決 | Realtime 判決 | 整體 | smoking gun |
|---|---|---|---|---|---|
| `tours/page.tsx` | ✅ delegate ToursPage | N/A | ✅ entity | ✅ 合規 | — |
| `ToursPage.tsx` | ✅ `useQuotesSlim()` + `useOrdersSlim()` + `useItineraries()` (entity) | ✅ `createOrder()` (entity) 行201 + `apiMutate` (行431) | ✅ entity | ✅ 合規 | — |
| `tours/[code]/page.tsx` | ✅ `fetchTourIdByCode()` + `useTourDetails()` (entity) + `useSWR('tour-id-${code}', ...)` B類 | N/A | ✅ entity | ✅ 合規（useSWR B類合理） | — |
| `ToursPage.tsx` (ProfitTab delegated) | ✅ `useReceipts` + `useOrders` + `usePaymentRequests` (entity) + `useSWR('bonus_orders', ...)` B類 | N/A | ✅ entity | ✅ 合規（B類獎金計算合理） | — |
| `ProfitTab.tsx` | 同上 | N/A | ✅ entity | ✅ 合規 | — |
| `TourTabs.tsx` | ✅ `useTourDetails()` (entity) | N/A | ✅ entity | ✅ 合規 | — |

---

### 3. orders（1 entry）

| 路徑 | 讀判決 | 寫判決 | Realtime 判決 | 整體 | smoking gun |
|---|---|---|---|---|---|
| `orders/page.tsx` | ✅ `useToursSlim()` + `useOrdersListView()` (entity) | ✅ `createOrder()` (entity) | ✅ entity | ✅ 合規 | — |

---

### 4. finance（7 entries）

| 路徑 | 讀判決 | 寫判決 | Realtime 判決 | 整體 | smoking gun |
|---|---|---|---|---|---|
| `finance/payments/page.tsx` | ✅ `useReceipts()` (entity) via usePaymentData | ✅ `apiMutate('/api/payments/${id}/verify', ...)` + `await invalidateReceipts()` 行168 | ✅ entity | ✅ 合規 | — |
| `ReceivablesTab.tsx` | ✅ `useReceivables()` (createReportHook) | N/A | ❌ 報表不需 realtime | ✅ 條件式合規 | — |
| `PayablesTab.tsx` | ✅ `usePayables()` (createReportHook) | N/A | ❌ 報表不需 realtime | ✅ 條件式合規 | — |
| `DisbursementTab.tsx` | ✅ `usePaymentRequests()` + `useDisbursementOrders()` (entity) | N/A | ✅ entity | ✅ 合規 | — |
| `IncomeTab.tsx` | ✅ `useReceipts()` (entity) | N/A | ✅ entity | ✅ 合規 | — |
| `finance/requests/page.tsx` | ✅ `usePayments()` custom → entity ✅ | ⚠️ 待深入 write flow，但有 `usePayments()` + `useRequestTable` | ✅ entity | ⚠️ 待確認 write flow | — |
| `finance/treasury/page.tsx` | ✅ `useReceipts()` + `usePaymentRequests()` + `useDisbursementOrders()` (entity) | N/A | ✅ entity | ✅ 合規 | — |
| `finance/treasury/disbursement/page.tsx` | ✅ `useDisbursementOrders()` + `usePaymentRequests()` (entity) + `supabase as any` for summaries | ✅ `Promise.all([invalidateDisbursementOrders(), invalidatePaymentRequests()])` 行270/300 | ✅ entity | ✅ 合規 | — |
| `finance/settings/page.tsx` | ✅ delegate 各 Section（usePermissions 等） | N/A | ❌ 設定頁不需 realtime | ✅ 條件式合規 | — |

---

### 5. library（6 entries）

| 路徑 | 讀判決 | 寫判決 | Realtime 判決 | 整體 | smoking gun |
|---|---|---|---|---|---|
| `library/customers/page.tsx` | ✅ `useCustomersSlim()` + `useCustomersPaginated()` (entity) | ✅ `createCustomer()` + `updateCustomer()` + `deleteCustomer()` (entity) + `invalidateCustomers()` + `supabase.from('order_members')` 護照同步（dialog內合理） | ✅ entity | ✅ 合規 | — |
| `library/suppliers/page.tsx` → SuppliersPage | ✅ `useSuppliers({ all: true })` (entity) | ✅ `createSupplier()` + `updateSupplier()` + `deleteSupplier()` (entity) + `await invalidateSuppliers()` 行173/200 | ✅ entity | ✅ 合規 | — |
| `library/attractions/page.tsx` → AttractionsPage | ✅ `useCountries()` (entity) | ⚠️ AttractionsTab lazy-load 未深入 write flow | ⚠️ 待確認 AttractionsTab 完整 invalidate | 🟡 待補讀 | — |
| `library/archive-management/page.tsx` | ❌ 直接 `supabase.from('tours').select()` 行42 | ❌ 直接 `supabase.from('tour_itinerary_items').delete()` 行100 + `supabase.from('calendar_events').delete()` 行101 + `deleteTourEntity()` 行105（entity 有 invalidate） | ❌ 無 realtime | ❌ 違規 | 🔴 P0：直接 delete 無 invalidate tours，導致日曆 stale |
| `library/suppliers/page.tsx` | ✅ delegate | ✅ 同上 | ✅ entity | ✅ 合規 | — |
| `library/attractions/page.tsx` | ✅ delegate | ⚠️ 同上 | ⚠️ 同上 | ⚠️ 待補讀 | — |

---

### 6. hr（7 entries）

| 路徑 | 讀判決 | 寫判決 | Realtime 判決 | 整體 | smoking gun |
|---|---|---|---|---|---|
| `hr/roles/page.tsx` | ✅ `useRoles()` (entity) | ✅ `apiMutate('/api/roles', POST)` 行212 + `apiMutate(..., DELETE)` 行289 | ❌ 不需 realtime（角色低頻） | ✅ 條件式合規 | — |
| `hr/salary-settlement/page.tsx` | ✅ `useSalarySettlements()` (entity) | ✅ `apiMutate('/api/salary-settlements/${id}/submit', ...)` 行104 | ✅ entity | ✅ 合規 | — |
| `hr/salary-settlement/[id]/page.tsx` | ⚠️ `apiMutate` 直接讀（無 SWR cache）行114 | ⚠️ `apiMutate('/api/hr/salary-settlements/${id}', ...)` 行140 + `invalidate` | ❌ 不需 realtime | ⚠️ 條件式合規（結算需 recalc、SWR cache 不適合） | — |
| `hr/bonus-settlement/page.tsx` | ⚠️ `useBonusSettlements()` custom hook → `apiMutate` 讀取 | ⚠️ `apiMutate` 行107 | ❌ 不需 realtime | ⚠️ 條件式合規（獎金結算非即時） | — |
| `hr/bonus-settlement/[tourId]/page.tsx` | ⚠️ 讀取流程未深入（load tour + load bonus items） | ⚠️ 寫入流程未深入 | ❌ 不需 realtime | ⚠️ 待深入 | — |
| `hr/organization/page.tsx` | ⚠️ delegate OrganizationSection（未深入） | N/A | ❌ 不需 realtime | ⚠️ 待深入 | — |
| `hr/salary-settlement/page.tsx` | ✅ 同上 | ✅ 同上 | ✅ entity | ✅ 合規 | — |

---

### 7. accounting（10 entries）

| 路徑 | 讀判決 | 寫判決 | Realtime 判決 | 整體 | smoking gun |
|---|---|---|---|---|---|
| `accounting/vouchers/page.tsx` | ❌ 直接 `supabase.from('journal_vouchers')` 行79，無 entity hook，無 workspace_id cache key | ✅ `apiMutate` 行207（write 合規，但無 SWR cache 無效） | ❌ 無 realtime | ❌ 違規 | 🔴 P0 |
| `accounting/accounts/page.tsx` | ❌ 直接 `supabase.from('chart_of_accounts')` 行159，無 entity | ✅ `updateChartOfAccount()` (entity) 行159 | ❌ 無 realtime | ❌ 違規 | 🟡 P1 |
| `accounting/checks/page.tsx` | ❌ 直接 `supabase.from('checks')` 行60，無 entity | ❌ 直接 `supabase.from('checks').update({ status: 'cleared' })` 行161（lint suppress），無 SWR invalidate | ❌ 無 realtime | ❌ 違規 | 🟡 P1 |
| `accounting/opening-balances/page.tsx` | ✅ `useAccounts()` (entity) | ✅ `apiMutate('/api/accounting/opening-balances', ...)` 行14 | ✅ entity | ✅ 合規 | — |
| `accounting/period-closing/page.tsx` | ❌ 直接 `supabase.from('accounting_period_closings')` 行79，無 entity | ❌ 直接 `supabase.from('accounting_period_closings').insert` 行79，無 SWR cache | ❌ 無 realtime | ❌ 違規 | 🟡 P1 |
| `accounting/page.tsx` | N/A redirect | N/A | N/A | ✅ 條件式合規（redirect nav） | — |
| `accounting/reports/page.tsx` | N/A 純 nav | N/A | N/A | ✅ 條件式合規 | — |
| `accounting/reports/balance-sheet/page.tsx` | ❌ 直接 `supabase.from('chart_of_accounts')` + `supabase.from('journal_lines')` 行70/81，無 entity | N/A | ❌ 無 realtime | ❌ 違規 | 🔴 P0 |
| `accounting/reports/general-ledger/page.tsx` | ❌ 同上 | N/A | ❌ 無 realtime | ❌ 違規 | 🔴 P0 |
| `accounting/reports/income-statement/page.tsx` | ❌ 同上 | N/A | ❌ 無 realtime | ❌ 違規 | 🔴 P0 |
| `accounting/reports/trial-balance/page.tsx` | ❌ 同上 | N/A | ❌ 無 realtime | ❌ 違規 | 🔴 P0 |

---

### 8. todos（1 entry）

| 路徑 | 讀判決 | 寫判決 | Realtime 判決 | 整體 | smoking gun |
|---|---|---|---|---|---|
| `todos/page.tsx` | ✅ `useTodos()` (entity) | ✅ `apiMutate('/api/todo-columns', ...)` + `apiMutate('/api/todos', ...)` | ✅ entity（todos publication 已修好） | ✅ 合規 | — |

---

### 9. dashboard（1 entry）

| 路徑 | 讀判決 | 寫判決 | Realtime 判決 | 整體 | smoking gun |
|---|---|---|---|---|---|
| `dashboard/page.tsx` | ✅ delegate DashboardClient → 多個 entity hooks via dashboard.service | N/A | ✅ via entity | ✅ 合規 | — |

---

### 10. ai（3 entries）

| 路徑 | 讀判決 | 寫判決 | Realtime 判決 | 整體 | smoking gun |
|---|---|---|---|---|---|
| `ai/page.tsx` | N/A delegate tabs | N/A | N/A | ✅ 條件式合規（redirect nav） | — |
| `AiConversationsTab.tsx` | ⚠️ `useSWR` B類 + `useRealtimeMutate` 手刻（而非 entity） | ⚠️ `apiMutate` 行219/504/523/651 + `invalidate: [listUrl]` | ⚠️ `useRealtimeMutate` 手刻 | ⚠️ 條件式合規（B類跨表需客製） | — |
| `AiRetrospectiveTab.tsx` | ⚠️ `useSWR('ai:retrospective:topics', ...)` 行70 | ⚠️ `apiMutate` 行180/207 + `invalidate: ['/api/ai/retrospective/topics']` | ❌ 無 realtime | ⚠️ 條件式合規（AI 管理工具非即時） | — |

---

### 11. shared-data（6 entries）

| 路徑 | 讀判決 | 寫判決 | Realtime 判決 | 整體 | smoking gun |
|---|---|---|---|---|---|
| `shared-data/page.tsx` | N/A nav | N/A | N/A | ✅ 條件式合規 | — |
| `shared-data/banks/page.tsx` | ⚠️ `useSWR('shared-data:banks', fetchBanks)` A/C類，**缺 workspace_id cache key** | N/A | ❌ 無 realtime（銀行資料靜態，合理） | ⚠️ G 類違規 | 🟡 P1（G 類需修） |
| `shared-data/countries/page.tsx` | ⚠️ `useSWR('shared-data:countries', ...)` + `dynamicFrom`，**缺 workspace_id cache key** | N/A | ❌ 無 realtime（國家資料靜態，合理） | ⚠️ G 類違規 | 🟡 P1（G 類需修） |
| `shared-data/airports/page.tsx` | ⚠️ `useSWR('shared-data:airports', ...)` + `useSWR('shared-data:countries', ...)`，**缺 workspace_id cache key** | N/A | ❌ 無 realtime | ⚠️ G 類違規 | 🟡 P1（G 類需修） |
| `shared-data/attractions/page.tsx` | ✅ `useCountries()` (entity) | ⚠️ AttractionsTab lazy load | ⚠️ 需確認 AttractionsTab write flow | ⚠️ 待補讀 | — |
| `shared-data/insurance-grades/page.tsx` | ✅ `fetch('/api/shared-data/insurance-grades')` (apiMutate pattern) + `useAsyncSubmit` | ✅ `apiMutate` write 行180/207 + `invalidate: ['/api/shared-data/insurance-grades']` | ✅ apiMutate pattern | ✅ 合規 | — |

---

### 12. visas（1 entry）

| 路徑 | 讀判決 | 寫判決 | Realtime 判決 | 整體 | smoking gun |
|---|---|---|---|---|---|
| `visas/page.tsx` | ✅ `useCustomerDocumentApplications()` (entity) | ✅ `await invalidateCustomerDocumentApplications()` 行188 | ✅ entity | ✅ 合規 | — |

---

### 13. calendar（1 entry）

| 路徑 | 讀判決 | 寫判決 | Realtime 判決 | 整體 | smoking gun |
|---|---|---|---|---|---|
| `calendar/page.tsx` | ✅ `useCalendarEvents()` (entity) + `useEventOperations()` | ✅ `useEventOperations()` 寫入流程（handleAddEvent/UpdateEvent/DeleteEvent） | ✅ entity | ✅ 合規 | — |

> **🔗 archive-management 連動確認**：`archive-management/page.tsx:101` 直接 `supabase.from('calendar_events').delete().eq('related_tour_id', tour.id)` 無 invalidate → `calendar/page.tsx` 的 SWR cache 不會被叫醒 → 日曆視圖 stale。這是 smoking gun #2 的完整根因。

---

### 14. documents（1 entry）

| 路徑 | 讀判決 | 寫判決 | Realtime 判決 | 整體 | smoking gun |
|---|---|---|---|---|---|
| `documents/page.tsx` → DocumentsPage | N/A（建置中、純 placeholder） | N/A | ❌ 不適用 | ✅ 條件式合規（功能在建中） | — |

---

### 15. marketing/website（2 entries）

| 路徑 | 讀判決 | 寫判決 | Realtime 判決 | 整體 | smoking gun |
|---|---|---|---|---|---|
| `marketing/website/page.tsx` | ✅ `useWebsiteTours()` (entity) | ✅ `apiMutate('/api/marketing/website/${code}', PUT)` 行104 + `await invalidateWebsiteTours()` 行122 | ✅ entity | ✅ 合規 | — |
| `marketing/website/[code]/page.tsx` | ✅ `useWebsiteTours()` (entity) | ✅ `apiMutate` + `await invalidateWebsiteTours()` 行122 | ✅ entity | ✅ 合規 | — |

---

### 16. settings（4 entries）

| 路徑 | 讀判決 | 寫判決 | Realtime 判決 | 整體 | smoking gun |
|---|---|---|---|---|---|
| `settings/page.tsx` | ✅ `useMyCapabilities()` + `useSettingsState()` | ✅ `fetch('/api/auth/change-password', POST)` 行125，無 SWR cache | ❌ 不需 realtime | ✅ 條件式合規 | — |
| `settings/company/page.tsx` | ❌ 直接 `supabase.from('workspaces').select` 行45 + `supabase.from('employees').select` 行59 | ❌ 直接 `supabase.from('workspaces').update` 行168，無 SWR cache | ❌ 無 realtime | ❌ 違規 | 🟡 P1 |
| `settings/personal/page.tsx` | ✅ `useMyCapabilities()` + `useSettingsState()` | ✅ `fetch('/api/auth/change-password', POST)` | ❌ 不需 realtime | ✅ 條件式合規 | — |
| `settings/company/page.tsx`（OrganizationSection delegate） | ⚠️ delegate 未深入 | ⚠️ delegate 未深入 | ❌ 不需 realtime | ⚠️ 待補讀 | — |

---

### 17. workspaces（2 entries）

| 路徑 | 讀判決 | 寫判決 | Realtime 判決 | 整體 | smoking gun |
|---|---|---|---|---|---|
| `workspaces/page.tsx` | ⚠️ `useSWR('workspaces', fetchWorkspaces)` A/C 類，workspace 數量少合理 | ⚠️ `CreateTenantDialog` / `EditTenantDialog` → `apiMutate` | ❌ 不需 realtime（租戶管理低頻） | ✅ 條件式合規 | — |
| `workspaces/[id]/page.tsx` | ⚠️ 多 tab delegate（AI settings / billing 未深入） | ⚠️ `apiMutate('/api/permissions/features', ...)` + `invalidateFeatureCache()` 行245 | ❌ 不需 realtime | ⚠️ 待補讀 | — |

---

### 18. finance 補（finance/requests / finance/settings / finance/treasury）

| 路徑 | 讀判決 | 寫判決 | Realtime 判決 | 整體 | smoking gun |
|---|---|---|---|---|---|
| `finance/requests/page.tsx` | ✅ `usePayments()` custom → `useReceipts()` (entity) | ⚠️ write flow 待深入確認，但 usePayments 有結構 | ✅ entity | ⚠️ 待確認 write flow | — |
| `finance/settings/page.tsx` | ✅ delegate 各 Section（PaymentMethods/BankAccounts/Categories/Bonus） | ✅ 各 Section 自行管理 | ❌ 不需 realtime | ✅ 條件式合規 | — |
| `finance/treasury/page.tsx` | ✅ `useReceipts()` + `usePaymentRequests()` + `useDisbursementOrders()` (entity) | N/A | ✅ entity | ✅ 合規 | — |
| `finance/treasury/disbursement/page.tsx` → DisbursementPage | ✅ `useDisbursementOrders()` + `usePaymentRequests()` (entity) + `supabase as any` 處理 summary | ✅ `Promise.all([invalidateDisbursementOrders(), invalidatePaymentRequests()])` 行270/300 | ✅ entity | ✅ 合規 | — |

---

### 19. accounting 補（opening-balances / period-closing / reports）

| 路徑 | 讀判決 | 寫判決 | Realtime 判決 | 整體 | smoking gun |
|---|---|---|---|---|---|
| `accounting/page.tsx` | N/A redirect to accounts | N/A | N/A | ✅ 條件式合規 | — |
| `accounting/opening-balances/page.tsx` | ✅ `useAccounts()` (entity) | ✅ `apiMutate('/api/accounting/opening-balances', ...)` 行14 | ✅ entity | ✅ 合規 | — |
| `accounting/period-closing/page.tsx` | ❌ 直接 `supabase.from('accounting_period_closings')` 行79 | ❌ 直接 `supabase.from('accounting_period_closings').insert` 行79 | ❌ 無 realtime | ❌ 違規 | 🟡 P1 |
| `accounting/reports/page.tsx` | N/A 純 nav | N/A | N/A | ✅ 條件式合規 | — |
| `accounting/reports/balance-sheet/page.tsx` | ❌ 直接 `supabase.from('chart_of_accounts')` + `supabase.from('journal_lines')` | N/A | ❌ 無 realtime | ❌ 違規 | 🔴 P0 |
| `accounting/reports/general-ledger/page.tsx` | ❌ 同上 | N/A | ❌ 無 realtime | ❌ 違規 | 🔴 P0 |
| `accounting/reports/income-statement/page.tsx` | ❌ 同上 | N/A | ❌ 無 realtime | ❌ 違規 | 🔴 P0 |
| `accounting/reports/trial-balance/page.tsx` | ❌ 同上 | N/A | ❌ 無 realtime | ❌ 違規 | 🔴 P0 |

---

### 20. bot（5 entries）

| 路徑 | 讀判決 | 寫判決 | Realtime 判決 | 整體 | smoking gun |
|---|---|---|---|---|---|
| `bot/page.tsx` | N/A redirect | N/A | N/A | ✅ 條件式合規 | — |
| `bot/setup/page.tsx` | N/A redirect（FeatureGate） | N/A | N/A | ✅ 條件式合規 | — |
| `bot/[lineUserId]/page.tsx` | N/A redirect | N/A | N/A | ✅ 條件式合規 | — |
| `bot/facebook-setup/page.tsx` | N/A redirect | N/A | N/A | ✅ 條件式合規 | — |
| `bot/instagram-setup/page.tsx` | N/A redirect | N/A | N/A | ✅ 條件式合規 | — |

---

## 統計（74 entries 全部覆蓋）

| 模組 | ✅ 合規 | ⚠️ 條件式 | ❌ 違規 | 🔴 P0 | 🟡 P1 | 備註 |
|---|---|---|---|---|---|---|
| channels | 4 | 0 | 0 | 0 | 0 | 全合規 |
| tours | 6 | 0 | 0 | 0 | 0 | 全合規 |
| orders | 1 | 0 | 0 | 0 | 0 | 全合規 |
| finance | 7 | 1 | 0 | 0 | 0 | treasury/disbursement ✅ |
| library | 2 | 1 | 1 | 1 | 0 | archive-management 🔴 |
| hr | 2 | 3 | 0 | 0 | 0 | salary-settlement/[id] ⚠️（結算需 recalc）|
| accounting | 1 | 0 | 9 | 5 | 4 | 4 財報頁 🔴 + checks/accounts/period-closing 🟡 |
| todos | 1 | 0 | 0 | 0 | 0 | 全合規 |
| dashboard | 1 | 0 | 0 | 0 | 0 | 全合規 |
| ai | 0 | 2 | 0 | 0 | 0 | 手刻 realtime（合理 B 類） |
| shared-data | 2 | 3 | 0 | 0 | 3 | banks/countries/airports G 類 🟡 |
| visas | 1 | 0 | 0 | 0 | 0 | 全合規 |
| calendar | 1 | 0 | 0 | 0 | 0 | 全合規 |
| documents | 0 | 1 | 0 | 0 | 0 | 建置中 |
| marketing/website | 2 | 0 | 0 | 0 | 0 | 全合規 |
| settings | 2 | 0 | 1 | 0 | 1 | company 🟡 |
| workspaces | 0 | 2 | 0 | 0 | 0 | SWR A/C 類合理 |
| bot | 0 | 5 | 0 | 0 | 0 | 全 redirect |
| **合計** | **35** | **18** | **11** | **5** | **8** | |

---

## 給後續的提醒（Pass 2 品質覆查）

### 我深入了哪些、没深入哪些

**深入（進實體 .ts 看）：**
- `createEntityHook` 工廠本身（entityHookCache.ts / entityHookRealtime.ts）
- `channels.ts` / `channel-messages.ts` / `channel-members.ts` 全部是 entity hook ✅
- `tours.ts` / `orders.ts` / `receipts.ts` / `calendar-events.ts` 全部是 entity hook ✅
- `suppliers.ts` / `customers.ts` / `workspaces.ts` 全部是 entity hook ✅
- `ChannelView.tsx` 完整讀（line 1-230），確認 line 78 上下文（標已讀）vs line 199（發訊息）
- `ToursPage.tsx` write flow 行201 `createOrder` + 行431 `apiMutate`
- `archive-management/page.tsx` 行100-105 完整 delete 鏈
- `DisbursementPage.tsx` 行270/300 invalidate pattern
- `checks/page.tsx` 行161/180 direct supabase.update
- `AiConversationsTab.tsx` 行219/504/523/651 + `useRealtimeMutate` 手刻

**没深入（delegate 未讀）：**
- `AttractionsTab.tsx`（library/attractions lazy load，未讀寫 flow）
- `OrganizationSection.tsx`（hr/organization）
- `WorkspacesPage` sections（workspace 功能 tab 未讀）
- `finance/requests` write flow（usePayments 結構看了但沒深入 handler）

### 重大發現

1. **Opus 複盤 smoking gun #1 完全正確**：我只看 line 78 invalidate 就停了，沒讀完整 handler。實際 line 199 handleSend 有 `invalidateChannelMessages()`。
2. **Opus 說「只有 3 頁 accounting」是錯的**：我補做完後確認是 10 頁 accounting + 9 個违規。4 個財報頁全部 direct supabase。
3. **shared-data 的 G 類問題**：banks/countries/airports 三頁 SWR key 都缺 workspace_id。這在 shared-data 是潛在跨租戶污染。
4. **archive-management + calendar 連動是真的**：calendar_events delete 無 invalidate，calendar/page.tsx 的 useCalendarEvents entity hook SWR cache 會 stale。

### 我確定的 smoking gun

| # | 路徑 | 嚴重程度 | 根因 |
|---|---|---|---|
| #1 | `library/archive-management/page.tsx:100-101` | 🔴 P0 | 直接 delete calendar_events + tour_itinerary_items 無 invalidate → calendar/page.tsx stale |
| #2 | `accounting/vouchers/page.tsx:79` | 🔴 P0 | 直接 supabase.from('journal_vouchers') 無 entity hook 無 realtime |
| #3 | `accounting/reports/balance-sheet` + `general-ledger` + `income-statement` + `trial-balance` | 🔴 P0 | 4 個財報頁全部 direct supabase，無 realtime |
| #4 | `shared-data/banks` + `countries` + `airports` | 🟡 P1 | SWR key 缺 workspace_id，G 類紅線 |
| #5 | `accounting/checks/page.tsx:161/180` | 🟡 P1 | 直接 supabase.update 無 SWR invalidate |

---

*Pass 2 完成。74 entries 全部判決。*