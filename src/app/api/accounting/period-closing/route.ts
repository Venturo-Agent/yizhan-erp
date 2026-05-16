import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { z } from 'zod'
import { logger } from '@/lib/utils/logger'
import { requireCapability } from '@/lib/auth/require-capability'
import { CAPABILITIES } from '@/lib/permissions/capabilities'
import { resolveEmployeeIdFromUser } from '@/app/api/lib/resolve-employee'
import { recordApiAuditContext } from '@/lib/audit/audit-helper'
import { translateDbError } from '@/lib/db-error-translate'
import { generateVoucherNo } from '@/lib/codes'

const periodClosingSchema = z.object({
  period_type: z.enum(['month', 'quarter', 'year']),
  period_start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  period_end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
})

interface AccountBalance {
  account_id: string
  account_code: string
  account_name: string
  account_type: 'revenue' | 'expense' | 'cost'
  balance: number
}

// 計算損益科目餘額
async function calculateProfitLossBalances(
  supabase: SupabaseClient,
  workspaceId: string,
  startDate: string,
  endDate: string
): Promise<AccountBalance[]> {
  // 查詢所有損益科目（revenue, expense, cost）
  const { data: accounts, error: accountsError } = await supabase
    .from('chart_of_accounts')
    .select('id, code, name, account_type')
    .eq('workspace_id', workspaceId)
    .in('account_type', ['revenue', 'expense', 'cost'])

  if (accountsError) throw accountsError

  // 計算每個科目的餘額
  const balances: AccountBalance[] = []

  for (const account of accounts) {
    // 查詢該科目在期間內的所有分錄
    const { data: lines, error: linesError } = await supabase
      .from('journal_lines')
      .select(
        `
        debit_amount,
        credit_amount,
        journal_vouchers!inner(voucher_date, status)
      `
      )
      .eq('account_id', account.id)
      .gte('journal_vouchers.voucher_date', startDate)
      .lte('journal_vouchers.voucher_date', endDate)
      .eq('journal_vouchers.status', 'posted')

    if (linesError) throw linesError

    // 計算餘額
    let debitTotal = 0
    let creditTotal = 0

    for (const line of lines) {
      debitTotal += line.debit_amount || 0
      creditTotal += line.credit_amount || 0
    }

    // 損益科目的餘額計算方式：
    // - 收入科目：credit side (貸方餘額 - 借方餘額)
    // - 費用/成本科目：debit side (借方餘額 - 貸方餘額)
    let balance = 0
    if (account.account_type === 'revenue') {
      balance = creditTotal - debitTotal
    } else {
      balance = debitTotal - creditTotal
    }

    // 只記錄有餘額的科目
    if (Math.abs(balance) > 0.01) {
      balances.push({
        account_id: account.id,
        account_code: account.code,
        account_name: account.name,
        account_type: account.account_type,
        balance,
      })
    }
  }

  return balances
}

