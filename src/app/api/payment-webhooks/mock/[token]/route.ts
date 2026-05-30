/**
 * POST /api/payment-webhooks/mock/[token]
 *
 * Phase 1 mock：模擬永豐 webhook 回傳「付款成功」。
 * 客戶在 /pay/mock/[token] 假頁面按下「付款」→ 客戶端 fetch 這個 endpoint。
 *
 * 不守 capability：用 token 當作授權（跟 /pay/[token] 同概念、token 是隨機 22 字元）。
 *
 * Phase 2：替換成永豐真實 webhook、走 `/api/payment-webhooks/sinopac/[type]`
 *   - epos：刷卡通知（rtnCode / TransNo / ApproveCode）
 *   - collect：豐收款入帳通知
 *
 * 動作：
 *   1. 找 payment_transaction by token
 *   2. status pending → captured
 *   3. 若有 receipt_id、receipts.status → confirmed、confirmed_at 自動填
 *   4. 寫 raw_webhook_payload（mock 紀錄）
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { dbErrorResponse } from '@/lib/db-error-translate'
import { logger } from '@/lib/utils/logger'
import { notifyPaymentCapturedToConversation } from '@/lib/ai/notify-payment-captured'

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params

  if (!token || token.length < 10) {
    return NextResponse.json({ error: 'token 格式錯誤' }, { status: 400 })
  }

  const supabase = getSupabaseAdminClient()

  // 1. 找 transaction
  const { data: tx, error: txError } = await supabase
    .from('payment_transactions')
    .select(
      'id, status, receipt_id, payment_link_expires_at, amount, workspace_id, provider, raw_webhook_payload'
    )
    .eq('payment_link_token', token)
    .maybeSingle()

  if (txError) {
    return dbErrorResponse(txError)
  }
  if (!tx) {
    return NextResponse.json({ error: '連結無效或已過期' }, { status: 404 })
  }

  // 過期檢查
  if (tx.payment_link_expires_at && new Date(tx.payment_link_expires_at) < new Date()) {
    await supabase.from('payment_transactions').update({ status: 'expired' }).eq('id', tx.id)
    return NextResponse.json({ error: '連結已過期、請重新建立' }, { status: 410 })
  }

  // 已成功的單 idempotent
  if (tx.status === 'captured') {
    return NextResponse.json({ success: true, data: { status: 'captured', already_paid: true } })
  }

  if (tx.status !== 'pending' && tx.status !== 'authorized') {
    return NextResponse.json({ error: `此交易狀態為 ${tx.status}、無法重複付款` }, { status: 409 })
  }

  // 2. 更新 transaction status → captured
  const mockTransNo = `MOCK-${Date.now()}-${Math.floor(Math.random() * 10000)
    .toString()
    .padStart(4, '0')}`
  const mockApproveCode = Math.floor(Math.random() * 1000000)
    .toString()
    .padStart(6, '0')

  const { error: updateTxError } = await supabase
    .from('payment_transactions')
    .update({
      status: 'captured',
      external_trans_no: mockTransNo,
      external_approve_code: mockApproveCode,
      raw_webhook_payload: {
        mock: true,
        mock_simulated_at: new Date().toISOString(),
        provider: tx.provider,
        amount: tx.amount,
      },
    })
    .eq('id', tx.id)

  if (updateTxError) {
    return dbErrorResponse(updateTxError)
  }

  // 3. 同步更新 receipt（若有）
  if (tx.receipt_id) {
    const { error: receiptError } = await supabase
      .from('receipts')
      .update({
        status: 'confirmed',
        confirmed_at: new Date().toISOString(),
        actual_amount: tx.amount,
      })
      .eq('id', tx.receipt_id)
      .eq('workspace_id', tx.workspace_id)

    if (receiptError) {
      // 不擋付款流程、log 出去
      logger.error('[mock-webhook] receipt update failed', { receiptError })
    }
  }

  // 4. 若這筆 transaction 是 AI tool 從對話產出的、推一則「付款成功」訊息進對話
  //    讓 AI 下次接到客戶訊息時、有 context 知道「客戶剛剛付過了」
  //    Phase 2 真實 webhook 也走同樣邏輯（共用 helper）
  await notifyPaymentCapturedToConversation({
    workspaceId: tx.workspace_id,
    amount: Number(tx.amount),
    rawWebhookPayload: tx.raw_webhook_payload as Record<string, unknown> | null,
    externalTransNo: mockTransNo,
  })

  return NextResponse.json({
    success: true,
    data: {
      status: 'captured',
      mock: true,
      external_trans_no: mockTransNo,
      external_approve_code: mockApproveCode,
    },
  })
}
