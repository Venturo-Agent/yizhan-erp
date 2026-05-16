/**
 * LINE Messaging API client — token 驗證 / bot info 查詢
 *
 * Setup Wizard 用：填完 channel_access_token / channel_secret 後、
 * 打 GET /v2/bot/info 驗證 token 有效、順便拿 botUserId / channel_id。
 *
 * Multi-tenant：每 workspace 自己的 token、不走 .env。
 */

import { logger } from '@/lib/utils/logger'

const LINE_BOT_INFO_ENDPOINT = 'https://api.line.me/v2/bot/info'

export interface LineBotInfo {
  userId: string         // bot 自己的 LINE user ID（webhook destination）
  basicId: string        // @abc123 顯示用 ID
  displayName: string
  pictureUrl?: string
  premiumId?: string
  chatMode: 'chat' | 'bot'
  markAsReadMode: 'auto' | 'manual'
}

export interface ValidateTokenResult {
  ok: boolean
  info?: LineBotInfo
  error?: string
  status?: number
}

/**
 * 用 channel_access_token 打 LINE Bot Info API、驗證 token 有效。
 * 成功回 botUserId / displayName 等、可拿來在 UI 顯示「✅ 連到 OA: 角落郵輪」之類。
 *
 * 失敗的常見 status：
 * - 401 invalid token
 * - 403 token 不對 channel
 * - 5xx LINE 那邊壞
 */
export async function validateChannelAccessToken(
  channelAccessToken: string
): Promise<ValidateTokenResult> {
  if (!channelAccessToken || channelAccessToken.trim().length === 0) {
    return { ok: false, error: 'channel_access_token 不能為空' }
  }

  try {
    const res = await fetch(LINE_BOT_INFO_ENDPOINT, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${channelAccessToken.trim()}`,
      },
    })

    if (!res.ok) {
      const body = await res.text().catch(() => '')
      logger.warn('LINE bot info validation failed', { status: res.status, body })
      return {
        ok: false,
        status: res.status,
        error:
          res.status === 401
            ? 'channel_access_token 無效'
            : res.status === 403
              ? 'token 跟 channel 對不上、請確認複製的是同一個 channel'
              : `LINE API 錯誤（HTTP ${res.status}）`,
      }
    }

    const info = (await res.json()) as LineBotInfo
    return { ok: true, info, status: 200 }
  } catch (error) {
    logger.error('LINE bot info fetch error', { error })
    return {
      ok: false,
      error: error instanceof Error ? error.message : '無法連 LINE API',
    }
  }
}
