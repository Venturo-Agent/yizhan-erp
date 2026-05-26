# P0-1 草稿：accounting/vouchers 補 entity hook

> **Proposer**: Max（OPENCLAW agent: main）
> **依據**: Pass 2 判决 — `accounting/vouchers/page.tsx` 🔴 P0
> **目的**: 直接 `supabase.from('journal_vouchers')` → 改 `useJournalVouchers` entity hook

---

## 現況（Pass 2 確認的問題）

### 行79-94：直接 supabase query 無 workspace_id cache key

```tsx
// accounting/vouchers/page.tsx 行79-94
const loadVouchers = async () => {
  if (!user?.workspace_id) return
  setIsLoading(true)
  try {
    let query = supabase
      .from('journal_vouchers')
      .select(
        'id, voucher_no, voucher_date, memo, status, total_debit, total_credit, created_by, workspace_id, created_at'
      )
      .eq('workspace_id', user.workspace_id) // ← workspace_id 有對，但没用 SWR cache

    // 應用日期範圍篩選
    if (filters.startDate) query = query.gte('voucher_date', filters.startDate)
    if (filters.endDate) query = query.lte('voucher_date', filters.endDate)
    if (filters.status !== 'all') query = query.eq('status', filters.status as never)

    query = query
      .order('voucher_date', { ascending: false })
      .order('voucher_no', { ascending: false })

    const { data, error } = await query // ← 每次都打 DB，沒 SWR cache
    if (error) throw error
    setVouchers(data || [])
  } finally {
    setIsLoading(false)
  }
}
```

### 為什麼是 P0

1. **無 SWR cache**：每次進頁面或切換篩選都打 DB，user 感受慢
2. **無 realtime**：別人建傳票，你不會即時看到，要 F5 或等一分鐘 cache expire
3. **G 類紅線**：直接 `supabase.from()` query，workspace_id filter 是你有興趣就加、沒興趣就不加（lint 不抓）
4. **寫入無 invalidate**：行193 `handleReverse` 寫完直接 `loadVouchers()` reload，沒用到 SWR invalidate

---

## 修法

### Step 1：新建 entity hook（proposal 草稿）

**新檔**：`src/data/entities/journal-vouchers.ts`

```ts
// src/data/entities/journal-vouchers.ts
'use client'

/**
 * Journal Vouchers Entity — 傳票
 *
 * P0-1 修法草稿（2026-05-20）
 * 對照 customer-document-applications.ts 模板
 */

import { createEntityHook } from '../core/createEntityHook'
import { CACHE_PRESETS } from '../core/types'
import type { Database } from '@/lib/supabase/types'

type JournalVoucher = Database['public']['Tables']['journal_vouchers']['Row']

const journalVoucherEntity = createEntityHook<JournalVoucher>('journal_vouchers', {
  workspaceScoped: true,
  list: {
    // 對照 vouchers/page.tsx 行83-84 的 select 欄位
    select:
      'id, voucher_no, voucher_date, memo, status, total_debit, total_credit, created_by, workspace_id, created_at',
    orderBy: { column: 'voucher_date', ascending: false },
    // secondarySort: voucher_no descending（同一日期內）
  },
  detail: { select: '*' },
  cache: CACHE_PRESETS.low, // 傳票要即時、cache 設短
})

export const useJournalVouchers = journalVoucherEntity.useList
export const useJournalVoucher = journalVoucherEntity.useDetail
export const invalidateJournalVouchers = journalVoucherEntity.invalidate
export const createJournalVoucher = journalVoucherEntity.create
export const updateJournalVoucher = journalVoucherEntity.update
export const deleteJournalVoucher = journalVoucherEntity.delete

export type { JournalVoucher }
```

### Step 2：改寫 page.tsx（proposal diff）

