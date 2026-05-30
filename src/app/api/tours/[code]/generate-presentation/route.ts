/**
 * POST /api/tours/[code]/generate-presentation
 *
 * 產出該團展示行程的 PPTX 簡報（後台用、需登入 + capability）
 *
 * 守門：tours.display-itinerary.read — 能看展示行程的人就能產簡報（William 5/30 拍板「寄生在展示行程權限」）
 * 飼料：前端把「當前展示 canvas」帶進 body（所見即所得、含業務當下微調但還沒存草稿的版本）
 * 引擎：generatePresentation(canvas) → PPTX ArrayBuffer（src/lib/presentation、目前僅 playful 模板可用）
 * 回傳：附 Content-Disposition、瀏覽器自動下載
 *
 * 為什麼 canvas 從 body 帶、不從 DB 讀：
 *   展示頁的 canvas 常是「自動生成 + 業務當下微調但尚未存草稿」的版本、
 *   直接用前端當前畫面的 canvas 才能所見即所得。capability + workspace 仍嚴格守門、
 *   body 只是「要把哪份展示內容畫成投影片」、不涉及任何權限資料。
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { requireCapability } from '@/lib/auth/require-capability'
import { CAPABILITIES } from '@/lib/permissions/capabilities'
import { generatePresentation } from '@/lib/presentation'
import type { Canvas } from '@/components/canvas-renderer/types'
import { dbErrorResponse } from '@/lib/db-error-translate'
import { logger } from '@/lib/utils/logger'

// PPTX 產生用 pptxgenjs、非 edge 相容 → 強制 Node runtime
export const runtime = 'nodejs'

// body：canvas 是 JSON object（shape 由 canvas-renderer 決定、這層不嚴格驗）
// template 目前引擎只有 playful 可用、minimal / business 會 throw「尚在實作中」
const bodySchema = z.object({
  canvas: z.record(z.string(), z.unknown()),
  template: z.enum(['playful']).optional(),
})

/**
 * 取出該 code 對應的 tour（限定 user 的 workspace）、找不到回 null
 */
async function findTourByCode(
  supabase: SupabaseClient,
  code: string,
  workspaceId: string
): Promise<{ id: string; code: string } | null> {
  const { data } = await supabase
    .from('tours')
    .select('id, code')
    .eq('code', code)
    .eq('workspace_id', workspaceId)
    .maybeSingle()
  return (data as { id: string; code: string } | null) ?? null
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const guard = await requireCapability(CAPABILITIES.TOURS_DISPLAY_ITINERARY_READ)
    if (!guard.ok) return guard.response

    const { code } = await params
    if (!code) {
      return NextResponse.json({ error: '缺少團號' }, { status: 400 })
    }

    const body = await request.json()
    const validated = bodySchema.parse(body)

    const supabase = await createSupabaseServerClient()

    // 防跨租戶：團一定要在 user 的 workspace 內
    const tour = await findTourByCode(supabase, code, guard.workspaceId)
    if (!tour) {
      return NextResponse.json({ error: '找不到該旅遊團' }, { status: 404 })
    }

    const buffer = await generatePresentation(validated.canvas as unknown as Canvas, {
      template: validated.template ?? 'playful',
      title: `${tour.code} 行程簡報`,
    })

    return new NextResponse(Buffer.from(buffer), {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'Content-Disposition': `attachment; filename="presentation-${tour.code}.pptx"`,
      },
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: '資料格式錯誤', details: error.issues }, { status: 400 })
    }
    logger.error('POST generate-presentation error', error)
    return dbErrorResponse(error)
  }
}
