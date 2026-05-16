/**
 * LINE Messaging API client（multi-tenant）
 *
 * Reply API: https://developers.line.biz/en/reference/messaging-api/#send-reply-message
 *
 * Multi-tenant：channel_access_token 由呼叫端從 workspace_line_settings 取出、
 * 不從 .env 讀（每 workspace 不同）。
 */

import { logger } from '@/lib/utils/logger'

const LINE_REPLY_ENDPOINT = 'https://api.line.me/v2/bot/message/reply'
const LINE_PUSH_ENDPOINT = 'https://api.line.me/v2/bot/message/push'

export type LineMessage =
  | { type: 'text'; text: string }
  | { type: 'sticker'; packageId: string; stickerId: string }

export interface LineReplyOptions {
  replyToken: string
  messages: LineMessage[]
  channelAccessToken: string
}

export interface LineReplyResult {
  ok: boolean
  status: number
  error?: string
}

/**
 * 用 LINE Reply API 回覆訊息
 *
 * - replyToken 是 single-use、約 30 秒過期
 * - 失敗時回 { ok: false, error }、由呼叫端決定要不要 push fallback
 * - 不 throw、避免 webhook handler 整個炸
 */
export async function replyToLine(opts: LineReplyOptions): Promise<LineReplyResult> {
  const { replyToken, messages, channelAccessToken } = opts

  if (!channelAccessToken) {
    return { ok: false, status: 0, error: 'missing channel_access_token' }
  }

  if (!replyToken) {
    return { ok: false, status: 0, error: 'missing replyToken' }
  }

  try {
    const res = await fetch(LINE_REPLY_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${channelAccessToken}`,
      },
      body: JSON.stringify({ replyToken, messages }),
    })

    if (!res.ok) {
      const text = await res.text().catch(() => '')
      logger.warn('LINE reply API non-2xx', {
        status: res.status,
        body: text.slice(0, 500),
      })
      return { ok: false, status: res.status, error: text || `HTTP ${res.status}` }
    }

    return { ok: true, status: res.status }
  } catch (err) {
    logger.error('LINE reply API fetch failed', err)
    return {
      ok: false,
      status: 0,
      error: err instanceof Error ? err.message : 'unknown fetch error',
    }
  }
}

export interface LinePushOptions {
  to: string
  messages: LineMessage[]
  channelAccessToken: string
}

/**
 * 用 LINE Push API 主動推送訊息（agent 介入用）
 *
 * - 不需 reply token、可隨時送
 * - free tier monthly 200 則、付費依方案
 */
export async function pushToLine(opts: LinePushOptions): Promise<LineReplyResult> {
  const { to, messages, channelAccessToken } = opts

  if (!channelAccessToken) {
    return { ok: false, status: 0, error: 'missing channel_access_token' }
  }
  if (!to) {
    return { ok: false, status: 0, error: 'missing to (line user id)' }
  }

  try {
    const res = await fetch(LINE_PUSH_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${channelAccessToken}`,
      },
      body: JSON.stringify({ to, messages }),
    })

    if (!res.ok) {
      const text = await res.text().catch(() => '')
      logger.warn('LINE push API non-2xx', {
        status: res.status,
        body: text.slice(0, 500),
      })
      return { ok: false, status: res.status, error: text || `HTTP ${res.status}` }
    }

    return { ok: true, status: res.status }
  } catch (err) {
    logger.error('LINE push API fetch failed', err)
    return {
      ok: false,
      status: 0,
      error: err instanceof Error ? err.message : 'unknown fetch error',
    }
  }
}
