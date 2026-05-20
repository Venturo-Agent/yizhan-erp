import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { nanoid } from 'nanoid'

/**
 * Next.js Proxy - 伺服器端路由保護 + CSP nonce 注入（SEC-007）
 * 認證來源：Supabase Auth（session cookies 由 @supabase/ssr 管理）
 * CSP：每個 request 產生獨立 nonce、移除 unsafe-inline/unsafe-eval（script-src 嚴格模式）
 *
 * Next.js 16 起 middleware → proxy 命名變更、檔名 / 函式名同步改、行為不變。
 */

/**
 * 產生 CSP header（nonce-based Strict CSP）
 * script-src 走 nonce + strict-dynamic、捨棄 unsafe-inline / unsafe-eval
 * style-src 保留 unsafe-inline（CSS-in-JS / Google Fonts 需要）
 */
function buildCSPHeader(nonce: string): string {
  return [
    `default-src 'self'`,
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`,
    `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com`,
    `img-src 'self' data: blob: https:`,
    `font-src 'self' data: https://fonts.gstatic.com`,
    `connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.taishinbank.com.tw https://tspg.taishinbank.com.tw https://*.sentry.io https://api.open-meteo.com`,
    `frame-src 'self' blob: https://aitoearn.venturo.tw`,
    `object-src 'self' blob:`,
    `worker-src 'self' blob:`,
  ].join('; ')
}

// 公開路由白名單。
// 精確匹配 + 子路徑 prefix 分兩組、避免 `/api/auth` 這種過寬 prefix 把敏感 API 放行。
const EXACT_PUBLIC_PATHS = new Set<string>([
  // === 頁面（無子路由者）===
  '/landing',
  '/login',
  '/confirm',
  '/public',
  '/view',
  '/game',
  '/app',
  // === 靜態資源 ===
  '/favicon.ico',
  '/manifest.json',
  // === 認證 API ===
  '/api/auth/validate-login',
  '/api/auth/logout',
  // layout-context 自帶未登入處理（回 { ok: false }）、proxy 不需要攔截
  '/api/auth/layout-context',
  // sync-employee：解「登入時 session cookie 尚未就緒」的雞生蛋問題。
  // 自帶 access_token 驗證（比 cookie session 更嚴、已是 defense-in-depth）。
  '/api/auth/sync-employee',
  '/api/health',
  // === 客戶簽單確認（透過分享連結）===
  '/api/contracts/sign',
  // === LINE Webhook（LINE 伺服器打過來、不需認證）===
  '/api/line/webhook',
])

const PREFIX_PUBLIC_PATHS: readonly string[] = [
  // === 頁面子路由（帶斜線避開 /login-x 這類誤中）===
  '/login/',
  '/public/',
  '/view/',
  '/p/',
  '/game/',
  '/setup/',
  // APP 頁面（需登入）
  '/app/',
  // 客戶自助付款頁（invoices.public_token、14 天過期、5/14 William 拍板）
  '/pay/',
  // === Server-to-server webhook ===
  // === Cron (Vercel internal) ===
  '/api/cron/',
  // === 分享連結 ===
  '/api/itineraries/',
  '/api/d/',
  '/api/setup-tokens/',
  // 客戶自助付款 API（token + admin client 守門、不靠 session）
  '/api/public/',
  // === Next.js static ===
  '/_next/',
]

function isPublicPath(pathname: string): boolean {
  if (EXACT_PUBLIC_PATHS.has(pathname)) return true
  return PREFIX_PUBLIC_PATHS.some(p => pathname.startsWith(p))
}

async function isAuthenticated(request: NextRequest, response: NextResponse): Promise<boolean> {
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          // 讓 Supabase 刷新過期 token、把新 cookie 寫回 response
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value)
            response.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()
  return !!user
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // SEC-007：每個 request 產生獨立 nonce、透過 x-nonce header 傳給 Server Components
  const nonce = Buffer.from(nanoid()).toString('base64')
  const cspHeader = buildCSPHeader(nonce)

  // 把 nonce 注入 request headers、讓 layout.tsx 能用 headers().get('x-nonce') 拿到
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-nonce', nonce)

  const response = NextResponse.next({ request: { headers: requestHeaders } })

  // 在 response 上設 CSP（proxy 優先、會覆蓋 next.config.ts 的靜態 CSP）
  response.headers.set('Content-Security-Policy', cspHeader)

  // 根路由（Landing Page）為精確匹配
  if (pathname === '/') {
    return response
  }

  // 公開路由白名單、精確匹配。
  // 敏感 API（reset-employee-password / change-password 等）必須走登入守門
  // （endpoint 本身有 getServerAuth 是第二道、proxy 是第一道）。
  if (isPublicPath(pathname)) {
    return response
  }

  // 驗證 Supabase session
  const authed = await isAuthenticated(request, response)
  if (authed) {
    return response
  }

  // 未登入 → 重導
  const loginUrl = new URL('/login', request.url)
  if (pathname !== '/dashboard') {
    loginUrl.searchParams.set('redirect', pathname)
  }
  return NextResponse.redirect(loginUrl)
}

export const config = {
  matcher: [
    /*
     * 匹配所有路由，除了：
     * - _next/static (靜態檔案)
     * - _next/image (圖片優化)
     * - favicon.ico (網站圖標)
     * - robots.txt / sitemap.xml (爬蟲規範、SEO)
     * - public 資料夾內的檔案
     */
    '/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|contract-templates|.*\\.(?:svg|png|jpg|jpeg|gif|webp|html)$).*)',
  ],
}
