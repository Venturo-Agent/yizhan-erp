/**
 * GET /api/hr/bonus-settlements/[tourId]
 *
 * 看單一 tour 的 bonus_pending detail（員工 row 列表）。
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireCapability } from '@/lib/auth/require-capability'
import { CAPABILITIES } from '@/lib/permissions/capabilities'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { translateDbError } from '@/lib/db-error-translate'
import { logger } from '@/lib/utils/logger'
import type { SupabaseClient } from '@supabase/supabase-js'

interface RouteParams {
  params: Promise<{ tourId: string }>
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const guard = await requireCapability(CAPABILITIES.HR_BONUS_SETTLEMENT_READ)
    if (!guard.ok) return guard.response

    const { tourId } = await params

    // bonus_pending 尚未納入生成類型，用 unknown 中轉
    const supabase = getSupabaseAdminClient() as unknown as SupabaseClient

    // 撈 tour 資料
    const { data: tour } = await supabase
      .from('tours')
      .select('id, code, name, closing_date, status')
      .eq('id', tourId)
      .eq('workspace_id', guard.workspaceId)
      .maybeSingle()

    if (!tour) {
      return NextResponse.json({ error: '找不到 tour' }, { status: 404 })
    }

    // 撈該 tour 所有獎金
    const { data: items, error } = await supabase
      .from('bonus_pending')
      .select('id, employee_id, employee_name, amount, bonus_kind, reason, status, settled_at, settled_in_payment_request_id, created_at')
      .eq('tour_id', tourId)
      .eq('workspace_id', guard.workspaceId)
      .order('employee_name')

    if (error) {
      const t = translateDbError(error)
      return NextResponse.json({ error: t.message }, { status: t.httpStatus })
    }

    return NextResponse.json({
      data: {
        tour,
        items: items ?? [],
      },
    })
  } catch (error) {
    logger.error('API Error', { path: _request.nextUrl.pathname, error })
    return NextResponse.json({ success: false, error: '系統錯誤，請稍後再試' }, { status: 500 })
  }
}
