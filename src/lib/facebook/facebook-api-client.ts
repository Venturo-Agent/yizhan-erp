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
 * 成功 → 回 pageId（+ 拿得到的 pageName / category / picture）
 * 失敗常見 status：
 *   - 190 Invalid OAuth access token
 *   - 200 Permission denied（token 沒有 pages_messaging 權限）
 *   - 100 fields 需要 pages_read_engagement（v19+ 後加強）
 *   - 400 Bad request
 *
 * 兩階段策略（避免 pages_read_engagement 沒過 App Review 時整個卡住）：
 *   1. 先打 /me 不帶 fields、Meta 對 Page Access Token 預設回 {id, name}
 *      （這個基礎 endpoint 不需要 pages_read_engagement）
 *   2. 再試打 fields=category,picture 拿頭像 / 分類、失敗也 ok（pageName 可降級）
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
    const baseUrl = `${META_GRAPH_BASE}/me?access_token=${encodeURIComponent(token)}`
    const baseRes = await fetch(baseUrl, { method: 'GET' })

    if (!baseRes.ok) {
      const body = await baseRes.text().catch(() => '')
      logger.warn('FB Page token validation failed', { status: baseRes.status, body })
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
        friendly = `Meta API 錯誤（HTTP ${baseRes.status}）`
      }
      return { ok: false, status: baseRes.status, error: friendly }
    }

    const baseData = (await baseRes.json()) as { id: string; name?: string }
    const pageId = baseData.id
    let pageName = baseData.name || `Facebook Page (${pageId.slice(0, 6)})`
    let category: string | undefined
    let pictureUrl: string | undefined

    try {
      const extraUrl = `${META_GRAPH_BASE}/me?fields=name,category,picture&access_token=${encodeURIComponent(token)}`
      const extraRes = await fetch(extraUrl, { method: 'GET' })
      if (extraRes.ok) {
        const extraData = (await extraRes.json()) as {
          name?: string
          category?: string
          picture?: { data?: { url?: string } }
        }
        if (extraData.name) pageName = extraData.name
        category = extraData.category
        pictureUrl = extraData.picture?.data?.url
      }
    } catch {
      // extra fields 拿不到不算錯、token 有效就放行
    }

    return {
      ok: true,
      info: { pageId, pageName, category, pictureUrl },
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
