/**
 * Meta Messenger / Instagram Reply Client
 *
 * FB Messenger 走 graph.facebook.com + Page Access Token query string。
 * IG 走 Meta 新版 Business Messaging Platform（2024+）：
 *   - graph.instagram.com base
 *   - Instagram User Access Token（Bearer header、不是 query string）
 *   - 不再依賴 FB Page binding、IG 帳號獨立管理
 *
 * 文件：
 * - https://developers.facebook.com/docs/messenger-platform/reference/send-api
 * - https://developers.facebook.com/docs/instagram-platform/instagram-api-with-instagram-login/messaging-api
 */

import { logger } from '@/lib/utils/logger'

const FB_GRAPH_VERSION = 'v21.0'
const FB_GRAPH_BASE = `https://graph.facebook.com/${FB_GRAPH_VERSION}`
const IG_GRAPH_VERSION = 'v22.0'
const IG_GRAPH_BASE = `https://graph.instagram.com/${IG_GRAPH_VERSION}`

export interface SendTextInput {
  /** FB: Page Access Token / IG: Instagram User Access Token */
  pageAccessToken: string
  /** FB: PSID / IG: IGSID */
  recipientId: string
  text: string
  /** 'facebook' | 'instagram'、決定走哪條 Graph API base */
  channel: 'facebook' | 'instagram'
}

export interface SendTextResult {
  ok: boolean
  messageId?: string
  error?: string
  status?: number
}

/**
 * 送一則文字訊息給客戶
 *
 * FB Messenger：POST graph.facebook.com/v21/me/messages?access_token=...
 * IG DM 新版：POST graph.instagram.com/v22/me/messages + Bearer header
 *
 * 失敗可能：
 *   - 190 invalid token
 *   - 10 / 200 message blocked（過 24h window 規則）
 *   - 100 invalid recipient
 */
export async function sendTextMessage(input: SendTextInput): Promise<SendTextResult> {
  const isInstagram = input.channel === 'instagram'
  const messagingType = 'RESPONSE'

  const url = isInstagram
    ? `${IG_GRAPH_BASE}/me/messages`
    : `${FB_GRAPH_BASE}/me/messages?access_token=${encodeURIComponent(input.pageAccessToken)}`

  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (isInstagram) {
    headers['Authorization'] = `Bearer ${input.pageAccessToken}`
  }

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers,
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
