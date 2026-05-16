/**
 * Instagram Graph API client — IG Business Account 驗證
 *
 * IG DM 走 Meta Graph API、但需 IG Business Account 綁定 FB Page。
 * 用 Page Access Token 操作（不是 IG 自己的 token）。
 *
 * Setup Wizard 用：填完 page_access_token + ig_business_account_id 後驗證。
 */

import { logger } from '@/lib/utils/logger'

const META_GRAPH_VERSION = 'v21.0'
const META_GRAPH_BASE = `https://graph.facebook.com/${META_GRAPH_VERSION}`

export interface InstagramBusinessInfo {
  igBusinessAccountId: string
  igUsername: string
  igName?: string
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
 * 用 Page Access Token + IG Business Account ID 驗證權限。
 *
 * 流程：
 *   1. GET /{ig_business_account_id}?fields=id,username,name,profile_picture_url
 *   2. 順帶查綁定的 FB Page（GET /me?fields=instagram_business_account 反查）
 *
 * 失敗：
 *   - 100 Invalid parameter（IG Business ID 不對 / token 不對 page）
 *   - 190 Invalid OAuth token
 *   - 200 缺 instagram_basic / instagram_manage_messages 權限
 */
export async function validateInstagramBusinessAccount(
  pageAccessToken: string,
  igBusinessAccountId: string
): Promise<ValidateInstagramResult> {
  const token = (pageAccessToken || '').trim()
  const igId = (igBusinessAccountId || '').trim()
  if (!token) return { ok: false, error: 'page_access_token 不能為空' }
  if (!igId) return { ok: false, error: 'ig_business_account_id 不能為空' }

  try {
    const url = `${META_GRAPH_BASE}/${encodeURIComponent(igId)}?fields=id,username,name,profile_picture_url&access_token=${encodeURIComponent(token)}`
    const res = await fetch(url, { method: 'GET' })

    if (!res.ok) {
      const body = await res.text().catch(() => '')
      logger.warn('IG Business validation failed', { status: res.status, body })
      let parsed: { error?: { code?: number; message?: string } } | null = null
      try {
        parsed = JSON.parse(body)
      } catch {
        // not JSON
      }
      const code = parsed?.error?.code
      const msg = parsed?.error?.message
      let friendly: string
      if (code === 190) friendly = 'Page Access Token 無效或過期'
      else if (code === 100) friendly = 'IG Business Account ID 錯誤、或 token 對應的 FB Page 沒綁這個 IG 帳號'
      else if (code === 200) friendly = '缺 instagram_basic / instagram_manage_messages 權限'
      else if (msg) friendly = `Meta API 錯誤：${msg}`
      else friendly = `Meta API 錯誤（HTTP ${res.status}）`
      return { ok: false, status: res.status, error: friendly }
    }

    const data = (await res.json()) as {
      id: string
      username: string
      name?: string
      profile_picture_url?: string
    }

    // 順便查綁定的 FB Page（best effort）
    let linkedFbPageId: string | undefined
    try {
      const pageRes = await fetch(
        `${META_GRAPH_BASE}/me?fields=id,instagram_business_account&access_token=${encodeURIComponent(token)}`
      )
      if (pageRes.ok) {
        const pageData = (await pageRes.json()) as {
          id?: string
          instagram_business_account?: { id?: string }
        }
        if (pageData.instagram_business_account?.id === data.id) {
          linkedFbPageId = pageData.id
        }
      }
    } catch {
      // ignore、linkedFbPageId 留空
    }

    return {
      ok: true,
      info: {
        igBusinessAccountId: data.id,
        igUsername: data.username,
        igName: data.name,
        linkedFbPageId,
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
