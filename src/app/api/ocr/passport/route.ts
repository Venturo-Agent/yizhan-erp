import { NextRequest } from 'next/server'
import { getServerAuth } from '@/lib/auth/server-auth'
import { logger } from '@/lib/utils/logger'
import { successResponse, errorResponse, ErrorCode } from '@/lib/api/response'
import { checkRateLimit } from '@/lib/rate-limit'
import { callOcrSpace } from './ocr-clients'
import { parsePassportText } from './passport-parser'
import { requireCapability } from '@/lib/auth/require-capability'
import { CAPABILITIES } from '@/lib/permissions/capabilities'
import { getIntegrationConfig } from '@/lib/integrations/get-integration-config'
import { logIntegrationUsage } from '@/lib/integrations/usage-logger'
import { translateDbError } from '@/lib/db-error-translate'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { recordApiAuditContext } from '@/lib/audit/audit-helper'
import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * 拿 OCR.space API key
 * 優先序：workspace_integrations.passport_ocr → env fallback
 * （階段 3 設計：漫途 env 不會壞、其他客戶在 UI 設了就用自己的）
 *
 * 2026-05-14 William 拍板：徹底砍 Google Vision、純 OCR.space + cht 模式
 */
async function getOcrConfig(
  workspaceId: string,
): Promise<{ apiKey: string | null; chineseRecognition: boolean }> {
  const cfg = await getIntegrationConfig(workspaceId, 'passport_ocr')
  if (cfg?.ocr_space_api_key) {
    // chinese_recognition 是 checkbox、儲存成 'true' / 'false' string
    const chineseRecognition = cfg.chinese_recognition === 'true'
    return { apiKey: cfg.ocr_space_api_key, chineseRecognition }
  }
  // env fallback（漫途 dev 環境）— 預設啟用中文辨識
  return {
    apiKey: process.env.OCR_SPACE_API_KEY || null,
    chineseRecognition: true,
  }
}

/**
 * 護照 OCR 辨識 API
 *
 * 2026-05-14：簡化為純 OCR.space + cht 模式
 * - language=cht + OCREngine 2 → 中英混合辨識
 * - MRZ（純英文+數字）準確度 95%+
 * - 中文姓名「拍清楚會讀到、模糊讀不到」、客服可手動補
 * - 免費 25,000 次/月、約 1.5 秒/張
 */
export async function POST(request: NextRequest) {
  try {
    const guard = await requireCapability(CAPABILITIES.TOURS_MEMBERS_WRITE)
    if (!guard.ok) return guard.response

    const adminClient = getSupabaseAdminClient() as unknown as SupabaseClient
    await recordApiAuditContext(adminClient, {
      actorId: guard.employeeId,
      reason: '護照 OCR 辨識',
    })

    // 🔒 Rate limiting: 10 requests per minute (OCR processing is resource intensive)
    const rateLimited = await checkRateLimit(request, 'ocr-passport', 10, 60_000)
    if (rateLimited) return rateLimited

    // 🔒 安全檢查：驗證用戶身份（護照資料敏感）
    const auth = await getServerAuth()
    if (!auth.success) {
      return errorResponse('請先登入', 401, ErrorCode.UNAUTHORIZED)
    }

    const contentType = request.headers.get('content-type') || ''

    let base64Images: { name: string; data: string }[] = []

    // 判斷是 JSON 還是 FormData
    if (contentType.includes('application/json')) {
      const json = await request.json()
      if (json.image) {
        base64Images = [{ name: 'passport.jpg', data: json.image }]
      }
    } else if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData()
      const files = formData.getAll('files') as File[]

      if (files && files.length > 0) {
        for (const file of files) {
          const buffer = await file.arrayBuffer()
          const base64 = Buffer.from(buffer).toString('base64')
          const base64Image = `data:${file.type};base64,${base64}`
          base64Images.push({ name: file.name, data: base64Image })
        }
      }
    } else {
      return errorResponse('不支援的 Content-Type', 400, ErrorCode.INVALID_FORMAT)
    }

    if (base64Images.length === 0) {
      return errorResponse('沒有上傳檔案', 400, ErrorCode.MISSING_FIELD)
    }

    // workspace_integrations 優先、env fallback
    const { apiKey: ocrSpaceKey, chineseRecognition } = await getOcrConfig(auth.data.workspaceId)

    if (!ocrSpaceKey) {
      return errorResponse(
        'OCR.space API Key 未設定。請到「租戶管理 → API 整合」設定、或設 OCR_SPACE_API_KEY 環境變數。',
        500,
        ErrorCode.INTERNAL_ERROR
      )
    }

    const startTime = Date.now()

    // 批次辨識所有護照（看 config 切 cht / eng）
    const results = await Promise.all(
      base64Images.map(async img => {
        try {
          const ocrText = await callOcrSpace(img.data, ocrSpaceKey, { chineseRecognition })

          // parsePassportText 第 2 參數（visionText）傳空字串、走純 MRZ + OCR.space 中文路徑
          const customerData = parsePassportText(ocrText, '', img.name)

          return {
            success: true,
            fileName: img.name,
            customer: customerData,
            rawText: ocrText,
            imageBase64: img.data,
          }
        } catch (error) {
          logger.error(`辨識失敗 (${img.name}):`, error)
          return {
            success: false,
            fileName: img.name,
            error: '護照辨識失敗，請重試或手動輸入',
          }
        }
      })
    )

    const successful = results.filter(r => r.success).length
    const responseTimeMs = Date.now() - startTime

    // 記錄用量（fail-soft、不影響主流程）
    await logIntegrationUsage({
      workspaceId: auth.data.workspaceId,
      integrationCode: 'passport_ocr',
      success: successful > 0,
      errorMessage: successful === 0 ? 'All passports failed OCR' : null,
      metadata: {
        file_count: base64Images.length,
        successful,
        failed: base64Images.length - successful,
        response_time_ms: responseTimeMs,
        chinese_recognition: chineseRecognition,
      },
      triggeredBy: auth.data.user?.id ?? null,
    })

    return successResponse({
      results,
      total: base64Images.length,
      successful,
    })
  } catch (error) {
    logger.error('護照辨識錯誤:', error)
    const t = translateDbError(error)
    return errorResponse(t.message, t.httpStatus, ErrorCode.INTERNAL_ERROR)
  }
}
