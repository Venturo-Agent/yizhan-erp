'use client'

/**
 * useReceivables — 應收帳款明細
 *
 * 拉所有 remaining_amount > 0（尚未收清）的訂單、join 客戶 + 團、
 * 算「欠多久」（today - created_at 天數）、依欠期分桶（0-30 / 31-60 / 61-90 / 90+）。
 *
 * 不接受 dateRange — 應收是「現在欠多少」、不是「區間內」。
 */

import useSWR from 'swr'
import { supabase } from '@/lib/supabase/client'
import { logger } from '@/lib/utils/logger'

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

interface UseReceivablesResult {
  rows: ReceivableRow[]
  loading: boolean
  error: string | null
  stats: {
    count: number
    total_receivable: number
    overdue_count: number // > 90 天
    overdue_amount: number
  }
  refresh: () => Promise<void>
}

function daysBetween(dateStr: string | null, today: Date): number {
  if (!dateStr) return 0
  const d = new Date(dateStr)
  const diff = today.getTime() - d.getTime()
  return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)))
}

function bucketOf(days: number): ReceivableRow['aging_bucket'] {
  if (days <= 0) return 'current'
  if (days <= 30) return 'd30'
  if (days <= 60) return 'd60'
  if (days <= 90) return 'd90'
  return 'd90_plus'
}

export function useReceivables(): UseReceivablesResult {
  const { data, error, isLoading, mutate } = useSWR(
    'receivables-report',
    async () => {
      const { data: orders, error: queryError } = await supabase
        .from('orders')
        .select(
          'id, code, customer_id, tour_id, total_amount, paid_amount, remaining_amount, created_at'
        )
        .gt('remaining_amount', 0)
        .neq('status', 'cancelled')
        .order('created_at', { ascending: true })
        .limit(2000)

      if (queryError) {
        logger.error('❌ Error fetching receivables:', queryError.message)
        throw new Error(queryError.message)
      }

      const customerIds = Array.from(new Set((orders || []).map(o => o.customer_id).filter(Boolean))) as string[]
      const tourIds = Array.from(new Set((orders || []).map(o => o.tour_id).filter(Boolean))) as string[]

      const [customersRes, toursRes] = await Promise.all([
        customerIds.length > 0
          ? supabase.from('customers').select('id, name').in('id', customerIds)
          : Promise.resolve({ data: [], error: null }),
        tourIds.length > 0
          ? supabase.from('tours').select('id, code').in('id', tourIds)
          : Promise.resolve({ data: [], error: null }),
      ])

      const customerName = new Map<string, string>()
      for (const c of customersRes.data || []) customerName.set(c.id, c.name || '')
      const tourCode = new Map<string, string>()
      for (const t of toursRes.data || []) tourCode.set(t.id, t.code || '')

      const today = new Date()
      const rows: ReceivableRow[] = (orders || []).map(o => {
        const days = daysBetween(o.created_at, today)
        return {
          order_id: o.id,
          order_code: o.code,
          customer_id: o.customer_id,
          customer_name: o.customer_id ? (customerName.get(o.customer_id) || '(無客戶資料)') : '(散客 / 無 FK)',
          tour_id: o.tour_id,
          tour_code: o.tour_id ? tourCode.get(o.tour_id) || null : null,
          total_amount: Number(o.total_amount) || 0,
          paid_amount: Number(o.paid_amount) || 0,
          remaining_amount: Number(o.remaining_amount) || 0,
          created_at: o.created_at,
          days_overdue: days,
          aging_bucket: bucketOf(days),
        }
      })

      rows.sort((a, b) => b.days_overdue - a.days_overdue)

      const stats = {
        count: rows.length,
        total_receivable: rows.reduce((sum, r) => sum + r.remaining_amount, 0),
        overdue_count: rows.filter(r => r.aging_bucket === 'd90_plus').length,
        overdue_amount: rows
          .filter(r => r.aging_bucket === 'd90_plus')
          .reduce((sum, r) => sum + r.remaining_amount, 0),
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
    stats: data?.stats || { count: 0, total_receivable: 0, overdue_count: 0, overdue_amount: 0 },
    refresh: async () => {
      await mutate()
    },
  }
}
