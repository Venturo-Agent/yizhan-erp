/**
 * auto-create-voucher-builder.ts
 *
 * 傳票建立邏輯（收款單 / 請款單）。
 * 出納單傳票邏輯拆至 auto-create-disbursement-builder.ts（維持各檔 < 500 行）。
 * 兩個 builder 都由 route.ts 直接引用。
 */

import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { generateVoucherNo as generateVoucherNoShared } from '@/lib/codes'

const getSupabase = getSupabaseAdminClient

/**
 * 產生傳票編號 — 透過中央 codes module（RPC + advisory lock）
 */
async function generateVoucherNo(workspaceId: string, date: string): Promise<string> {
  return generateVoucherNoShared(workspaceId, date, getSupabase())
}

// 出納單傳票邏輯在獨立檔案
export { createVoucherFromDisbursement } from './auto-create-disbursement-builder'

/**
 * 從收款單產生傳票
 * 使用「收款方式」的借方/貸方科目
 */
export async function createVoucherFromReceipt(workspaceId: string, receiptId: string) {
  const db = getSupabase()

  // 1. 查詢收款單（含收款方式的科目設定、限定 workspace）
  const { data: receipt, error: recError } = await db
    .from('receipts')
    .select(
      `
      *,
      payment_method_ref:payment_methods!payment_method_id(
        id, name, fee_percent, fee_account_id,
        debit_account:chart_of_accounts!debit_account_id(id, code, name),
        credit_account:chart_of_accounts!credit_account_id(id, code, name),
        fee_account:chart_of_accounts!fee_account_id(id, code, name)
      )
    `
    )
    .eq('workspace_id', workspaceId)
    .eq('id', receiptId)
    .single()

  if (recError || !receipt) {
    throw new Error(`找不到收款單：${receiptId}`)
  }

  // 收款轉移類（transferred_pair_id 不為 null）不產傳票
  // 因為會計科目沒變、只是業務歸屬調整、產正負相抵的傳票會干擾報表
  if ((receipt as { transferred_pair_id?: string | null }).transferred_pair_id) {
    return { skipped: true, reason: 'transferred_pair' }
  }

  // 只有已確認的收款才產生傳票（pending / cancelled 跳過）
  if (receipt.status !== 'confirmed') {
    throw new Error(`收款單狀態為 ${receipt.status}、只有已確認的收款才能產生傳票`)
  }

  // 已產過的傳票不重複產（idempotent）
  const { data: existingVoucher } = await db
    .from('journal_vouchers')
    .select('id, voucher_no')
    .eq('workspace_id', workspaceId)
    .eq('source_type', 'receipt')
    .eq('source_id', receiptId)
    .maybeSingle()

  if (existingVoucher) {
    return existingVoucher
  }

  // 2. 取得科目
  const methodRef = receipt.payment_method_ref as unknown as {
    debit_account: { id: string; code: string; name: string } | null
    credit_account: { id: string; code: string; name: string } | null
    fee_account: { id: string; code: string; name: string } | null
  } | null

  if (!methodRef?.debit_account || !methodRef?.credit_account) {
    throw new Error('收款方式未設定會計科目，無法自動產生傳票')
  }

  const debitAccount = methodRef.debit_account
  const creditAccount = methodRef.credit_account
  const feeAccount = methodRef.fee_account

  // 金額拆解：
  //   receipt_amount = 客戶該付的總額（貸方 = 應收帳款結清）
  //   fees           = 銀行手續費（借方 = 手續費支出）
  //   actual_amount  = 實收（借方 = 銀行存款進帳）= receipt_amount - fees
  const receiptAmount = Number(receipt.receipt_amount) || 0
  const fees = Number(receipt.fees) || 0
  const actualAmount = Number(receipt.actual_amount) > 0
    ? Number(receipt.actual_amount)
    : receiptAmount - fees

  if (receiptAmount <= 0) {
    throw new Error('收款金額為 0、無法產生傳票')
  }

  const hasFees = fees > 0 && !!feeAccount

  // 3. 產生傳票編號
  const voucherDate = receipt.receipt_date || new Date().toISOString().split('T')[0]
  const voucherNo = await generateVoucherNo(workspaceId, voucherDate)

  // 4. 建立傳票（使用 journal_vouchers 表）
  const { data: voucher, error: voucherError } = await db
    .from('journal_vouchers')
    .insert({
      workspace_id: workspaceId,
      voucher_no: voucherNo,
      voucher_date: voucherDate,
      memo: `收款單 ${receipt.receipt_number || ''} - ${receipt.notes || ''}`.trim(),
      status: 'posted',
      total_debit: receiptAmount,
      total_credit: receiptAmount,
      source_type: 'receipt',
      source_id: receiptId,
    })
    .select()
    .single()

  if (voucherError) {
    throw new Error(`建立傳票失敗：${voucherError.message}`)
  }

  // 5. 建立傳票分錄
  // 無手續費 → 兩行（借存款 / 貸應收）
  // 有手續費 → 三行（借存款=實收 / 借手續費=fees / 貸應收=總額）
  const noteDesc = `收款 - ${receipt.notes || ''}`.trim()
  const lines = hasFees
    ? [
        {
          voucher_id: voucher.id,
          line_no: 1,
          account_id: debitAccount.id,
          description: noteDesc,
          debit_amount: actualAmount,
          credit_amount: 0,
        },
        {
          voucher_id: voucher.id,
          line_no: 2,
          account_id: feeAccount!.id,
          description: `${noteDesc} 手續費`,
          debit_amount: fees,
          credit_amount: 0,
        },
        {
          voucher_id: voucher.id,
          line_no: 3,
          account_id: creditAccount.id,
          description: noteDesc,
          debit_amount: 0,
          credit_amount: receiptAmount,
        },
      ]
    : [
        {
          voucher_id: voucher.id,
          line_no: 1,
          account_id: debitAccount.id,
          description: noteDesc,
          debit_amount: receiptAmount,
          credit_amount: 0,
        },
        {
          voucher_id: voucher.id,
          line_no: 2,
          account_id: creditAccount.id,
          description: noteDesc,
          debit_amount: 0,
          credit_amount: receiptAmount,
        },
      ]

  const { error: linesError } = await db.from('journal_lines').insert(lines)

  if (linesError) {
    await db.from('journal_vouchers').delete().eq('workspace_id', workspaceId).eq('id', voucher.id)
    throw new Error(`建立傳票分錄失敗：${linesError.message}`)
  }

  return voucher
}

