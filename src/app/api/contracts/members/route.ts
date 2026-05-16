import { NextRequest, NextResponse } from 'next/server'
import { createApiClient } from '@/lib/supabase/api-client'
import { requireCapability } from '@/lib/auth/require-capability'
import { CAPABILITIES } from '@/lib/permissions/capabilities'

export async function GET(request: NextRequest) {
  try {
    const guard = await requireCapability(CAPABILITIES.TOURS_CONTRACT_READ)
    if (!guard.ok) return guard.response
    const supabase = await createApiClient()
    const { searchParams } = new URL(request.url)
    const tourId = searchParams.get('tourId')

    if (!tourId) {
      return NextResponse.json({ error: '缺少 tourId' }, { status: 400 })
    }

    // 查詢訂單和團員（RLS 自動過濾）
    // A1（5/13 拍板）：砍 orders.code、order_number 為 SSOT
    const { data: orders, error } = await supabase
      .from('orders')
      .select(
        `
        id,
        order_number,
        contact_person,
        contact_phone,
        order_members (
          id,
          chinese_name,
          id_number
        )
      `
      )
      .eq('tour_id', tourId)
      .order('order_number')

    if (error) {
      return NextResponse.json({ error: '查詢失敗' }, { status: 500 })
    }

    return NextResponse.json({ orders })
  } catch {
    return NextResponse.json({ error: '系統錯誤' }, { status: 500 })
  }
}
