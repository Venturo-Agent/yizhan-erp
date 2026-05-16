/**
 * Sentry verification endpoint (上線前驗證、之後可移除)
 *
 * 用法：
 *   curl "https://erp.venturo.tw/api/_test/sentry-check?secret=$CRON_SECRET"
 *
 * 預期：
 *   - response: 500 + body { error: 'Sentry test triggered' }
 *   - Sentry dashboard 應在 1-2 分鐘內收到 event 'Sentry test - yizhan-erp ...'
 *
 * 驗完移除這個 file。
 */

import { NextRequest, NextResponse } from 'next/server'

// 跟 cron/process-tasks/route.ts 對齊、env 名統一用 CRON_SECRET
const CRON_SECRET = process.env.CRON_SECRET

export async function GET(request: NextRequest) {
  // 守門：只接受帶 secret 的呼叫（避免外部觸發 / 被掃 endpoint 觸發）
  const secret = request.nextUrl.searchParams.get('secret')
  if (!CRON_SECRET || secret !== CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // 故意 throw、不 catch、讓 Sentry 自動撈
  // Next.js 會把這個 unhandled error 變成 500 response
  throw new Error(`Sentry test - yizhan-erp ${new Date().toISOString()}`)
}
