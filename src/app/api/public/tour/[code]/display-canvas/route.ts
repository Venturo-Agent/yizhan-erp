/**
 * GET /api/public/tour/[code]/display-canvas
 *
 * 公開讀取展示行程 Canvas（anon、不需登入）
 *
 * 客人從 demo 連結 / 業務分享網址打進來、頁面 server-side fetch 這支拿發布版 canvas。
 *
 * 安全性：
 *   - service_role client + 走表上的 anon RLS policy（published = true 才看得到）
 *     用 admin client 主要是不需要 user session、不是要繞 RLS
 *   - Rate limit：120 req/min per IP（demo 頁 + 編輯器即時預覽都會打、抓寬鬆一點）
 *   - 只回 published_canvas / theme / published_at、不洩漏 workspace_id / updated_by 等內部欄位
 *   - 沒發布 / 沒 row：回 200 + canvas:null、讓 client 自己 fallback 到 auto-generate
 *
 * 「為什麼不 404 而是 200 + null」：
 *   demo 頁就算找不到 override、也該顯示 auto-generate 的展示行程（從 tours / itineraries 算）、
 *   不該整頁炸 404。
 */

import { NextRequest, NextResponse } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { checkRateLimit } from '@/lib/rate-limit'
import { logger } from '@/lib/utils/logger'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  // Rate limit：120 req/min per IP
  const rateLimited = await checkRateLimit(
    request,
    'public-tour-display-canvas',
    120,
    60_000
  )
  if (rateLimited) return rateLimited

  const { code } = await params
  if (!code) {
    return NextResponse.json(
      { success: false, error: '缺少團號' },
      { status: 400 }
    )
  }

  try {
    const supabase = getSupabaseAdminClient() as unknown as SupabaseClient

    // 用 code 找 tour（公開 endpoint、不篩 workspace_id — tour code 視為全域）
    const { data: tour, error: tourError } = await supabase
      .from('tours')
      .select('id')
      .eq('code', code)
      .maybeSingle()

    if (tourError) throw tourError

    // 找不到 tour 也回 null、讓 client 處理（跟現有 /api/public/tour/[code] 的 404 行為不同、
    // 因為這支設計上是 demo 連結的 fallback 端點、要寬容）
    if (!tour) {
      return NextResponse.json({
        canvas: null,
        theme: null,
        published_at: null,
      })
    }

    const tourId = (tour as { id: string }).id

    // 只查發布版欄位、明確排除 workspace_id / created_by / updated_by / canvas（草稿）
    const { data, error } = await supabase
      .from('tour_display_overrides')
      .select('published, published_canvas, published_at, theme')
      .eq('tour_id', tourId)
      .maybeSingle()

    if (error) throw error

    // 沒 row 或 published = false：回 200 + null、不洩漏狀態
    if (!data || !(data as { published: boolean }).published) {
      return NextResponse.json({
        canvas: null,
        theme: null,
        published_at: null,
      })
    }

    const row = data as {
      published: boolean
      published_canvas: unknown
      published_at: string | null
      theme: string
    }

    return NextResponse.json({
      canvas: row.published_canvas ?? null,
      theme: row.theme,
      published_at: row.published_at,
    })
  } catch (error) {
    logger.error('GET public display-canvas error', error)
    // 公開端點不洩漏 DB error 內部訊息、給通用 500
    return NextResponse.json(
      { success: false, error: '系統錯誤、請稍後再試' },
      { status: 500 }
    )
  }
}
