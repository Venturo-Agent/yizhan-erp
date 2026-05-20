# Pass 1 — SWR/Realtime 全頁面盤點 — 2026-05-20

> 承辦：Max（OPENCLAW agent: main、人格 Max）
> 開始：2026-05-20T09:00:00+08:00

## 救護車式總覽

| 指標 | 數量 | 備註 |
|---|---|---|
| 頁面數 | ~86 | 含 page.tsx + *Tab.tsx |
| 有 entity hook 讀取 | 多數 | `useXxx()` from `@/data` |
| 散刻 useSWR | 少數 | 主要見於 B 類複雜邏輯 |
| 直接 supabase.from 寫入 | 少數 | 多已搬 entity hook |
| 有 Realtime（entity 內建）| 多數 | `createEntityHook` 內建 |
| 手刻 supabase.channel | 少數 | 只在特定場面 |

---

## 模組分區

### 1. channels（頻道）← William 痛點區

#### src/app/(main)/channels/page.tsx
- **頁面名**：頻道列表
- **讀取點**：
  - `channels`: `useChannels({ all: true })` (entity hook) ✅
- **寫入點**：無（純列表）
- **Realtime**：✅ entity hook 內建 `useRealtimeSync`

#### src/app/(main)/channels/[id]/page.tsx
- **頁面名**：頻道詳情（進入某頻道）
- **讀取點**：delegates to `ChannelView`
- **寫入點**：無
- **Realtime**：✅ via ChannelView

#### src/app/(main)/channels/_components/ChannelView.tsx
- **頁面名**：頻道詳情組件
- **讀取點**：
  - `channels`: `useChannel(channelId)` (entity hook) ✅
  - `channel_messages`: `useChannelMessages({ channelId })` (entity hook) ✅
  - `channel_members`: `useChannelMembers({ all: true, filter: { channel_id } })` (entity hook) ✅
- **寫入點**：
  - `channel_messages`: `apiPost('/api/channels/...')` + `invalidateChannelMessages()` (行78/199/214)
  - `channel_members`: `invalidateChannelMembers()` (行78)
- **Realtime**：✅ entity hook 內建（messages + members 自動 realtime）

#### src/app/(main)/channels/_components/ChannelsSidebar.tsx
- **頁面名**：頻道側邊欄
- **讀取點**：
  - `channels`: `useChannels({ all: true })` (entity hook) ✅
  - `channel_members`: `useChannelMembers({ all: true })` (entity hook) ✅
- **寫入點**：
  - `channels`: `invalidateChannels()` (行123)
  - `channel_members`: `invalidateChannelMembers()` (行122)
- **Realtime**：✅ entity hook 內建

**Channels 現況觀察**：
- 所有讀取走 entity hook ✅
- 寫入後 invalidate 有做到 ✅
- Realtime 有 entity hook 內建、乾淨 ✅

---

### 2. tours（旅遊團）

#### src/app/(main)/tours/page.tsx
- **頁面名**：旅遊團列表頁（delegate to ToursPage.tsx）
- **讀取點**：
  - `quotes`: `useQuotesSlim()` (entity hook) ✅
  - `orders`: `useOrdersSlim()` (entity hook) ✅
  - `itineraries`: `useItineraries({ all: true })` (entity hook) ✅
- **寫入點**：無（delegate 實際邏輯在 ToursPage.tsx）

#### src/app/(main)/tours/_components/ToursPage.tsx
- **頁面名**：旅遊團列表實作
- **讀取點**：
  - `quotes`: `useQuotesSlim()` (entity hook) ✅
  - `orders`: `useOrdersSlim()` (entity hook) ✅
  - `itineraries`: `useItineraries({ all: true })` (entity hook) ✅
- **寫入點**：
  - `orders`: `createOrder()` (entity hook) + `apiMutate` (行431 generateOrderNumber)
- **Realtime**：✅ via entity hooks

