/**
 * POST /api/public/invoices/[token]/generate-payment-link
 *
 * 客戶在 /pay/[token] 選了「永豐」相關 provider → 不能走既有「填匯款資訊」流程、
 * 改打這個 endpoint：產生 payment_transaction（含 mock pay link）+ 回傳 redirect URL。
 *
 * Phase 1 mock：redirect 到 /pay/mock/[paymentToken]
 * Phase 2：redirect 到永豐 EPOS iframe 頁
 *
 * 守門：token 對到 batch、selected invoices 必須屬於該 batch、payment_method 的 provider 必須是 sinopac_*
 * rate limit：5 / 分 / IP（跟 /pay 一致）
 */

import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { checkRateLimit } from '@/lib/rate-limit'
import { logger } from '@/lib/utils/logger'
import { isGatewayProvider } from '@/constants/payment-provider'
import { createSinopacCardTransaction, SINOPAC_ERR } from '@/lib/payment-providers/sinopac/create-transaction'

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const schema = z.object({
  selected_invoice_ids: z.array(z.string().uuid()).min(1).max(50),
  payment_method_id: z.string().uuid(),
  customer_email: z.string().email().optional().nullable(),
  customer_name: z.string().max(100).optional().nullable(),
})

export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params

  const rateLimited = await checkRateLimit(request, 'public-invoice-gen-link', 5, 60_000)
  if (rateLimited) return rateLimited

  if (!UUID_REGEX.test(token)) {
    return NextResponse.json({ error: '無效的連結' }, { status: 400 })
  }

  const body = await request.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: '請求格式錯誤', detail: parsed.error.issues },
      { status: 400 }
    )
  }
  const payload = parsed.data

  const supabase = getSupabaseAdminClient()

  // 1. 對 token 找 batch
  const { data: batch, error: batchError } = await supabase
    .from('invoice_batches')
    .select('id, workspace_id, status, token_expires_at')
    .eq('public_token', token)
    .maybeSingle()

  if (batchError || !batch) {
    return NextResponse.json({ error: '連結無效' }, { status: 404 })
  }
  if (batch.status === 'paid' || batch.status === 'cancelled') {
    return NextResponse.json({ error: '此帳單已結清或已取消' }, { status: 409 })
  }
  if (batch.token_expires_at && new Date(batch.token_expires_at) < new Date()) {
    return NextResponse.json({ error: '連結已過期' }, { status: 410 })
  }

  // 2. 驗 payment_method 是 sinopac_* provider + 同 workspace
  const { data: method, error: methodError } = await supabase
    .from('payment_methods')
    .select('id, name, provider, workspace_id, type, is_active')
    .eq('id', payload.payment_method_id)
    .maybeSingle()

  if (methodError || !method) {
    return NextResponse.json({ error: '付款方式不存在' }, { status: 404 })
  }
  if (method.workspace_id !== batch.workspace_id) {
    return NextResponse.json({ error: '付款方式不屬於此公司' }, { status: 403 })
  }
  if (!method.is_active || method.type !== 'receipt') {
    return NextResponse.json({ error: '付款方式不可用' }, { status: 400 })
  }
  if (!isGatewayProvider(method.provider)) {
    return NextResponse.json(
      { error: '此付款方式非永豐金流、請改用既有匯款流程' },
      { status: 400 }
    )
  }

  // 3. 撈 selected invoices、算總金額（server 端、不收 client）
  const { data: invoices, error: invErr } = await supabase
    .from('invoices')
    .select('id, batch_id, total_amount, paid_amount, status')
    .in('id', payload.selected_invoice_ids)

  if (invErr || !invoices || invoices.length !== payload.selected_invoice_ids.length) {
    return NextResponse.json({ error: '帳單清單不正確' }, { status: 400 })
  }

  const wrongBatch = invoices.find(inv => inv.batch_id !== batch.id)
  if (wrongBatch) {
    return NextResponse.json({ error: '帳單不屬於此付款連結' }, { status: 400 })
  }
  const alreadyPaid = invoices.find(inv => inv.status === 'paid')
  if (alreadyPaid) {
    return NextResponse.json({ error: '部分帳單已結清、請重新選擇' }, { status: 409 })
  }

  const totalAmount = invoices.reduce((sum, inv) => {
    const remaining = Number(inv.total_amount) - Number(inv.paid_amount ?? 0)
    return sum + Math.max(0, remaining)
  }, 0)

  if (totalAmount <= 0) {
    return NextResponse.json({ error: '可付金額為 0' }, { status: 400 })
  }

  // 4. 跟永豐開刷卡單 + 建 payment_transaction（走三入口共用函式）
  const expiresAt = new Date(Date.now() + 60 * 60_000).toISOString() // 60 分鐘

  try {
    const result = await createSinopacCardTransaction({
      workspaceId: batch.workspace_id,
      provider: method.provider,
      amount: totalAmount,
      invoiceIds: payload.selected_invoice_ids,
      customerEmail: payload.customer_email ?? null,
      customerName: payload.customer_name ?? null,
      productName: method.name || '旅遊費用',
      expiresAt,
    })

    return NextResponse.json({
      success: true,
      data: {
        redirect_to: result.redirectTo, // 永豐刷卡頁網址
        amount: result.amount,
        token: result.token,
        expires_at: result.expiresAt,
      },
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : ''
    if (msg.startsWith(SINOPAC_ERR.NOT_CONFIGURED)) {
      return NextResponse.json({ error: '此公司尚未設定永豐金流、請聯繫客服' }, { status: 503 })
    }
    if (msg.startsWith(SINOPAC_ERR.ORDER_FAILED) || msg.startsWith(SINOPAC_ERR.NO_PAY_URL)) {
      logger.error('[generate-payment-link] 永豐開單失敗', msg)
      return NextResponse.json({ error: '金流服務暫時無法使用、請稍後再試' }, { status: 502 })
    }
    logger.error('[generate-payment-link] 產生付款連結失敗', e)
    return NextResponse.json({ error: '產生付款連結失敗' }, { status: 500 })
  }
}
