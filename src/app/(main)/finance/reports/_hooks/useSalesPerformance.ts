'use client'

/**
 * useSalesPerformance — 業務員業績排行
 *
 * 拉「下訂日」在區間內、有業務員（sales_id）的訂單、按業務員聚合。
 * 業績維度：訂單數 + 訂單總額 + 平均訂單金額。
 * 不算「收款金額」— 業務員業績看「成單」、不是「收款進帳」（會計事件）。
 */

import useSWR from 'swr'
import { supabase } from '@/lib/supabase/client'
import { logger } from '@/lib/utils/logger'

export interface SalesPerformanceRow {
  sales_id: string
  sales_name: string
  order_count: number
  total_amount: number
  avg_amount: number
  rank: number
}

interface UseSalesPerformanceResult {
  rows: SalesPerformanceRow[]
  loading: boolean
  error: string | null
  stats: {
    sales_count: number
    total_orders: number
    total_amount: number
  }
  refresh: () => Promise<void>
}

interface DateRange {
  startDate: string
  endDate: string
}

export function useSalesPerformance(dateRange: DateRange | null): UseSalesPerformanceResult {
  const swrKey = dateRange
    ? `sales-performance-report:${dateRange.startDate}:${dateRange.endDate}`
    : null

  const { data, error, isLoading, mutate } = useSWR(
    swrKey,
    async () => {
      if (!dateRange) return { rows: [], stats: emptyStats() }

      const { data: orders, error: queryError } = await supabase
        .from('orders')
        .select('id, sales_id, total_amount, created_at, status')
        .not('sales_id', 'is', null)
        .neq('status', 'cancelled')
        .gte('created_at', dateRange.startDate)
        .lte('created_at', `${dateRange.endDate}T23:59:59`)
        .limit(5000)

      if (queryError) {
        logger.error('❌ Error fetching sales performance:', queryError.message)
        throw new Error(queryError.message)
      }

      const bySales = new Map<string, { count: number; total: number }>()
      for (const order of orders || []) {
        if (!order.sales_id) continue
        const entry = bySales.get(order.sales_id) || { count: 0, total: 0 }
        entry.count += 1
        entry.total += Number(order.total_amount) || 0
        bySales.set(order.sales_id, entry)
      }

      const salesIds = Array.from(bySales.keys())
      if (salesIds.length === 0) return { rows: [], stats: emptyStats() }

      const { data: employees, error: empError } = await supabase
        .from('employees')
        .select('id, display_name, chinese_name, english_name')
        .in('id', salesIds)

      if (empError) {
        logger.error('❌ Error fetching sales employees:', empError.message)
        throw new Error(empError.message)
      }

      const nameById = new Map<string, string>()
      for (const emp of employees || []) {
        nameById.set(emp.id, emp.display_name || emp.chinese_name || emp.english_name || '(未命名)')
      }

      const rows: SalesPerformanceRow[] = Array.from(bySales.entries())
        .map(([sales_id, { count, total }]) => ({
          sales_id,
          sales_name: nameById.get(sales_id) || '(已離職)',
          order_count: count,
          total_amount: total,
          avg_amount: count > 0 ? total / count : 0,
          rank: 0,
        }))
        .sort((a, b) => b.total_amount - a.total_amount)
        .map((row, idx) => ({ ...row, rank: idx + 1 }))

      const stats = {
        sales_count: rows.length,
        total_orders: rows.reduce((sum, r) => sum + r.order_count, 0),
        total_amount: rows.reduce((sum, r) => sum + r.total_amount, 0),
      }

      return { rows, stats }
    },
    {
      revalidateOnFocus: false,
      dedupingInterval: 5 * 60 * 1000,
    }
  )

  return {
    rows: data?.rows || [],
    loading: isLoading,
    error: error?.message || null,
    stats: data?.stats || emptyStats(),
    refresh: async () => {
      await mutate()
    },
  }
}

function emptyStats() {
  return { sales_count: 0, total_orders: 0, total_amount: 0 }
}
