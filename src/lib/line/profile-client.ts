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

/**
 * 拿群組所有成員 line_user_id 陣列（cursor pagination）
 *
 * Endpoint: GET /v2/bot/group/{groupId}/members/ids
 * 文件寫「Verified / Premium only」、但 2026-05-18 角落旅遊（一般 OA）實測也通、
 * 走得通就用、走不通會回 403、caller 拿到 null fall back。
 *
 * 用途：bot 第一次見到群組時、把全員 ID 抓出來、再逐個 fetchLineGroupMemberProfile
 * cache 進 line_user_profiles。這樣連「沒發過訊息的成員」名字也有。
 *
 * 自動跨頁、回完整 ID 陣列（小群組通常 1 頁就結束）。
 */
export async function fetchLineGroupMemberIds(opts: {
  groupId: string
  channelAccessToken: string
}): Promise<string[] | null> {
  const { groupId, channelAccessToken } = opts
  if (!channelAccessToken || !groupId) return null

  const ids: string[] = []
  let cursor: string | undefined
  const MAX_PAGES = 20 // 群組上限 100~500 人、20 頁 100/頁 = 2000、足夠

  try {
    for (let page = 0; page < MAX_PAGES; page++) {
      const url = new URL(`https://api.line.me/v2/bot/group/${encodeURIComponent(groupId)}/members/ids`)
      if (cursor) url.searchParams.set('start', cursor)
      const res = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${channelAccessToken}` },
      })
      if (!res.ok) {
        logger.warn('LINE Get Group Member IDs non-2xx', { status: res.status, groupId })
        return null
      }
      const body = (await res.json()) as { memberIds: string[]; next?: string }
      ids.push(...(body.memberIds ?? []))
      if (!body.next) break
      cursor = body.next
    }
    return ids
  } catch (err) {
    logger.error('LINE Get Group Member IDs failed', err)
    return null
  }
}
