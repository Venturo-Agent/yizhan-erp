import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { logger } from '@/lib/utils/logger'
import { requireCapability } from '@/lib/auth/require-capability'
import { CAPABILITIES } from '@/lib/permissions/capabilities'
import { resolveEmployeeIdFromUser } from '@/app/api/lib/resolve-employee'
import { recordApiAuditContext } from '@/lib/audit/audit-helper'
import { translateDbError } from '@/lib/db-error-translate'
import { generateVoucherNo } from '@/lib/codes'

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const guard = await requireCapability(CAPABILITIES.ACCOUNTING_VOUCHERS_WRITE)
    if (!guard.ok) return guard.response
    const { id: sourceVoucherId } = await context.params
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
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('workspace_id')
        .eq('id', session.user.id)
        .single()
      if (userError || !userData?.workspace_id) {
        return NextResponse.json({ error: 'User workspace not found' }, { status: 400 })
      }
      workspaceId = userData.workspace_id
    }

    const { data: source, error: sourceError } = await supabase
      .from('journal_vouchers')
      .select('id, voucher_no, status, reversed_by_id, workspace_id, memo')
      .eq('id', sourceVoucherId)
      .single()

    if (sourceError || !source) {
      return NextResponse.json({ error: '找不到原傳票' }, { status: 404 })
    }

    if (source.workspace_id !== workspaceId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    if (source.status !== 'posted') {
      return NextResponse.json({ error: '只有已過帳的傳票可以反沖' }, { status: 400 })
    }

    if (source.reversed_by_id) {
      return NextResponse.json({ error: '此傳票已經反沖過' }, { status: 400 })
    }

    const { data: sourceLines, error: linesError } = await supabase
      .from('journal_lines')
      .select('account_id, description, debit_amount, credit_amount')
      .eq('voucher_id', sourceVoucherId)
      .order('line_no')

    if (linesError || !sourceLines || sourceLines.length === 0) {
      return NextResponse.json({ error: '原傳票分錄缺漏' }, { status: 500 })
    }

    const employeeId = await resolveEmployeeIdFromUser(supabase, session.user.id)

    await recordApiAuditContext(supabase, {
      actorId: employeeId ?? guard.employeeId,
      reason: '傳票反沖',
      requestId: sourceVoucherId,
    })

    const today = new Date().toISOString().slice(0, 10)
    const newVoucherNo = await generateVoucherNo(workspaceId, today, supabase)

    const totalDebit = sourceLines.reduce((s, l) => s + Number(l.credit_amount), 0)
    const totalCredit = sourceLines.reduce((s, l) => s + Number(l.debit_amount), 0)

    const { data: newVoucher, error: newVoucherError } = await supabase
      .from('journal_vouchers')
      .insert({
        workspace_id: workspaceId,
        voucher_no: newVoucherNo,
        voucher_date: today,
        memo: `反沖 ${source.voucher_no}${source.memo ? ' — ' + source.memo : ''}`,
        status: 'posted',
        total_debit: totalDebit,
        total_credit: totalCredit,
        created_by: employeeId,
        source_type: 'reversal',
        reversed_from_id: source.id,
      })
      .select()
      .single()

    if (newVoucherError) throw newVoucherError

    const reversedLines = sourceLines.map((line, idx) => ({
      voucher_id: newVoucher.id,
      line_no: idx + 1,
      account_id: line.account_id,
      description: line.description,
      debit_amount: line.credit_amount,
      credit_amount: line.debit_amount,
    }))

    const { error: newLinesError } = await supabase.from('journal_lines').insert(reversedLines)

    if (newLinesError) {
      await supabase.from('journal_vouchers').delete().eq('id', newVoucher.id)
      throw newLinesError
    }

    const { error: updateError } = await supabase
      .from('journal_vouchers')
      .update({
        status: 'reversed',
        reversed_by_id: newVoucher.id,
      })
      .eq('id', source.id)

    if (updateError) {
      await supabase.from('journal_lines').delete().eq('voucher_id', newVoucher.id)
      await supabase.from('journal_vouchers').delete().eq('id', newVoucher.id)
      throw updateError
    }

    return NextResponse.json({
      success: true,
      voucher_no: newVoucherNo,
      voucher_id: newVoucher.id,
      reversed_from: source.voucher_no,
    })
  } catch (error) {
    logger.error('Reverse voucher error:', error)
    const t = translateDbError(error)
    return NextResponse.json(
      { error: t.message, code: t.code, field: t.field },
      { status: t.httpStatus }
    )
  }
}
