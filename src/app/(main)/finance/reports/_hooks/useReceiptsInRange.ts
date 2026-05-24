'use client'

/**
 * useReceiptsInRange — 只撈「選取日期範圍」內的收款單（取代報表頁全撈整張表）
 *
 * 為什麼存在（效能 #2、3 億規模）：
 * - finance/reports 的 IncomeTab / OverviewTab 原本 useReceipts({ all: true }) 全撈整張收款表、
 *   再在前端用 dateRange 過濾。規模化後（累積數年資料）為了看「本月」要搬全歷史回來、egress 線性爆。
 * - 改成只撈「選取範圍」的收款單。讀取量跟著使用者選的範圍走、不跟總資料量走。
 *
 * 數字準確性（會計、不可錯）：
 * - 抓「超集」：receipt_date 落在範圍 OR receipt_date IS NULL（極少、保險涵蓋 fallback 到 created_at 的列）；
 *   各 tab 仍保留自己原本的精確 client 過濾（coalesce 日期 / 狀態），在這個 bounded 集合上 trim → 結果與全撈時一字不差。
 * - **自動翻頁**：raw PostgREST 單次查詢預設上限 1000 筆；忙碌月份可能超過。本 hook 迴圈抓到撈完為止、
 *   不會像單次 range 查詢那樣靜默截斷導致金額短少（對齊 entity hook {all:true} 的自動翻頁行為）。
 *
 * 紅線：workspace 隔離走 RLS（前端不刻）、軟刪 filterActive。
 */

import { supabase } from '@/lib/supabase/client'
import { createReportHook } from '@/lib/swr/createReportHook'
import { filterActive } from '@/lib/data/filter-active'
import type { DateRange } from '@/app/(main)/finance/reports/_components/DateRangeSelector'
import type { Receipt } from '@/types/receipt.types'

// 涵蓋 IncomeTab + OverviewTab 會讀到的欄位（兩 tab 共用此 hook）
const SELECT =
  'id,receipt_number,order_number,tour_id,tour_name,customer_name,actual_amount,receipt_amount,status,payment_method,payment_method_id,receipt_date,created_at,notes'

const PAGE = 1000

export const useReceiptsInRange = createReportHook<Receipt, Record<string, never>, DateRange>({
  key: (p: DateRange) => `receipts-in-range:${p.startDate}:${p.endDate}`,
  defaultStats: {},
  fetcher: async (p: DateRange) => {
    const all: Receipt[] = []
    // 自動翻頁：抓到某批不足 PAGE 筆為止（避免單次查詢 1000 筆上限靜默截斷）
    for (let from = 0; ; from += PAGE) {
      const { data, error } = await filterActive(
        supabase.from('receipts').select(SELECT)
      )
        // 超集：receipt_date 在範圍內、或 receipt_date 為 null（client 端再用 coalesce 精確 trim）
        .or(
          `and(receipt_date.gte.${p.startDate},receipt_date.lte.${p.endDate}),receipt_date.is.null`
        )
        .order('receipt_date', { ascending: false })
        .range(from, from + PAGE - 1)

      if (error) throw new Error(error.message)
      const batch = (data || []) as unknown as Receipt[]
      all.push(...batch)
      if (batch.length < PAGE) break
    }
    return { rows: all, stats: {} }
  },
})
