'use client'

/**
 * usePayables — 應付帳款明細
 *
 * 拉所有 status IN ('confirmed', 'billed') 的請款單（已確認 / 已拋出納、但未付清）、
 * join 供應商 + 團、算「欠多久」（today - request_date）、依欠期分桶。
 *
 * 不接受 dateRange — 應付是「現在欠多少」、不是「區間內」。
 *
 * 業務語意：
 *   - pending = 還沒主管確認、不算應付
 *   - confirmed = 已確認、變應付帳款（核心）
 *   - billed = 已拋出納、仍是應付（核心）
 *   - paid = 已付、不列
 */

import useSWR from 'swr'
import { supabase } from '@/lib/supabase/client'
import { logger } from '@/lib/utils/logger'

export interface PayableRow {
  request_id: string
  request_code: string | null
  supplier_id: string | null
  supplier_name: string
  tour_id: string | null
  tour_code: string | null
  amount: number
  status: string
  request_date: string | null
  days_overdue: number
  aging_bucket: 'current' | 'd30' | 'd60' | 'd90' | 'd90_plus'
}

interface UsePayablesResult {
  rows: PayableRow[]
  loading: boolean
  error: string | null
  stats: {
    count: number
    total_payable: number
    overdue_count: number
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

function bucketOf(days: number): PayableRow['aging_bucket'] {
  if (days <= 0) return 'current'
  if (days <= 30) return 'd30'
  if (days <= 60) return 'd60'
  if (days <= 90) return 'd90'
  return 'd90_plus'
}

export function usePayables(): UsePayablesResult {
  const { data, error, isLoading, mutate } = useSWR(
    'payables-report',
    async () => {
      const { data: requests, error: queryError } = await supabase
        .from('payment_requests')
        .select(
          'id, code, supplier_id, tour_id, amount, status, request_date'
        )
        .eq('status', 'confirmed')
        .order('request_date', { ascending: true })
        .limit(2000)

      if (queryError) {
        logger.error('❌ Error fetching payables:', queryError.message)
        throw new Error(queryError.message)
      }

      const supplierIds = Array.from(new Set((requests || []).map(r => r.supplier_id).filter(Boolean))) as string[]
      const tourIds = Array.from(new Set((requests || []).map(r => r.tour_id).filter(Boolean))) as string[]

      const [suppliersRes, toursRes] = await Promise.all([
        supplierIds.length > 0
          ? supabase.from('suppliers').select('id, name').in('id', supplierIds)
          : Promise.resolve({ data: [], error: null }),
        tourIds.length > 0
          ? supabase.from('tours').select('id, code').in('id', tourIds)
          : Promise.resolve({ data: [], error: null }),
      ])

      const supplierName = new Map<string, string>()
      for (const s of suppliersRes.data || []) supplierName.set(s.id, s.name || '')
      const tourCode = new Map<string, string>()
      for (const t of toursRes.data || []) tourCode.set(t.id, t.code || '')

      const today = new Date()
      const rows: PayableRow[] = (requests || []).map(r => {
        const days = daysBetween(r.request_date, today)
        return {
          request_id: r.id,
          request_code: r.code,
          supplier_id: r.supplier_id,
          supplier_name: r.supplier_id ? (supplierName.get(r.supplier_id) || '(無供應商資料)') : '(公司請款 / 無 FK)',
          tour_id: r.tour_id,
          tour_code: r.tour_id ? tourCode.get(r.tour_id) || null : null,
          amount: Number(r.amount) || 0,
          status: r.status || '',
          request_date: r.request_date,
          days_overdue: days,
          aging_bucket: bucketOf(days),
        }
      })

      rows.sort((a, b) => b.days_overdue - a.days_overdue)

      const stats = {
        count: rows.length,
        total_payable: rows.reduce((sum, r) => sum + r.amount, 0),
        overdue_count: rows.filter(r => r.aging_bucket === 'd90_plus').length,
        overdue_amount: rows
          .filter(r => r.aging_bucket === 'd90_plus')
          .reduce((sum, r) => sum + r.amount, 0),
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
    stats: data?.stats || { count: 0, total_payable: 0, overdue_count: 0, overdue_amount: 0 },
    refresh: async () => {
      await mutate()
    },
  }
}
