# P0-3 草稿：accounting/reports 4 頁補 entity hook

> **Proposer**: Max（OPENCLAW agent: main）
> **依據**: Pass 2 判决 — 4 個財報頁 🔴 P0
> - `accounting/reports/balance-sheet/page.tsx`
> - `accounting/reports/general-ledger/page.tsx`
> - `accounting/reports/income-statement/page.tsx`
> - `accounting/reports/trial-balance/page.tsx`
> **目的**: 4 個財報頁全部直接 `supabase.from()` → 改 entity hook（SWR cache + dedupingInterval）

---

## 現況（Pass 2 確認的問題）

### 共同模式：每頁都有兩段直接 supabase query

| 頁面 | Query 1 | Query 2 |
|---|---|---|
| `balance-sheet/page.tsx` | `chart_of_accounts` 行51-57 | `journal_lines` 行70-86 |
| `general-ledger/page.tsx` | `chart_of_accounts` 行77-83 | `journal_lines` 行87-99 |
| `income-statement/page.tsx` | `chart_of_accounts` 行78-84 | `journal_lines` 行88-100 |
| `trial-balance/page.tsx` | `chart_of_accounts` 行69-75 | `journal_lines` 行79-91 |

### 每頁都是無 SWR cache 的直接 DB query

```tsx
// balance-sheet/page.tsx 行51-57（每頁都一樣的問題）
const { data: accounts, error: accountsError } = await supabase
  .from('chart_of_accounts')
  .select('id, code, name, account_type')
  .eq('workspace_id', user.workspace_id)
  .eq('is_active', true)
  .in('account_type', ['asset', 'liability', 'equity'])
  .order('code', { ascending: true })
```

### 為什麼是 P0

財報是會計模組的皇冠。用戶建完傳票要即時看到報表更新、但現在要 F5。
加上直接 `supabase.from()` 是 G 類紅線（lint 不抓、但架構不合規）。

---

## 修法策略

### 不需要 realtime（財報是 read-only 聚合查詢）

財報頁的邏輯是：
1. 查 chart_of_accounts（很少變動）
2. 查 journal_lines（透過 join 聚合）
3. 在 client 做減法/餘額計算

這不是 CRUD，是 OLAP-style 聚合。realtime subscription 沒有幫助（OLAP 不需要）。

**但是**：SWR cache + dedupingInterval 是有用的，可以：
- 避免每次進頁面都打 DB
- 多個 user 同時查同一個 period 的財報，只打一次 DB（deduping）
- 財報數據在 1-2 分鐘內 stale 是可接受的

### 修法 Option（不走 entity hook，改走 readonly deduping SWR）

因為財報是 complex join query，不是 simple CRUD，
`createEntityHook` 預設的 list query 不支援這麼複雜的 join。

所以修法是：**每一頁自己包一個 useSWR + dedupingInterval，key 含 workspaceId + date range**。

（不是 entity hook，是 B 類 SWR pattern，合規的 B 類）

---

## Step 1：每頁新增 SWR hook（proposal 草稿）

**注意**：這是草稿 code，不是實際 apply。

### balance-sheet/page.tsx 新增 useBalanceSheetData hook

```ts
// src/app/(main)/accounting/reports/balance-sheet/_hooks/useBalanceSheetData.ts
// P0-3 proposal draft - NOT applied to src/

import useSWR from 'swr'
import { supabase } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/auth-store'

// dedupingInterval: 5min（財報數據不即時，1-2min stale 可接受）
const DEDUP_INTERVAL = 5 * 60 * 1000

function fetcher([workspaceId, asOfDate]: [string, string]) {
  return loadBalanceSheetData(workspaceId, asOfDate)
}

async function loadBalanceSheetData(workspaceId: string, asOfDate: string) {
  // 1. 取得科目（只查一次，cache 5min）
  const { data: accounts, error: accountsError } = await supabase
    .from('chart_of_accounts')
    .select('id, code, name, account_type')
    .eq('workspace_id', workspaceId)
    .eq('is_active', true)
    .in('account_type', ['asset', 'liability', 'equity'])
    .order('code', { ascending: true })
  if (accountsError) throw accountsError

  // 2. 取得分錄（只算 posted/locked）
  const { data: lines, error: linesError } = await supabase
    .from('journal_lines')
    .select(`account_id, debit_amount, credit_amount,
             voucher:journal_vouchers!inner(voucher_date, workspace_id, status)`)
    .eq('voucher.workspace_id', workspaceId)
    .lte('voucher.voucher_date', asOfDate)
    .in('voucher.status', ['posted', 'locked'])
  if (linesError) throw linesError

  // 3. client-side 聚合（余額計算）
  const balanceMap = new Map<string, number>()
  ;(lines as any[]).forEach(line => {
    const existing = balanceMap.get(line.account_id) || 0
    balanceMap.set(line.account_id, existing + (line.debit_amount - line.credit_amount))
  })

  // 4. 分類（資產/負債/權益）
  const assets = [], liabilities = [], equity = []
  accounts.forEach((account: any) => {
    const rawBalance = balanceMap.get(account.id) || 0
    if (rawBalance === 0) return
    const balance = account.account_type === 'asset' ? rawBalance : -rawBalance
    if (balance === 0) return

    const item = { code: account.code, name: account.name, balance: Math.abs(balance) }
    if (account.account_type === 'asset') assets.push(item)
    else if (account.account_type === 'liability') liabilities.push(item)
    else if (account.account_type === 'equity') equity.push(item)
  })

  return { assets, liabilities, equity, totalAssets: assets.reduce((s,i)=>s+i.balance,0), ... }
}

export function useBalanceSheetData(asOfDate: string) {
  const { user } = useAuthStore()
  return useSWR(
    user?.workspace_id && asOfDate
      ? ['balance-sheet', user.workspace_id, asOfDate]
      : null,
    fetcher,
    { dedupingInterval: DEDUP_INTERVAL }
  )
}
```

