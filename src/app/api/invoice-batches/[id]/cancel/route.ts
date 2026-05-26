import { NextResponse } from 'next/server'
import { requireCapability } from '@/lib/auth/require-capability'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { CAPABILITIES } from '@/lib/permissions'
import { recordApiAuditContext } from '@/lib/audit/audit-helper'
import { logger } from '@/lib/utils/logger'
import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * POST /api/invoice-batches/[id]/cancel
 * 作廢帳單批次 —— 標記 status='cancelled'（非真刪、留痕、可查）。
 *
 * 紅線 D（不准作弊後門）：
 *   - 已收款（paid_amount > 0）擋下 → 要先退款才能作廢（避免「收了錢還能把帳單抹掉」）
 *   - 已付清（status='paid'）擋下
 *   - 已作廢（status='cancelled'）擋下
 *
 * 守門：ORDERS_PAYMENTS_WRITE（開帳單 / 收款的權限）。
 * 連帶：作廢 batch + 底下 invoices 一起標 cancelled（trigger 對 cancelled 會保留、不推翻）。
 * anon RLS policy 已排除 cancelled、故作廢後客戶付款連結自動失效。
 */
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params

    const guard = await requireCapability(CAPABILITIES.ORDERS_PAYMENTS_WRITE)
    if (!guard.ok) return guard.response

    const admin = getSupabaseAdminClient()
    await recordApiAuditContext(admin, {
      actorId: guard.employeeId,
      reason: '作廢帳單',
      requestId: id,
    })
    // invoice_batches / invoices 尚未納入生成類型、用 unknown 中轉
    const s = admin as unknown as SupabaseClient

    // 1. 查 batch、驗 workspace + 狀態
    const { data: batch } = await s
      .from('invoice_batches')
      .select('id, workspace_id, status')
      .eq('id', id)
      .maybeSingle()

    if (!batch || batch.workspace_id !== guard.workspaceId) {
      return NextResponse.json({ error: '帳單不存在或無權限' }, { status: 404 })
    }
    if (batch.status === 'cancelled') {
      return NextResponse.json({ error: '此帳單已作廢' }, { status: 400 })
    }
    if (batch.status === 'paid') {
      return NextResponse.json({ error: '已付清的帳單不能作廢' }, { status: 400 })
    }

    // 2. 紅線 D：加總已收款、有收款擋下（要先退款才能作廢）
    const { data: invoices } = await s.from('invoices').select('id, paid_amount').eq('batch_id', id)
    const paidTotal = ((invoices || []) as Array<{ paid_amount: number }>).reduce(
      (sum, i) => sum + Number(i.paid_amount ?? 0),
      0
    )
    if (paidTotal > 0) {
      return NextResponse.json(
        { error: `此帳單已收款 NT$ ${paidTotal.toLocaleString()}、需先退款才能作廢` },
        { status: 409 }
      )
    }

    // 3. 標記作廢（batch + 底下 invoices；非真刪、留痕）
    const { error: batchErr } = await s
      .from('invoice_batches')
      .update({ status: 'cancelled' })
      .eq('id', id)
    if (batchErr) {
      logger.error('[invoice-batches cancel] batch update error:', batchErr)
      return NextResponse.json({ error: '作廢失敗' }, { status: 500 })
    }
    await s.from('invoices').update({ status: 'cancelled' }).eq('batch_id', id)

    return NextResponse.json({ success: true })
  } catch (error) {
    logger.error('[invoice-batches cancel] API Error', { error })
    return NextResponse.json({ error: '系統錯誤，請稍後再試' }, { status: 500 })
  }
}
