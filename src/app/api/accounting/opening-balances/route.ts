import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { z } from 'zod'
import { logger } from '@/lib/utils/logger'
import { requireCapability } from '@/lib/auth/require-capability'
import { CAPABILITIES } from '@/lib/permissions/capabilities'
import { resolveEmployeeIdFromUser } from '@/app/api/lib/resolve-employee'
import { recordApiAuditContext } from '@/lib/audit/audit-helper'
import { dbErrorResponse } from '@/lib/db-error-translate'
import { generateVoucherNo } from '@/lib/codes'

/**
 * 期初餘額 API
 *
 * 設計：每個 workspace 一張 source_type='opening_balance' 的傳票
 * 借方 = 資產類科目期初餘額
 * 貸方 = 負債 + 權益類科目期初餘額
 * 借貸必須平衡
 *
 * GET: 讀取現有期初設定（含科目清單 + 已輸入餘額）
 * POST: 建立 / 更新期初餘額（先刪舊、再建新、atomic compensating）
 */

const balanceItemSchema = z.object({
  account_id: z.string().uuid(),
  amount: z.number().min(0),
})

const upsertOpeningBalanceSchema = z.object({
  as_of_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  items: z.array(balanceItemSchema),
})

async function resolveWorkspace(
  supabase: SupabaseClient,
  userId: string,
  metadata: Record<string, unknown> | undefined
): Promise<string | null> {
  const wsFromMeta = metadata?.workspace_id as string | undefined
  if (wsFromMeta) return wsFromMeta
  const { data } = await supabase
    .from('users')
    .select('workspace_id')
    .eq('id', userId)
    .maybeSingle()
  return (data?.workspace_id as string) || null
}

