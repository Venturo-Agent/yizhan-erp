/**
 * POST /api/tours/[code]/display-canvas/unpublish
 *
 * 把 tour_display_overrides.published 設成 false、客人看不到 published_canvas。
 *
 * 「為什麼保留 published_canvas」：
 *   業務可能只是暫時下架（譬如行程要校稿）、之後想重新發布同樣內容。
 *   保留 snapshot 讓他可以再按一次「發布」就回復、不用重新編。
 *
 * 「為什麼沒 row 也算 ok」：
 *   沒 row = 從未發布過、結果跟「現在下架」一致、不需要報錯。
 */

import { NextRequest, NextResponse } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { requireCapability } from '@/lib/auth/require-capability'
import { CAPABILITIES } from '@/lib/permissions/capabilities'
import { resolveEmployeeIdFromUser } from '@/app/api/lib/resolve-employee'
import { recordApiAuditContext } from '@/lib/audit/audit-helper'
import { translateDbError } from '@/lib/db-error-translate'
import { logger } from '@/lib/utils/logger'

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const guard = await requireCapability(CAPABILITIES.TOURS_DISPLAY_ITINERARY_WRITE)
    if (!guard.ok) return guard.response

    const { code } = await params
    if (!code) {
      return NextResponse.json({ error: '缺少團號' }, { status: 400 })
    }

    const supabase = await createSupabaseServerClient()

    const { data: tour } = await supabase
      .from('tours')
      .select('id')
      .eq('code', code)
      .eq('workspace_id', guard.workspaceId)
      .maybeSingle()

    if (!tour) {
      return NextResponse.json({ error: '找不到該旅遊團' }, { status: 404 })
    }

    const tourId = (tour as { id: string }).id

    const {
      data: { session },
    } = await supabase.auth.getSession()
    const userId = session?.user.id
    const employeeId = userId
      ? await resolveEmployeeIdFromUser(supabase, userId)
      : null
    const actorId = employeeId ?? guard.employeeId

    await recordApiAuditContext(supabase, {
      actorId,
      reason: '展示行程 Canvas 取消發布',
    })

    const sb = supabase as unknown as SupabaseClient
    // 不動 published_canvas / published_at（之後想重新發布時方便）
    const { error } = await sb
      .from('tour_display_overrides')
      .update({
        published: false,
        updated_by: actorId,
      })
      .eq('tour_id', tourId)

    if (error) throw error

    return NextResponse.json({ ok: true })
  } catch (error) {
    logger.error('POST display-canvas unpublish error', error)
    const t = translateDbError(error)
    return NextResponse.json(
      { error: t.message, code: t.code, field: t.field },
      { status: t.httpStatus }
    )
  }
}
