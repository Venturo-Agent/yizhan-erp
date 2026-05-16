/**
 * GET /api/pexels/search
 *
 * Server-side proxy for Pexels image search.
 * PEXELS_API_KEY is kept server-only — never exposed to the browser.
 *
 * Query params:
 *   query     - search term (required)
 *   per_page  - number of results (default 15, max 80)
 *   page      - page number (default 1)
 *   orientation - landscape | portrait | square (optional)
 *
 * 🔒 Requires: auth + rate limit 30 req/min per IP
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerAuth } from '@/lib/auth/server-auth'
import { checkRateLimit } from '@/lib/rate-limit'
import { logger } from '@/lib/utils/logger'

const PEXELS_API_URL = 'https://api.pexels.com/v1'

export async function GET(request: NextRequest) {
  try {
    // 🔒 Rate limiting: 30 req/min per IP（Pexels free tier 有流量上限）
    const rateLimited = await checkRateLimit(request, 'pexels-search', 30, 60_000)
    if (rateLimited) return rateLimited

    // 🔒 需要登入（API key 只給已認證用戶用）
    const auth = await getServerAuth()
    if (!auth.success) {
      return NextResponse.json({ error: '請先登入' }, { status: 401 })
    }

    const apiKey = process.env.PEXELS_API_KEY
    if (!apiKey) {
      logger.warn('pexels-search: PEXELS_API_KEY 未設定')
      return NextResponse.json({ error: 'Pexels API 未設定' }, { status: 503 })
    }

    const { searchParams } = request.nextUrl
    const query = searchParams.get('query')
    if (!query || !query.trim()) {
      return NextResponse.json({ error: '請提供搜尋關鍵字' }, { status: 400 })
    }

    const perPage = Math.min(parseInt(searchParams.get('per_page') ?? '15', 10) || 15, 80)
    const page = Math.max(parseInt(searchParams.get('page') ?? '1', 10) || 1, 1)
    const orientation = searchParams.get('orientation') ?? ''

    const params = new URLSearchParams({
      query: query.trim(),
      per_page: String(perPage),
      page: String(page),
      ...(orientation && { orientation }),
    })

    const response = await fetch(`${PEXELS_API_URL}/search?${params}`, {
      headers: {
        Authorization: apiKey,
      },
    })

    if (!response.ok) {
      if (response.status === 401) {
        logger.error('pexels-search: API key 無效')
        return NextResponse.json({ error: 'Pexels API 驗證失敗' }, { status: 502 })
      }
      if (response.status === 429) {
        return NextResponse.json({ error: 'Pexels API 請求次數過多，請稍後再試' }, { status: 429 })
      }
      logger.warn(`pexels-search: upstream error ${response.status}`)
      return NextResponse.json({ error: `Pexels API 錯誤: ${response.status}` }, { status: 502 })
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (err) {
    logger.error('pexels-search: unexpected error', err)
    return NextResponse.json({ error: '搜尋失敗，請稍後再試' }, { status: 500 })
  }
}
