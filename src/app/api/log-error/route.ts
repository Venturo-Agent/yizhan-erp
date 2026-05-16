import { NextRequest } from 'next/server'
import { logger } from '@/lib/utils/logger'
import { successResponse, errorResponse, ErrorCode } from '@/lib/api/response'
import { getServerAuth } from '@/lib/auth/server-auth'
import { validateBody } from '@/lib/api/validation'
import { logErrorSchema } from '@/lib/validations/api-schemas'

/**
 * 錯誤回報 API
 *
 * 前端把瀏覽器端錯誤丟過來、寫進 logger（會經 Sentry / structured log pipeline）
 * 不再寫本機檔案：Vercel/serverless 上 fs 唯讀、寫了等於沒寫。
 *
 * auth-only 合理：員工自己的瀏覽器錯誤、登入即可
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await getServerAuth()
    if (!auth.success) {
      return errorResponse(auth.error.error, 401, ErrorCode.UNAUTHORIZED)
    }

    const validation = await validateBody(request, logErrorSchema)
    if (!validation.success) return validation.error

    logger.error('[client-error]', {
      ...validation.data,
      employeeId: auth.data.employeeId,
      workspaceId: auth.data.workspaceId,
      userAgent: request.headers.get('user-agent'),
      url: request.headers.get('referer'),
    })

    return successResponse(null)
  } catch (error) {
    logger.error('Failed to log error:', error)
    return errorResponse('Failed to log error', 500, ErrorCode.INTERNAL_ERROR)
  }
}
