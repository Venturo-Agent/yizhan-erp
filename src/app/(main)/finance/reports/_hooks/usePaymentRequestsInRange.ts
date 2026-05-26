'use client'

/**
 * usePaymentRequestsInRange — 只撈「選取日期範圍」內的請款單（含 items、取代報表頁全撈）
 *
 * 給 OverviewTab + DisbursementTab 共用。比照 useReceiptsInRange 的設計：
 * - 超集：request_date 在範圍 OR request_date IS NULL（client 端再精確 trim、數字不變）
 * - 自動翻頁：避免 raw 查詢 1000 筆上限靜默截斷（忙碌月份金額短少）
 * - items 巢狀帶出（OverviewTab 依品項展開供應商明細需要）
 * - workspace 隔離走 RLS、軟刪 filterActive
 */

import { supabase } from '@/lib/supabase/client'
import { createReportHook } from '@/lib/swr/createReportHook'
import { filterActive } from '@/lib/data/filter-active'
import type { DateRange } from '@/app/(main)/finance/reports/_components/DateRangeSelector'
import type { PaymentRequest } from '@/stores/types'

// 涵蓋 OverviewTab + DisbursementTab 會讀到的欄位 + items 巢狀（供應商展開用）
const SELECT =
  'id,code,request_number,request_date,created_at,request_type,request_category,expense_type,expense_category_id,tour_id,tour_code,tour_name,supplier_name,amount,total_amount,status,disbursement_order_id,items:payment_request_items(id,supplier_name,description,subtotal,category)'

const PAGE = 1000

export const usePaymentRequestsInRange = createReportHook<
  PaymentRequest,
  Record<string, never>,
  DateRange
>({
  key: (p: DateRange) => `payment-requests-in-range:${p.startDate}:${p.endDate}`,
  defaultStats: {},
  fetcher: async (p: DateRange) => {
    const all: PaymentRequest[] = []
    for (let from = 0; ; from += PAGE) {
      const { data, error } = await filterActive(supabase.from('payment_requests').select(SELECT))
        .or(
          `and(request_date.gte.${p.startDate},request_date.lte.${p.endDate}),request_date.is.null`
        )
        .order('request_date', { ascending: false })
        .range(from, from + PAGE - 1)

      if (error) throw new Error(error.message)
      const batch = (data || []) as unknown as PaymentRequest[]
      all.push(...batch)
      if (batch.length < PAGE) break
    }
    return { rows: all, stats: {} }
  },
})