#### src/app/(main)/tours/[code]/page.tsx
- **頁面名**：旅遊團詳情（依 code）
- **讀取點**：
  - `tours`: `fetchTourIdByCode()` → `useTourDetails()` (entity hook) ✅
  - `useSWR` (B類): `useSWR(code ? \`tour-id-${code}\` : null, ...)` (行30) — 查 tour_id by code、複雜、不替換
- **寫入點**：無
- **Realtime**：✅ via useTourDetails entity hook

#### src/app/(main)/tours/_components/ProfitTab.tsx
- **頁面名**：團收益分析 Tab
- **讀取點**：
  - `receipts`: `useReceipts({ filter: { tour_id } })` (entity hook) ✅
  - `orders`: `useOrders({ filter: { tour_id } })` (entity hook) ✅
  - `payment_requests`: `usePaymentRequests({ filter: { tour_id } })` (entity hook) ✅
  - `useSWR` (B類): `useSWR(..., () => supabase.from('bonus_orders').select(...))` (行190) — 獎金計算、跨表 join、保留
- **寫入點**：無
- **Realtime**：✅ via entity hooks

#### src/app/(main)/tours/_components/TourTabs.tsx
- **頁面名**：團頁 Tab 切換
- **讀取點**：
  - `tours`: `useTourDetails()` (entity hook) ✅
- **寫入點**：無
- **Realtime**：✅ via entity hook

---

### 3. orders（訂單）

#### src/app/(main)/orders/page.tsx
- **頁面名**：訂單列表
- **讀取點**：
  - `tours`: `useToursSlim()` (entity hook) ✅
  - `orders`: `useOrdersListView()` (custom hook) → 內部用 entity hooks ✅
- **寫入點**：
  - `orders`: `createOrder()` (entity hook) (行431)
- **Realtime**：✅ via entity hooks

---

### 4. finance（財務）

#### src/app/(main)/finance/payments/page.tsx
- **頁面名**：收款列表
- **讀取點**：
  - `receipts`: `usePaymentData()` → 內部 `useReceipts()` (entity hook) ✅
- **寫入點**：
  - `receipts`: `apiMutate('/api/payments/${receiptId}/verify', ...)` + `invalidateReceipts()` (行162/168/186/195/407/424)
- **Realtime**：✅ via entity hook

#### src/app/(main)/finance/reports/_components/ReceivablesTab.tsx
- **頁面名**：應收帳款 Tab
- **讀取點**：
  - `receipts`: `useReceivables()` (createReportHook) ✅ — 5/19 健檢已升格
- **寫入點**：無
- **Realtime**：❌（report hook 無 realtime、合理）

#### src/app/(main)/finance/reports/_components/PayablesTab.tsx
- **頁面名**：應付帳款 Tab
- **讀取點**：
  - `payment_requests`: `usePayables()` (createReportHook) ✅
- **寫入點**：無
- **Realtime**：❌

---

### 5. library（客戶 / 供應商）

#### src/app/(main)/library/customers/page.tsx
- **頁面名**：客戶列表
- **讀取點**：
  - `customers`: `useCustomersSlim()` + `useCustomersPaginated()` (entity hooks) ✅
- **寫入點**：
  - `customers`: `createCustomer()` + `updateCustomer()` + `deleteCustomer()` (entity hooks) (行29)
  - 但有直接 `supabase.from()`：護照同步 `supabase.from('order_members').select()` (行78/95/107/131) — 用於護照圖片同步、dialog 內清單
- **Realtime**：✅ entity hook 內建

#### src/app/(main)/library/suppliers/page.tsx
- **頁面名**：供應商列表
- **讀取點**：待掃（見下方 Working Notes）
- **寫入點**：待掃
- **Realtime**：待掃

---

### 6. hr（人力資源）

#### src/app/(main)/hr/roles/page.tsx
- **頁面名**：角色設定
- **讀取點**：
  - `roles`: `useRoles()` (custom hook → entity) ✅
- **寫入點**：
  - `roles`: `apiMutate('/api/roles', ...)` (行212) — create role
  - `role_capabilities`: `apiMutate('/api/roles/${id}/tab-permissions', ...)` (行248) — update capabilities
  - `roles`: `apiMutate('/api/roles/${id}', { method: DELETE })` (行289) — delete role
