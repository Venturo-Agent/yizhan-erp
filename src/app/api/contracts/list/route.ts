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

    // RLS 會自動過濾，只回傳當前租戶的合約
    const { data, error } = await supabase
      .from('contracts')
      .select('id, code, template, signer_name, status, signed_at, member_ids')
      .eq('tour_id', tourId)
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: '查詢失敗' }, { status: 500 })
    }

    return NextResponse.json({ contracts: data })
  } catch {
    return NextResponse.json({ error: '系統錯誤' }, { status: 500 })
  }
}
