# 02 — SSR / Server Action 熱點

**資料時點**：2026-05-23 12:37
**資料來源**：grep + Read `src/app/(main)/**/page.tsx`（67 個 page）+ `src/app/**/actions.ts`（0 個、不存在）+ `src/lib/actions/*.ts`（2 個 `'use server'` action）
**掃過頁數**：67 個 page + 2 個 server action（非 page-bound）

---

## 摘要（業務語言）

**最大發現**：「SSR 階段查多少 DB」**等於零**。yizhan-erp 沒任何 page.tsx 在 server 端 fetch、也沒一個 `actions.ts`。

**67 個 page.tsx 全部是極短 wrapper / redirect**：

- 38 個一進來就 `'use client'`、把整頁丟給 client component 跑
- 14 個 SERVER component 但內容 5~17 行：8 個 `redirect()`、6 個 `import + return <ClientPage />`
- 0 個 page 用 `async function Page()`、0 個 page 直接撈 Supabase / 呼叫 API
- 0 個 page route 級的 `actions.ts`（Alex 報告講的「sequential DB call」全部都發生在 `/api/**` route handler、不在 page SSR）

**結論**：用戶提的「SSR 階段查多少 DB」這個維度在 yizhan-erp **不存在熱點、因為架構完全跳過 SSR**。
但「沒 SSR」並不代表沒問題 — 整盤負擔 100% 推到 client、變成 client 重複 query / N+1 / 全 workspace 撈、egress 跟 SaaS Supabase 費用全炸在 client 那層。

**真正抓到的熱點**：**4 個 client 級熱點 + 18 個 N+1 寫入點 + 4 個跨 component 重複 query**。下方表列。

---

## 熱點 top 10（client 級、單頁打開後 mount 時跑的 DB call 數 > 3）

> 注意：以下「DB call 數」算的是 **單次 page mount 時、所有 child component useSWR / entity hook fire 的合計**。SWR 對相同 cache key 會 dedup（重複呼叫不重打）、但**不同 hook（變體 / 不同 filter）每個都是獨立 round-trip**。