export async function GET() {
  try {
    const guard = await requireCapability(CAPABILITIES.ACCOUNTING_OPENING_BALANCES_READ)
    if (!guard.ok) return guard.response
    const supabase = await createSupabaseServerClient()
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession()
    if (sessionError || !session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const workspaceId = await resolveWorkspace(
      supabase,
      session.user.id,
      session.user.user_metadata
    )
    if (!workspaceId) {
      return NextResponse.json({ error: 'workspace_id not found' }, { status: 400 })
    }

    // 查所有 asset / liability / equity 科目
    const { data: accounts, error: accErr } = await supabase
      .from('chart_of_accounts')
      .select('id, code, name, account_type')
      .eq('workspace_id', workspaceId)
      .eq('is_active', true)
      .in('account_type', ['asset', 'liability', 'equity'])
      .order('code', { ascending: true })

    if (accErr) throw accErr

    // 查既有期初開帳傳票
    const { data: existingVoucher } = await supabase
      .from('journal_vouchers')
      .select('id, voucher_no, voucher_date, status')
      .eq('workspace_id', workspaceId)
      .eq('source_type', 'opening_balance')
      .maybeSingle()

    let existingLines: Array<{ account_id: string; debit_amount: number; credit_amount: number }> =
      []
    if (existingVoucher) {
      const { data: lines } = await supabase
        .from('journal_lines')
        .select('account_id, debit_amount, credit_amount')
        .eq('voucher_id', existingVoucher.id)
      existingLines = (lines as typeof existingLines) || []
    }

    // 推算每個科目的期初餘額（資產取借方、負債/權益取貸方）
    const balanceMap = new Map<string, number>()
    for (const line of existingLines) {
      const debit = Number(line.debit_amount) || 0
      const credit = Number(line.credit_amount) || 0
      const account = accounts?.find(a => a.id === line.account_id)
      if (!account) continue
      const amount = account.account_type === 'asset' ? debit : credit
      balanceMap.set(line.account_id, (balanceMap.get(line.account_id) || 0) + amount)
    }

    return NextResponse.json({
      voucher: existingVoucher || null,
      accounts: (accounts || []).map(a => ({
        ...a,
        balance: balanceMap.get(a.id) || 0,
      })),
    })
  } catch (error) {
    logger.error('GET opening balances error:', error)
    return dbErrorResponse(error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const guard = await requireCapability(CAPABILITIES.ACCOUNTING_OPENING_BALANCES_WRITE)
    if (!guard.ok) return guard.response
    const supabase = await createSupabaseServerClient()
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession()
    if (sessionError || !session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const workspaceId = await resolveWorkspace(
      supabase,
      session.user.id,
      session.user.user_metadata
    )
    if (!workspaceId) {
      return NextResponse.json({ error: 'workspace_id not found' }, { status: 400 })
    }

    const body = await request.json()
    const validated = upsertOpeningBalanceSchema.parse(body)

    // 過濾掉金額為 0 的項目
    const nonZeroItems = validated.items.filter(item => item.amount > 0)
    if (nonZeroItems.length === 0) {
      return NextResponse.json({ error: '至少要有一筆非零的期初餘額' }, { status: 400 })
    }

    // 查科目類型
    const accountIds = nonZeroItems.map(i => i.account_id)
    const { data: accounts, error: accErr } = await supabase
      .from('chart_of_accounts')
      .select('id, code, name, account_type')
      .eq('workspace_id', workspaceId)
      .in('id', accountIds)

    if (accErr || !accounts) throw accErr ?? new Error('讀取科目失敗')

    if (accounts.length !== accountIds.length) {
      return NextResponse.json({ error: '部分科目不存在或不屬於此 workspace' }, { status: 400 })
    }

    const accountMap = new Map(accounts.map(a => [a.id, a]))

    // 借方總額 = 資產類；貸方總額 = 負債 + 權益類
    let debitTotal = 0
    let creditTotal = 0
    for (const item of nonZeroItems) {
      const acc = accountMap.get(item.account_id)
      if (!acc) continue
      if (acc.account_type === 'asset') {
        debitTotal += item.amount
      } else if (acc.account_type === 'liability' || acc.account_type === 'equity') {
        creditTotal += item.amount
      } else {
        return NextResponse.json(
          {
            error: `科目「${acc.code} ${acc.name}」非資產 / 負債 / 權益類、不能設期初餘額`,
          },
          { status: 400 }
        )
      }
    }

    if (Math.abs(debitTotal - creditTotal) > 0.01) {
      return NextResponse.json(
        {
          error: `借貸不平衡：資產合計 ${debitTotal.toLocaleString()}、負債+權益合計 ${creditTotal.toLocaleString()}、差額 ${(debitTotal - creditTotal).toLocaleString()}`,
        },
        { status: 400 }
      )
    }

    const employeeId = await resolveEmployeeIdFromUser(supabase, session.user.id)

    await recordApiAuditContext(supabase, {
      actorId: employeeId ?? guard.employeeId,
      reason: '期初餘額設定',
    })

    // 刪除既有期初開帳傳票（先 lines、後 voucher）
    const { data: existing } = await supabase
      .from('journal_vouchers')
      .select('id')
      .eq('workspace_id', workspaceId)
      .eq('source_type', 'opening_balance')
      .maybeSingle()

    if (existing) {
      await supabase.from('journal_lines').delete().eq('voucher_id', existing.id)
      await supabase.from('journal_vouchers').delete().eq('id', existing.id)
    }

    // 產生新傳票
    const voucherNo = await generateVoucherNo(workspaceId, validated.as_of_date, supabase)

    const { data: newVoucher, error: voucherError } = await supabase
      .from('journal_vouchers')
      .insert({
        workspace_id: workspaceId,
        voucher_no: voucherNo,
        voucher_date: validated.as_of_date,
        memo: `期初開帳（${validated.as_of_date}）`,
        status: 'locked',
        total_debit: debitTotal,
        total_credit: creditTotal,
        source_type: 'opening_balance',
        created_by: employeeId,
      })
      .select()
      .single()

    if (voucherError) throw voucherError

    // 建立分錄
    const lines = nonZeroItems.map((item, idx) => {
      const acc = accountMap.get(item.account_id)!
      const isDebit = acc.account_type === 'asset'
      return {
        voucher_id: newVoucher.id,
        line_no: idx + 1,
        account_id: item.account_id,
        description: `期初 ${acc.code} ${acc.name}`,
        debit_amount: isDebit ? item.amount : 0,
        credit_amount: isDebit ? 0 : item.amount,
      }
    })

    const { error: linesError } = await supabase.from('journal_lines').insert(lines)

    if (linesError) {
      await supabase.from('journal_vouchers').delete().eq('id', newVoucher.id)
      throw linesError
    }

    return NextResponse.json({
      success: true,
      voucher_no: voucherNo,
      voucher_id: newVoucher.id,
      total_debit: debitTotal,
      total_credit: creditTotal,
    })
  } catch (error) {
    logger.error('POST opening balances error:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      )
    }

    return dbErrorResponse(error)
  }
}
