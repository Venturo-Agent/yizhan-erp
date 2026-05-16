/**
 * LINE Push Message API client
 *
 * Reply API（用 replyToken）只能在 webhook 收到訊息後 30 秒內回。
 * Push API 沒這限制、agent 在後台主動回訊息走這個。
 *
 * 文件：https://developers.line.biz/en/reference/messaging-api/#send-push-message
 */

import { logger } from '@/lib/utils/logger'

const LINE_PUSH_ENDPOINT = 'https://api.line.me/v2/bot/message/push'

export interface PushTextInput {
  channelAccessToken: string
  /** LINE userId */
  toUserId: string
  text: string
}

export interface PushTextResult {
  ok: boolean
  status?: number
  error?: string
}

export async function pushLineText(input: PushTextInput): Promise<PushTextResult> {
  try {
    const res = await fetch(LINE_PUSH_ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${input.channelAccessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: input.toUserId,
        messages: [{ type: 'text', text: input.text }],
      }),
    })

    if (!res.ok) {
      const body = await res.text().catch(() => '')
      logger.warn('LINE push failed', { status: res.status, body })
      return { ok: false, status: res.status, error: `HTTP ${res.status}: ${body}` }
    }

    return { ok: true, status: 200 }
  } catch (error) {
    logger.error('LINE push error', { error })
    return { ok: false, error: error instanceof Error ? error.message : 'network error' }
  }
}
