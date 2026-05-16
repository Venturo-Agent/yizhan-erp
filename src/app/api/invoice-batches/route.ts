import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { getServerAuth } from '@/lib/auth/server-auth'
import { logger } from '@/lib/utils/logger'
import { apiHandler } from '@/lib/api/api-handler'
import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * GET /api/invoice-batches?order_id=xxx
 * 列該 order 的所有帳單批次 + 各員付款狀態
 * (2026-05-15、業務員端歷史帳單區用)
 *
 * 守門：
 *   - 必須登入
 *   - order 必須屬於 caller workspace
 */

export const GET = apiHandler(async (request: NextRequest) => {
  const auth = await getServerAuth()
  if (!auth.success) {
    return NextResponse.json({ error: '請先登入' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const orderId = searchParams.get('order_id')
  if (!orderId) {
    return NextResponse.json({ error: '缺 order_id' }, { status: 400 })
  }

  // invoice_batches / invoices 尚未納入生成類型，用 unknown 中轉
  const s = getSupabaseAdminClient() as unknown as SupabaseClient
  const workspaceId = auth.data.workspaceId

  // 驗 order 屬於 caller workspace
  const { data: order } = await s
    .from('orders')
    .select('id, workspace_id')
    .eq('id', orderId)
    .maybeSingle()

  if (!order || order.workspace_id !== workspaceId) {
    return NextResponse.json({ error: '訂單不存在或無權限' }, { status: 404 })
  }

  // 撈該 order 的 batches
  const { data: batches, error: batchErr } = await s
    .from('invoice_batches')
    .select(
      `id, public_token, token_expires_at, status, notes, created_at`
    )
    .eq('order_id', orderId)
    .order('created_at', { ascending: false })

  if (batchErr) {
    logger.error('[/api/invoice-batches GET] batch query error:', batchErr)
    return NextResponse.json({ error: '查詢失敗' }, { status: 500 })
  }

  const batchesArr = (batches || []) as Array<{
    id: string
    public_token: string
    token_expires_at: string
    status: string
    notes: string | null
    created_at: string
  }>

  if (batchesArr.length === 0) {
    return NextResponse.json({ batches: [] })
  }

  // 撈這些 batch 的 invoices(同 workspace、會 RLS 過)
  const batchIds = batchesArr.map(b => b.id)
  const { data: invoices } = await s
    .from('invoices')
    .select(
      `id, batch_id, customer_id, member_id, total_amount, paid_amount, status`
    )
    .in('batch_id', batchIds)

  const invoicesArr = (invoices || []) as Array<{
    id: string
    batch_id: string
    customer_id: string
    member_id: string | null
    total_amount: number
    paid_amount: number
    status: string
  }>

  // 撈 customers / members name(平行)
  const customerIds = [...new Set(invoicesArr.map(i => i.customer_id))]
  const memberIds = invoicesArr.map(i => i.member_id).filter((x): x is string => !!x)

  const [customersResult, membersResult] = await Promise.all([
    customerIds.length
      ? s.from('customers').select('id, chinese_name, passport_name').in('id', customerIds)
      : Promise.resolve({ data: [] }),
    memberIds.length
      ? s.from('order_members').select('id, chinese_name, passport_name').in('id', memberIds)
      : Promise.resolve({ data: [] }),
  ])

  const customerMap = new Map(
    (customersResult.data || []).map(
      (c: { id: string; chinese_name: string | null; passport_name: string | null }) => [
        c.id,
        c.chinese_name || c.passport_name || '客戶',
      ]
    )
  )
  const memberMap = new Map(
    (membersResult.data || []).map(
      (m: { id: string; chinese_name: string | null; passport_name: string | null }) => [
        m.id,
        m.chinese_name || m.passport_name || null,
      ]
    )
  )

  // group invoices by batch_id
  const invoicesByBatch = new Map<string, typeof invoicesArr>()
  for (const inv of invoicesArr) {
    if (!invoicesByBatch.has(inv.batch_id)) invoicesByBatch.set(inv.batch_id, [])
    invoicesByBatch.get(inv.batch_id)!.push(inv)
  }

  const result = batchesArr.map(b => {
    const items = invoicesByBatch.get(b.id) || []
    const totalAmount = items.reduce((s, i) => s + Number(i.total_amount), 0)
    const paidAmount = items.reduce((s, i) => s + Number(i.paid_amount), 0)
    return {
      id: b.id,
      public_token: b.public_token,
      token_expires_at: b.token_expires_at,
      status: b.status,
      notes: b.notes,
      created_at: b.created_at,
      total_amount: totalAmount,
      paid_amount: paidAmount,
      member_count: items.length,
      invoices: items.map(i => ({
        id: i.id,
        member_name:
          (i.member_id && memberMap.get(i.member_id)) ||
          customerMap.get(i.customer_id) ||
          '(未命名)',
        total_amount: Number(i.total_amount),
        paid_amount: Number(i.paid_amount),
        status: i.status,
      })),
    }
  })

  return NextResponse.json({ batches: result })
})
