import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { logger } from '@/lib/utils/logger'

/**
 * POST /api/auth/logout
 *
 * 主動清除：
 *   1. server-side Supabase session（雙保險、即使 client signOut 失敗也保證 server 端清掉）
 *   2. venturo-workspace-id cookie
 *
 * Client 端的 `auth-store.logout()` 會先呼叫 `supabase.auth.signOut()` 再 fetch 此 API。
 */
/**
 * 故意不守 requireCapability：登出、登入後即可用、不需 capability
 */
export async function POST() {
  // 1. server-side signOut（雙保險）
  try {
    const supabase = await createSupabaseServerClient()
    await supabase.auth.signOut()
  } catch (err) {
    logger.warn('Server-side signOut failed (non-fatal):', err)
  }

  // 2. 清 venturo-workspace-id cookie
  const response = NextResponse.json({ success: true })
  response.cookies.set('venturo-workspace-id', '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0, // 立刻過期
  })
  return response
}
