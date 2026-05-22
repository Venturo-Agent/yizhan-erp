/**
 * Instagram Graph API client — Meta 2024+ 新版 Instagram Business API（獨立、非 via FB Page）
 *
 * Meta 把 IG Messaging 拆出獨立 Business API：
 *   - 不再透過 FB Page Token 操作 IG
 *   - 用 Instagram User Access Token（OAuth via instagram.com/oauth）
 *   - Endpoint base: graph.instagram.com（不是 graph.facebook.com）
 *   - 權限：instagram_business_basic / instagram_business_manage_messages
 *
 * Setup Wizard 流程：
 *   - 客戶在 Meta App Dashboard 走 Instagram API setup 拿到 Instagram User Access Token
 *   - 貼回 wizard 一個 token、IG_ID 從 graph.instagram.com/me 反查
 */

import { logger } from '@/lib/utils/logger'

const IG_GRAPH_VERSION = 'v22.0'
const IG_GRAPH_BASE = `https://graph.instagram.com/${IG_GRAPH_VERSION}`

export interface InstagramBusinessInfo {
  igBusinessAccountId: string
  igUsername: string
  igName?: string
  /** Meta 新版 IG API 不再透過 FB Page、保留欄位給舊資料相容 */
  linkedFbPageId?: string
  pictureUrl?: string
}

export interface ValidateInstagramResult {
  ok: boolean
  info?: InstagramBusinessInfo
  error?: string
  status?: number
}

/**
 * 用 Instagram User Access Token 驗證。
 *
 * 流程：
 *   - GET graph.instagram.com/v22/me?fields=user_id,username,name,profile_picture_url
 *   - 回的 user_id / id 就是 IG_ID
 *
 * 失敗：
 *   - 190 token 無效或過期（IG token 60 天、要 refresh）
 *   - 200 缺 instagram_business_basic / manage_messages 權限
 */
export async function validateInstagramBusinessAccount(
  instagramUserAccessToken: string
): Promise<ValidateInstagramResult> {
  const token = (instagramUserAccessToken || '').trim()
  if (!token) return { ok: false, error: 'instagram_user_access_token 不能為空' }

  try {
    const url = `${IG_GRAPH_BASE}/me?fields=user_id,username,name,profile_picture_url&access_token=${encodeURIComponent(token)}`
    const res = await fetch(url, { method: 'GET' })

    if (!res.ok) {
      const body = await res.text().catch(() => '')
      logger.warn('IG Business validation failed', { status: res.status, body: body.slice(0, 300) })
      let parsed: { error?: { code?: number; message?: string } } | null = null
      try {
        parsed = JSON.parse(body)
      } catch {
        // not JSON
      }
      const code = parsed?.error?.code
      const msg = parsed?.error?.message
      let friendly: string
      if (code === 190) friendly = 'Instagram User Access Token 無效或已過期（60 天效期、要 refresh）'
      else if (code === 200) friendly = '缺 instagram_business_basic / instagram_business_manage_messages 權限'
      else if (msg) friendly = `Meta API 錯誤：${msg}`
      else friendly = `Meta API 錯誤（HTTP ${res.status}）`
      return { ok: false, status: res.status, error: friendly }
    }

    const data = (await res.json()) as {
      id?: string
      user_id?: string
      username: string
      name?: string
      profile_picture_url?: string
    }

    const igId = data.user_id || data.id
    if (!igId) {
      return { ok: false, error: 'Meta API 回應沒有 user_id / id 欄位、無法取得 IG Business ID' }
    }

    return {
      ok: true,
      info: {
        igBusinessAccountId: igId,
        igUsername: data.username,
        igName: data.name,
        pictureUrl: data.profile_picture_url,
      },
      status: 200,
    }
  } catch (error) {
    logger.error('IG Business fetch error', { error })
    return {
      ok: false,
      error: error instanceof Error ? error.message : '無法連 Meta Graph API',
    }
  }
}
