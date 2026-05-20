# Pass 1 — SWR/Realtime 全頁面盤點 — 2026-05-20

> 承辦：Max（OPENCLAW agent: main、人格 Max）
> 開始：2026-05-20T09:00:00+08:00

## 救護車式總覽

| 指標 | 數量 | 備註 |
|---|---|---|
| 掃描範圍 | ~86 個頁面/組件 | 含 page.tsx + *Tab.tsx |
| 用 entity hook 讀取 | 多數 | `useXxx()` from `@/data` |
| 散刻 useSWR | 少數（~5 頁） | 見 B 類說明 |
| 直接 supabase.from 寫入 | 少數 | 多已搬 entity hook |
| 有 Realtime（entity 內建）| 多數 | `createEntityHook` 內建 |
| 手刻 supabase.channel | 極少 | 只在特定場面 |

---

## 模組分區（依路由）

### 1. channels（頻道）← William 痛點區

| 路徑 | 頁面名 | 讀 | 寫 | Realtime | 備註 |
|---|---|---|---|---|---|
| `channels/page.tsx` | 頻道列表 | `useChannels({ all: true })` (entity) | 無 | ✅ entity 內建 | 乾淨 |
| `channels/[id]/page.tsx` | 頻道詳情 | delegates to `ChannelView` | 無 | via ChannelView |  |
| `channels/_components/ChannelView.tsx` | 頻道詳情組件 | `useChannel` + `useChannelMessages` + `useChannelMembers` (entity) | `apiPost` + `invalidateChannelMessages()` + `invalidateChannelMembers()` | ✅ entity 內建 | invalidate 有做到 |
| `channels/_components/ChannelsSidebar.tsx` | 頻道側邊欄 | `useChannels` + `useChannelMembers` (entity) | `invalidateChannels()` + `invalidateChannelMembers()` | ✅ entity 內建 |  |

**channels 觀察**：架構上應該即時（entity hook + realtime）。若仍有「新增看不到」問題，懷疑是 invalidate timing 或訊息走別的路（非 entity hook 寫入）。

---

### 2. tours（旅遊團）

| 路徑 | 頁面名 | 讀 | 寫 | Realtime | 備註 |
|---|---|---|---|---|---|
| `tours/page.tsx` | 旅遊團列表 | `useQuotesSlim()` + `useOrdersSlim()` + `useItineraries()` (entity) | 無 | ✅ entity | delegate ToursPage.tsx |
| `tours/_components/ToursPage.tsx` | 旅遊團列表實作 | 同上 + `useToursPage` hook | `createOrder()` (entity) + `apiMutate` (行431) | ✅ entity |  |
| `tours/[code]/page.tsx` | 旅遊團詳情 | `fetchTourIdByCode()` + `useTourDetails()` (entity) + `useSWR('tour-id-${code}', ...)` (B類保留) | 無 | ✅ entity | useSWR 查 code→id、合理保留 |
| `tours/_components/ProfitTab.tsx` | 團收益分析 | `useReceipts` + `useOrders` + `usePaymentRequests` (entity) + `useSWR('bonus_orders', ...)` (B類) | 無 | ✅ entity | 獎金跨表計算、保留 |
| `tours/_components/TourTabs.tsx` | Tab 切換 | `useTourDetails()` (entity) | 無 | ✅ entity |  |

---

### 3. orders（訂單）

| 路徑 | 頁面名 | 讀 | 寫 | Realtime | 備註 |
|---|---|---|---|---|---|
| `orders/page.tsx` | 訂單列表 | `useToursSlim()` + `useOrdersListView()` (→ entity) | `createOrder()` (entity) | ✅ entity |  |

---

### 4. finance（財務）

| 路徑 | 頁面名 | 讀 | 寫 | Realtime | 備註 |
|---|---|---|---|---|---|
| `finance/payments/page.tsx` | 收款列表 | `usePaymentData()` → `useReceipts()` (entity) | `apiMutate('/api/payments/${id}/verify', ...)` + `invalidateReceipts()` | ✅ entity | 寫入電商已正規化 |
| `finance/reports/_components/ReceivablesTab.tsx` | 應收帳款 | `useReceivables()` (createReportHook) ✅ | 無 | ❌ | 報表無 realtime、合理 |
| `finance/reports/_components/PayablesTab.tsx` | 應付帳款 | `usePayables()` (createReportHook) ✅ | 無 | ❌ | 同上 |
| `finance/reports/_components/DisbursementTab.tsx` | 出納Tab | `usePaymentRequests()` + `useDisbursementOrders()` (entity) | 無 | ✅ entity |  |
| `finance/reports/_components/IncomeTab.tsx` | 收入Tab | `useReceipts()` (entity) | 無 | ✅ entity |  |

---

### 5. library（客戶 / 供應商 / 景點）

