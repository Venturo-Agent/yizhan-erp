/**
 * POST /api/public/invoices/[token]/pay
 * 客戶批次代付：勾選 N 個 invoice、一次付完
 * (2026-05-15 William 拍板、從一張 invoice 一筆 receipt 改成多 invoice 一筆 receipt + allocations)
 *
 * 設計:
 * - admin client per-request(紅線 C)、service_role bypass RLS
 * - token 對到 batch、所選 invoice 必須屬於該 batch
 * - 金額 server 自己加總 invoice.remaining、不收 client 金額(避免被竄改)
 * - 不准付已 paid 的 invoice
 * - 客戶選 payment_method_id、server 驗 workspace 對齊、寫入 receipt
 * - INSERT 1 筆 receipt + N 筆 allocations(每員分配 = 該 invoice.remaining)
 * - status='pending_verify'、會計確認才轉 confirmed
 * - rate limit 5 / min / IP
 * - receipt_number 走 generateReceiptNo(tour_id) RPC、advisory lock 防競態
 *
 * 完整 spec: Logan-Workspace/2026-05-14-帳單系統-客戶自助付款-CRM-spec.md
 */

import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { checkRateLimit } from '@/lib/rate-limit'
import { generateReceiptNo } from '@/lib/codes'
import { logger } from '@/lib/utils/logger'
import type { SupabaseClient } from '@supabase/supabase-js'

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const paySchema = z.object({
  selected_invoice_ids: z.array(z.string().uuid()).min(1).max(50),
  payment_method_id: z.string().uuid(),
  // 識別碼：匯款後五碼 / 信用卡末四碼 / etc、4-20 碼數字
  identifier: z.string().regex(/^\d{4,20}$/),
  payment_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  notes: z.string().max(500).optional().nullable(),
  // 實際轉帳金額（選填、不填 = 全額）、正整數、不可超過勾選總額
  amount: z.number().int().positive().optional(),
})

