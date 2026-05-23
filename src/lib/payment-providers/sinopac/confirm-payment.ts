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
}

const TX_COLS =
  'id, status, workspace_id, external_order_no, external_trans_no, amount, payment_link_expires_at, raw_webhook_payload'

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
  tx: TxRow,
): Promise<ConfirmResult> {
  if (tx.status === 'captured') {
    return { status: 'captured', alreadyCaptured: true, externalTransNo: tx.external_trans_no, amount: Number(tx.amount) }
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

  // updated 為空 = 別的請求已搶先標 captured（冪等、不重複通知）
  if (updated && updated.length > 0) {
    await notifyPaymentCapturedToConversation({
      workspaceId: tx.workspace_id,
      amount: Number(tx.amount),
      rawWebhookPayload: tx.raw_webhook_payload as Record<string, unknown> | null,
      externalTransNo: transNo,
    })
  }

  return { status: 'captured', alreadyCaptured: false, externalTransNo: transNo, amount: Number(tx.amount) }
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
