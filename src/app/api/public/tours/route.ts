/**
 * 公開行程列表 API（Corner 官網用）
 *
 * 業務語意（譬喻）：
 *   把「廚房裡櫥窗那層架上、目前願意對外賣的便當」列出來給客人看。
 *   只回菜單該有的資訊（菜名、出餐日、價錢、剩幾份）、不回廚房內部資訊
 *   （成本、業務員、利潤、其他客戶資料）。
 *
 * 規矩對齊：
 *   - 紅線 C：admin client 每次 new、不 singleton
 *   - 紅線 0：不暴露 workspace_id、不靠 isAdmin、純走 workspaces.code='CORNER' 過濾
 *   - 五大方向 5：列表預設不亂撒、回固定 sanitized 欄位
 *   - 跟 /api/public/tour/[code] 同 rate-limit pattern（60/min/IP）
 *
 * 過濾條件：
 *   workspace = CORNER + is_public_listed = true + 未軟刪
 *
 * 排序：departure_date ASC（最近出發的排最前面）
 */

import { NextRequest, NextResponse } from 'next/server'
import { checkRateLimit } from '@/lib/rate-limit'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { logger } from '@/lib/utils/logger'
import { withPublicCors, optionsResponse } from '@/lib/cors/public-cors'
import { filterActive } from '@/lib/data/filter-active'

export const dynamic = 'force-dynamic'

const CORNER_WORKSPACE_CODE = 'CORNER'

export async function OPTIONS(request: NextRequest) {
  return optionsResponse(request)
}

export async function GET(request: NextRequest) {
  // Rate limit（跟 /api/public/tour/[code] 對齊）
  const rateLimited = await checkRateLimit(request, 'public-tours', 60, 60_000)
  if (rateLimited) return withPublicCors(request, rateLimited)

  try {
    // 用 admin client 是因為這條 API 對外公開、無登入身分
    // 但只回 sanitized 欄位、不暴露 workspace_id 等 internal 資訊
    const supabase = getSupabaseAdminClient()

    // 1. 先反查 CORNER workspace id（透過 code 找、不寫死 uuid）
    const { data: ws, error: wsErr } = await supabase
      .from('workspaces')
      .select('id')
      .eq('code', CORNER_WORKSPACE_CODE)
      .maybeSingle()

    if (wsErr) {
      logger.error('public/tours: lookup workspace failed', { wsErr })
      return withPublicCors(
        request,
        NextResponse.json({ success: false, error: '系統暫時無法取得行程列表' }, { status: 500 })
      )
    }
    if (!ws) {
      // workspace 不存在 → 視同沒上架的團、回空列表（不是 500、官網才不會掛掉）
      return withPublicCors(request, NextResponse.json({ tours: [] }))
    }

    // 2. 列出上架中的團
    const toursResp = await filterActive(
      supabase
        .from('tours')
        .select(
          'code, marketing_title, marketing_subtitle, hero_image_url, departure_date, days_count, selling_price_per_person, max_participants, current_participants'
        )
        .eq('workspace_id', ws.id)
        .eq('is_public_listed', true)
    ).order('departure_date', { ascending: true })
    const tours = toursResp.data
    const toursErr = toursResp.error

    if (toursErr) {
      logger.error('public/tours: list failed', { toursErr })
      return withPublicCors(
        request,
        NextResponse.json({ success: false, error: '系統暫時無法取得行程列表' }, { status: 500 })
      )
    }

    return withPublicCors(request, NextResponse.json({ tours: tours ?? [] }))
  } catch (err) {
    logger.error('public/tours: unexpected', { err })
    return withPublicCors(
      request,
      NextResponse.json({ success: false, error: '系統暫時無法取得行程列表' }, { status: 500 })
    )
  }
}