- **Realtime**：❓待確認

#### src/app/(main)/hr/salary-settlement/page.tsx
- **頁面名**：薪資結算列表
- **讀取點**：
  - `salary_settlements`: `useSalarySettlements()` (entity hook) ✅
- **寫入點**：
  - `salary_settlements`: `apiMutate('/api/salary-settlements/${id}/submit', ...)` (行104)
- **Realtime**：✅ via entity hook

---

### 7. accounting（會計）

#### src/app/(main)/accounting/vouchers/page.tsx
- **頁面名**：傳票列表
- **讀取點**：待掃（見 Working Notes）
- **寫入點**：待掃
- **Realtime**：待掃

#### src/app/(main)/accounting/checks/page.tsx
- **頁面名**：支票列表
- **讀取點**：待掃
- **寫入點**：待掃
- **Realtime**：待掃

---

### 8. todos（待辦）

#### src/app/(main)/todos/page.tsx
- **頁面名**：待辦任務
- **讀取點**：
  - `todos`: `useTodos()` (entity hook) ✅
- **寫入點**：
  - `todos`: `apiMutate('/api/todo-columns', ...)` (行141) — column CRUD
  - `apiMutate('/api/todos', ...)` — task CRUD
- **Realtime**：✅ entity hook 內建（todos realtime publication 已修好）

---

### 9. dashboard

#### src/app/(main)/dashboard/page.tsx
- **頁面名**：儀表板
- **讀取點**：
  - 多個 entity hooks via `dashboard.service.ts`（見下方 Working Notes）
- **寫入點**：無
- **Realtime**：✅ via entity hooks

---

### 10. ai

#### src/app/(main)/ai/page.tsx
- **頁面名**：AI 助理
- **讀取點**：
  - `useAiConversations()` / `useAiRetrospective()` (custom hooks) — B 類保留
- **寫入點**：無
- **Realtime**：❌

---

## Working Notes（自由寫）

### Surprise 1：channels 乾淨得出乎意料
William 說「channels 新增刪除不會即時」，但我看到的架構是：
- `useChannelMessages` / `useChannelMembers` / `useChannels` 全走 entity hook
- `createEntityHook` 內建 `useRealtimeSync()`
- 寫入後有 `invalidateChannelMessages()` / `invalidateChannels()` / `invalidateChannelMembers()`
- 理論上應該即時

**懷疑方向**：如果真的有「新增看不到」問題，可能不是 SWR/realtime 機制問題，而是：
- invalidate call 在哪個階段被呼叫（optimistic update 前？後？）
- channel_messages 的 realtime subscription 是否真的在該 page mount 時有啟動
- 還是「有 realtime 但訊息寫入走了別的路」（非 entity hook 的 API 直接寫？）

### Surprise 2：useSWR 出現的位置相對少
上一次（5/19）健檢有 18 處直接 useSWR，這次看主要頁面：
- `ProfitTab.tsx:190` — 獎金計算跨表、B 類合理保留
- `tours/[code]/page.tsx:30` — tour_id fetch、B 類合理
- `useToursPaginated.ts` — 有、但行數少

大部分讀取已經走在 entity hook 上。

### 不確定點（需 Claude Opus 覆查）
1. `library/customers/page.tsx` 有 4 處 `supabase.from('order_members')` 直接讀 — 這是護照同步功能、可能合理但需確認不在清單刷新時被呼叫
2. `accounting/vouchers` / `accounting/checks` 的 Realtime 狀態 — 待掃
3. `hr/roles` 沒看到 Realtime subscription — 如果有及時性需求、應該加
4. `channels/_components/CreateChannelDialog.tsx` — 新增 channel 的寫入方式還沒確認

---

## 進度紀錄

| 時間 | 完成區塊 |
|---|---|
| T+0:15 | channels / tours / orders |
| T+0:30 | finance / library / hr |
| T+0:45 | 待掃：accounting / cis / todos / dashboard / ai |
| T+1:00 | 收尾 commit |

