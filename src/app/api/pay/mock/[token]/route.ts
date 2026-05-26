/**
 * GET /api/pay/mock/[token]
 *
 * 給 mock 付款頁讀取交易資訊（金額 / provider / 客戶名 / 過期時間 / 狀態）。
 * 公開 endpoint、用 token 當授權。
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params

  if (!token || token.length < 10) {
    return NextResponse.json({ error: 'token 格式錯誤' }, { status: 400 })
  }

  const supabase = getSupabaseAdminClient()
  const { data: tx, error } = await supabase
    .from('payment_transactions')
    .select(
      `
      id,
      provider,
      amount,
      currency,
      customer_email,
      customer_name,
      status,
      payment_link_expires_at,
      external_trans_no,
      external_approve_code,
      provider_info:platform_payment_providers!provider(provider_name, provider_kind),
      workspace:workspaces!workspace_id(name)
    `
    )
    .eq('payment_link_token', token)
    .maybeSingle()

  if (error) {
    return NextResponse.json({ error: '讀取失敗' }, { status: 500 })
  }
  if (!tx) {
    return NextResponse.json({ error: '連結無效' }, { status: 404 })
  }

  return NextResponse.json({ data: tx })
}
