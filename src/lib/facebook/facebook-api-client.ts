/**
 * Facebook Graph API client — Page Access Token 驗證 / Page info 查詢
 *
 * Setup Wizard 用：填完 page_access_token 後、打 GET /me?fields=id,name,access_token
 * 驗 token 有效、順便拿 page_id / page_name。
 *
 * Multi-tenant：每 workspace 自己的 token、不走 .env。
 */

import { logger } from '@/lib/utils/logger'

const META_GRAPH_VERSION = 'v21.0'
const META_GRAPH_BASE = `https://graph.facebook.com/${META_GRAPH_VERSION}`

export interface FacebookPageInfo {
  pageId: string
  pageName: string
  category?: string
  pictureUrl?: string
}

export interface ValidatePageTokenResult {
  ok: boolean
  info?: FacebookPageInfo
  error?: string
  status?: number
}

/**
 * 用 Page Access Token 打 Meta Graph API、驗證 token 有效。
 *
 * 成功 → 回 pageId / pageName、UI 可顯示「✅ 連到 Page: 角落郵輪」
 * 失敗常見 status：
 *   - 190 Invalid OAuth access token
 *   - 200 Permission denied（token 沒有 pages_messaging 權限）
 *   - 400 Bad request
 *
 * 文件：https://developers.facebook.com/docs/graph-api/reference/page/
 */
export async function validatePageAccessToken(
  pageAccessToken: string
): Promise<ValidatePageTokenResult> {
  const token = (pageAccessToken || '').trim()
  if (!token) {
    return { ok: false, error: 'page_access_token 不能為空' }
  }

  try {
    // /me on a Page Access Token returns the Page entity (not user)
    const url = `${META_GRAPH_BASE}/me?fields=id,name,category,picture&access_token=${encodeURIComponent(token)}`
    const res = await fetch(url, { method: 'GET' })

    if (!res.ok) {
      const body = await res.text().catch(() => '')
      logger.warn('FB Page token validation failed', { status: res.status, body })
      let parsed: { error?: { code?: number; message?: string } } | null = null
      try {
        parsed = JSON.parse(body)
      } catch {
        // body 不是 JSON
      }
      const metaCode = parsed?.error?.code
      const metaMsg = parsed?.error?.message
      let friendly: string
      if (metaCode === 190) {
        friendly = 'Page Access Token 無效或已過期（請重新從 Meta Business Suite 產一個 long-lived token）'
      } else if (metaCode === 200) {
        friendly = 'token 缺少 pages_messaging 權限（請在 App Review 取得權限後重新產 token）'
      } else if (metaMsg) {
        friendly = `Meta API 錯誤：${metaMsg}`
      } else {
        friendly = `Meta API 錯誤（HTTP ${res.status}）`
      }
      return { ok: false, status: res.status, error: friendly }
    }

    const data = (await res.json()) as {
      id: string
      name: string
      category?: string
      picture?: { data?: { url?: string } }
    }
    return {
      ok: true,
      info: {
        pageId: data.id,
        pageName: data.name,
        category: data.category,
        pictureUrl: data.picture?.data?.url,
      },
      status: 200,
    }
  } catch (error) {
    logger.error('FB Page info fetch error', { error })
    return {
      ok: false,
      error: error instanceof Error ? error.message : '無法連 Meta Graph API',
    }
  }
}
