/**
 * GET /api/unsplash/search
 *
 * Server-side proxy for Unsplash image search.
 * UNSPLASH_ACCESS_KEY is kept server-only — never exposed to the browser.
 *
 * Query params:
 *   query       - search term (required)
 *   per_page    - number of results (default 12, max 30)
 *   page        - page number (default 1)
 *   orientation - landscape | portrait | squarish (optional)
 *
 * 🔒 Requires: auth + rate limit 30 req/min per IP
 *
 * Note: Unsplash API requires triggering a download event when an image is
 * selected. The download_location URL is included in the response so the
 * client can call /api/unsplash/trigger-download (or directly hit the URL
 * with the Authorization header from this proxy).
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerAuth } from '@/lib/auth/server-auth'
import { checkRateLimit } from '@/lib/rate-limit'
import { logger } from '@/lib/utils/logger'

const UNSPLASH_API_URL = 'https://api.unsplash.com'

export async function GET(request: NextRequest) {
  try {
    // 🔒 Rate limiting: 30 req/min per IP（Unsplash free tier 50 req/hour）
    const rateLimited = await checkRateLimit(request, 'unsplash-search', 30, 60_000)
    if (rateLimited) return rateLimited

    // 🔒 需要登入
    const auth = await getServerAuth()
    if (!auth.success) {
      return NextResponse.json({ error: '請先登入' }, { status: 401 })
    }

    const accessKey = process.env.UNSPLASH_ACCESS_KEY
    if (!accessKey) {
      logger.warn('unsplash-search: UNSPLASH_ACCESS_KEY 未設定')
      return NextResponse.json({ error: 'Unsplash API 未設定' }, { status: 503 })
    }

    const { searchParams } = request.nextUrl
    const query = searchParams.get('query')
    if (!query || !query.trim()) {
      return NextResponse.json({ error: '請提供搜尋關鍵字' }, { status: 400 })
    }

    const perPage = Math.min(parseInt(searchParams.get('per_page') ?? '12', 10) || 12, 30)
    const page = Math.max(parseInt(searchParams.get('page') ?? '1', 10) || 1, 1)
    const orientation = searchParams.get('orientation') ?? ''

    const params = new URLSearchParams({
      query: query.trim(),
      per_page: String(perPage),
      page: String(page),
      ...(orientation && { orientation }),
    })

    const response = await fetch(`${UNSPLASH_API_URL}/search/photos?${params}`, {
      headers: {
        Authorization: `Client-ID ${accessKey}`,
      },
    })

    if (!response.ok) {
      if (response.status === 401) {
        logger.error('unsplash-search: access key 無效')
        return NextResponse.json({ error: 'Unsplash API 驗證失敗' }, { status: 502 })
      }
      if (response.status === 403) {
        return NextResponse.json({ error: 'Unsplash API 超過請求限制' }, { status: 429 })
      }
      logger.warn(`unsplash-search: upstream error ${response.status}`)
      return NextResponse.json({ error: `Unsplash API 錯誤: ${response.status}` }, { status: 502 })
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (err) {
    logger.error('unsplash-search: unexpected error', err)
    return NextResponse.json({ error: '搜尋失敗，請稍後再試' }, { status: 500 })
  }
}