| 路徑                                 | 種類   | DB call 數       | 重複 query? | N+1? | 備註                                                                                                                                                                                                                                    |
| ------------------------------------ | ------ | ---------------- | ----------- | ---- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/tours/[code]`                      | client | **15+**          | ✅ 嚴重     | ✅   | 開團詳情頁、5 個 tab component 各自 `useReceipts({all,filter:{tour_id}})` + `useOrdersSlim({all,filter:{tour_id}})` + `useSuppliersSlim({all})`；filter 被 silently drop（見下）→ 等於每個 component 都全 workspace 撈                  |
| `/finance/payments`                  | client | **8+**           | ✅          | ✅   | `usePaymentData` hook 一次 fire useOrdersSlim + useReceipts + useTourDictionary；建單流程 N+1（見下）；確認收款一鍵 5-6 個 sequential DB call（method → update → recalc → fee request → voucher）                                       |
| `/finance/treasury`                  | client | **6+**           | —           | —    | mount 直接 fire useReceipts() + usePaymentRequests() + useDisbursementOrders() + 自訂 bank summary hook（4 個並行）。`/treasury/disbursement` 子頁再加 usePaymentRequests({all:true}) + useDisbursementOrders({all:true})               |
| `/finance/reports`（4 tab）          | client | **8+**           | ✅          | —    | 每個 tab 各自呼 entity hook：IncomeTab→useReceipts({all}), DisbursementTab→usePaymentRequests({all})+useDisbursementOrders, OverviewTab→useReceipts+usePaymentRequests+useTours({all}), 4 個 tab 切換但 cache key 同 → SWR dedup 救一半 |
| `/channels/[id]`                     | client | **6**            | —           | —    | mount fire 6 個 entity hook：useChannel + useChannelMessages + useChannelMembers + useEmployeeDictionary + useAiAgentsSlim + sidebar 另外 useChannels({all})                                                                            |
| `/accounting/reports/balance-sheet`  | client | **4 sequential** | —           | —    | 按按鈕 fire 4 個 sequential supabase.from：accounts → lines → plLines → plAccounts。可改 Promise.all 救 75% latency                                                                                                                     |
| `/accounting/reports/trial-balance`  | client | 2 sequential     | —           | —    | accounts → lines（可改並行）                                                                                                                                                                                                            |
| `/accounting/reports/general-ledger` | client | 2                | —           | —    | loadAccounts mount fire、loadLedger 手動觸發                                                                                                                                                                                            |
| `/orders`                            | client | **6+**           | —           | ✅   | mount fire useToursSlim + useOrdersListView + useCustomersSlim + useEmployeesSlim + useCustomers（OrderMembersExpandable 內）；關閉編輯模式 N+1（見下）                                                                                 |
| `/library/customers/[id]`            | client | **3+**           | —           | ✅   | 護照更新 N+1（多個 customer 各自 update）                                                                                                                                                                                               |

---

## 重複 query 個案（同頁不同 component 各自呼同表）

### 1. `/tours/[code]` — receipts / orders 4 個 component 重複呼

**證據**：

- `src/app/(main)/tours/_components/tour-receipts.tsx:67`：`useReceipts({ all: true, filter: { tour_id: tour.id } })`
- `src/app/(main)/tours/_components/TourClosingSections.tsx:62`：`useReceipts({ all: true, filter: { tour_id: tour.id } })`
- `src/app/(main)/tours/_components/BonusSettingsDialog.tsx:84`：`useReceipts({ all: true, filter: { tour_id: tour.id } })`
- `src/app/(main)/tours/_components/ProfitTab.tsx:206`：`useReceipts({ all: true, filter: { tour_id: tour.id } })`

**設計缺陷**（comment 自承）：

```
// tour-receipts.tsx:65-66
// 注意：useReceipts({ filter }) 的 filter 參數目前被 createEntityHook.useList silently drop
// 暫時 client side filter；長期應修 createEntityHook 真正支援 server-side filter
```

業務語意：

- SWR 對相同 cache key 會 dedup、所以「4 個 component 各呼」只打 1 次 DB
- 但因為 filter 被 silent drop、那 1 次是「**全 workspace 所有 receipts**」（不只該團）→ 100 個團 × 平均 50 筆 receipt = 5000 筆全撈、client 再過濾
- 加上 `useOrdersSlim({all, filter:{tour_id}})` 也是 4 個 component 各呼、同病：全撈再 filter

**影響**：每打開一個團詳情頁 → 全 workspace receipts + orders 各撈一次完整表（egress 殺手）。`hook:Receipt` 在 tours 模組出現在 4 個檔案 9 次、在 finance 模組出現在 6 個檔案 12 次。

### 2. `/finance/reports` 4 個 tab — receipts / payment-requests 各自呼

**證據**：

- `IncomeTab.tsx:56`：`useReceipts({ all: true })`
- `DisbursementTab.tsx:60`：`usePaymentRequests({ all: true })`
- `OverviewTab.tsx:54-56`：`useReceipts({ all: true })` + `usePaymentRequests({ all: true })` + `useTours({ all: true })`

**業務影響**：tab 切換時、SWR cache 有救（同 key dedup）、但**全 workspace 三大表都全撈**、應該走 server-side aggregated RPC view（見 createReportHook、未用上）。

### 3. `/finance/payments` 跟 `/finance/treasury` 之間

**證據**：

- `finance/page.tsx:37`：`useReceipts()` 撈當頁列表
- `finance/payments/hooks/usePaymentData.ts:32`：`useReceipts()` 撈付款管理列表
- `finance/treasury/page.tsx:52`：`useReceipts()` 撈出納列表

3 個頁面切換時、cache key 一致 → SWR dedup 沒問題。但每頁額外多撈 orders / payment_requests / tours 多種、單頁累積 6+ round-trip。

### 4. `/orders` 列表頁 — customers 多次撈

**證據**：

- `OrderMembersExpandable.tsx:77`：`useCustomers({ all: true })`
- `useMemberEditDialog.ts:24`：`useCustomersSlim({ all: true })`
- 不同 cache key（`useCustomers` vs `useCustomersSlim`）→ 2 個獨立 round-trip
- order_members 表在 orders 模組 6 個 file 出現 11 次

---

## N+1 pattern 個案

> 全是 client-side 寫入 N+1。讀取 N+1 沒抓到（entity hook + SWR cache 結構基本上預防讀 N+1）。

### A. 收款建立 / 確認流程（重大）

**`src/app/(main)/finance/payments/hooks/usePaymentData.ts:81-110`**：

```typescript
for (const item of paymentItems) {
  const receiptNumber = await generateReceiptNo(...)   // RPC 1 個 round-trip
  const _receipt = await createReceipt({...})          // INSERT 1 個 round-trip
}
```

每個收款 item 序列 2 個 round-trip。批次 10 筆 = 20 個 round-trip。

**同檔 `handleConfirmReceipt` line 141-265**：單按 1 個確認鍵跑 5-6 個 sequential：

1. `supabase.from('payment_methods').select(...)` 撈手續費設定
2. `updateReceipt()` UPDATE
3. `recalculateReceiptStats()` RPC
4. （若 fees>0）`generateCompanyPaymentRequestCode()` RPC
5. `createPaymentRequest()` + `createPaymentRequestItem()` 2 個 INSERT
6. `apiMutate('/api/accounting/vouchers/auto-create')` 內部又 5-6 個（Alex 報告 #1 已記）

業務影響：會計按一筆確認 → 等 6 秒、按批次 10 筆 → 60 秒。

### B. 請款單建立 N+1

**`src/app/(main)/finance/requests/_components/AddRequestDialog.submit.ts:307-329`**：

```typescript
for (const allocation of toSubmit) {
  const requestCode = await generateRequestNo(...)
  const request = await createPaymentRequest({...})
  // 再 addPaymentItems → 內部又有 N 個 INSERT
}
```

**同檔 line 409-417 / 507-510**：類似 pattern、每個 group 序列 createRequest。

**`src/app/(main)/finance/requests/_hooks/useRequestOperations.ts:248-269`**：

```typescript
for (const tourId of tourIds) {
  const requestCode = await generateRequestCodeAsync(...)
  const request = await createPaymentRequest({...})
  await addPaymentItems(...)  // 內部又 N 個
}
```

業務影響：「同時建 5 個團的請款」= 5 × 3 round-trip = 15 個序列 round-trip。

### C. 出帳確認 N+1

**`src/app/(main)/finance/treasury/_disbursement/_components/DisbursementPage.tsx:254-261`**：

```typescript
for (const req of linkedRequests) {
  await updatePaymentRequestApi(req.id, { status: 'paid' }) // N
}
for (const tour_id of tour_ids_to_recalculate) {
  await recalculateExpenseStats(tour_id) // M
}
```

10 筆請款連動 5 個團 = 15 個序列 round-trip。

### D. 薪資結算建立 N+1

**`src/app/(main)/hr/salary-settlement/page.tsx:148-169`**：

```typescript
for (const period of periods) {
  const res = await apiMutate('/api/hr/salary-settlements', {
    method: 'POST',
    body: { period, excluded_employee_ids: excludedArr },
  })
}
```

12 個月份 = 12 個序列 API call、每個 API 內部又呼 Alex 報告講的 5-6 個 DB call。

### E. 訂單編輯 → 自動建顧客 N+1

**`src/app/(main)/orders/_hooks/useEditModeSyncCustomers.ts:30-60`**：

```typescript
for (const member of membersToSync) {
  const { data: existing } = await supabase.from('customers').select('id').or(...)  // SELECT
  if (existing) { ... }
  else { await createCustomer({...}) }  // INSERT
}
```

20 個團員 = 20 × (SELECT + INSERT) = 40 個序列 round-trip。

### F. 訂單成員背景同步 N+1

**`src/app/(main)/orders/_hooks/useOrderMembersData.ts:264-266`**：

```typescript
for (const item of membersToSync) {
  await supabase.from('order_members').update(item.updateData).eq('id', item.memberId)
}
```

### G. 客戶 / 供應商批次匯入 N+1

- `src/app/(main)/library/customers/_components/useCustomerImport.ts:190-207`：每行 1 個 `await createCustomer(...)`
- `src/app/(main)/library/suppliers/_components/useSupplierImport.ts:192-194`：每行 1 個 `await createSupplier(...)`

500 筆 CSV 匯入 = 500 個序列 INSERT、UX 跑 2-5 分鐘。

### H. 護照辨識批次更新 N+1

**`src/app/(main)/library/customers/_hooks/passportExecuteUpdates.ts:106 / 122-126 / 137-141 / 160-179`**：4 個獨立 for loop、每個 update / storage remove 1 個 customer。

### I. 報價單寫入核心表 N+1

**`src/app/(main)/orders/_quotes/_utils/core-table-adapter.ts:149-155`** + 284-290：

```typescript
for (const category of categories) {
  for (const item of category.items) {
    await supabase.from('tour_itinerary_items').update({...}).eq('id', ...)
  }
}
```

雙層 for + await UPDATE = N×M 個 round-trip。

### J. 結算月份 N+1

**`src/app/(main)/accounting/opening-balances/page.tsx:70 / 93 / 102`**：類似 pattern。

---

## 「預設 server 但其實該 client」的頁

**無**。yizhan-erp 走「整盤 client」策略：

| Server component pages（14 個）                                                                                                                                      | 實際內容                                         | 評估                                                                                                                             |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------- |
| `/page.tsx`、`/dashboard/page.tsx`、`/tours/page.tsx`、`/documents/page.tsx`、`/library/attractions/page.tsx`                                                        | 5 行：`import ClientPage; return <ClientPage />` | 該 client、設計正確（page 是純 wrapper、export 給 Next.js route）                                                                |
| `/settings/page.tsx`、`/platform/page.tsx`、`/bot/page.tsx`、`/bot/setup`、`/bot/instagram-setup`、`/bot/facebook-setup`、`/bot/[lineUserId]`、`/messaging/page.tsx` | `redirect(...)`                                  | 該 server、正確                                                                                                                  |
| `/shared-data/countries`、`/shared-data/banks`、`/shared-data/airports`                                                                                              | client + useSWR 直接 `dynamicFrom('ref_*')`      | 全域 master 表、可考慮 SSR + revalidate（cache 1h、靜態化）省 client 6075 筆機場 egress、但目前因為 dedupingInterval=1h 影響有限 |

**反向問題（更該關注）**：所有「主要邏輯都是讀取展示」的列表頁、其實應該考慮**改 SSR + Suspense**（譬如 `/finance/reports` 一進來 4 個 tab 全 mount 撈、第一畫面 latency 高）、但這是架構大改、不是 page-by-page 改錯。

---

## 找不到的東西（誠實記）

1. **真正的 SSR data fetch**：找不到、yizhan-erp 沒這層
2. **server actions**：找不到、`grep "'use server'"` 全 src/ 只命中 `/lib/actions/flight-actions.ts`（2 個 AeroDataBox 外部 API wrapper、跟 page lifecycle 無關）
3. **N+1 讀取 pattern**：找不到、entity hook + dedup 把讀的 N+1 都鎖住、但**寫入 N+1 大量存在**（18 個獨立熱點）

---

## 給 William 的業務翻譯

**Alex 報告 #1（API route 每次 5-6 sequential DB call）+ 本報告（client 寫入 N+1 + 重複全 workspace 撈）= 同根**：

| 層          | Alex 抓到                              | 本報告抓到                                                                                       |
| ----------- | -------------------------------------- | ------------------------------------------------------------------------------------------------ |
| API route   | 每個請求內部 5-6 個 sequential DB call | —                                                                                                |
| Client 寫入 | —                                      | 18 個 for-loop + await 點、批次 N 筆會放大 N 倍                                                  |
| Client 讀取 | —                                      | 4 個跨 component 全 workspace 撈（filter 被 silent drop）、`/tours/[code]` 開一次 15+ round-trip |

**1+2 同時發生**的真實場景：

- 會計按「批次確認 10 筆收款」 → client 10 個 sequential update API call → 每個 API 內部 5-6 個 sequential DB call = **10 × 6 = 60 個 sequential DB round-trip、總時間 30-60 秒**
- 員工開「漫途某團詳情頁」 → 5 個 tab component mount × `useReceipts({all})` + `useOrdersSlim({all})` 等 → SWR dedup 變 2 次 round-trip、但每次撈全 workspace 5000 筆 receipts → **egress 約 2-5 MB／開一次團頁**、Supabase 月費直接燒
- 業務匯入 500 筆 CSV 顧客 → 500 個 sequential INSERT → **5 分鐘**、UX 卡死

**推薦對策（不在本報告 scope、留給 04-recommendations）**：

1. 修 `createEntityHook.useList` 真正支援 server-side filter（comment 自承）→ 大量解 #1 重複 query
2. 寫入 N+1 改 batch RPC（譬如 `createReceiptsBatch(items[])`）→ 解 #A-J
3. balance-sheet / trial-balance 4 個 sequential → Promise.all → 救 75% latency（最簡單一步）
