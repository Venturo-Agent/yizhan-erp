/**
 * 永豐刷卡交易產生 — 三入口共用函式（B-0）
 *
 * 收斂三個產付款連結的入口（客戶自助 / 業務手動 / AI 機器人）：
 *   1. getSinopacConfig(workspace) 拿該公司永豐憑證
 *   2. createCardOrder(PayType=C) 跟永豐要刷卡頁網址（CardPayURL）
 *   3. INSERT payment_transactions（狀態 pending、存 CardPayURL + 我方訂單號）
 *
 * 三入口只要呼叫這支、就不會「自助頁走真永豐、AI 發的還是假的」（探查兵 🟡#1）。
 *
 * ⚠️ 不建 receipt（William 2026-05-23 拍板暫不做自動開收據）。
 *    付款成功只更新 payment_transactions 狀態、不連動 receipt / 帳單已付清。
 */

import { randomBytes } from 'node:crypto'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { logger } from '@/lib/utils/logger'
import type { Json } from '@/lib/supabase/types'
import { getSinopacConfig } from './config'
import { createCardOrder, getCardPayUrl } from './credit-card'

/** 站台基底網址（returnUrl / backendUrl 要絕對網址、沿用全站 SSOT） */
const APP_BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://erp.venturo.tw'

/** caller 用 error.message 開頭判斷類型、翻成中文業務語言回前端 */
export const SINOPAC_ERR = {
  NOT_CONFIGURED: 'SINOPAC_NOT_CONFIGURED', // 此公司尚未設定永豐金流
  ORDER_FAILED: 'SINOPAC_ORDER_FAILED', // 永豐開單被拒（後接原因）
  NO_PAY_URL: 'SINOPAC_NO_PAY_URL', // 永豐沒回刷卡頁網址
  TX_INSERT_FAILED: 'SINOPAC_TX_INSERT_FAILED', // 寫交易記錄失敗
} as const

export interface CreateCardTxInput {
  workspaceId: string
  /** payment_methods.provider（sinopac_qpay 等） */
  provider: string
  /** 金額（新台幣元、整數） */
  amount: number
  /** 這筆付款涵蓋的帳單 id */
  invoiceIds: string[]
  customerEmail?: string | null
  customerName?: string | null
  /** 顯示在永豐刷卡頁的收款名稱 */
  productName?: string
  /** 連結效期（ISO 字串） */
  expiresAt: string
  /** 操作員工 id（自助頁無、業務 / AI 有）；空就 undefined、不可空字串（紅線 B） */
  createdBy?: string | null
  /** 額外塞進 raw_webhook_payload（AI 入口帶 conversation_id 等） */
  rawWebhookPayload?: Json | null
}

export interface CreateCardTxResult {
  txId: string
  /** 永豐刷卡頁網址（導客戶過去刷卡） */
  redirectTo: string
  /** 我方訂單號（webhook / 反查用） */
  orderNo: string
  /** 落地頁 / 反查用 token */
  token: string
  amount: number
  expiresAt: string
}

/** 落地頁 / 反查用 token（URL-safe） */
function genPayToken(): string {
  return randomBytes(16).toString('base64url')
}

/** 我方訂單號（英數、唯一、不超長；永豐 OrderNo 用） */
function genOrderNo(): string {
  return (
    'V' +
    Date.now() +
    Math.floor(Math.random() * 10000)
      .toString()
      .padStart(4, '0')
  )
}

/**
 * 跟永豐開一張信用卡刷卡單、寫進 payment_transactions、回刷卡頁網址。
 * 失敗一律 throw（message 開頭是 SINOPAC_ERR.*）、caller 翻成中文回前端。
 */
export async function createSinopacCardTransaction(
  input: CreateCardTxInput
): Promise<CreateCardTxResult> {
  const config = await getSinopacConfig(input.workspaceId)
  if (!config) {
    throw new Error(SINOPAC_ERR.NOT_CONFIGURED)
  }

  const payToken = genPayToken()
  const orderNo = genOrderNo()
  // 永豐刷完導客戶回這裡（帶 token 讓落地頁知道查哪筆）
  const returnUrl = `${APP_BASE_URL}/pay/result?t=${payToken}`
  // 永豐後台入帳通知打這裡（必須公開可達）
  const backendUrl = `${APP_BASE_URL}/api/payment-webhooks/sinopac/notify`

  const order = await createCardOrder(config, {
    orderNo,
    amount: input.amount,
    productName: input.productName || '旅遊費用',
    returnUrl,
    backendUrl,
    param1: payToken, // 自訂參數帶 token、方便對單
  })

  if (order.Status !== 'S') {
    throw new Error(`${SINOPAC_ERR.ORDER_FAILED}:${order.Description || order.Status || 'unknown'}`)
  }
  const cardPayUrl = getCardPayUrl(order)
  if (!cardPayUrl) {
    throw new Error(SINOPAC_ERR.NO_PAY_URL)
  }

  const supabase = getSupabaseAdminClient()
  const { data: tx, error } = await supabase
    .from('payment_transactions')
    .insert({
      workspace_id: input.workspaceId,
      receipt_id: null,
      provider: input.provider,
      payment_link: cardPayUrl,
      payment_link_token: payToken,
      payment_link_expires_at: input.expiresAt,
      customer_email: input.customerEmail ?? null,
      customer_name: input.customerName ?? null,
      amount: input.amount,
      currency: 'TWD',
      invoice_ids: input.invoiceIds,
      external_order_no: orderNo,
      status: 'pending',
      created_by: input.createdBy ?? undefined,
      raw_webhook_payload: input.rawWebhookPayload ?? null,
    })
    .select('id')
    .single()

  if (error || !tx) {
    logger.error('[createSinopacCardTransaction] payment_transactions insert 失敗', error)
    throw new Error(SINOPAC_ERR.TX_INSERT_FAILED)
  }

  return {
    txId: tx.id,
    redirectTo: cardPayUrl,
    orderNo,
    token: payToken,
    amount: input.amount,
    expiresAt: input.expiresAt,
  }
}
