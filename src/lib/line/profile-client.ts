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

/**
 * 拿群組內成員 profile（不限好友、所有 OA 都能用）
 *
 * Endpoint: GET /v2/bot/group/{groupId}/member/{userId}
 * 前提：Bot 跟該成員都還在群組內。
 *
 * 跟 fetchLineProfile 差別：
 *   - fetchLineProfile (`/v2/bot/profile/{userId}`) 只能拿 OA 好友的 profile、非好友 404
 *   - fetchLineGroupMemberProfile 不限好友、只要 Bot 在群組就能拿
 */
export interface FetchLineGroupMemberProfileOptions {
  groupId: string
  lineUserId: string
  channelAccessToken: string
}

export async function fetchLineGroupMemberProfile(
  opts: FetchLineGroupMemberProfileOptions
): Promise<LineProfile | null> {
  const { groupId, lineUserId, channelAccessToken } = opts
  if (!channelAccessToken || !lineUserId || !groupId) return null

  try {
    const url = `https://api.line.me/v2/bot/group/${encodeURIComponent(groupId)}/member/${encodeURIComponent(lineUserId)}`
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${channelAccessToken}` },
    })
    if (!res.ok) {
      logger.warn('LINE Get Group Member Profile non-2xx', {
        status: res.status,
        groupId,
        lineUserId,
      })
      return null
    }
    return (await res.json()) as LineProfile
  } catch (err) {
    logger.error('LINE Get Group Member Profile failed', err)
    return null
  }
}

/**
 * 拿多人聊天室成員 profile（room 版）
 * Endpoint: GET /v2/bot/room/{roomId}/member/{userId}
 */
export interface FetchLineRoomMemberProfileOptions {
  roomId: string
  lineUserId: string
  channelAccessToken: string
}

export async function fetchLineRoomMemberProfile(
  opts: FetchLineRoomMemberProfileOptions
): Promise<LineProfile | null> {
  const { roomId, lineUserId, channelAccessToken } = opts
  if (!channelAccessToken || !lineUserId || !roomId) return null

  try {
    const url = `https://api.line.me/v2/bot/room/${encodeURIComponent(roomId)}/member/${encodeURIComponent(lineUserId)}`
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${channelAccessToken}` },
    })
    if (!res.ok) {
      logger.warn('LINE Get Room Member Profile non-2xx', {
        status: res.status,
        roomId,
        lineUserId,
      })
      return null
    }
    return (await res.json()) as LineProfile
  } catch (err) {
    logger.error('LINE Get Room Member Profile failed', err)
    return null
  }
}

/**
 * 拿群組摘要（群組名 / 頭像）
 *
 * Endpoint: GET /v2/bot/group/{groupId}/summary
 * 回 { groupId, groupName, pictureUrl }
 *
 * 前提：Bot 還在群組內、且該 OA 有權限（一般 OA 即可、不需 Verified）
 * — 2026-05-18 William 實測角落旅遊 OA 可拿到。
 *
 * 用途：webhook 收到群組訊息時、第一次見到此群組就 fetch、cache 到 inbox_conversations.display_name + picture_url
 */
export interface FetchLineGroupSummaryOptions {
  groupId: string
  channelAccessToken: string
}

export interface LineGroupSummary {
  groupId: string
  groupName: string
  pictureUrl?: string
}

export async function fetchLineGroupSummary(
  opts: FetchLineGroupSummaryOptions
): Promise<LineGroupSummary | null> {
  const { groupId, channelAccessToken } = opts
  if (!channelAccessToken || !groupId) return null

  try {
    const url = `https://api.line.me/v2/bot/group/${encodeURIComponent(groupId)}/summary`
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${channelAccessToken}` },
    })
    if (!res.ok) {
      logger.warn('LINE Get Group Summary non-2xx', { status: res.status, groupId })
      return null
    }
    return (await res.json()) as LineGroupSummary
  } catch (err) {
    logger.error('LINE Get Group Summary failed', err)
    return null
  }
}
