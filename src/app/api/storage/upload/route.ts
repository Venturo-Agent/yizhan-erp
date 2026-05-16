import { NextRequest } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { logger } from '@/lib/utils/logger'
import { successResponse, errorResponse, ErrorCode } from '@/lib/api/response'
import { getServerAuth } from '@/lib/auth/server-auth'
import { checkRateLimit } from '@/lib/rate-limit'
import { translateDbError } from '@/lib/db-error-translate'
import { createApiClient } from '@/lib/supabase/api-client'
import { recordApiAuditContext } from '@/lib/audit/audit-helper'

/**
 * 檔案上傳 API
 * 🔒 需登入 + 檔案大小 / mime type 驗證
 */
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10 MB
const BUCKET_MIME_WHITELIST: Record<string, RegExp> = {
  'company-assets': /^image\/(png|jpeg|jpg|webp|svg\+xml)$/,
  'passport-images': /^image\/(png|jpeg|jpg|webp)$/,
  'member-documents': /^(image\/(png|jpeg|jpg|webp)|application\/pdf)$/,
  'user-avatars': /^image\/(png|jpeg|jpg|webp)$/,
}

export async function POST(request: NextRequest) {
  try {
    // 🔒 Rate limiting: 20 requests per minute (file upload)
    const rateLimited = await checkRateLimit(request, 'storage-upload', 20, 60_000)
    if (rateLimited) return rateLimited

    // 🔒 安全檢查：需要已登入用戶
    const auth = await getServerAuth()
    if (!auth.success) {
      return errorResponse('請先登入才能上傳檔案', 401, ErrorCode.UNAUTHORIZED)
    }

    const formData = await request.formData()
    const file = formData.get('file') as File
    const bucket = formData.get('bucket') as string
    const path = formData.get('path') as string

    if (!file || !bucket || !path) {
      return errorResponse(
        'Missing required fields: file, bucket, path',
        400,
        ErrorCode.MISSING_FIELD
      )
    }

    const allowedBuckets = Object.keys(BUCKET_MIME_WHITELIST)
    if (!allowedBuckets.includes(bucket)) {
      return errorResponse('Invalid bucket', 400, ErrorCode.VALIDATION_ERROR)
    }

    // 🔒 檔案大小限制（防 1GB 上傳吃光 storage / DDoS）
    if (file.size > MAX_FILE_SIZE) {
      return errorResponse(
        `檔案過大（最大 ${MAX_FILE_SIZE / 1024 / 1024} MB）`,
        413,
        ErrorCode.VALIDATION_ERROR
      )
    }

    // 🔒 Mime type 白名單（依 bucket 區分、防 passport-images bucket 被塞 PHP shell 等）
    const mimePattern = BUCKET_MIME_WHITELIST[bucket]
    if (!file.type || !mimePattern.test(file.type)) {
      return errorResponse(
        `此 bucket 不接受 ${file.type || '未知'} 類型的檔案`,
        400,
        ErrorCode.VALIDATION_ERROR
      )
    }

    // 🔒 租戶隔離：確保檔案路徑包含 workspace_id
    const workspaceId = auth.data.workspaceId
    if (!path.startsWith(`${workspaceId}/`)) {
      return errorResponse('檔案路徑必須以 workspace_id 開頭', 403, ErrorCode.FORBIDDEN)
    }

    const auditClient = await createApiClient()
    await recordApiAuditContext(auditClient, {
      actorId: auth.data.employeeId ?? '',
      reason: `上傳檔案 ${bucket}/${path}`,
    })

    const arrayBuffer = await file.arrayBuffer()
    let buffer = Buffer.from(arrayBuffer)

    // SEC-010：SVG 上傳必須先清除 XSS 載體（<script>、on* handler、javascript: href）
    // 攻擊向量：惡意 SVG 裡含 <script> 或 onload="fetch(...)"，若瀏覽器直接載入 SVG URL 會執行
    if (file.type === 'image/svg+xml') {
      const svgText = buffer.toString('utf-8')
      // 禁止含 <script> 任何變體（大小寫、空格、CDATA 包裝）
      if (/<script[\s>]/i.test(svgText) || /<!CDATA\[/i.test(svgText)) {
        return errorResponse('SVG 包含不允許的 script 元素', 400, ErrorCode.VALIDATION_ERROR)
      }
      // 禁止 on* 事件屬性（onload / onerror / onclick 等）
      if (/\bon\w+\s*=/i.test(svgText)) {
        return errorResponse('SVG 包含不允許的事件處理器屬性', 400, ErrorCode.VALIDATION_ERROR)
      }
      // 禁止 javascript: 偽協議（href / xlink:href）
      if (/javascript\s*:/i.test(svgText)) {
        return errorResponse('SVG 包含不允許的 javascript: 協議', 400, ErrorCode.VALIDATION_ERROR)
      }
      // 禁止外部資源載入（可被用來 exfiltrate data）
      if (/\bxlink:href\s*=\s*["']https?:/i.test(svgText)) {
        return errorResponse('SVG 包含不允許的外部資源引用', 400, ErrorCode.VALIDATION_ERROR)
      }
      // 通過檢查後用 sanitized text 重新建 buffer（清除 BOM / UTF-16）
      buffer = Buffer.from(svgText, 'utf-8')
    }

    const supabaseAdmin = getSupabaseAdminClient()
    const { data, error } = await supabaseAdmin.storage.from(bucket).upload(path, buffer, {
      contentType: file.type,
      upsert: false,
    })

    if (error) {
      logger.error('Storage upload error:', error)
      const t = translateDbError(error)
      return errorResponse(t.message, t.httpStatus, ErrorCode.INTERNAL_ERROR)
    }

    const { data: publicUrlData } = supabaseAdmin.storage.from(bucket).getPublicUrl(path)

    return successResponse({
      path: data.path,
      publicUrl: publicUrlData.publicUrl,
    })
  } catch (error) {
    logger.error('Upload API error:', error)
    const t = translateDbError(error)
    return errorResponse(t.message, t.httpStatus, ErrorCode.INTERNAL_ERROR)
  }
}

/**
 * 檔案刪除 API
 * 🔒 需登入
 */
export async function DELETE(request: NextRequest) {
  try {
    // 🔒 Rate limiting: 20 requests per minute (file delete)
    const rateLimited = await checkRateLimit(request, 'storage-delete', 20, 60_000)
    if (rateLimited) return rateLimited

    // 🔒 安全檢查：需要已登入用戶
    const auth = await getServerAuth()
    if (!auth.success) {
      return errorResponse('請先登入才能刪除檔案', 401, ErrorCode.UNAUTHORIZED)
    }

    const { searchParams } = new URL(request.url)
    const bucket = searchParams.get('bucket')
    const path = searchParams.get('path')

    if (!bucket || !path) {
      return errorResponse('Missing required params: bucket, path', 400, ErrorCode.MISSING_FIELD)
    }

    if (!Object.keys(BUCKET_MIME_WHITELIST).includes(bucket)) {
      return errorResponse('Invalid bucket', 400, ErrorCode.VALIDATION_ERROR)
    }

    // 🔒 租戶隔離：確保檔案路徑包含 workspace_id
    const workspaceId = auth.data.workspaceId
    if (!path.startsWith(`${workspaceId}/`)) {
      return errorResponse('只能刪除自己租戶的檔案', 403, ErrorCode.FORBIDDEN)
    }

    const auditClient = await createApiClient()
    await recordApiAuditContext(auditClient, {
      actorId: auth.data.employeeId ?? '',
      reason: `刪除檔案 ${bucket}/${path}`,
    })

    const supabaseAdmin = getSupabaseAdminClient()
    const { error } = await supabaseAdmin.storage.from(bucket).remove([path])

    if (error) {
      logger.error('Storage delete error:', error)
      const t = translateDbError(error)
      return errorResponse(t.message, t.httpStatus, ErrorCode.INTERNAL_ERROR)
    }

    return successResponse(null)
  } catch (error) {
    logger.error('Delete API error:', error)
    const t = translateDbError(error)
    return errorResponse(t.message, t.httpStatus, ErrorCode.INTERNAL_ERROR)
  }
}