/**
 * 從請款單產生傳票
 * 使用「請款類別」的借方/貸方科目
 */
export async function createVoucherFromPaymentRequest(workspaceId: string, paymentRequestId: string) {
  const db = getSupabase()

  // 1. 查詢請款單（限定 workspace）
  // 2026-05-21 Phase 2：items 多撈 category_id；categoryMap 同時建 id 與 name 兩個 key、過渡期相容
  const { data: request, error: reqError } = await db
    .from('payment_requests')
    .select('*, items:payment_request_items(*)')
    .eq('workspace_id', workspaceId)
    .eq('id', paymentRequestId)
    .single()

  if (reqError || !request) {
    throw new Error(`找不到請款單：${paymentRequestId}`)
  }

  // 成本轉移類（transferred_pair_id 不為 null）不產傳票
  // 因為會計科目沒變、只是把成本掛到不同團、產正負相抵的傳票會干擾報表
  if ((request as { transferred_pair_id?: string | null }).transferred_pair_id) {
    return { skipped: true, reason: 'transferred_pair' }
  }

  // 2. 查詢所有請款類別（用於對應 category）
  // 撈 workspace 自己 + 系統預設（workspace_id IS NULL）
  const { data: categories } = await db
    .from('expense_categories')
    .select(
      `
      id, name,
      debit_account:chart_of_accounts!debit_account_id(id, code, name),
      credit_account:chart_of_accounts!credit_account_id(id, code, name)
    `
    )
    .or(`workspace_id.eq.${workspaceId},workspace_id.is.null`)
    .eq('is_active', true)

  type AcctRef = { id: string; code: string; name: string } | null
  const categoryById = new Map<string, { debit_account: AcctRef; credit_account: AcctRef }>()
  const categoryByName = new Map<string, { debit_account: AcctRef; credit_account: AcctRef }>()

  if (categories) {
    for (const cat of categories) {
      // Supabase join 可能返回陣列或單一物件
      const debitRaw = cat.debit_account as unknown
      const creditRaw = cat.credit_account as unknown
      const debit = Array.isArray(debitRaw) ? debitRaw[0] : debitRaw
      const credit = Array.isArray(creditRaw) ? creditRaw[0] : creditRaw

      const mapping = {
        debit_account: debit as AcctRef,
        credit_account: credit as AcctRef,
      }
      categoryById.set(cat.id, mapping)
      categoryByName.set(cat.name, mapping)
    }
  }

  // 3. 產生傳票編號
  const voucherDate = request.request_date || new Date().toISOString().split('T')[0]
  const voucherNo = await generateVoucherNo(workspaceId, voucherDate)

  // 4. 建立傳票
  const totalAmount = request.total_amount || 0
  const { data: voucher, error: voucherError } = await db
    .from('journal_vouchers')
    .insert({
      workspace_id: workspaceId,
      voucher_no: voucherNo,
      voucher_date: voucherDate,
      memo: `請款單 ${request.code || ''} - ${request.notes || ''}`.trim(),
      status: 'posted',
      total_debit: totalAmount,
      total_credit: totalAmount,
      source_type: 'payment_request',
      source_id: paymentRequestId,
    })
    .select()
    .single()

  if (voucherError) {
    throw new Error(`建立傳票失敗：${voucherError.message}`)
  }

  // 5. 建立傳票分錄
  const lines: Array<{
    voucher_id: string
    line_no: number
    account_id: string
    description: string
    debit_amount: number
    credit_amount: number
  }> = []

  let lineNo = 1
  const creditAccountIds: Map<string, number> = new Map() // 用於合併相同貸方科目

  // 借方分錄（每個項目一筆）
  // 2026-05-21 Phase 2：優先用 category_id 反查、fallback category 文字（舊資料）
  for (const item of request.items || []) {
    const itemExt = item as { category?: string | null; category_id?: string | null; subtotal?: number | null; description?: string | null }
    const catMapping =
      (itemExt.category_id && categoryById.get(itemExt.category_id)) ||
      categoryByName.get(itemExt.category || '其他')
    const catDisplayName =
      (itemExt.category_id && categories?.find(c => c.id === itemExt.category_id)?.name) ||
      itemExt.category ||
      '其他'

    if (!catMapping?.debit_account) {
      throw new Error(`請款類別「${catDisplayName}」未設定借方科目，無法自動產生傳票`)
    }

    lines.push({
      voucher_id: voucher.id,
      line_no: lineNo++,
      account_id: catMapping.debit_account.id,
      description: `${request.supplier_name || ''} / ${itemExt.description || catDisplayName}`,
      debit_amount: itemExt.subtotal || 0,
      credit_amount: 0,
    })

    // 累計貸方金額（可能多個項目用同一個貸方科目）
    if (catMapping.credit_account) {
      const creditId = catMapping.credit_account.id
      creditAccountIds.set(creditId, (creditAccountIds.get(creditId) || 0) + (itemExt.subtotal || 0))
    }
  }

  // 貸方分錄（合併相同科目）
  for (const [creditAccountId, amount] of creditAccountIds) {
    lines.push({
      voucher_id: voucher.id,
      line_no: lineNo++,
      account_id: creditAccountId,
      description: `應付 ${request.supplier_name || ''}`,
      debit_amount: 0,
      credit_amount: amount,
    })
  }

  if (lines.length === 0) {
    await db.from('journal_vouchers').delete().eq('workspace_id', workspaceId).eq('id', voucher.id)
    throw new Error('沒有有效的分錄，無法產生傳票')
  }

  const { error: linesError } = await db.from('journal_lines').insert(lines)

  if (linesError) {
    await db.from('journal_vouchers').delete().eq('workspace_id', workspaceId).eq('id', voucher.id)
    throw new Error(`建立傳票分錄失敗：${linesError.message}`)
  }

  return voucher
}