### Page 改寫 diff

```diff
--- a/src/app/(main)/accounting/reports/balance-sheet/page.tsx
+++ b/src/app/(main)/accounting/reports/balance-sheet/page.tsx
@@ -1,4 +1,5 @@
 'use client'
+// P0-3: migrate to SWR with dedupingInterval (proposal draft - NOT applied)

 import { useState, useEffect } from 'react'
 ...
-import { supabase } from '@/lib/supabase/client'
 import { useAuthStore } from '@/stores/auth-store'
+import { useBalanceSheetData } from './_hooks/useBalanceSheetData'

 export default function BalanceSheetPage() {
   const { user } = useAuthStore()
@@ -32,8 +33,8 @@ export default function BalanceSheetPage() {
   const [data, setData] = useState<BalanceSheetData | null>(null)
   const [isLoading, setIsLoading] = useState(false)

-  useEffect(() => { setAsOfDate(new Date().toISOString().split('T')[0]) }, [])
+  const { data: fetchedData, isLoading, mutate: refetch } = useBalanceSheetData(asOfDate)

-  const loadBalanceSheet = async () => {
-    if (!asOfDate || !user?.workspace_id) { toast.warning(...); return }
-    setIsLoading(true)
-    try {
-      const { data: accounts, error: accountsError } = await supabase...
-      // ... 150 lines of data fetching
-    } finally { setIsLoading(false) }
-  }
+  useEffect(() => {
+    if (fetchedData) setData(fetchedData)
+  }, [fetchedData])

-  return (
-    ...
-    <Button onClick={loadBalanceSheet} ...>  // ← 直接 call loadBalanceSheet
+  return (
+    ...
+    <Button onClick={() => refetch()} ...>  // ← SWR refetch
```

---

## 對其他 3 頁的同樣修法

| 頁面 | Hook 檔 | SWR key |
|---|---|---|
| `general-ledger/page.tsx` | `_hooks/useGeneralLedgerData.ts` | `['general-ledger', workspaceId, accountId, startDate, endDate]` |
| `income-statement/page.tsx` | `_hooks/useIncomeStatementData.ts` | `['income-statement', workspaceId, startDate, endDate]` |
| `trial-balance/page.tsx` | `_hooks/useTrialBalanceData.ts` | `['trial-balance', workspaceId, asOfDate]` |

每個都是 `useSWR` + `dedupingInterval: 5min` + workspace_id in key（修 G 類紅線）。

---

## 驗證步驟

```bash
# 確認 chart-of-accounts.ts 已存在（不需要新建）
ls src/data/entities/chart-of-accounts.ts
# ✅ 已存在（2026-05-19 SWR 水管健檢時創建）

# 確認 journal_lines 沒有 entity hook（complex join 不適合 entity CRUD）
ls src/data/entities/journal-lines.ts 2>/dev/null || echo "NOT FOUND - 正常，journal_lines 是OLAP查詢不適合entity"
# journal_lines entity 不存在（正常）

# 確認 4 個 page 都各自有 import { supabase }
grep "import { supabase }" src/app/\(main\)/accounting/reports/balance-sheet/page.tsx
grep "import { supabase }" src/app/\(main\)/accounting/reports/general-ledger/page.tsx
grep "import { supabase }" src/app/\(main\)/accounting/reports/income-statement/page.tsx
grep "import { supabase }" src/app/\(main\)/accounting/reports/trial-balance/page.tsx
# 4 個都是 ✅
```

---

## 影響行數 / 風險 / 回滾

| 項目 | 值 |
|---|---|
| **新增檔** | 4 個 hook 檔（每個 ~80 行）|
| **改動行數** | 4 個 page.tsx（每個 ~+5/-100 行，把 loadBalanceSheet 之類的拆進 hook）|
| **風險** | 中（財報邏輯複雜、client-side 聚合計算需要回歸測試）|
| **回滾** | git revert 8 commits（4 個 hook 新建 + 4 個 page 改寫）|
| **測試驗證** | 1. 建一張 posted 傳票 2. 四個財報頁都即時更新（不用 F5）3. deduping：兩個 tab 同時打開只打一次 DB（看 network tab）|
| **依賴** | 無（只動 client-side SWR，不動 DB schema）|

---

## 附：為什麼不走 entity hook（複雜 join 不適合 CRUD entity）

`createEntityHook` 是給 CRUD 用的：
- list: `supabase.from('journal_vouchers').select(...)`
- detail: `supabase.from('journal_vouchers').select('*').eq('id', id)`
- create/update/delete: `supabase.from('journal_vouchers').insert/update/delete`

但財報的 query 是：
```sql
SELECT chart_of_accounts.code, chart_of_accounts.name,
       SUM(journal_lines.debit_amount - journal_lines.credit_amount) as balance
FROM chart_of_accounts
JOIN journal_lines ON ...
JOIN journal_vouchers ON ...
WHERE journal_vouchers.voucher_date <= :asOfDate
  AND journal_vouchers.status IN ('posted', 'locked')
GROUP BY chart_of_accounts.id
```

這不是 CRUD、是 OLAP。`createEntityHook` 預設不支援這種復雜 join。
所以走 B 類 SWR（useSWR + custom fetcher + dedupingInterval）是對的架構選擇。

---

*Draft by Max — 等待 William review + approve*
*⚠️ 注意：此草稿尚未實際 apply 到 src/ 目錄*