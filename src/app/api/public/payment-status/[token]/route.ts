/**
 * GET /api/public/payment-status/[token]
 *
 * 付款結果落地頁（/pay/result）輪詢這支、確認永豐刷卡是否入帳。
 *
 * 不信任「客戶有沒有導回」、每次呼叫都用 queryOrder 反查永豐確認真實狀態
 * （邏輯在 confirmSinopacPaymentByToken）。確認成功才把交易標 captured（冪等）。
 *
 * 守門：token 當授權（跟 /pay、generate-payment-link 同概念）、無 capability。
 * rate limit：30 / 分 / IP（配合落地頁每 3 秒輪詢、約撐 90 秒）。
 */

import { NextResponse } from 'next/server'
import { confirmSinopacPaymentByToken } from '@/lib/payment-providers/sinopac/confirm-payment'
import { checkRateLimit } from '@/lib/rate-limit'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const rateLimited = await checkRateLimit(request, 'public-payment-status', 30, 60_000)
  if (rateLimited) return rateLimited

  const { token } = await params
  if (!token || token.length < 10) {
    return NextResponse.json({ error: '無效的連結' }, { status: 400 })
  }

  const result = await confirmSinopacPaymentByToken(token)
  if (result.status === 'not_found') {
    return NextResponse.json({ error: '找不到付款記錄' }, { status: 404 })
  }

  return NextResponse.json({
    success: true,
    data: {
      status: result.status, // captured / pending / failed / expired
      amount: result.amount ?? null,
      external_trans_no: result.externalTransNo ?? null,
    },
  })
}
