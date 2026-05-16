/**
 * Meta Messenger / Instagram Reply Client
 *
 * 用 Page Access Token 透過 Graph API 回傳訊息給客戶。
 * FB 跟 IG 共用同一個 endpoint（IG 經由綁定的 FB Page 發送）。
 *
 * 文件：
 * - https://developers.facebook.com/docs/messenger-platform/reference/send-api
 * - https://developers.facebook.com/docs/messenger-platform/instagram/sending-messages
 */

import { logger } from '@/lib/utils/logger'

const META_GRAPH_VERSION = 'v21.0'
const META_GRAPH_BASE = `https://graph.facebook.com/${META_GRAPH_VERSION}`

export interface SendTextInput {
  pageAccessToken: string
  /** FB: PSID / IG: IGSID */
  recipientId: string
  text: string
  /** 'facebook' | 'instagram'、決定 messaging_type 預設值 */
  channel: 'facebook' | 'instagram'
}

export interface SendTextResult {
  ok: boolean
  messageId?: string
  error?: string
  status?: number
}

/**
 * 送一則文字訊息給客戶（FB Messenger 或 IG DM 共用）
 *
 * 失敗可能：
 *   - 190 invalid token
 *   - 10 / 200 message blocked（過 24h window 規則）
 *   - 100 invalid recipient
 */
export async function sendTextMessage(input: SendTextInput): Promise<SendTextResult> {
  const url = `${META_GRAPH_BASE}/me/messages?access_token=${encodeURIComponent(input.pageAccessToken)}`
  // FB 預設 RESPONSE（24h window 內）、IG 用 RESPONSE 亦可
  const messagingType = 'RESPONSE'

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messaging_type: messagingType,
        recipient: { id: input.recipientId },
        message: { text: input.text },
      }),
    })

    if (!res.ok) {
      const bodyText = await res.text().catch(() => '')
      logger.warn('Meta send message failed', {
        status: res.status,
        body: bodyText,
        channel: input.channel,
        recipientId: input.recipientId,
      })
      let parsed: { error?: { message?: string } } | null = null
      try {
        parsed = JSON.parse(bodyText)
      } catch {
        // not JSON
      }
      return {
        ok: false,
        status: res.status,
        error: parsed?.error?.message || `HTTP ${res.status}`,
      }
    }

    const data = (await res.json()) as {
      recipient_id?: string
      message_id?: string
    }
    return { ok: true, messageId: data.message_id }
  } catch (error) {
    logger.error('Meta send message error', { error, channel: input.channel })
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'network error',
    }
  }
}
