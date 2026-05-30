/**
 * POST /api/tours/[code]/display-canvas/publish
 *
 * 把 tour_display_overrides.canvas（草稿）snapshot 成 published_canvas、
 * 設 published = true、published_at = now()、published_by = currentEmployee.id。
 *
 * 「為什麼用 snapshot 而不是直接讀 canvas」：
 *   業務發布後可能繼續編草稿（譬如下個月再改一輪）、客人看到的版本要凍結成發布那一刻、
 *   不能讓「業務還在草稿亂改、客人就跟著變」。
 *
 * 「為什麼草稿空就回 400」：
 *   發布空 canvas 等於把客人現在看的版本擦掉、會看到「空白頁」、
 *   是不可逆的破壞性操作、要擋掉。
 */

import { NextRequest, NextResponse } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { requireCapability } from '@/lib/auth/require-capability'
import { CAPABILITIES } from '@/lib/permissions/capabilities'
import { resolveEmployeeIdFromUser } from '@/app/api/lib/resolve-employee'
import { recordApiAuditContext } from '@/lib/audit/audit-helper'
import { dbErrorResponse } from '@/lib/db-error-translate'
import { logger } from '@/lib/utils/logger'

/**
 * 判斷 canvas 是否「無內容可發布」
 * 規則：null / undefined / 純 {} / 空 array → 視為無內容
 */
function isCanvasEmpty(canvas: unknown): boolean {
  if (canvas == null) return true
  if (Array.isArray(canvas)) return canvas.length === 0
  if (typeof canvas === 'object') {
    return Object.keys(canvas as Record<string, unknown>).length === 0
  }
  return false
}

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

    // 找對應 tour（限定 user 的 workspace）
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

    // 取目前草稿
    const sb = supabase as unknown as SupabaseClient
    const { data: existing, error: readError } = await sb
      .from('tour_display_overrides')
      .select('canvas')
      .eq('tour_id', tourId)
      .maybeSingle()

    if (readError) throw readError

    const canvas = (existing as { canvas: unknown } | null)?.canvas
    if (isCanvasEmpty(canvas)) {
      return NextResponse.json({ error: '無內容可發布' }, { status: 400 })
    }

    // 取 employee id（審計 FK）
    const {
      data: { session },
    } = await supabase.auth.getSession()
    const userId = session?.user.id
    const employeeId = userId ? await resolveEmployeeIdFromUser(supabase, userId) : null
    const actorId = employeeId ?? guard.employeeId

    await recordApiAuditContext(supabase, {
      actorId,
      reason: '展示行程 Canvas 發布',
    })

    const publishedAt = new Date().toISOString()

    const { data: updated, error: updateError } = await sb
      .from('tour_display_overrides')
      .update({
        published: true,
        published_canvas: canvas,
        published_at: publishedAt,
        published_by: actorId,
        updated_by: actorId,
      })
      .eq('tour_id', tourId)
      .select('published_at')
      .single()

    if (updateError) throw updateError

    return NextResponse.json({
      ok: true,
      published_at: (updated as { published_at: string }).published_at,
    })
  } catch (error) {
    logger.error('POST display-canvas publish error', error)
    return dbErrorResponse(error)
  }
}