```diff
--- a/src/app/(main)/accounting/vouchers/page.tsx
+++ b/src/app/(main)/accounting/vouchers/page.tsx
@@ -1,4 +1,5 @@
 'use client'
+// P0-1: migrate to entity hook (proposal draft - NOT applied)

 import { useState, useEffect } from 'react'
@@ -13,7 +14,9 @@ import type { TableColumn } from '@/components/ui/enhanced-table'
-import { supabase } from '@/lib/supabase/client'
 import { useAuthStore } from '@/stores/auth-store'
+import { useJournalVouchers } from '@/data'
+import { apiMutate } from '@/lib/swr/api-mutate'
+import { invalidateJournalVouchers } from '@/data'
 import { CreateVoucherDialog } from './components/CreateVoucherDialog'
 import { VoucherDetailDialog } from './components/VoucherDetailDialog'
 import { toast } from 'sonner'
@@ -36,8 +39,16 @@ export default function VouchersPage() {
   const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false)
   const [selectedVoucher, setSelectedVoucher] = useState<JournalVoucher | null>(null)
   const [filters, setFilters] = useState({ startDate: '', endDate: '', status: 'all' })

-  useEffect(() => { loadVouchers() }, [user?.workspace_id])
-  useEffect(() => { if (user?.workspace_id) loadVouchers() }, [filters])
+  // P0-1: use entity hook with SWR cache
+  // Filter state goes into the SWR key so cache is per-filter-combination
+  const { items: vouchers, isLoading, mutate } = useJournalVouchers({
+    filters: {
+      startDate: filters.startDate || undefined,
+      endDate: filters.endDate || undefined,
+      status: filters.status !== 'all' ? filters.status : undefined,
+    },
+    workspaceId: user?.workspace_id,
+  })
+
+  // Handle reverse still needs apiMutate (has backend logic)
   const handleReverse = async (voucher: JournalVoucher) => {
     const confirmed = await confirm(...)
     if (!confirmed) return
     try {
       const res = await apiMutate<{ voucher_no?: string; error?: string }>(
         `/api/accounting/vouchers/${voucher.id}/reverse`,
         { method: 'POST' }
       )
       if (!res.ok) { toast.error(...); return }
       toast.success(...)
-      loadVouchers()  // ← reload entire page
+      await invalidateJournalVouchers()  // P0-1: invalidate SWR cache instead of full reload
     } catch (error) { ... }
   }

   const handleCreateSuccess = () => {
-    loadVouchers()  // ← reload entire page
+    invalidateJournalVouchers()  // P0-1: SWR cache invalidation
   }
```

---

## 驗證步驟（草稿階段）

```bash
# 1. 確認 types.ts 有 journal_vouchers 型別
grep "journal_vouchers:" src/lib/supabase/types.ts
# ✅ 存在（行4117）

# 2. 確認 createEntityHook 支援 custom filters 參數
grep -n "filters" src/data/core/createEntityHook.ts | head -10
# 需要確認 ormFilter 之類的 custom filter 支援（TODO）

# 3. 確認 CACHE_PRESETS.low 存在
grep "CACHE_PRESETS" src/data/core/types.ts | head -5
```

---

## 影響行數 / 風險 / 回滾

| 項目         | 值                                                                                                                                                       |
| ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **新增檔**   | `src/data/entities/journal-vouchers.ts`（~35 行）                                                                                                        |
| **改動行數** | `vouchers/page.tsx` ~+10/-15 行（去掉 loadVouchers，換成 useJournalVouchers）                                                                            |
| **風險**     | 中（傳票是核心功能，需要 regression test）                                                                                                               |
| **回滾**     | git revert 2 commits（entity 新建 + page 改寫）                                                                                                          |
| **測試驗證** | 1. 正常流程：建傳票 → 出現在列表 2. 跨 tab：開兩個瀏覽器，一個建傳票，另一個應即時看到 3. reverse：反沖後列表狀態更新 4. 篩選：篩選條件切換後 cache 命中 |
| **依賴**     | CI 先跑 `audit:realtime` 確認 journal_vouchers publication 已存在                                                                                        |

---

## 附：為什麼用 `CACHE_PRESETS.low`

```
CACHE_PRESETS.high   → 10 min（适合 tours/channels 等高頻互動）
CACHE_PRESETS.medium  → 5 min
CACHE_PRESETS.low     → 1 min（傳票要即時看到別人建/反沖）
```

傳票是會計核心資料、user 抱怨「要 F5 才看到」就是 P0 級的痛點。cache 設 1 分鐘是一個合理的 trade-off。

---

_Draft by Max — 等待 William review + approve_
_⚠️ 注意：此草稿尚未實際 apply 到 src/ 目錄_
