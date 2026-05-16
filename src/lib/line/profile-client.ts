/**
 * LINE Get Profile API client
 *
 * https://developers.line.biz/en/reference/messaging-api/#get-profile
 *
 * webhook 收到陌生 line_user_id 時、用這個 fetch profile（display name / picture url）。
 */

import { logger } from '@/lib/utils/logger'

const LINE_PROFILE_BASE = 'https://api.line.me/v2/bot/profile'

export interface LineProfile {
  userId: string
  displayName: string
  pictureUrl?: string
  statusMessage?: string
  language?: string
}

export interface FetchLineProfileOptions {
  lineUserId: string
  channelAccessToken: string
}

export async function fetchLineProfile(opts: FetchLineProfileOptions): Promise<LineProfile | null> {
  const { lineUserId, channelAccessToken } = opts
  if (!channelAccessToken || !lineUserId) return null

  try {
    const res = await fetch(`${LINE_PROFILE_BASE}/${encodeURIComponent(lineUserId)}`, {
      headers: { Authorization: `Bearer ${channelAccessToken}` },
    })
    if (!res.ok) {
      logger.warn('LINE Get Profile non-2xx', { status: res.status, lineUserId })
      return null
    }
    return (await res.json()) as LineProfile
  } catch (err) {
    logger.error('LINE Get Profile failed', err)
    return null
  }
}
