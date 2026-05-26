import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { requireCapability } from '@/lib/auth/require-capability'
import { CAPABILITIES } from '@/lib/permissions/capabilities'
import { resolveEmployeeIdFromUser } from '@/app/api/lib/resolve-employee'
import { z } from 'zod'
import { logger } from '@/lib/utils/logger'
import { recordApiAuditContext } from '@/lib/audit/audit-helper'
import { translateDbError } from '@/lib/db-error-translate'
import { generateVoucherNo, generateDisbursementNo } from '@/lib/codes'

/**
 * 收款退款 API
 *
 * POST /api/accounting/receipts/[id]/refund
 *
 * 流程：
 *   1. 檢查 receipt status='confirmed' AND refunded_at IS NULL（防重複退）
 *   2. 從原 voucher 找借/貸科目（銀行 / 收入）
 *   3. 建反向傳票：借收入 / 貸銀行
 *   4. update receipts: refunded_at, refund_amount, refund_voucher_id, refund_notes, refunded_by
 *   5. 部分退款支援：refund_amount 可 < actual_amount
 *
 * 沒啟用會計時：只 update receipts、不建傳票
 */

const refundSchema = z.object({
  refund_amount: z.number().positive(),
  refund_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  refund_notes: z.string().optional(),
})

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    // capability 守門（CLAUDE.md「API + RLS 雙保險」）
    const guard = await requireCapability(CAPABILITIES.FINANCE_MANAGE_PAYMENTS)
    if (!guard.ok) return guard.response

    const { id: receiptId } = await context.params
    const supabase = await createSupabaseServerClient()

    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession()
    if (sessionError || !session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let workspaceId = session.user.user_metadata?.workspace_id
    if (!workspaceId) {
      const { data: userData } = await supabase
        .from('users')
        .select('workspace_id')
        .eq('id', session.user.id)
        .maybeSingle()
      workspaceId = userData?.workspace_id
    }
    if (!workspaceId) {
      return NextResponse.json({ error: 'workspace_id not found' }, { status: 400 })
    }

    const body = await request.json()
    const validated = refundSchema.parse(body)

    const employeeId = await resolveEmployeeIdFromUser(supabase, session.user.id)

    await recordApiAuditContext(supabase, {
      actorId: employeeId ?? guard.employeeId,
      reason: '收款退款',
      requestId: receiptId,
    })

    // 查收款單
    const { data: receipt, error: recErr } = await supabase
      .from('receipts')
      .select(
        'id, receipt_number, status, actual_amount, receipt_amount, refunded_at, workspace_id, notes, order_id, tour_id'
      )
      .eq('id', receiptId)
      .single()

    if (recErr || !receipt) {
      return NextResponse.json({ error: '找不到收款單' }, { status: 404 })
    }
    if (receipt.workspace_id !== workspaceId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    if (receipt.status !== 'confirmed') {
      return NextResponse.json({ error: '只有已確認的收款才能退款' }, { status: 400 })
    }
    if (receipt.refunded_at) {
      return NextResponse.json({ error: '此收款已退款過' }, { status: 400 })
    }

    const actualAmount = Number(receipt.actual_amount) || Number(receipt.receipt_amount) || 0
    if (validated.refund_amount > actualAmount) {
      return NextResponse.json(
        { error: `退款金額（${validated.refund_amount}）超過實收金額（${actualAmount}）` },
        { status: 400 }
      )
    }

    const refundDate = validated.refund_date || new Date().toISOString().split('T')[0]

    // ── 紅線 D guard：檢查 refundDate 所屬區間是否已關帳 ──
    const periodName = refundDate.substring(0, 7) // "2026-05"
    const { data: period } = await supabase
      .from('accounting_periods')
      .select('id, period_name, is_closed, closed_at')
      .eq('workspace_id', workspaceId)
      .eq('period_name', periodName)
      .maybeSingle()

    if (period && period.is_closed) {
      return NextResponse.json(
        { error: `此區間（${periodName}）已關帳、不能執行退款`, code: 'PERIOD_CLOSED' },
        { status: 409 }
      )
    }
    // ── END 紅線 D guard ───────────────────────────────────────────

    // 檢查 workspace 是否啟用會計
    const { data: feat } = await supabase
      .from('workspace_features')
      .select('enabled')
      .eq('workspace_id', workspaceId)
      .eq('feature_code', 'accounting')
      .maybeSingle()

    let refundVoucherId: string | null = null

    if (feat?.enabled) {
      // 找原收款的傳票（找借方銀行 / 貸方收入科目）
      const { data: sourceVoucher } = await supabase
        .from('journal_vouchers')
        .select('id, voucher_no')
        .eq('workspace_id', workspaceId)
        .eq('source_type', 'receipt')
        .eq('source_id', receiptId)
        .maybeSingle()

      if (sourceVoucher) {
        // 從原 voucher lines 反推借貸科目
        const { data: sourceLines } = await supabase
          .from('journal_lines')
          .select('account_id, debit_amount, credit_amount')
          .eq('voucher_id', sourceVoucher.id)
          .order('line_no')

        if (sourceLines && sourceLines.length >= 2) {
          // 找借方（銀行）跟貸方（收入）科目
          const debitLine = sourceLines.find(l => Number(l.debit_amount) > 0)
          const creditLine = sourceLines.find(l => Number(l.credit_amount) > 0)

          if (debitLine && creditLine) {
            // 產生反向傳票（借收入 / 貸銀行）
            const voucherNo = await generateVoucherNo(workspaceId, refundDate, supabase)

            const { data: newVoucher, error: vErr } = await supabase
              .from('journal_vouchers')
              .insert({
                workspace_id: workspaceId,
                voucher_no: voucherNo,
                voucher_date: refundDate,
                memo: `退款 ${receipt.receipt_number}${validated.refund_notes ? ' - ' + validated.refund_notes : ''}`,
                status: 'posted',
                total_debit: validated.refund_amount,
                total_credit: validated.refund_amount,
                source_type: 'receipt_refund',
                source_id: receiptId,
                reversed_from_id: sourceVoucher.id,
                created_by: employeeId,
              })
              .select()
              .single()

            if (vErr) throw vErr

            const { error: lErr } = await supabase.from('journal_lines').insert([
              {
                voucher_id: newVoucher.id,
                line_no: 1,
                account_id: creditLine.account_id, // 借原貸方（收入）
                description: `退款 ${receipt.receipt_number}`,
                debit_amount: validated.refund_amount,
                credit_amount: 0,
              },
              {
                voucher_id: newVoucher.id,
                line_no: 2,
                account_id: debitLine.account_id, // 貸原借方（銀行）
                description: `退款 ${receipt.receipt_number}`,
                debit_amount: 0,
                credit_amount: validated.refund_amount,
              },
            ])

            if (lErr) {
              await supabase.from('journal_vouchers').delete().eq('id', newVoucher.id)
              throw lErr
            }

            refundVoucherId = newVoucher.id
          }
        }
      }
      // 啟用會計但找不到原傳票（confirm 時沒接會計、之後才啟用）→ 只 update receipts、不產傳票
    }

    // 建立對應的出納單（type='refund'、銀行對帳補上這筆出帳）
    let disbursementId: string | null = null
    try {
      // 透過中央 codes module 生成出納單編號（RPC + advisory lock）
      let dispNo: string | null = null
      try {
        dispNo = await generateDisbursementNo(workspaceId, refundDate, supabase)
      } catch (genErr) {
        logger.error('產生退款出納單編號失敗（不阻擋退款流程）:', genErr)
      }
      if (dispNo) {
        const { data: disp, error: dispErr } = await supabase
          .from('disbursement_orders')
          .insert({
            workspace_id: workspaceId,
            code: dispNo,
            order_number: dispNo,
            amount: validated.refund_amount,
            status: 'paid',
            disbursement_date: refundDate,
            disbursement_type: 'refund',
            refund_id: receiptId,
            accounting_voucher_id: refundVoucherId,
            confirmed_by: employeeId,
            confirmed_at: new Date().toISOString(),
            created_by: employeeId,
            notes: `退款 ${receipt.receipt_number}${validated.refund_notes ? ' - ' + validated.refund_notes : ''}`,
          })
          .select()
          .single()
        if (!dispErr) disbursementId = disp?.id ?? null
      }
    } catch (err) {
      logger.error('建立退款出納單失敗（不阻擋退款流程）:', err)
    }

    // update receipts
    const { error: updErr } = await supabase
      .from('receipts')
      .update({
        refunded_at: new Date().toISOString(),
        refund_amount: validated.refund_amount,
        refund_voucher_id: refundVoucherId,
        refund_notes: validated.refund_notes || null,
        refunded_by: employeeId,
        status: 'refunded',
      })
      .eq('id', receiptId)

    if (updErr) throw updErr

    // 重算訂單 paid_amount + 團 total_revenue（refund 邏輯：refunded 狀態用 actual−refund_amount 算淨額）
    // 這裡務必傳 server-side supabase client、否則用瀏覽器單例會拿不到 session、RLS 擋下、財務數字默默不更新
    const { recalculateReceiptStats } =
      await import('@/app/(main)/finance/payments/_services/receipt-core.service')
    await recalculateReceiptStats(receipt.order_id, receipt.tour_id, supabase)

    return NextResponse.json({
      success: true,
      receipt_id: receiptId,
      refund_amount: validated.refund_amount,
      refund_voucher_id: refundVoucherId,
      disbursement_id: disbursementId,
    })
  } catch (error) {
    logger.error('Refund receipt error:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      )
    }

    const t = translateDbError(error)
    return NextResponse.json(
      { error: t.message, code: t.code, field: t.field },
      { status: t.httpStatus }
    )
  }
}
