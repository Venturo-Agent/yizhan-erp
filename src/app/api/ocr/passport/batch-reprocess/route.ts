import { NextRequest } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { getServerAuth } from '@/lib/auth/server-auth'
import { logger } from '@/lib/utils/logger'
import { successResponse, errorResponse, ErrorCode } from '@/lib/api/response'
import { validateBody } from '@/lib/api/validation'
import { batchReprocessSchema } from '@/lib/validations/api-schemas'
import { requireCapability } from '@/lib/auth/require-capability'
import { CAPABILITIES } from '@/lib/permissions/capabilities'
import { translateDbError } from '@/lib/db-error-translate'
import { createApiClient } from '@/lib/supabase/api-client'
import { recordApiAuditContext } from '@/lib/audit/audit-helper'

/**
 * 批次重新處理護照 OCR
 * 用於還原舊資料的 passport_name_print 欄位
 *
 * 流程：
 * 1. 查詢有 passport_image_url 但沒有 passport_name_print 的記錄
 * 2. 下載護照圖片並重新 OCR
 * 3. 只更新 passport_name_print 欄位
 */

const OCR_SPACE_API_KEY = process.env.OCR_SPACE_API_KEY

/**
 * GET: 查詢需要重新處理的記錄數量
 */
export async function GET(_request: NextRequest) {
  try {
    const auth = await getServerAuth()
    if (!auth.success) {
      return errorResponse('請先登入', 401, ErrorCode.UNAUTHORIZED)
    }

    const supabase = getSupabaseAdminClient()
    const workspaceId = auth.data.workspaceId

    // 查詢 customers 表（限定當前 workspace）
    const { count: customerCount } = await supabase
      .from('customers')
      .select('id', { count: 'exact', head: true })
      .eq('workspace_id', workspaceId)
      .not('passport_image_url', 'is', null)
      .is('passport_name_print', null)

    // 查詢 order_members 表（限定當前 workspace）
    const { count: memberCount } = await supabase
      .from('order_members')
      .select('id', { count: 'exact', head: true })
      .eq('workspace_id', workspaceId)
      .not('passport_image_url', 'is', null)
      .is('passport_name_print', null)

    return successResponse({
      customers: customerCount || 0,
      order_members: memberCount || 0,
      total: (customerCount || 0) + (memberCount || 0),
    })
  } catch (error) {
    logger.error('查詢失敗:', error)
    return errorResponse('查詢失敗', 500, ErrorCode.INTERNAL_ERROR)
  }
}

/**
 * POST: 執行批次重新處理
 */
