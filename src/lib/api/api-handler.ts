import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/utils/logger'

/** Shared error shape returned by the catch wrapper */
export interface ApiErrorBody {
  success: false
  error: string
  code?: string
}

/**
 * 統一 API try-catch wrapper
 * 讓所有 route handler 不用重複寫 catch block
 *
 * 使用方式：
 *   export const POST = apiHandler(async (req) => {
 *     const data = await req.json()
 *     return NextResponse.json({ data })
 *   })
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function apiHandler(handler: (...args: any[]) => Promise<Response>): (req: NextRequest) => Promise<Response> {
  return async (req: NextRequest) => {
    try {
      return await handler(req)
    } catch (error) {
      logger.error('API Error', { path: req.nextUrl.pathname, error })
      return NextResponse.json(
        { success: false, error: '系統錯誤，請稍後再試' } satisfies ApiErrorBody,
        { status: 500 }
      )
    }
  }
}
