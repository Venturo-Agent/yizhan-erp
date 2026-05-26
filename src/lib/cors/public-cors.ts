/**
 * 公開 API CORS helper
 *
 * 業務語意（譬喻）：
 *   ERP 是後場、Corner 官網（corner.venturo.tw）是櫥窗。
 *   櫥窗從別的網域打進來的請求、瀏覽器預設會擋（同源政策）。
 *   這支 helper 給特定白名單來源「通行證」、其他來源仍會被瀏覽器擋。
 *
 * 規矩對齊：
 *   - 5/20 William 拍板：白名單僅 corner.venturo.tw + 開發機 localhost:4321（Astro 預設 port）
 *   - 嚴格白名單比對來源（不回 `*`、防被任何網站亂打）
 *   - 不包含 credentials（無 cookie 場景、純讀取 / 報名）
 *
 * 用法：
 *   export async function GET(req: NextRequest) {
 *     const res = NextResponse.json({ ... })
 *     return withPublicCors(req, res)
 *   }
 *   export async function OPTIONS(req: NextRequest) {
 *     return optionsResponse(req)
 *   }
 *
 * 為什麼放 lib 不放 middleware：
 *   middleware.ts 不存在、且 CORS 應該緊跟 API route、防之後其他人新增 middleware 蓋掉。
 *   單一 SSOT（這個檔）+ caller import = 不散刻。
 */

import { NextRequest, NextResponse } from 'next/server'

const PUBLIC_API_ALLOWED_ORIGINS = new Set<string>([
  'https://corner.venturo.tw',
  'http://localhost:4321', // Astro dev server 預設 port
])

const ALLOWED_METHODS = 'GET, POST, OPTIONS'
const ALLOWED_HEADERS = 'Content-Type, Accept'
const MAX_AGE_SECONDS = '600' // 10 分鐘、瀏覽器快取 preflight、減少 OPTIONS 次數

/**
 * 把白名單 CORS header 套到 response 上。
 * 來源不在白名單時：不設 ACAO header、瀏覽器自然會擋（不是 server 主動 403、避免誤殺）
 *
 * 接受 Response 或 NextResponse（dbErrorResponse / checkRateLimit 回 Response、
 * NextResponse.json 回 NextResponse、都要支援）。
 */
export function withPublicCors<T extends Response>(request: NextRequest, response: T): T {
  const origin = request.headers.get('origin')
  if (origin && PUBLIC_API_ALLOWED_ORIGINS.has(origin)) {
    response.headers.set('Access-Control-Allow-Origin', origin)
    response.headers.set('Vary', 'Origin')
    response.headers.set('Access-Control-Allow-Methods', ALLOWED_METHODS)
    response.headers.set('Access-Control-Allow-Headers', ALLOWED_HEADERS)
  }
  return response
}

/**
 * Preflight OPTIONS handler。
 * 瀏覽器在跨網域 POST application/json 前會先打 OPTIONS、必須回 200 + CORS header
 * 否則實際的 POST 不會送出。
 */
export function optionsResponse(request: NextRequest): NextResponse {
  const origin = request.headers.get('origin')
  const headers: Record<string, string> = {
    'Access-Control-Max-Age': MAX_AGE_SECONDS,
  }
  if (origin && PUBLIC_API_ALLOWED_ORIGINS.has(origin)) {
    headers['Access-Control-Allow-Origin'] = origin
    headers['Vary'] = 'Origin'
    headers['Access-Control-Allow-Methods'] = ALLOWED_METHODS
    headers['Access-Control-Allow-Headers'] = ALLOWED_HEADERS
  }
  return new NextResponse(null, { status: 204, headers })
}
