import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/utils/logger'
import { errorResponse, ErrorCode } from '@/lib/api/response'
import { getServerAuth } from '@/lib/auth/server-auth'
import { validateBody } from '@/lib/api/validation'
import { fetchImageSchema } from '@/lib/validations/api-schemas'

/**
 * 後端 API 代理下載圖片、繞過瀏覽器的 CORS 限制
 *
 * 🔒 SSRF 防護：
 * 1. 必須登入
 * 2. 強制 https://（拒絕 http / file / gopher 等）
 * 3. 拒絕 private / reserved / link-local IP（內網探測 / metadata 攻擊）
 * 4. content-type 必須 image/*
 *
 * 此 API 成功時直接回傳圖片 binary，錯誤時使用統一 JSON 格式
 */

/**
 * 阻擋 SSRF 用：拒絕指向內網 / 雲端 metadata 的 hostname / IP
 * - localhost / 127.0.0.0/8
 * - 0.0.0.0
 * - 10.0.0.0/8
 * - 172.16.0.0/12
 * - 192.168.0.0/16
 * - 169.254.0.0/16（含 AWS metadata 169.254.169.254）
 * - ::1 / fd00::/8 / fe80::/10
 */
function isBlockedHostname(hostname: string): boolean {
  const lower = hostname.toLowerCase()
  if (lower === 'localhost' || lower.endsWith('.local') || lower.endsWith('.internal')) return true
  // IPv4 private ranges
  const ipv4 = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(lower)
  if (ipv4) {
    const [, a, b] = ipv4.map(Number)
    if (a === 127 || a === 10 || a === 0) return true
    if (a === 169 && b === 254) return true // AWS / GCP metadata
    if (a === 172 && b >= 16 && b <= 31) return true
    if (a === 192 && b === 168) return true
  }
  // IPv6
  if (
    lower === '::1' ||
    lower.startsWith('fc') ||
    lower.startsWith('fd') ||
    lower.startsWith('fe80:')
  )
    return true
  return false
}

export async function POST(request: NextRequest) {
  try {
    // 🔒 認證：防止未登入者使用此代理進行 SSRF 攻擊
    const auth = await getServerAuth()
    if (!auth.success) {
      return errorResponse(auth.error.error, 401, ErrorCode.UNAUTHORIZED)
    }

    const validation = await validateBody(request, fetchImageSchema)
    if (!validation.success) return validation.error
    const { url } = validation.data

    // 🔒 SSRF：強制 https + 擋私有 IP / metadata endpoint
    let parsed: URL
    try {
      parsed = new URL(url)
    } catch {
      return errorResponse('URL 格式錯誤', 400, ErrorCode.INVALID_FORMAT)
    }
    if (parsed.protocol !== 'https:') {
      return errorResponse('只接受 https:// URL', 400, ErrorCode.VALIDATION_ERROR)
    }
    if (isBlockedHostname(parsed.hostname)) {
      return errorResponse('禁止的目標主機', 400, ErrorCode.VALIDATION_ERROR)
    }

    // 下載圖片
    const response = await fetch(url, {
      headers: {
        // 模擬瀏覽器請求
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: 'image/*,*/*;q=0.8',
      },
    })

    if (!response.ok) {
      return errorResponse('無法下載圖片', 502, ErrorCode.EXTERNAL_API_ERROR)
    }

    const contentType = response.headers.get('content-type') || 'image/jpeg'

    // 確認是圖片類型
    if (!contentType.startsWith('image/')) {
      return errorResponse('URL 不是圖片', 400, ErrorCode.INVALID_FORMAT)
    }

    const imageBuffer = await response.arrayBuffer()

    // 回傳圖片資料（這是特殊情況，成功時直接回傳 binary）
    return new NextResponse(imageBuffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=3600',
      },
    })
  } catch (error) {
    logger.error('Fetch image error:', error)
    return errorResponse('下載圖片失敗', 500, ErrorCode.INTERNAL_ERROR)
  }
}
