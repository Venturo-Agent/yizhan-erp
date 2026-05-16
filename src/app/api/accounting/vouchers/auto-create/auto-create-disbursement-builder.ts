/**
 * auto-create-disbursement-builder.ts
 *
 * 從出納單產生沖銷傳票的邏輯（獨立拆出維持各檔 < 500 行）。
 * 由 auto-create-voucher-builder.ts re-export 給 route.ts 使用。
 */

import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { generateVoucherNo as generateVoucherNoShared } from '@/lib/codes'

const getSupabase = getSupabaseAdminClient

async function generateVoucherNo(workspaceId: string, date: string): Promise<string> {
  return generateVoucherNoShared(workspaceId, date, getSupabase())
}

/**
 * 從出納單產生沖銷傳票（撥款付款）
 * 借：應付帳款（從 PR.items 對應的 expense_categories.credit_account 反查、累加分組）
 * 貸：銀行存款（從 disbursement_orders.bank_account_id 對應的 chart_of_accounts）
 */
export async function createVoucherFromDisbursement(workspaceId: string, disbursementId: string) {
  const db = getSupabase()

  // 1. 查出納單 + 銀行帳戶 + 付款方式
  // type cast：generated types 還沒含 payment_method_id（migration 跑完 regen 後可拿掉）
  const { data: disbursementRaw, error: disErr } = await db
    .from('disbursement_orders')
    .select(
      'id, code, order_number, amount, disbursement_date, bank_account_id, payment_method_id, accounting_voucher_id, notes'
    )
    .eq('workspace_id', workspaceId)
    .eq('id', disbursementId)
    .single()

  if (disErr || !disbursementRaw) {
    throw new Error(`找不到出納單：${disbursementId}`)
  }
  const disbursement = disbursementRaw as unknown as {
    id: string
    code: string | null
    order_number: string | null
    amount: number
    disbursement_date: string | null
    bank_account_id: string | null
    payment_method_id: string | null
    accounting_voucher_id: string | null
    notes: string | null
  }

  // idempotent：已產過直接 return
  if (disbursement.accounting_voucher_id) {
    const { data: existing } = await db
      .from('journal_vouchers')
      .select('id, voucher_no')
      .eq('id', disbursement.accounting_voucher_id)
      .maybeSingle()
    if (existing) return existing
  }

  if (!disbursement.bank_account_id) {
    throw new Error('出納單未指定銀行帳戶、無法產生傳票')
  }

  // 2. 銀行帳戶 → chart_of_accounts.id（貸方銀行科目）
  const { data: bankAcct, error: bankErr } = await db
    .from('bank_accounts')
    .select('id, name, account_id')
    .eq('id', disbursement.bank_account_id)
    .single()

  if (bankErr || !bankAcct?.account_id) {
    throw new Error('銀行帳戶未綁定會計科目、無法產生傳票')
  }

  // 3. 查關聯的請款單 + items + items 對應 expense_categories
  const { data: linkedRequests, error: prErr } = await db
    .from('payment_requests')
    .select('id, code, supplier_name, items:payment_request_items(category, subtotal)')
    .eq('workspace_id', workspaceId)
    .eq('disbursement_order_id', disbursementId)

  if (prErr) throw prErr
  if (!linkedRequests || linkedRequests.length === 0) {
    throw new Error('出納單沒有關聯請款單、無法產生傳票')
  }

  // 4. 查所有 expense_categories 的 credit_account（要沖的應付科目）
  const { data: categories } = await db
    .from('expense_categories')
    .select(
      `name,
       credit_account:chart_of_accounts!credit_account_id(id, code, name)`
    )
    .eq('is_active', true)

  const categoryMap = new Map<string, { id: string; code: string; name: string }>()
  if (categories) {
    for (const cat of categories) {
      const creditRaw = cat.credit_account as unknown
      const credit = Array.isArray(creditRaw) ? creditRaw[0] : creditRaw
      if (credit) {
        categoryMap.set(cat.name, credit as { id: string; code: string; name: string })
      }
    }
  }

  // 5. 累加每個 credit_account 的金額（沖銷分組）
  const debitAccountAmounts = new Map<string, { name: string; amount: number }>()
  const supplierNames: string[] = []

  for (const pr of linkedRequests) {
    if (pr.supplier_name) supplierNames.push(pr.supplier_name)
    for (const item of (pr.items || [])) {
      const cat = (item as { category?: string; subtotal?: number }).category || '其他'
      const subtotal = Number((item as { subtotal?: number }).subtotal) || 0
      const creditAcct = categoryMap.get(cat)
      if (!creditAcct) {
        throw new Error(`請款類別「${cat}」未設定貸方科目（沖銷對象）、無法產生出納傳票`)
      }
      const existing = debitAccountAmounts.get(creditAcct.id)
      debitAccountAmounts.set(creditAcct.id, {
        name: creditAcct.name,
        amount: (existing?.amount || 0) + subtotal,
      })
    }
  }

  if (debitAccountAmounts.size === 0) {
    throw new Error('沒有有效的沖銷科目、無法產生出納傳票')
  }

  // 6. 產生傳票編號
  const voucherDate = disbursement.disbursement_date || new Date().toISOString().split('T')[0]
  const voucherNo = await generateVoucherNo(workspaceId, voucherDate)

  // 7. 建立傳票（header total 先 0、lines 算完再 update）
  const { data: voucher, error: voucherError } = await db
    .from('journal_vouchers')
    .insert({
      workspace_id: workspaceId,
      voucher_no: voucherNo,
      voucher_date: voucherDate,
      memo: `出納撥款 ${disbursement.code || disbursement.order_number || ''} - ${supplierNames.join(', ').slice(0, 80)}`,
      status: 'posted',
      total_debit: 0,
      total_credit: 0,
      source_type: 'disbursement_order',
      source_id: disbursementId,
    })
    .select()
    .single()

  if (voucherError) {
    throw new Error(`建立出納傳票失敗：${voucherError.message}`)
  }

  // 8. 借方分錄（每個應付科目一筆）
  const lines: Array<{
    voucher_id: string
    line_no: number
    account_id: string
    description: string
    debit_amount: number
    credit_amount: number
  }> = []
  let lineNo = 1
  let debitTotal = 0

  for (const [accountId, info] of debitAccountAmounts) {
    lines.push({
      voucher_id: voucher.id,
      line_no: lineNo++,
      account_id: accountId,
      description: `沖${info.name}`,
      debit_amount: info.amount,
      credit_amount: 0,
    })
    debitTotal += info.amount
  }

  // 9. 貸方銀行存款（匯多少記多少、無手續費分攤邏輯）
  const bankCredit = debitTotal
  lines.push({
    voucher_id: voucher.id,
    line_no: lineNo++,
    account_id: bankAcct.account_id,
    description: `付款 ${bankAcct.name}`,
    debit_amount: 0,
    credit_amount: bankCredit,
  })

  const { error: linesError } = await db.from('journal_lines').insert(lines)

  if (linesError) {
    await db.from('journal_vouchers').delete().eq('workspace_id', workspaceId).eq('id', voucher.id)
    throw new Error(`建立出納傳票分錄失敗：${linesError.message}`)
  }

  // 10. 回填 header total
  const creditTotal = bankCredit
  await db
    .from('journal_vouchers')
    .update({ total_debit: debitTotal, total_credit: creditTotal })
    .eq('id', voucher.id)

  // 11. 回填 disbursement_orders.accounting_voucher_id
  await db
    .from('disbursement_orders')
    .update({ accounting_voucher_id: voucher.id })
    .eq('id', disbursementId)

  return voucher
}
