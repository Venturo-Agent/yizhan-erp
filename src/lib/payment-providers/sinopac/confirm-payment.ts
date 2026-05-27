/**
 * 永豐刷卡付款確認 — 落地頁反查 + webhook 共用（B-2 / B-3 SSOT）
 *
 * 兩個入口都呼叫這裡，確保「確認付款 → 更新狀態 → 通知」邏輯只有一份：
 *   - 落地頁（客戶刷完導回）：confirmSinopacPaymentByToken(token)
 *   - 永豐後台 webhook：confirmSinopacPaymentByOrderNo(orderNo)
 *
 * 核心：不信任「客戶導回」或「webhook body」本身、一律用 queryOrder 反查永豐確認，
 *   確認真的付款成功才把 payment_transactions 標 captured（冪等、條件式 update 防併發）。
 *
 * ⚠️ 不建 receipt（William 2026-05-23 拍板暫不做）。只更新付款狀態。
 *
 * ⚠️ isPaidFromQuery 的判斷欄位待 sandbox 測試對齊（永豐 OrderQuery 回應 SampleCode 沒附），
 *    先寬鬆判斷 + 完整 log、第一次測通後收斂。
 */

import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { logger } from '@/lib/utils/logger'
import { getSinopacConfig } from './config'
import { queryOrder, type OrderQueryResult } from './credit-card'
import { notifyPaymentCapturedToConversation } from '@/lib/ai/notify-payment-captured'
import { generateReceiptNo } from '@/lib/codes'
import { calculateReceiptFees } from '@/lib/finance/receipt-fees'

export type ConfirmStatus = 'captured' | 'pending' | 'failed' | 'not_found' | 'expired'

export interface ConfirmResult {
  status: ConfirmStatus
  /** 已是 captured（重複呼叫）時為 true */
  alreadyCaptured?: boolean
  externalTransNo?: string | null
  amount?: number
}

interface TxRow {
  id: string
  status: string
  workspace_id: string
  external_order_no: string | null
  external_trans_no: string | null
  amount: number
  payment_link_expires_at: string | null
  raw_webhook_payload: unknown
  // 開收款單用（2026-05-26 B）
  invoice_ids: string[] | null
  payment_method_id: string | null
  receipt_id: string | null
  provider: string | null
}

const TX_COLS =
  'id, status, workspace_id, external_order_no, external_trans_no, amount, payment_link_expires_at, raw_webhook_payload, invoice_ids, payment_method_id, receipt_id, provider'

/**
 * 從永豐 OrderQuery 回應判斷「是否已付款成功」+ 取交易序號。
 *
 * 回應結構（手冊 8.4 + 2026-05-23 sandbox 實測）：交易在 OrderList 陣列裡（非頂層）：
 *   { Status:'S', OrderList:[{ OrderNo, TSNo, PayStatus, AuthCode, Amount, ... }] }
 *   - 頂層 Status='S' 只代表「查詢成功」、不是付款成功
 *   - 真正付款狀態看 OrderList[0].PayStatus（手冊 10.2 交易狀態碼表）
 *
 * 信用卡付款成功 = PayStatus 1C300（已授權未請款）/ 1C400（請款完成）/ 1C900（已撥款）。
 *   1C200=待付款（沒刷）、1C250=刷卡逾期、1C350/1C351=授權失效/取消 → 皆未付款。
 */
function isPaidFromQuery(q: OrderQueryResult): { paid: boolean; transNo: string | null } {
  const orderList = (q as Record<string, unknown>).OrderList as
    | Array<Record<string, unknown>>
    | undefined
  const order = orderList?.[0]
  if (!order) return { paid: false, transNo: null }

  const transNo = (order.TSNo as string | undefined) || null
  const payStatus = String(order.PayStatus ?? '')
  const authCode = String(order.AuthCode ?? '')
  // 付款成功碼（手冊 10.2）：已授權 x300 / 請款完成 x400 / 已撥款 x900
  // 信用卡 1C*；保險涵蓋虛擬帳號 1A400/1A900、行動支付 1M400/1M900
  const PAID_STATUSES = ['1C300', '1C400', '1C900', '1A400', '1A900', '1M400', '1M900']
  const paid = PAID_STATUSES.includes(payStatus) || authCode.length > 0
  return { paid, transNo }
}

