/**
 * POST /api/hr/bonus-settlements/write-pending
 *
 * 結案 callback：把 tour 內計算出的獎金寫進 bonus_pending（status=pending）。
 * 由 tours/_components/TourClosingSections.tsx 的 handleConfirmCloseFromReport 呼叫。
 *
 * 2026-05-15 William 拍板：結案 ≠ 產請款、改寫 bonus_pending 待結算池。
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireCapability } from '@/lib/auth/require-capability'
import { CAPABILITIES } from '@/lib/permissions/capabilities'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { recordApiAuditContext } from '@/lib/audit/audit-helper'
import { translateDbError } from '@/lib/db-error-translate'
import { apiHandler } from '@/lib/api/api-handler'
import type { SupabaseClient } from '@supabase/supabase-js'

interface BonusInput {
  employee_id: string | null
  employee_name: string
  amount: number
  bonus_kind: string | null
  reason: string | null
}

export const POST = apiHandler(async (request: NextRequest) => {
  // 結案觸發、用 tours.write capability（caller 是改 tour 流程）
  const guard = await requireCapability(CAPABILITIES.TOURS_WRITE)
  if (!guard.ok) return guard.response

  const body = await request.json().catch(() => ({}))
  const { tour_id, tour_code, bonuses } = body as {
    tour_id?: string
    tour_code?: string
    bonuses?: BonusInput[]
  }

  if (!tour_id || !Array.isArray(bonuses)) {
    return NextResponse.json({ error: '缺少必要欄位 (tour_id / bonuses)' }, { status: 400 })
  }

  // bonus_pending 尚未納入生成類型，用 unknown 中轉
  const supabase = getSupabaseAdminClient() as unknown as SupabaseClient
  await recordApiAuditContext(supabase, {
    actorId: guard.employeeId,
    reason: `結案寫入 bonus_pending（tour=${tour_code ?? tour_id}）`,
    requestId: tour_id,
  })

  const validBonuses = bonuses.filter((b: BonusInput) => b.employee_id && b.amount > 0)
  if (validBonuses.length === 0) {
    return NextResponse.json({ data: { inserted: 0 } })
  }

  const rows = validBonuses.map((b: BonusInput) => ({
    workspace_id: guard.workspaceId,
    tour_id,
    employee_id: b.employee_id,
    employee_name: b.employee_name,
    tour_code: tour_code ?? null,
    amount: b.amount,
    bonus_kind: b.bonus_kind ?? null,
    reason: b.reason ?? null,
    status: 'pending',
    created_by: guard.employeeId,
  }))

  // upsert by (tour_id, employee_id, bonus_kind) — 防同 tour 重複結案寫多次
  const { error } = await supabase
    .from('bonus_pending')
    .upsert(rows, { onConflict: 'tour_id,employee_id,bonus_kind' })

  if (error) {
    const t = translateDbError(error)
    return NextResponse.json({ error: t.message }, { status: t.httpStatus })
  }

  return NextResponse.json({ data: { inserted: rows.length } })
})