export async function POST(request: NextRequest) {
  try {
    const guard = await requireCapability(CAPABILITIES.TOURS_MEMBERS_WRITE)
    if (!guard.ok) return guard.response
    const auth = await getServerAuth()
    if (!auth.success) {
      return errorResponse('請先登入', 401, ErrorCode.UNAUTHORIZED)
    }

    const auditClient = await createApiClient()
    await recordApiAuditContext(auditClient, {
      actorId: guard.employeeId,
      reason: '批次重新處理護照 OCR',
    })

    if (!OCR_SPACE_API_KEY) {
      return errorResponse('OCR API Key 未設定', 500, ErrorCode.INTERNAL_ERROR)
    }

    const validation = await validateBody(request, batchReprocessSchema)
    if (!validation.success) return validation.error
    const { table, limit } = validation.data

    const supabase = getSupabaseAdminClient()
    const workspaceId = auth.data.workspaceId
    const results = {
      customers: { processed: 0, updated: 0, failed: 0, errors: [] as string[] },
      order_members: { processed: 0, updated: 0, failed: 0, errors: [] as string[] },
    }

    // 處理 customers 表（限定當前 workspace）
    if (table === 'all' || table === 'customers') {
      const { data: customers } = await supabase
        .from('customers')
        .select('id, passport_image_url, passport_name')
        .eq('workspace_id', workspaceId)
        .not('passport_image_url', 'is', null)
        .is('passport_name_print', null)
        .limit(limit)

      if (customers) {
        for (const customer of customers) {
          results.customers.processed++
          try {
            const passportNamePrint = await reprocessPassportImage(customer.passport_image_url!)

            if (passportNamePrint) {
              const { error } = await supabase
                .from('customers')
                .update({ passport_name_print: passportNamePrint })
                .eq('workspace_id', workspaceId)
                .eq('id', customer.id)

              if (error) {
                results.customers.failed++
                results.customers.errors.push(`${customer.id}: ${error.message}`)
              } else {
                results.customers.updated++
              }
            } else {
              // 如果 OCR 失敗，嘗試從現有的 passport_name 轉換
              if (customer.passport_name) {
                const fallbackPrint = convertPassportNameToPrint(customer.passport_name)
                const { error } = await supabase
                  .from('customers')
                  .update({ passport_name_print: fallbackPrint })
                  .eq('workspace_id', workspaceId)
                  .eq('id', customer.id)

                if (!error) {
                  results.customers.updated++
                  logger.info(`客戶 ${customer.id} 使用 fallback 轉換`)
                }
              } else {
                results.customers.failed++
                results.customers.errors.push(`${customer.id}: OCR 失敗且無 passport_name`)
              }
            }
          } catch (err) {
            results.customers.failed++
            results.customers.errors.push(
              `${customer.id}: ${err instanceof Error ? err.message : '未知錯誤'}`
            )
          }
        }
      }
    }

    // 處理 order_members 表（限定當前 workspace）
    if (table === 'all' || table === 'order_members') {
      const { data: members } = await supabase
        .from('order_members')
        .select('id, passport_image_url, passport_name')
        .eq('workspace_id', workspaceId)
        .not('passport_image_url', 'is', null)
        .is('passport_name_print', null)
        .limit(limit)

      if (members) {
        for (const member of members) {
          results.order_members.processed++
          try {
            const passportNamePrint = await reprocessPassportImage(member.passport_image_url!)

            if (passportNamePrint) {
              const { error } = await supabase
                .from('order_members')
                .update({ passport_name_print: passportNamePrint })
                .eq('workspace_id', workspaceId)
                .eq('id', member.id)

              if (error) {
                results.order_members.failed++
                results.order_members.errors.push(`${member.id}: ${error.message}`)
              } else {
                results.order_members.updated++
              }
            } else {
              // 如果 OCR 失敗，嘗試從現有的 passport_name 轉換
              if (member.passport_name) {
                const fallbackPrint = convertPassportNameToPrint(member.passport_name)
                const { error } = await supabase
                  .from('order_members')
                  .update({ passport_name_print: fallbackPrint })
                  .eq('workspace_id', workspaceId)
                  .eq('id', member.id)

                if (!error) {
                  results.order_members.updated++
                  logger.info(`成員 ${member.id} 使用 fallback 轉換`)
                }
              } else {
                results.order_members.failed++
                results.order_members.errors.push(`${member.id}: OCR 失敗且無 passport_name`)
              }
            }
          } catch (err) {
            results.order_members.failed++
            results.order_members.errors.push(
              `${member.id}: ${err instanceof Error ? err.message : '未知錯誤'}`
            )
          }
        }
      }
    }

    return successResponse(results)
  } catch (error) {
    logger.error('批次處理失敗:', error)
    const t = translateDbError(error)
    return errorResponse(t.message, t.httpStatus, ErrorCode.INTERNAL_ERROR)
  }
}

/**
 * 從存儲值（可能是 bare filename 或完整 URL）產出可 fetch 的 URL。
 */
async function resolveImageUrl(stored: string): Promise<string | null> {
  if (stored.startsWith('data:') || stored.startsWith('http')) return stored
  // bare filename → 用 admin client 簽 1 小時 URL 供 fetch
  const supabase = getSupabaseAdminClient()
  const { data, error } = await supabase.storage
    .from('passport-images')
    .createSignedUrl(stored, 3600)
  if (error || !data) {
    logger.error('簽 passport-images URL 失敗', error)
    return null
  }
  return data.signedUrl
}

