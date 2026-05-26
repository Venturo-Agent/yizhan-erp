import { NextRequest } from 'next/server'
import { z } from 'zod'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { recordApiAuditContext } from '@/lib/audit/audit-helper'
import { logger } from '@/lib/utils/logger'
import { successResponse, errorResponse, ErrorCode } from '@/lib/api/response'
import { checkRateLimit } from '@/lib/rate-limit'
import { validateBody } from '@/lib/api/validation'
import { getServerAuth } from '@/lib/auth/server-auth'

/**
 * 員工自助更新「自己的」頭像 avatar_url
 *
 * auth-only 合理：登入者只能改自己那列（用 session 的 employeeId 鎖定、不收 client 傳的 id）、
 * 不需 HR_MANAGE_EMPLOYEES 權限。頭像檔本身已先經 /api/storage/upload（租戶隔離 + MIME 白名單）。
 * 用途：側邊欄「個人偏好」dialog 的上傳照片（取代舊個人設定頁的整張 EmployeeForm）。
 */
const bodySchema = z.object({
  avatar_url: z.string().url().nullable(),
})

export async function PATCH(request: NextRequest) {
  try {
    const rateLimited = await checkRateLimit(request, 'profile-avatar', 10, 60_000)
    if (rateLimited) return rateLimited

    const auth = await getServerAuth()
    if (!auth.success) {
      return errorResponse('請先登入', 401, ErrorCode.UNAUTHORIZED)
    }

    const validation = await validateBody(request, bodySchema)
    if (!validation.success) return validation.error
    const { avatar_url } = validation.data

    const supabaseAdmin = getSupabaseAdminClient()
    await recordApiAuditContext(supabaseAdmin, {
      actorId: auth.data.employeeId,
      reason: 'self update avatar',
    })

    // 用 session 的 employeeId 鎖定、只能改自己（不信任 client 傳的任何 id）
    const { error } = await supabaseAdmin
      .from('employees')
      .update({ avatar_url })
      .eq('id', auth.data.employeeId)

    if (error) {
      logger.error('[profile.avatar] update failed:', error)
      return errorResponse('頭像更新失敗', 500, ErrorCode.INTERNAL_ERROR)
    }

    return successResponse({ avatar_url })
  } catch (err) {
    logger.error('[profile.avatar] unexpected error:', err)
    return errorResponse('頭像更新失敗', 500, ErrorCode.INTERNAL_ERROR)
  }
}
