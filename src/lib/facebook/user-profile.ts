/**
 * Facebook / Instagram User Profile lookup
 *
 * Messenger Platform 從 PSID（Page-Scoped User ID）反查 user 真名 + 頭像。
 *
 * Meta 限制（v18+）：
 *   - 必須有 pages_user_profile 或對應通道權限
 *   - 用戶必須在 24h 內 messaging 過 Page
 *   - 私人帳號 / 隱私設定嚴格的用戶可能 anyway 拿不到
 *
 * 拿不到就回 null name → caller 自己 fallback「FB 用戶 (PSID 後 4 碼)」。
 *
 * IG Direct 用同樣 Graph API、共用此 module（之後 IG webhook backfill 走 ensureContactProfile）。
 */

import { logger } from '@/lib/utils/logger'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'

const META_GRAPH_VERSION = 'v21.0'
const META_GRAPH_BASE = `https://graph.facebook.com/${META_GRAPH_VERSION}`

export interface UserProfileResult {
  name: string | null
  pictureUrl: string | null
}

async function fetchProfileFromGraphAPI(
  externalUserId: string,
  pageAccessToken: string
): Promise<UserProfileResult> {
  try {
    const url = `${META_GRAPH_BASE}/${encodeURIComponent(externalUserId)}?fields=name,first_name,last_name,profile_pic&access_token=${encodeURIComponent(pageAccessToken)}`
    const res = await fetch(url, { method: 'GET' })
    if (!res.ok) {
      const body = await res.text().catch(() => '')
      logger.debug('fb user profile fetch failed', {
        externalUserId,
        status: res.status,
        body: body.slice(0, 200),
      })
      return { name: null, pictureUrl: null }
    }
    const data = (await res.json()) as {
      name?: string
      first_name?: string
      last_name?: string
      profile_pic?: string
    }
    // 台灣慣用「姓 + 空格 + 名」、Meta 預設 name 是「名 姓」、有 first/last 就重組
    const name =
      data.last_name && data.first_name ? `${data.last_name} ${data.first_name}` : data.name || null
    return { name, pictureUrl: data.profile_pic || null }
  } catch (e) {
    logger.debug('fb user profile fetch error', { externalUserId, error: e })
    return { name: null, pictureUrl: null }
  }
}

/**
 * 確保 conversation 有 display_name + picture_url。
 * - 已有真名（非 fallback 格式）→ 跳過、避免每次訊息重打 Graph API
 * - 沒有 → call Graph API、拿到用真名、拿不到 fallback「FB 用戶 (後 4 碼)」
 *
 * channelLabel 用來組 fallback name（'FB' / 'IG'）。
 */
export async function ensureContactProfile(args: {
  conversationId: string
  externalUserId: string
  pageAccessToken: string | null
  channelLabel?: 'FB' | 'IG'
}): Promise<void> {
  const { conversationId, externalUserId, pageAccessToken } = args
  const channelLabel = args.channelLabel ?? 'FB'

  const supabase = getSupabaseAdminClient()

  // 檢查 conversation 現有 display_name（.bind 保 this、避免 supabase.from cast 後丟 context）
  const convTable = supabase.from.bind(supabase) as unknown as (table: string) => {
    select: (cols: string) => {
      eq: (
        col: string,
        value: string
      ) => {
        maybeSingle: () => Promise<{
          data: { display_name: string | null } | null
          error: { message: string } | null
        }>
      }
    }
  }
  const { data: conv } = await convTable('inbox_conversations')
    .select('display_name')
    .eq('id', conversationId)
    .maybeSingle()

  // 已有真名（不是 fallback「FB 用戶 / IG 用戶」開頭）→ 跳過
  if (conv?.display_name && !conv.display_name.startsWith(`${channelLabel} 用戶 `)) {
    return
  }

  // 嘗試 Graph API（沒 token 就直接走 fallback）
  let displayName: string | null = null
  let pictureUrl: string | null = null
  if (pageAccessToken) {
    const profile = await fetchProfileFromGraphAPI(externalUserId, pageAccessToken)
    displayName = profile.name
    pictureUrl = profile.pictureUrl
  }

  // Fallback：拿不到真名 → 「FB/IG 用戶 (PSID 後 4 碼)」
  if (!displayName) {
    displayName = `${channelLabel} 用戶 ${externalUserId.slice(-4)}`
  }

  const updateTable = supabase.from.bind(supabase) as unknown as (table: string) => {
    update: (values: { display_name?: string | null; picture_url?: string | null }) => {
      eq: (col: string, value: string) => Promise<{ error: { message: string } | null }>
    }
  }
  const { error } = await updateTable('inbox_conversations')
    .update({ display_name: displayName, picture_url: pictureUrl })
    .eq('id', conversationId)

  if (error) {
    logger.warn('ensureContactProfile update failed', { conversationId, error })
  }
}