/**
 * 重新處理護照圖片，提取 passport_name_print
 */
async function reprocessPassportImage(stored: string): Promise<string | null> {
  try {
    // 接受 bare filename（新格式）或完整 URL（舊資料）
    const imageUrl = await resolveImageUrl(stored)
    if (!imageUrl) return null

    // 下載圖片並轉換為 base64
    const response = await fetch(imageUrl)
    if (!response.ok) {
      logger.error(`下載圖片失敗: ${imageUrl}`, { status: response.status })
      return null
    }

    const buffer = await response.arrayBuffer()
    const base64 = Buffer.from(buffer).toString('base64')
    const contentType = response.headers.get('content-type') || 'image/jpeg'
    const base64Image = `data:${contentType};base64,${base64}`

    // 呼叫 OCR.space API
    const ocrResult = await callOcrSpace(base64Image)
    if (!ocrResult) {
      return null
    }

    // 解析 MRZ 取得 passport_name_print
    const passportNamePrint = parseMrzForNamePrint(ocrResult)
    return passportNamePrint
  } catch (error) {
    logger.error('重新處理護照圖片失敗:', error)
    return null
  }
}

/**
 * 呼叫 OCR.space API
 */
async function callOcrSpace(base64Image: string): Promise<string | null> {
  try {
    const formData = new FormData()
    formData.append('base64Image', base64Image)
    formData.append('language', 'eng')
    formData.append('isOverlayRequired', 'false')
    formData.append('detectOrientation', 'true')
    formData.append('scale', 'true')
    formData.append('OCREngine', '2')

    const response = await fetch('https://api.ocr.space/parse/image', {
      method: 'POST',
      headers: {
        apikey: OCR_SPACE_API_KEY!,
      },
      body: formData,
    })

    const data = await response.json()

    if (data.OCRExitCode !== 1 || !data.ParsedResults?.[0]) {
      return null
    }

    return data.ParsedResults[0].ParsedText || null
  } catch (error) {
    logger.error('OCR.space API 錯誤:', error)
    return null
  }
}

/**
 * 從 MRZ 文字解析 passport_name_print
 */
function parseMrzForNamePrint(ocrText: string): string | null {
  // 移除所有空白和換行
  const cleanText = ocrText.replace(/\s+/g, '')

  // MRZ 第一行格式：P<國籍姓氏<<名字<<<<<...
  const mrzLine1Match = cleanText.match(/P<([A-Z]{3})([A-Z<]{2,39})/i)

  if (!mrzLine1Match) {
    // 備用方案：處理 OCR 誤讀 < 為 I 的情況
    const relaxedMatch = cleanText.match(/P[<I\|]([A-Z]{3})([A-Z<I\|]{2,39})/i)
    if (relaxedMatch) {
      const _countryCode = relaxedMatch[1]
      const namePart = relaxedMatch[2].replace(/[I\|]/g, '<')
      return extractNamePrint(namePart)
    }
    return null
  }

  return extractNamePrint(mrzLine1Match[2])
}

/**
 * 從 MRZ 名字部分提取列印格式
 */
function extractNamePrint(namePart: string): string | null {
  const parts = namePart.split('<<')
  if (parts.length >= 2) {
    const surname = parts[0].replace(/</g, '')
    // 名字中的 < 表示音節分隔，替換成 -
    const givenNamesWithDash = parts[1].replace(/</g, '-').replace(/-+$/, '').trim()

    if (surname && givenNamesWithDash) {
      return `${surname}, ${givenNamesWithDash}`
    } else if (surname) {
      return surname
    }
  } else if (parts.length === 1) {
    const surname = parts[0].replace(/</g, '')
    return surname || null
  }
  return null
}

/**
 * 從現有的 passport_name 轉換為列印格式（fallback）
 * 注意：這無法還原連字號，只是簡單轉換格式
 */
function convertPassportNameToPrint(passportName: string): string {
  // CHEN/YIHSUAN -> CHEN, YIHSUAN
  return passportName.replace('/', ', ')
}