| 路徑 | 頁面名 | 讀 | 寫 | Realtime | 備註 |
|---|---|---|---|---|---|
| `library/customers/page.tsx` | 客戶列表 | `useCustomersSlim()` + `useCustomersPaginated()` (entity) | `createCustomer()` + `updateCustomer()` + `deleteCustomer()` (entity) + `supabase.from('order_members')` (護照同步 dialog 內) | ✅ entity | 直接 supabase 為護照同步功能、合理 |
| `library/suppliers/page.tsx` | 供應商列表 | `SuppliersPage` (delegate) | 待掃 delegate | 待掃 |  |
| `library/attractions/page.tsx` | 景點列表 | 待掃 | 待掃 | 待掃 |  |
| `library/archive-management/page.tsx` | 歸檔管理 | `supabase.from('tours')` (直接) | `supabase.from('tour_itinerary_items').delete()` + `supabase.from('calendar_events').delete()` + `deleteTourEntity()` (entity) | ❌ | 歸檔操作直接 supabase、需確認有無 invalidate |

---

### 6. hr（人力資源）

| 路徑 | 頁面名 | 讀 | 寫 | Realtime | 備註 |
|---|---|---|---|---|---|
| `hr/roles/page.tsx` | 角色設定 | `useRoles()` (custom → entity) ✅ | `apiMutate('/api/roles', ...)` (create) + `apiMutate('/api/roles/${id}/tab-permissions', ...)` (cap update) + `apiMutate(..., { method: DELETE })` (delete) | ❌不明 | 無 realtime 確認、必要性待定 |
| `hr/salary-settlement/page.tsx` | 薪資結算列表 | `useSalarySettlements()` (entity) ✅ | `apiMutate('/api/salary-settlements/${id}/submit', ...)` | ✅ entity |  |
| `hr/salary-settlement/[id]/page.tsx` | 薪資結算詳情 | 待掃 | 待掃 | 待掃 |  |
| `hr/bonus-settlement/page.tsx` | 獎金結算列表 | `useBonusSettlements()` (custom hook) → `apiMutate('/api/hr/bonus-settlements/pending-tours', ...)` | `apiMutate` (行107) | ❌ |  |
| `hr/organization/page.tsx` | 組織架構 | delegate to `OrganizationSection` | — | — |  |

---

### 7. accounting（會計）

| 路徑 | 頁面名 | 讀 | 寫 | Realtime | 備註 |
|---|---|---|---|---|---|
| `accounting/vouchers/page.tsx` | 傳票列表 | `supabase.from('journal_vouchers')` (直接) | `apiMutate` (行26) | ❌不明 | 直接 supabase 讀、待確認是否有 realtime |
| `accounting/accounts/page.tsx` | 會計科目 | `supabase.from('chart_of_accounts')` (直接) | `updateChartOfAccount()` (entity) (行159) | ❌不明 | 讀走直接 supabase（非 entity） |
| `accounting/checks/page.tsx` | 支票列表 | `supabase.from('checks')` (直接) | `supabase.from('checks').update({ status: 'cleared' })` (行163/180) | ❌不明 | 寫入直接 supabase（有 lint suppress） |

---

### 8. todos（待辦）

| 路徑 | 頁面名 | 讀 | 寫 | Realtime | 備註 |
|---|---|---|---|---|---|
| `todos/page.tsx` | 待辦任務 | `useTodos()` (entity) ✅ | `apiMutate('/api/todo-columns', ...)` + `apiMutate('/api/todos', ...)` | ✅ entity | todos realtime publication 已修好 |

---

### 9. dashboard

| 路徑 | 頁面名 | 讀 | 寫 | Realtime | 備註 |
|---|---|---|---|---|---|
| `dashboard/page.tsx` | 儀表板 | delegate to `DashboardClient` → 多個 entity hooks via `dashboard.service` | 無 | ✅ via entity |  |

---

### 10. ai

| 路徑 | 頁面名 | 讀 | 寫 | Realtime | 備註 |
|---|---|---|---|---|---|
| `ai/page.tsx` | AI 助理 | delegates to tabs | — | — |  |
| `ai/_components/AiConversationsTab.tsx` | AI 對話列表 | `useSWR` (B類保留) + `useRealtimeMutate` | `apiMutate` (行219/504/523/651) | ⚠️ `useRealtimeMutate` 手刻 | B 類複雜跨表、保留 |
| `ai/_components/AiRetrospectiveTab.tsx` | AI 回顧 | 待掃 | 待掃 | 待掃 |  |

---

### 11. shared-data（共享資料）

| 路徑 | 頁面名 | 讀 | 寫 | Realtime | 備註 |
|---|---|---|---|---|---|
| `shared-data/banks/page.tsx` | 銀行資料 | `useSWR('shared-data:banks', fetchBanks)` (A/C類) | 無 | ❌ | 銀行為唯讀、realtime 不需要 |
| `shared-data/countries/page.tsx` | 國家資料 | 待掃 | 待掃 | ❌ |  |
| `shared-data/airports/page.tsx` | 機場資料 | 待掃 | 待掃 | ❌ |  |