export async function POST(request: NextRequest) {
  try {
    const guard = await requireCapability(CAPABILITIES.ACCOUNTING_PERIOD_CLOSING_WRITE)
    if (!guard.ok) return guard.response
    const supabase = await createSupabaseServerClient()

    // 驗證 session
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession()

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 取得 workspace_id（從 user metadata 或 RPC）
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

    // 解析當前員工 id（audit 欄位一律用 employee.id 而非 auth uid）
    const employeeId = await resolveEmployeeIdFromUser(supabase, session.user.id)

    await recordApiAuditContext(supabase, {
      actorId: employeeId ?? guard.employeeId,
      reason: '會計期間結轉',
    })

    // 解析 body
    const body = await request.json()
    const validated = periodClosingSchema.parse(body)

    // 檢查是否已結轉
    const { data: existingClosing } = await supabase
      .from('accounting_period_closings')
      .select('id')
      .eq('workspace_id', workspaceId)
      .eq('period_type', validated.period_type)
      .eq('period_start', validated.period_start)
      .eq('period_end', validated.period_end)
      .single()

    if (existingClosing) {
      return NextResponse.json({ error: '此期間已結轉，無法重複結轉' }, { status: 400 })
    }

    // 計算損益科目餘額
    const balances = await calculateProfitLossBalances(
      supabase,
      workspaceId,
      validated.period_start,
      validated.period_end
    )

    // 計算淨利/淨損
    const revenueTotal = balances
      .filter(b => b.account_type === 'revenue')
      .reduce((sum, b) => sum + b.balance, 0)
    const expenseTotal = balances
      .filter(b => b.account_type === 'expense' || b.account_type === 'cost')
      .reduce((sum, b) => sum + b.balance, 0)
    const netIncome = revenueTotal - expenseTotal

    // 查詢「3200 本期損益」科目
    const { data: currentProfitAccount, error: profitAccountError } = await supabase
      .from('chart_of_accounts')
      .select('id')
      .eq('workspace_id', workspaceId)
      .eq('code', '3200')
      .single()

    if (profitAccountError || !currentProfitAccount) {
      return NextResponse.json({ error: '找不到「3200 本期損益」科目' }, { status: 400 })
    }

    // 如果是年結，查詢「3300 保留盈餘」科目
    let retainedEarningsAccount = null
    if (validated.period_type === 'year') {
      const { data, error } = await supabase
        .from('chart_of_accounts')
        .select('id')
        .eq('workspace_id', workspaceId)
        .eq('code', '3300')
        .single()

      if (error || !data) {
        return NextResponse.json({ error: '找不到「3300 保留盈餘」科目' }, { status: 400 })
      }
      retainedEarningsAccount = data
    }

    // 生成結轉傳票
    const voucherNo = await generateVoucherNo(workspaceId, validated.period_end, supabase)

    const { data: voucher, error: voucherError } = await supabase
      .from('journal_vouchers')
      .insert({
        workspace_id: workspaceId,
        voucher_no: voucherNo,
        voucher_date: validated.period_end,
        memo: `${validated.period_type === 'month' ? '月結' : validated.period_type === 'quarter' ? '季結' : '年結'}結轉（${validated.period_start} ~ ${validated.period_end}）`,
        status: 'locked', // 結轉傳票鎖定，無法修改
        total_debit: 0,
        total_credit: 0,
        created_by: employeeId,
      })
      .select()
      .single()

    if (voucherError) throw voucherError

    // 生成分錄
    const lines: Array<Record<string, unknown>> = []
    let lineNo = 1

    // 1. 將損益科目餘額結轉到「本期損益」
    for (const balance of balances) {
      if (balance.account_type === 'revenue') {
        // 收入科目：借: 收入科目，貸: 本期損益
        lines.push({
          voucher_id: voucher.id,
          line_no: lineNo++,
          account_id: balance.account_id,
          description: `結轉${balance.account_name}`,
          debit_amount: balance.balance,
          credit_amount: 0,
        })
        lines.push({
          voucher_id: voucher.id,
          line_no: lineNo++,
          account_id: currentProfitAccount.id,
          description: `結轉${balance.account_name}`,
          debit_amount: 0,
          credit_amount: balance.balance,
        })
      } else {
        // 費用/成本科目：借: 本期損益，貸: 費用/成本科目
        lines.push({
          voucher_id: voucher.id,
          line_no: lineNo++,
          account_id: currentProfitAccount.id,
          description: `結轉${balance.account_name}`,
          debit_amount: balance.balance,
          credit_amount: 0,
        })
        lines.push({
          voucher_id: voucher.id,
          line_no: lineNo++,
          account_id: balance.account_id,
          description: `結轉${balance.account_name}`,
          debit_amount: 0,
          credit_amount: balance.balance,
        })
      }
    }

    // 2. 如果是年結，將「本期損益」結轉到「保留盈餘」
    if (validated.period_type === 'year' && retainedEarningsAccount && Math.abs(netIncome) > 0.01) {
      if (netIncome > 0) {
        // 淨利：借: 本期損益，貸: 保留盈餘
        lines.push({
          voucher_id: voucher.id,
          line_no: lineNo++,
          account_id: currentProfitAccount.id,
          description: '結轉本期損益至保留盈餘',
          debit_amount: netIncome,
          credit_amount: 0,
        })
        lines.push({
          voucher_id: voucher.id,
          line_no: lineNo++,
          account_id: retainedEarningsAccount.id,
          description: '結轉本期損益至保留盈餘',
          debit_amount: 0,
          credit_amount: netIncome,
        })
      } else {
        // 淨損：借: 保留盈餘，貸: 本期損益
        lines.push({
          voucher_id: voucher.id,
          line_no: lineNo++,
          account_id: retainedEarningsAccount.id,
          description: '結轉本期損益至保留盈餘',
          debit_amount: Math.abs(netIncome),
          credit_amount: 0,
        })
        lines.push({
          voucher_id: voucher.id,
          line_no: lineNo++,
          account_id: currentProfitAccount.id,
          description: '結轉本期損益至保留盈餘',
          debit_amount: 0,
          credit_amount: Math.abs(netIncome),
        })
      }
    }

    // 插入分錄
    const { error: linesError } = await supabase.from('journal_lines').insert(lines)

    if (linesError) {
      // 回滾：刪除傳票
      await supabase.from('journal_vouchers').delete().eq('id', voucher.id)
      throw linesError
    }

    // 用 lines 真實合計回填傳票表頭
    const headerDebit = lines.reduce((s, l) => s + Number(l.debit_amount || 0), 0)
    const headerCredit = lines.reduce((s, l) => s + Number(l.credit_amount || 0), 0)

    const { error: headerError } = await supabase
      .from('journal_vouchers')
      .update({
        total_debit: headerDebit,
        total_credit: headerCredit,
      })
      .eq('id', voucher.id)

    if (headerError) {
      await supabase.from('journal_lines').delete().eq('voucher_id', voucher.id)
      await supabase.from('journal_vouchers').delete().eq('id', voucher.id)
      throw headerError
    }

    // 記錄結轉歷史
    const { error: closingError } = await supabase.from('accounting_period_closings').insert({
      workspace_id: workspaceId,
      period_type: validated.period_type,
      period_start: validated.period_start,
      period_end: validated.period_end,
      closing_voucher_id: voucher.id,
      net_income: netIncome,
      closed_by: employeeId,
    })

    if (closingError) {
      // 回滾：刪除傳票和分錄
      await supabase.from('journal_vouchers').delete().eq('id', voucher.id)
      throw closingError
    }

    return NextResponse.json({
      success: true,
      voucher_no: voucherNo,
      net_income: netIncome,
      period_type: validated.period_type,
    })
  } catch (error) {
    logger.error('Period closing error:', error)

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
