/**
 * AI tool：send_payment_link — 通用付款連結產生（不認 channel、所有 bot 共用）
 *
 * 2026-05-23 William 拍板：AI 在 LINE / FB / IG / Telegram / WhatsApp / AI Hub 對話中
 *   偵測到「該收錢」場景 → 自動 call 這個 tool → 拿到付款連結 → 用 channel-native 訊息送給客戶。
 *
 * 設計：
 *   - 不打 HTTP /api/finance/payment-links（那條走 user session、AI 沒 session）
 *   - 直接用 admin client 寫 payment_transactions（service_role bypass RLS）
 *   - workspace_id 由 caller 傳（從對話 context 拿）、AI 不能自己決定
 *   - provider 預設 sinopac_card；豐收款 / 行動支付未來 AI 自己選
 *   - 回的連結是相對 path、caller 自己拼絕對 URL（不同 channel 用不同 base URL）
 *
 * Phase 1 mock 階段：產的連結是 /pay/mock/[token]、客戶刷完 mock webhook 自動 captured
 * Phase 2 真實：連結改 /pay/sinopac/[token]、接 EPOS iframe
 *
 * Anthropic tool use spec：
 *   - name: send_payment_link
 *   - 4 個 input：amount / customer_email / customer_name / expires_days
 */

import { randomBytes } from 'node:crypto'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { logger } from '@/lib/utils/logger'
import { PROVIDER_CODES, PAYMENT_LINK_DEFAULT_EXPIRY_DAYS } from '@/constants/payment-provider'
import type { LLMTool } from '@/types/line.types'

const HANDLER = 'ai-tool:send-payment-link'

/**
 * Tool 定義（給 LLM 看的 spec）
 * 描述要寫清楚、AI 才會在對的時機 call
 */
export const sendPaymentLinkTool: LLMTool = {
  type: 'function',
  function: {
    name: 'send_payment_link',
    description:
      '當客戶確認要付款、且金額明確時、產生一個信用卡付款連結給客戶。' +
      '使用情境：客戶說「我要訂」「我要付」「我要繳訂金」「我要付尾款」這類明確付款意圖、且雙方對金額有共識時。' +
      '不要在客戶只是詢價或諮詢時主動產連結。',
    parameters: {
      type: 'object',
      properties: {
        amount: {
          type: 'number',
          description: '付款金額（TWD、整數、必須 > 0、譬如 15000）',
          minimum: 1,
        },
        customer_email: {
          type: 'string',
          description: '客戶 Email（選填、如有可寄回單；本期暫不自動寄信、留作記錄）',
        },
        customer_name: {
          type: 'string',
          description: '客戶姓名（選填、用於記錄）',
        },
        expires_days: {
          type: 'integer',
          description: '連結有效天數、預設 7 天、可選 1 / 3 / 7 / 14 / 30',
          enum: [1, 3, 7, 14, 30],
          default: PAYMENT_LINK_DEFAULT_EXPIRY_DAYS,
        },
      },
      required: ['amount'],
    },
  },
}

export interface SendPaymentLinkArgs {
  amount: number
  customer_email?: string
  customer_name?: string
  expires_days?: number
}

export interface SendPaymentLinkContext {
  workspaceId: string
  /** 對話 ID（選填、有就 link 進 transaction、未來 webhook 回來能對到原對話） */
  conversationId?: string
  /** AI agent ID（選填、給 audit log 用） */
  agentId?: string
}

export interface SendPaymentLinkResult {
  ok: boolean
  /** 相對 path、譬如 /pay/mock/abc123 */
  payment_link: string
  /** token、給 caller 自己組 absolute URL 用 */
  token: string
  /** 過期時間 ISO string */
  expires_at: string
  /** 金額（覆述、給 AI 確認）*/
  amount: number
  /** error message（ok=false 時填） */
  error: string | null
}

const FAILURE: Omit<SendPaymentLinkResult, 'error'> = {
  ok: false,
  payment_link: '',
  token: '',
  expires_at: '',
  amount: 0,
}

/**
 * Handler — 給 AI dispatcher 收到 tool_use 後 execute 用
 */
export async function executeSendPaymentLink(
  args: SendPaymentLinkArgs,
  ctx: SendPaymentLinkContext
): Promise<SendPaymentLinkResult> {
  logger.info(`${HANDLER}: → execute`, {
    workspaceId: ctx.workspaceId,
    conversationId: ctx.conversationId ?? null,
    amount: args.amount,
    expires_days: args.expires_days ?? PAYMENT_LINK_DEFAULT_EXPIRY_DAYS,
  })

  if (!ctx.workspaceId) {
    return { ...FAILURE, error: 'workspaceId 必填、AI tool 拿不到 workspace context' }
  }
  if (!args.amount || args.amount <= 0) {
    return { ...FAILURE, error: '金額必須 > 0' }
  }

  const expiresDays = args.expires_days ?? PAYMENT_LINK_DEFAULT_EXPIRY_DAYS
  const expiresAt = new Date(Date.now() + expiresDays * 24 * 60 * 60_000).toISOString()
  const token = randomBytes(16).toString('base64url')
  const paymentLink = `/pay/mock/${token}`

  const supabase = getSupabaseAdminClient()
  const { error } = await supabase.from('payment_transactions').insert({
    workspace_id: ctx.workspaceId,
    receipt_id: null,
    provider: PROVIDER_CODES.SINOPAC_CARD, // Phase 1 預設刷卡、未來 AI 可選 collect / wallet
    payment_link: paymentLink,
    payment_link_token: token,
    payment_link_expires_at: expiresAt,
    customer_email: args.customer_email ?? null,
    customer_name: args.customer_name ?? null,
    amount: args.amount,
    currency: 'TWD',
    invoice_ids: [],
    status: 'pending',
    raw_webhook_payload: {
      created_by_ai: true,
      conversation_id: ctx.conversationId ?? null,
      agent_id: ctx.agentId ?? null,
    },
  })

  if (error) {
    logger.error(`${HANDLER}: insert failed`, error)
    return { ...FAILURE, error: '產生付款連結失敗、請稍後再試' }
  }

  logger.info(`${HANDLER}: ← ok`, {
    workspaceId: ctx.workspaceId,
    token,
    amount: args.amount,
  })

  return {
    ok: true,
    payment_link: paymentLink,
    token,
    expires_at: expiresAt,
    amount: args.amount,
    error: null,
  }
}