---

### 12. visas（簽證）

| 路徑 | 頁面名 | 讀 | 寫 | Realtime | 備註 |
|---|---|---|---|---|---|
| `visas/page.tsx` | 簽證申請 | `useCustomerDocumentApplications()` (entity) ✅ | `invalidateCustomerDocumentApplications()` (行188) | ✅ entity | 2026-05-20 新做的 entity hook |

---

### 13. cis（外部系統整合）

| 路徑 | 頁面名 | 讀 | 寫 | Realtime | 備註 |
|---|---|---|---|---|---|
| `cis/page.tsx` | CIS 總覽 | `useCisClients()` (entity) → 但 DB table 不存在 | — | ⚠️ | 5/19 已發現：table 不存在、前端實作但會炸 |
| `cis/[id]/page.tsx` | CIS 客戶詳情 | 同上 | — | ⚠️ |  |
| `cis/pricing/page.tsx` | CIS 定價 | `useCisPricingItems()` (entity) → 但 table 不存在 | — | ⚠️ |  |

---

## Working Notes（Pass 1 盤點自由紀錄）

### Surprise 1：channels 架構比預期乾淨
- 所有讀取走 entity hook ✅
- 寫入後 invalidate 有做到 ✅
- `useRealtimeSync()` 由 entity hook 內建

若 William 仍感受「新增/刪除訊息不即時」→ 可能是：
1. **訊息寫入走了非 entity hook 的路**（直接 API `/api/channels/[id]/messages` 而不通過 `invalidateChannelMessages()`）
2. **Realtime subscription 在該 context 沒啟動**（ChannelView mount 時 messages 已 fetch 但 subscription 未建立）
3. **訊息刪除走了別的路**（非 messages table 的刪除，而是其他狀態更新）

### Surprise 2：accounting 三個頁面讀取走直接 supabase
- `vouchers/page.tsx`：直接 `supabase.from('journal_vouchers')`
- `accounts/page.tsx`：直接 `supabase.from('chart_of_accounts')`
- `checks/page.tsx`：直接 `supabase.from('checks')`

這三個都**沒有**對應的 entity hook（5/19 健檢也沒要求補）。若要修，需要先補 entity hook 再搬。

### Surprise 3：useSWR 出現頻率比想像低
- `ProfitTab.tsx:190` — 獎金計算（合理 B 類）
- `tours/[code]/page.tsx:30` — code→id fetch（合理 B 類）
- `AiConversationsTab.tsx` — AI conversation list（合理 B 類）
- `shared-data/banks/page.tsx:31` — 銀行資料（可考慮補 entity）

大部分頁面讀取已經走在 entity hook 上。

### Surprise 4：CIS 模組仍是半成品
- `cis_clients` / `cis_pricing_items` / `cis_visits` table 在 DB 不存在
- 前端有 entity hook + page，進去會炸 table not found
- 建議另立工單

### 不確定點（需 Claude Opus 覆查）
1. `library/archive-management/page.tsx` 的歸檔操作有 `supabase.from(...).delete()` 直接寫入、需確認有沒有對應的 invalidate 或 cache 清理
2. `accounting/vouchers` / `accounts` / `checks` 的 Realtime 狀態需確認（直接 supabase 讀取通常無 realtime）
3. `hr/roles` 無 realtime、是否需要？
4. `library/customers/page.tsx` 的 `supabase.from('order_members')` 護照同步是 dialog 內的暫時性讀取、合理但需標記

---

## Pass 1 統計（初估）

| 模組 | 頁面數 | 有 entity 讀 | 直接 supabase 讀 | 有 SWR | 有 Realtime |
|---|---|---|---|---|---|
| channels | 4 | 4 | 0 | 0 | 3 |
| tours | 5 | 4 | 0 | 1 | 5 |
| orders | 1 | 1 | 0 | 0 | 1 |
| finance | 5 | 5 | 0 | 0 | 3 |
| library | 4 | 2 | 2 | 0 | 1 |
| hr | 5 | 3 | 0 | 1 | 1 |
| accounting | 3 | 1 | 2 | 0 | 0 |
| todos | 1 | 1 | 0 | 0 | 1 |
| dashboard | 1 | 1 | 0 | 0 | 1 |
| ai | 2 | 1 | 0 | 1 | 1 |
| shared-data | 3 | 0 | 1 | 1 | 0 |
| visas | 1 | 1 | 0 | 0 | 1 |
| cis | 3 | 3 | 0 | 0 | 0 |
| **合計** | ~38 | ~27 | ~5 | ~4 | ~18 |

---

## 進度紀錄

| 時間 | 完成區塊 |
|---|---|
| T+0:15 | channels / tours / orders |
| T+0:30 | finance / library / hr |
| T+0:45 | accounting / todos / dashboard / ai / shared-data / visas / cis |
| T+0:55 | 第一個 commit |

---

*Pass 1 完成，等 Claude Opus 複盤後才做 Pass 2。*