/** 反查永豐 + 確認 + 更新（共用核心） */
async function confirmCore(
  supabase: ReturnType<typeof getSupabaseAdminClient>,
  tx: TxRow
): Promise<ConfirmResult> {
  if (tx.status === 'captured') {
    return {
      status: 'captured',
      alreadyCaptured: true,
      externalTransNo: tx.external_trans_no,
      amount: Number(tx.amount),
    }
  }
  if (tx.status === 'failed' || tx.status === 'refunded') {
    return { status: 'failed' }
  }
  if (!tx.external_order_no) {
    return { status: 'pending' } // 沒訂單號無法反查
  }

  const config = await getSinopacConfig(tx.workspace_id)
  if (!config) {
    logger.error('[sinopac confirm] 找不到永豐設定、無法反查', { workspaceId: tx.workspace_id })
    return { status: 'pending' }
  }

  let q: OrderQueryResult
  try {
    q = await queryOrder(config, tx.external_order_no)
  } catch (e) {
    logger.error('[sinopac confirm] queryOrder 反查失敗', { orderNo: tx.external_order_no, err: e })
    return { status: 'pending' }
  }
  // 第一次測試靠這行 log 對齊「已付款」判斷欄位
  logger.info('[sinopac confirm] queryOrder 回應', { orderNo: tx.external_order_no, response: q })

  const { paid, transNo } = isPaidFromQuery(q)
  if (!paid) {
    return { status: 'pending' }
  }

  // 條件式 update：只在 status='pending' 時改、防 webhook 跟落地頁併發重複
  const { data: updated, error } = await supabase
    .from('payment_transactions')
    .update({ status: 'captured', external_trans_no: transNo ?? tx.external_trans_no })
    .eq('id', tx.id)
    .eq('status', 'pending')
    .select('id')

  if (error) {
    logger.error('[sinopac confirm] 更新 captured 失敗', { txId: tx.id, err: error.message })
    return { status: 'pending' }
  }

  // updated 為空 = 別的請求已搶先標 captured（冪等、不重複通知 / 不重複開收款單）
  if (updated && updated.length > 0) {
    // 自動開收款單 + 回填帳單（B：付款成功連動會計、2026-05-26 推翻 5/23 暫不做）
    // 失敗只 log、不影響「付款已成功」事實（收款單可後補、不讓收款單錯誤回滾已 captured 的付款）
    try {
      await openReceiptForCapturedTx(supabase, tx, transNo)
    } catch (e) {
      logger.error('[sinopac confirm] 開收款單失敗（付款已 captured、收款單待補）', {
        txId: tx.id,
        err: e instanceof Error ? e.message : e,
      })
    }
    await notifyPaymentCapturedToConversation({
      workspaceId: tx.workspace_id,
      amount: Number(tx.amount),
      rawWebhookPayload: tx.raw_webhook_payload as Record<string, unknown> | null,
      externalTransNo: transNo,
    })
  }

  return {
    status: 'captured',
    alreadyCaptured: false,
    externalTransNo: transNo,
    amount: Number(tx.amount),
  }
}

/**
 * 刷卡 captured 成功後、自動開收款單(receipt, status=confirmed) + allocations 回填帳單。
 *
 * William 2026-05-26 拍板：刷卡跳過會計人工核對 —— 永豐已確認授權、直接 confirmed。
 *   - 手續費：用 payment_method.fee_percent / fee_fixed 算、receipt 記毛額(receipt_amount)/
 *     手續費(fees)/實收淨額(actual_amount)。
 *   - status=confirmed → DB trigger 自動 recalc invoices.paid_amount + batch.status（帳單顯示已付清）。
 *   - 冪等：tx.receipt_id 已有值代表開過、跳過。
 *   - created_by=null（紅線 B：客戶自助、無員工操作者）。
 *   - 編號走中央 generateReceiptNo、不散刻。
 *
 * 失敗一律 return（不 throw 也不部分寫）：付款已 captured 是既成事實、收款單可後補。
 */
