'use client'

/**
 * useDisbursementOrdersInRange — 只撈「選取日期範圍」內的出納單（取代報表頁全撈）
 *
 * 給 DisbursementTab 用。比照 useReceiptsInRange：
 * - 超集：disbursement_date 在範圍 OR disbursement_date IS NULL（client 再精確 trim）
 * - 自動翻頁防 1000 筆截斷、軟刪 filterActive、workspace 隔離走 RLS
 */

import { supabase } from '@/lib/supabase/client'
import { createReportHook } from '@/lib/swr/createReportHook'
import { filterActive } from '@/lib/data/filter-active'
import type { DateRange } from '@/app/(main)/finance/reports/_components/DateRangeSelector'
import type { DisbursementOrder } from '@/stores/types'

const SELECT = 'id,order_number,disbursement_date,amount,status,created_at'
const PAGE = 1000

export const useDisbursementOrdersInRange = createReportHook<DisbursementOrder, Record<string, never>, DateRange>({
  key: (p: DateRange) => `disbursement-orders-in-range:${p.startDate}:${p.endDate}`,
  defaultStats: {},
  fetcher: async (p: DateRange) => {
    const all: DisbursementOrder[] = []
    for (let from = 0; ; from += PAGE) {
      const { data, error } = await filterActive(
        supabase.from('disbursement_orders').select(SELECT)
      )
        .or(
          `and(disbursement_date.gte.${p.startDate},disbursement_date.lte.${p.endDate}),disbursement_date.is.null`
        )
        .order('disbursement_date', { ascending: false })
        .range(from, from + PAGE - 1)

      if (error) throw new Error(error.message)
      const batch = (data || []) as unknown as DisbursementOrder[]
      all.push(...batch)
      if (batch.length < PAGE) break
    }
    return { rows: all, stats: {} }
  },
})
