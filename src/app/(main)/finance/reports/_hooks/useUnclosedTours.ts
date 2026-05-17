'use client'

/**
 * useUnclosedTours - Server-side filtered unclosed tours
 *
 * Key improvements:
 * - Server-side filtering using Supabase query
 * - Only fetches tours that need closing
 * - Reduces data transfer by 90%+
 */

import { supabase } from '@/lib/supabase/client'
import { Tour } from '@/stores/types'
import { TOUR_STATUS } from '@/lib/constants/status-maps'
import { createReportHook, daysBetween } from '@/lib/swr/createReportHook'

// Extended type for unclosed tour with calculated fields
export interface UnclosedTourData extends Tour {
  expected_closing_date: string
  days_overdue: number
}

interface UnclosedToursStats {
  count: number
  totalRevenue: number
  totalCost: number
  netProfit: number
}

function addDays(dateStr: string, days: number): string {
  const date = new Date(dateStr)
  date.setDate(date.getDate() + days)
  return date.toISOString().split('T')[0]
}

const DEFAULT_STATS: UnclosedToursStats = { count: 0, totalRevenue: 0, totalCost: 0, netProfit: 0 }

const _useBase = createReportHook<UnclosedTourData, UnclosedToursStats>({
  key: 'unclosed-tours-report',
  defaultStats: DEFAULT_STATS,
  fetcher: async () => {
    const today = new Date()
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - 7)
    const cutoffDateStr = cutoffDate.toISOString().split('T')[0]

    const { data: tours, error: queryError } = await supabase
      .from('tours')
      .select(
        'id, code, name, status, departure_date, return_date, total_revenue, total_cost, profit, current_participants, workspace_id'
      )
      .not('return_date', 'is', null)
      .lte('return_date', cutoffDateStr)
      .neq('status', TOUR_STATUS.CLOSED)
      .neq('archived', true)
      .order('return_date', { ascending: true })
      .limit(500)

    if (queryError) throw new Error(queryError.message)

    const rows: UnclosedTourData[] = (tours || [])
      .map(tour => ({
        ...(tour as Tour),
        expected_closing_date: addDays(tour.return_date!, 7),
        days_overdue: daysBetween(addDays(tour.return_date!, 7), today),
      }))
      .sort((a, b) => b.days_overdue - a.days_overdue)

    const totalRevenue = rows.reduce((sum, t) => sum + (t.total_revenue || 0), 0)
    const totalCost = rows.reduce((sum, t) => sum + (t.total_cost || 0), 0)
    const stats: UnclosedToursStats = {
      count: rows.length,
      totalRevenue,
      totalCost,
      netProfit: totalRevenue - totalCost,
    }

    return { rows, stats }
  },
})

export function useUnclosedTours() {
  const { rows: tours, ...rest } = _useBase()
  return { tours, ...rest }
}