async function openReceiptForCapturedTx(
  supabase: ReturnType<typeof getSupabaseAdminClient>,
  tx: TxRow,
  transNo: string | null
): Promise<void> {
  if (tx.receipt_id) return // 冪等：已開過收款單
  const invoiceIds = tx.invoice_ids ?? []
  if (invoiceIds.length === 0) {
    logger.info('[sinopac confirm] 交易無 invoice_ids、不開收款單（如 AI 無帳單連結）', {
      txId: tx.id,
    })
    return
  }

  // 1. 解析收款方式（receipt.payment_method_id 為 NOT NULL；無則用 provider fallback 找）
  let pm: {
    id: string
    name: string | null
    fee_percent: number | null
    fee_fixed: number | null
  } | null = null
  if (tx.payment_method_id) {
    const r = await supabase
      .from('payment_methods')
      .select('id, name, fee_percent, fee_fixed')
      .eq('workspace_id', tx.workspace_id)
      .eq('id', tx.payment_method_id)
      .maybeSingle()
    pm = r.data
  } else {
    const r = await supabase
      .from('payment_methods')
      .select('id, name, fee_percent, fee_fixed')
      .eq('workspace_id', tx.workspace_id)
      .eq('type', 'receipt')
      .eq('provider', tx.provider ?? 'sinopac_card')
      .eq('is_active', true)
      .order('sort_order')
      .limit(1)
      .maybeSingle()
    pm = r.data
  }
  if (!pm) {
    logger.error('[sinopac confirm] 找不到收款方式、無法開收款單', { txId: tx.id })
    return
  }
  const feePercent = Number(pm.fee_percent ?? 0)
  const feeFixed = Number(pm.fee_fixed ?? 0)

  // 2. 查 invoices、依各 invoice 剩餘金額分配付款（照 public/invoices/[token]/pay 模仿）
  const { data: invoices } = await supabase
    .from('invoices')
    .select('id, batch_id, customer_id, total_amount, paid_amount')
    .in('id', invoiceIds)
  if (!invoices || invoices.length === 0) {
    logger.error('[sinopac confirm] 查無 invoices、不開收款單', { txId: tx.id })
    return
  }
  const amount = Number(tx.amount)
  let left = amount
  const allocations: { invoice_id: string; amount: number }[] = []
  for (const inv of invoices) {
    if (left <= 0) break
    const remaining = Number(inv.total_amount) - Number(inv.paid_amount ?? 0)
    if (remaining <= 0) continue
    const alloc = Math.min(left, remaining)
    allocations.push({ invoice_id: inv.id, amount: alloc })
    left -= alloc
  }
  if (allocations.length === 0) {
    logger.info('[sinopac confirm] 帳單皆已結清、不重複開收款單', { txId: tx.id })
    return
  }

  // 3. 取 tour 資訊（收款編號需 tour_id；tour_name 為 receipt 冗餘欄位）
  const batchId = invoices[0].batch_id
  let orderId: string | null = null
  let orderNumber: string | null = null
  let branchId: string | null = null
  let tourId: string | null = null
  let tourName: string | null = null
  if (batchId) {
    const { data: batch } = await supabase
      .from('invoice_batches')
      .select('order_id')
      .eq('id', batchId)
      .maybeSingle()
    orderId = batch?.order_id ?? null
  }
  if (orderId) {
    // 2026-05-27 William 抓出：LINKPAY 收款單漏抄「訂單號 + 分公司」（列表顯示「—」）→ 一併帶進來
    const { data: order } = await supabase
      .from('orders')
      .select('tour_id, order_number, branch_id')
      .eq('id', orderId)
      .maybeSingle()
    tourId = order?.tour_id ?? null
    orderNumber = order?.order_number ?? null
    branchId = order?.branch_id ?? null
  }
  if (tourId) {
    const { data: tour } = await supabase
      .from('tours')
      .select('name')
      .eq('id', tourId)
      .maybeSingle()
    tourName = tour?.name ?? null
  }
  if (!tourId) {
    logger.error('[sinopac confirm] 缺 tour_id、無法產收款編號', { txId: tx.id })
    return
  }

  // 4. 收款編號（中央 SSOT、advisory lock 防撞號）
  const receiptNumber = await generateReceiptNo(tourId, supabase)

  // 5. 手續費：毛額 amount、手續費 fees（無條件進位、走 SSOT）、實收淨額 actual_amount
  const { fees, actualAmount } = calculateReceiptFees(amount, feePercent, feeFixed)
  const today = new Date().toISOString().slice(0, 10)

  // 6. INSERT receipt（status=confirmed：永豐已確認授權、跳過會計核對）
  const { data: receipt, error: recErr } = await supabase
    .from('receipts')
    .insert({
      workspace_id: tx.workspace_id,
      receipt_number: receiptNumber,
      order_id: orderId,
      order_number: orderNumber,
      branch_id: branchId,
      tour_id: tourId,
      tour_name: tourName,
      customer_id: invoices[0].customer_id,
      invoice_id: null,
      batch_id: batchId,
      receipt_type: 1,
      receipt_amount: amount,
      actual_amount: actualAmount,
      fees,
      payment_method: pm.name ?? '永豐刷卡',
      payment_method_id: pm.id,
      payment_date: today,
      receipt_date: today,
      bank_account_last5: null,
      notes: `永豐刷卡（線上）${transNo ? `交易序號 ${transNo}` : ''}`.trim(),
      status: 'confirmed',
      created_by: null,
      updated_by: null,
    })
    .select('id')
    .single()
  if (recErr || !receipt) {
    logger.error('[sinopac confirm] receipt insert 失敗', { txId: tx.id, err: recErr?.message })
    return
  }

  // 7. INSERT allocations（分配失敗 → 刪 receipt 防孤兒、照 pay route）
  const { error: allocErr } = await supabase.from('receipt_invoice_allocations').insert(
    allocations.map(a => ({
      receipt_id: receipt.id,
      invoice_id: a.invoice_id,
      allocated_amount: a.amount,
      workspace_id: tx.workspace_id,
    }))
  )
  if (allocErr) {
    await supabase.from('receipts').delete().eq('id', receipt.id)
    logger.error('[sinopac confirm] allocations insert 失敗、已回滾 receipt', {
      txId: tx.id,
      err: allocErr.message,
    })
    return
  }

  // 8. 回填 payment_transactions.receipt_id（冪等 guard + 對帳連結）
  await supabase.from('payment_transactions').update({ receipt_id: receipt.id }).eq('id', tx.id)

  logger.info('[sinopac confirm] 自動開收款單成功', {
    txId: tx.id,
    receiptId: receipt.id,
    receiptNumber,
    amount,
    fees,
    actualAmount,
  })
  // status=confirmed → DB trigger 自動 recalc invoices.paid_amount + batch.status（帳單顯示已付清）
}

/** 落地頁用：以 payment_link_token 反查確認 */
export async function confirmSinopacPaymentByToken(token: string): Promise<ConfirmResult> {
  const supabase = getSupabaseAdminClient()
  const { data: tx, error } = await supabase
    .from('payment_transactions')
    .select(TX_COLS)
    .eq('payment_link_token', token)
    .maybeSingle()

  if (error || !tx) return { status: 'not_found' }
  return confirmCore(supabase, tx as TxRow)
}

/** webhook 用：以我方訂單號（external_order_no）反查確認 */
export async function confirmSinopacPaymentByOrderNo(orderNo: string): Promise<ConfirmResult> {
  const supabase = getSupabaseAdminClient()
  const { data: tx, error } = await supabase
    .from('payment_transactions')
    .select(TX_COLS)
    .eq('external_order_no', orderNo)
    .maybeSingle()

  if (error || !tx) return { status: 'not_found' }
  return confirmCore(supabase, tx as TxRow)
}
