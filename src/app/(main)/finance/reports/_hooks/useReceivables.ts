'use client'

/**
 * useReceivables — 應收帳款明細
 *
 * 拉所有 remaining_amount > 0（尚未收清）的訂單、join 客戶 + 團、
 * 算「欠多久」（today - created_at 天數）、依欠期分桶。
 */

import { supabase } from '@/lib/supabase/client'
import { createReportHook, agingBucket, daysBetween } from '@/lib/swr/createReportHook'
import { isDraftTourStatus } from '@/lib/constants/tour-status'

export interface ReceivableRow {
  order_id: string
  order_code: string | null
  customer_id: string | null
  customer_name: string
  tour_id: string | null
  tour_code: string | null
  total_amount: number
  paid_amount: number
  remaining_amount: number
  created_at: string | null
  days_overdue: number
  aging_bucket: 'current' | 'd30' | 'd60' | 'd90' | 'd90_plus'
}

interface ReceivablesStats {
  count: number
  total_receivable: number
  overdue_count: number
  overdue_amount: number
}

const DEFAULT_STATS: ReceivablesStats = {
  count: 0,
  total_receivable: 0,
  overdue_count: 0,
  overdue_amount: 0,
}

export const useReceivables = createReportHook<ReceivableRow, ReceivablesStats>({
  key: 'receivables-report',
  defaultStats: DEFAULT_STATS,
  fetcher: async () => {
    const { data: orders, error: queryError } = await supabase
      .from('orders')
      .select(
        'id, order_number, customer_id, tour_id, total_amount, paid_amount, remaining_amount, created_at'
      )
      .gt('remaining_amount', 0)
      .neq('status', 'cancelled')
      .order('created_at', { ascending: true })
      .limit(2000)

    if (queryError) throw new Error(queryError.message)

    const customerIds = Array.from(
      new Set((orders || []).map(o => o.customer_id).filter(Boolean))
    ) as string[]
    const tourIds = Array.from(
      new Set((orders || []).map(o => o.tour_id).filter(Boolean))
    ) as string[]

    const [customersRes, toursRes] = await Promise.all([
      customerIds.length > 0
        ? supabase.from('customers').select('id, name').in('id', customerIds)
        : Promise.resolve({ data: [], error: null }),
      tourIds.length > 0
        ? supabase.from('tours').select('id, code, status').in('id', tourIds)
        : Promise.resolve({ data: [], error: null }),
    ])

    const customerName = new Map<string, string>()
    for (const c of customersRes.data || []) customerName.set(c.id, c.name || '')
    const tourCode = new Map<string, string>()
    const tourStatus = new Map<string, string>()
    for (const t of toursRes.data || []) {
      tourCode.set(t.id, t.code || '')
      tourStatus.set(t.id, (t as { status?: string }).status || '')
    }

    const today = new Date()
    // 過濾掉 template/proposal 團的訂單（工作台暫存、不應入應收帳款）
    const filteredOrders = (orders || []).filter(
      o => !o.tour_id || !isDraftTourStatus(tourStatus.get(o.tour_id))
    )
    const rows: ReceivableRow[] = filteredOrders.map(o => {
      const days = daysBetween(o.created_at, today)
      return {
        order_id: o.id,
        order_code: o.order_number,
        customer_id: o.customer_id,
        customer_name: o.customer_id
          ? customerName.get(o.customer_id) || '(無客戶資料)'
          : '(散客 / 無 FK)',
        tour_id: o.tour_id,
        tour_code: o.tour_id ? tourCode.get(o.tour_id) || null : null,
        total_amount: Number(o.total_amount) || 0,
        paid_amount: Number(o.paid_amount) || 0,
        remaining_amount: Number(o.remaining_amount) || 0,
        created_at: o.created_at,
        days_overdue: days,
        aging_bucket: agingBucket(days),
      }
    })

    rows.sort((a, b) => b.days_overdue - a.days_overdue)

    const stats: ReceivablesStats = {
      count: rows.length,
      total_receivable: rows.reduce((sum, r) => sum + r.remaining_amount, 0),
      overdue_count: rows.filter(r => r.aging_bucket === 'd90_plus').length,
      overdue_amount: rows
        .filter(r => r.aging_bucket === 'd90_plus')
        .reduce((sum, r) => sum + r.remaining_amount, 0),
    }

    return { rows, stats }
  },
})
