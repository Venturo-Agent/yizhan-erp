/**
 * GET / PUT /api/tours/[code]/display-canvas
 *
 * 展示行程 Canvas 編輯 API（後台用、需登入 + capability）
 *
 * GET  → 讀回該 tour 的草稿 canvas + theme + 發布狀態（沒 row 就回空、不 404）
 * PUT  → UPSERT 草稿 canvas（保留 published 狀態不動、不影響客人看到的版本）
 *
 * 「為什麼 GET 不存在也回 200」：
 *   業務還沒編輯過的團就是「沒有 override」、前端直接 fallback 到 auto-generate canvas、
 *   不該因為「沒編輯過」就讓編輯器報錯。
 *
 * 「PUT 為什麼不動 published」：
 *   發布 / 取消發布是另一個 endpoint。編輯只動草稿、不影響客人現在看到的版本。
 *   業務改一改隨時存草稿、確定 ok 再走 /publish 推給客人。
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { requireCapability } from '@/lib/auth/require-capability'
import { CAPABILITIES } from '@/lib/permissions/capabilities'
import { resolveEmployeeIdFromUser } from '@/app/api/lib/resolve-employee'
import { recordApiAuditContext } from '@/lib/audit/audit-helper'
import { translateDbError } from '@/lib/db-error-translate'
import { logger } from '@/lib/utils/logger'

// PUT body schema — canvas 是 JSON object（內容由前端 canvas canvas 結構決定、這層不嚴格驗 shape）
const putBodySchema = z.object({
  canvas: z.record(z.string(), z.unknown()),
  theme: z.literal('classic').optional(),
})

/**
 * 取出該 code 對應的 tour（限定 user 的 workspace）、找不到回 null
 */
async function findTourByCode(
  supabase: SupabaseClient,
  code: string,
  workspaceId: string
): Promise<{ id: string } | null> {
  const { data } = await supabase
    .from('tours')
    .select('id')
    .eq('code', code)
    .eq('workspace_id', workspaceId)
    .maybeSingle()
  return (data as { id: string } | null) ?? null
}

// ─────────────────────────────────────────────────────────────────────────────
// GET — 讀草稿 canvas
// ─────────────────────────────────────────────────────────────────────────────
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const guard = await requireCapability(CAPABILITIES.TOURS_DISPLAY_ITINERARY_READ)
    if (!guard.ok) return guard.response

    const { code } = await params
    if (!code) {
      return NextResponse.json({ error: '缺少團號' }, { status: 400 })
    }

    const supabase = await createSupabaseServerClient()

    const tour = await findTourByCode(supabase, code, guard.workspaceId)
    if (!tour) {
      return NextResponse.json({ error: '找不到該旅遊團' }, { status: 404 })
    }

    // 走專案慣例：新表還沒同步進 types.ts 之前、用 as unknown as SupabaseClient（不是 as any）
    const sb = supabase as unknown as SupabaseClient
    const { data, error } = await sb
      .from('tour_display_overrides')
      .select('canvas, theme, published, published_canvas, published_at, updated_at')
      .eq('tour_id', tour.id)
      .maybeSingle()

    if (error) throw error

    // 沒 row → 回空殼讓前端 fallback、不 404
    if (!data) {
      return NextResponse.json({
        canvas: null,
        theme: 'classic',
        published: false,
        published_canvas: null,
        published_at: null,
        updated_at: null,
      })
    }

    return NextResponse.json({
      canvas: data.canvas,
      theme: data.theme,
      published: data.published,
      published_canvas: data.published_canvas,
      published_at: data.published_at,
      updated_at: data.updated_at,
    })
  } catch (error) {
    logger.error('GET display-canvas error', error)
    const t = translateDbError(error)
    return NextResponse.json(
      { error: t.message, code: t.code, field: t.field },
      { status: t.httpStatus }
    )
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// PUT — UPSERT 草稿 canvas（保留 published 狀態）
// ─────────────────────────────────────────────────────────────────────────────
export async function PUT(request: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  try {
    const guard = await requireCapability(CAPABILITIES.TOURS_DISPLAY_ITINERARY_WRITE)
    if (!guard.ok) return guard.response

    const { code } = await params
    if (!code) {
      return NextResponse.json({ error: '缺少團號' }, { status: 400 })
    }

    const body = await request.json()
    const validated = putBodySchema.parse(body)

    const supabase = await createSupabaseServerClient()

    const tour = await findTourByCode(supabase, code, guard.workspaceId)
    if (!tour) {
      return NextResponse.json({ error: '找不到該旅遊團' }, { status: 404 })
    }

    // 取得對應 employee（審計 FK 必指 employees(id)、不是 auth.users）
    const {
      data: { session },
    } = await supabase.auth.getSession()
    const userId = session?.user.id
    const employeeId = userId ? await resolveEmployeeIdFromUser(supabase, userId) : null

    const actorId = employeeId ?? guard.employeeId

    await recordApiAuditContext(supabase, {
      actorId,
      reason: '展示行程 Canvas 儲存草稿',
    })

    const theme = validated.theme ?? 'classic'

    const sb = supabase as unknown as SupabaseClient

    // UPSERT：tour_id 為衝突 key、保留 published / published_canvas / published_at / published_by 不動
    // 不在 update 列表內列這幾欄、PostgREST onConflict 只會 update 我們列出來的欄位
    const { data, error } = await sb
      .from('tour_display_overrides')
      .upsert(
        {
          tour_id: tour.id,
          workspace_id: guard.workspaceId,
          theme,
          canvas: validated.canvas,
          updated_by: actorId,
          // created_by 只在第一次 insert 時有意義；UPSERT 後續呼叫 PostgREST 會忽略不影響舊值
          created_by: actorId,
        },
        { onConflict: 'tour_id' }
      )
      .select('updated_at')
      .single()

    if (error) throw error

    return NextResponse.json({
      ok: true,
      updated_at: (data as { updated_at: string }).updated_at,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: '資料格式錯誤', details: error.issues }, { status: 400 })
    }
    logger.error('PUT display-canvas error', error)
    const t = translateDbError(error)
    return NextResponse.json(
      { error: t.message, code: t.code, field: t.field },
      { status: t.httpStatus }
    )
  }
}
