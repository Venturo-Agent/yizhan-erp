/**
 * GET /api/hr/bonus-settlements/pending-tours
 *
 * 列當前 workspace 所有「有 pending 獎金」的 tour、按團聚合。
 * 給 /hr/bonus-settlement 列表頁用。
 */

import { NextResponse } from 'next/server'
import { requireCapability } from '@/lib/auth/require-capability'
import { CAPABILITIES } from '@/lib/permissions/capabilities'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { translateDbError } from '@/lib/db-error-translate'
import { apiHandler } from '@/lib/api/api-handler'
import type { SupabaseClient } from '@supabase/supabase-js'

interface PendingRow {
  tour_id: string
  tour_code: string | null
  amount: number
  employee_id: string
}

export const GET = apiHandler(async () => {
  const guard = await requireCapability(CAPABILITIES.HR_BONUS_SETTLEMENT_READ)
  if (!guard.ok) return guard.response

  // bonus_pending 尚未納入生成類型，用 unknown 中轉
  const supabase = getSupabaseAdminClient() as unknown as SupabaseClient

  // 撈所有 pending bonus、join tours 拿 tour name + closing_date
  const { data, error } = await supabase
    .from('bonus_pending')
    .select('tour_id, tour_code, amount, employee_id')
    .eq('workspace_id', guard.workspaceId)
    .eq('status', 'pending')

  if (error) {
    const t = translateDbError(error)
    return NextResponse.json({ error: t.message }, { status: t.httpStatus })
  }

  // 按 tour 聚合
  const map = new Map<string, { tour_id: string; tour_code: string | null; total_amount: number; employee_set: Set<string>; bonus_count: number }>()
  for (const r of (data ?? []) as PendingRow[]) {
    const key = r.tour_id
    if (!map.has(key)) {
      map.set(key, {
        tour_id: r.tour_id,
        tour_code: r.tour_code,
        total_amount: 0,
        employee_set: new Set(),
        bonus_count: 0,
      })
    }
    const agg = map.get(key)!
    agg.total_amount += Number(r.amount ?? 0)
    if (r.employee_id) agg.employee_set.add(r.employee_id)
    agg.bonus_count += 1
  }

  // 撈 tour 的 name + closing_date
  const tourIds = Array.from(map.keys())
  let tourMeta: Record<string, { name: string; closing_date: string | null }> = {}
  if (tourIds.length > 0) {
    const { data: tours } = await supabase
      .from('tours')
      .select('id, name, closing_date')
      .in('id', tourIds)
    if (tours) {
      tourMeta = Object.fromEntries(
        (tours as Array<{ id: string; name: string; closing_date: string | null }>)
          .map((t) => [t.id, { name: t.name, closing_date: t.closing_date }])
      )
    }
  }

  const result = Array.from(map.values())
    .map((agg) => ({
      tour_id: agg.tour_id,
      tour_code: agg.tour_code,
      tour_name: tourMeta[agg.tour_id]?.name ?? '(未知團名)',
      closing_date: tourMeta[agg.tour_id]?.closing_date ?? null,
      total_amount: agg.total_amount,
      employee_count: agg.employee_set.size,
      bonus_count: agg.bonus_count,
    }))
    .sort((a, b) => {
      // 結案日 desc
      if (a.closing_date && b.closing_date) return b.closing_date.localeCompare(a.closing_date)
      if (a.closing_date) return -1
      if (b.closing_date) return 1
      return 0
    })

  return NextResponse.json({ data: result })
})
