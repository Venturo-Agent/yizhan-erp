# finance 升級到 5/5 計劃

## 當前分數：2.5/5（讀取❌ 資安⚠️ 架構✅ 品管⚠️ 清理⚠️）

---

## 5 維度狀態

| 維度         | 現狀 | 具體缺口                                                                                                                           |
| ------------ | ---- | ---------------------------------------------------------------------------------------------------------------------------------- |
| **讀取效能** | ❌   | payments/requests/treasury/reports 多處散刻 useSWR；CostTransferDialog 10 處直接 `supabase.update()`；service 層多處繞 entity hook |
| **資安**     | ⚠️   | receipts/payment_requests/disbursement_orders 紅線 D guard（closed period）待補；created_by 部分合規                               |
| **架構**     | ✅   | L1-L6 全過；apiMutate 有；但 service 層偏離 L6 SSOT                                                                                |
| **開發品管** | ⚠️   | finance 無完整 e2e；eslint 1515 warnings 中 finance 相關多                                                                         |
| **清理**     | ⚠️   | finance 多個 service 檔是半成品；待確認具體狀態                                                                                    |

---

## 升 5/5 具體 actions

### 🔴 Action A（讀取效能 — service 層重構）

**缺口**：finance service 層 (`src/lib/finance/`) 多處直接 `supabase.from().update()/insert()`，繞過 entity hook。

**修法**：

1. 盤點 `src/lib/finance/` 所有 service 檔，列出哪些走 entity hook、哪些繞過
2. 對高頻 service（receipts / payment_requests / disbursement_orders）漸進搬遷到 entity hook
3. `CostTransferDialog` 10 處直接 `supabase.update()` → 改用 `apiMutate`

**影響範圍**：`src/lib/finance/*` + `src/app/(main)/finance/requests/_components/CostTransferDialog.tsx`
**預估工時**：6-10 小時（service 層重構相對複雜，要確保來龍去脈不斷）
**預期難度**：🔴 高（finance service 業務邏輯深）

---

### 🟠 Action B（資安紅線 D guard）

**缺口**：receipts / disbursement_orders / payment_requests 缺少月結 guard。

**修法**：

- 在對應 API route 或 service 層加 `is_closed: boolean` check
- 月份關帳後，任何數字修改 request 要被 API reject（return 403）

**影響檔**：`src/app/api/finance/receipts/`、`src/app/api/finance/disbursement-orders/`、`src/app/api/finance/payment-requests/`
**預估工時**：2-3 小時
**預期難度**：🟡 中（業務邏輯明確）

---

### 🟡 Action C（品管 e2e）

**缺口**：finance/payments / requests / treasury / reports 無任一完整 e2e 覆蓋。

**修法**：

- `tests/e2e/finance-receipts.spec.ts`：「建立收款 → 確認出現在列表 → 編輯 → 刪除 → 確認消失」
- `tests/e2e/finance-payment-requests.spec.ts`：「建立付款申請 → 審核 → 確認餘額變動」
- 這兩個覆蓋最主要場景

**預估工時**：3-4 小時
**預期難度**：🟡 中

---

### 🟡 Action D（清理）

**缺口**：finance service 多個半成品檔；大量 unused exports。

**修法**：

1. 跑 knip 確認 finance 相關 unused files
2. `.eslint-suppressions.json` 中 finance entries 修完後跑 `npm run lint:swr-prune`
3. 確認 `src/app/(main)/finance/` 下各 page.tsx 無散刻直接 supabase

**預估工時**：1-2 小時
**預期難度**：低

---

## 總工時

**12-18 小時（2-3 人天）**。主要時間在 Action A（service 重構）。

---

## 預期難度

🔴 高。finance 業務邏輯深，service 層重構要小心業務連續性。

---

## 推薦執行順序

1. **Action B（紅線 D）** 先做、簡單止血
2. **Action D（cleanup）** 在重構前先清
3. **Action A（service 重構）** 最重、最後做
4. **Action C（e2e）** 在 Action A 完成後補

---

## 備註

finance 是 Phase 1 最大的半成品之一（業務複雜度僅次於 accounting）。建議 William 確認優先級：6/1 之前 finance 業務團隊常用嗎？還是可以等到 6/1 以後再重構？

---

_Max — 2026-05-20 — 紅線：❌ 未動 src/ ❌ 未 push_
