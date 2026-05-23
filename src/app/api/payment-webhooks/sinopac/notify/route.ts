/**
 * POST /api/payment-webhooks/sinopac/notify
 *
 * 永豐豐收款後台入帳通知（BackendURL）。客戶刷卡成功後永豐 server 主動 POST 這裡。
 *
 * 安全模型：不信任 POST body 內容（可能被偽造）、只從 body 取 OrderNo、
 *   再用 queryOrder 反查永豐確認真實狀態（邏輯在 confirmSinopacPaymentByOrderNo）。
 *   確認成功才把交易標 captured（冪等、跟落地頁反查共用同一份邏輯）。
 *
 * 落地頁主動反查才是「入帳到畫面」的主路徑；本 webhook 是「客戶沒導回也能入帳」的保險。
 *
 * 守門：永豐沒有 user session、走 admin client（confirm 函式內 per-request 新建、紅線 C）。
 *
 * ⚠️ 永豐通知 body 格式 SampleCode 沒附、第一次測試靠 log raw 對齊 OrderNo 欄位。
 *    不建 receipt（William 2026-05-23 拍板暫不做）。
 */

import { NextResponse } from 'next/server'
import { confirmSinopacPaymentByOrderNo } from '@/lib/payment-providers/sinopac/confirm-payment'
import { logger } from '@/lib/utils/logger'

export async function POST(request: Request) {
  // 1. 讀 raw body（格式未知、先全收 + log 對齊）
  const raw = await request.text()
  const contentType = request.headers.get('content-type') || ''
  logger.info('[sinopac webhook] 收到永豐通知', { contentType, raw })

  // 2. 嘗試解析拿 OrderNo（JSON / form-urlencoded 都試）
  let orderNo: string | null = null
  try {
    if (contentType.includes('application/json')) {
      const j = JSON.parse(raw) as Record<string, unknown>
      orderNo = (j.OrderNo as string) || (j.orderNo as string) || null
    } else {
      const p = new URLSearchParams(raw)
      orderNo = p.get('OrderNo') || p.get('orderNo')
    }
  } catch (e) {
    logger.warn('[sinopac webhook] body 解析失敗', { err: e })
  }

  if (!orderNo) {
    // 拿不到 OrderNo：log 待對齊、仍回 S 避免永豐重送風暴（落地頁反查是入帳主路徑）
    logger.warn('[sinopac webhook] 通知未含可辨識 OrderNo、待對齊格式', { raw })
    return NextResponse.json({ Status: 'S' })
  }

  // 3. 反查永豐確認 + 入帳（冪等、跟落地頁共用 confirm 邏輯）
  const result = await confirmSinopacPaymentByOrderNo(orderNo)
  logger.info('[sinopac webhook] 確認結果', { orderNo, status: result.status })

  // 永豐要求回 {"Status":"S"} 表示我方已正確接收通知
  return NextResponse.json({ Status: 'S' })
}