export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params

  const rateLimited = await checkRateLimit(request, 'public-invoice-pay', 5, 60_000)
  if (rateLimited) return rateLimited

  if (!UUID_REGEX.test(token)) {
    return NextResponse.json({ error: '無效的連結' }, { status: 400 })
  }

  const json = await request.json()
  const parsed = paySchema.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json(
      { error: '請求格式錯誤', detail: parsed.error.issues },
      { status: 400 }
    )
  }

  const {
    selected_invoice_ids,
    payment_method_id,
    identifier,
    payment_date,
    notes,
    amount: requestedAmount,
  } = parsed.data

  // 匯款日不能未來
  const today = new Date()
  today.setHours(23, 59, 59, 999)
  if (new Date(payment_date) > today) {
    return NextResponse.json({ error: '匯款日期不能在未來' }, { status: 400 })
  }

  // invoice_batches / invoices / receipts 新欄位尚未納入生成類型，用 unknown 中轉
  const s = getSupabaseAdminClient() as unknown as SupabaseClient

  // 查 batch
  const { data: batch } = await s
    .from('invoice_batches')
    .select('id, workspace_id, order_id, status, token_expires_at')
    .eq('public_token', token)
    .maybeSingle()

  if (!batch) {
    return NextResponse.json({ error: '帳單不存在' }, { status: 404 })
  }
  if (batch.status === 'cancelled') {
    return NextResponse.json({ error: '此帳單已取消' }, { status: 410 })
  }
  if (batch.status === 'paid') {
    return NextResponse.json({ error: '此帳單已付清' }, { status: 400 })
  }
  if (new Date(batch.token_expires_at) < new Date()) {
    return NextResponse.json({ error: '連結已過期' }, { status: 410 })
  }

  // 驗 payment_method：必須是同 workspace + type=receipt
  const { data: paymentMethod } = await s
    .from('payment_methods')
    .select('id, name, code, workspace_id, type, is_active')
    .eq('id', payment_method_id)
    .maybeSingle()

  if (
    !paymentMethod ||
    paymentMethod.workspace_id !== batch.workspace_id ||
    paymentMethod.type !== 'receipt' ||
    !paymentMethod.is_active
  ) {
    return NextResponse.json({ error: '收款方式無效' }, { status: 400 })
  }

  // 撈所選 invoices、驗都屬於該 batch、且還沒付清
  const { data: invoices, error: invErr } = await s
    .from('invoices')
    .select('id, batch_id, customer_id, total_amount, paid_amount, status')
    .in('id', selected_invoice_ids)

  if (invErr) {
    logger.error('[public/invoices pay] invoices query error:', invErr)
    return NextResponse.json({ error: '查詢失敗' }, { status: 500 })
  }

  const invoicesArr = invoices as Array<{
    id: string
    batch_id: string | null
    customer_id: string
    total_amount: number
    paid_amount: number
    status: string
  }>

  if (invoicesArr.length !== selected_invoice_ids.length) {
    return NextResponse.json({ error: '所選帳單不存在' }, { status: 400 })
  }

  for (const inv of invoicesArr) {
    if (inv.batch_id !== batch.id) {
      return NextResponse.json({ error: '所選帳單不屬於此批次' }, { status: 400 })
    }
    if (inv.status === 'paid') {
      return NextResponse.json({ error: '所選帳單包含已付清項目' }, { status: 400 })
    }
    if (inv.status === 'cancelled') {
      return NextResponse.json({ error: '所選帳單包含已取消項目' }, { status: 400 })
    }
  }

  // 各 invoice 的剩餘金額
  const remainings = invoicesArr.map(inv => ({
    invoice_id: inv.id,
    customer_id: inv.customer_id,
    remaining: Number(inv.total_amount) - Number(inv.paid_amount),
  }))
  const serverTotal = remainings.reduce((sum, r) => sum + r.remaining, 0)

  if (serverTotal <= 0) {
    return NextResponse.json({ error: '所選帳單未收金額為 0' }, { status: 400 })
  }

  // 客戶可填部分金額（分多次轉帳）、不填則預設全額
  const payAmount = requestedAmount ?? serverTotal
  if (payAmount > serverTotal) {
    return NextResponse.json({ error: `金額不可超過應付總額 ${serverTotal}` }, { status: 400 })
  }

  // 平均分配：base 每人相同、最後一人拿餘數
  // 每筆上限 cap 在該 invoice.remaining（防超付）
  const count = remainings.length
  const base = Math.floor(payAmount / count)
  const allocations = remainings.map((r, i) => {
    const isLast = i === count - 1
    const raw = isLast ? payAmount - base * (count - 1) : base
    return {
      invoice_id: r.invoice_id,
      customer_id: r.customer_id,
      amount: Math.min(raw, r.remaining),
    }
  })
  const totalAmount = allocations.reduce((sum, a) => sum + a.amount, 0)

  // 撈 order.tour_id + tour.name(receipt 冗餘存)
  const { data: order } = await s
    .from('orders')
    .select('id, tour_id')
    .eq('id', batch.order_id)
    .maybeSingle()

  if (!order?.tour_id) {
    return NextResponse.json({ error: '訂單缺團資訊、無法建立收款' }, { status: 500 })
  }

  const { data: tour } = await s
    .from('tours')
    .select('id, name')
    .eq('id', order.tour_id)
    .maybeSingle()

  // 產收款編號
  let receiptNumber: string
  try {
    receiptNumber = await generateReceiptNo(order.tour_id, s)
  } catch (err) {
    logger.error('[public/invoices pay] generateReceiptNo failed:', err)
    return NextResponse.json({ error: '產生收款編號失敗' }, { status: 500 })
  }

  // receipt.customer_id：合付場景多人、取第一個 invoice 的 customer_id 當主、
  // 真實分配在 allocations 表
  const primaryCustomerId = invoicesArr[0].customer_id

  // Step 1: INSERT receipt
  const { data: receipt, error: insertErr } = await s
    .from('receipts')
    .insert({
      workspace_id: batch.workspace_id,
      receipt_number: receiptNumber,
      order_id: batch.order_id,
      tour_id: order.tour_id,
      tour_name: tour?.name || null,
      customer_id: primaryCustomerId,
      // 5/14 1:1 用 invoice_id、新 N:N 用 batch_id + allocations
      invoice_id: null,
      batch_id: batch.id,
      receipt_type: 1, // 1 = 團體收款
      receipt_amount: totalAmount,
      actual_amount: 0,
      payment_method: paymentMethod.name,
      payment_method_id: paymentMethod.id,
      payment_date,
      receipt_date: payment_date,
      bank_account_last5: identifier,
      notes: notes || null,
      status: 'pending_verify',
      created_by: null,
      updated_by: null,
    })
    .select('id, receipt_amount, status, payment_date, notes, created_at')
    .single()

  if (insertErr) {
    logger.error('[public/invoices pay] receipt insert error:', insertErr)
    return NextResponse.json(
      {
        error: insertErr.message || '建立付款記錄失敗',
        code: insertErr.code,
        details: insertErr.details,
        hint: insertErr.hint,
      },
      { status: 500 }
    )
  }

  // Step 2: INSERT N 筆 allocations
  const allocRows = allocations.map(a => ({
    receipt_id: receipt.id,
    invoice_id: a.invoice_id,
    allocated_amount: a.amount,
    workspace_id: batch.workspace_id,
  }))

  const { error: allocErr } = await s.from('receipt_invoice_allocations').insert(allocRows)

  if (allocErr) {
    logger.error('[public/invoices pay] allocations insert error:', allocErr)
    // 補救：刪掉 receipt 避免孤兒
    await s.from('receipts').delete().eq('id', receipt.id)
    return NextResponse.json(
      {
        error: allocErr.message || '建立分配記錄失敗',
        code: allocErr.code,
        details: allocErr.details,
        hint: allocErr.hint,
      },
      { status: 500 }
    )
  }

  return NextResponse.json(
    {
      receipt,
      allocations: allocRows.map(a => ({
        invoice_id: a.invoice_id,
        allocated_amount: a.allocated_amount,
      })),
    },
    { status: 201 }
  )
}
