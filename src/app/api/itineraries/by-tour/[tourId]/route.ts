import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { getServerAuth } from '@/lib/auth/server-auth'
import { requireCapability } from '@/lib/auth/require-capability'
import { CAPABILITIES } from '@/lib/permissions/capabilities'
import { logger } from '@/lib/utils/logger'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tourId: string }> }
) {
  try {
    // 🔒 必須登入 + 限定當前 workspace、防止跨租戶讀取行程
    const guard = await requireCapability(CAPABILITIES.TOURS_ITINERARY_READ)
    if (!guard.ok) return guard.response
    const auth = await getServerAuth()
    if (!auth.success) {
      return NextResponse.json({ error: '請先登入' }, { status: 401 })
    }

    const { tourId } = await params

    const supabase = getSupabaseAdminClient()

    const { data, error } = await supabase
      .from('itineraries')
      .select(
        'id, tour_id, title, subtitle, tour_code, daily_itinerary, departure_date, return_date, outbound_flight, return_flight, workspace_id, created_at, updated_at'
      )
      .eq('workspace_id', auth.data.workspaceId)
      .eq('tour_id', tourId)
      .single()

    if (error || !data) {
      return NextResponse.json({ error: '找不到行程表' }, { status: 404 })
    }

    return NextResponse.json(data)
  } catch (error) {
    logger.error('API Error', { path: request.nextUrl.pathname, error })
    return NextResponse.json({ success: false, error: '系統錯誤，請稍後再試' }, { status: 500 })
  }
}
