/**
 * API 輸入驗證工具
 *
 * 使用 Zod 進行 API 請求參數驗證
 *
 * @example
 * // 在 API route 中使用
 * import { z } from 'zod'
 * import { validateBody, validateQuery } from '@/lib/api/validation'
 *
 * const CreateTourSchema = z.object({
 *   name: z.string().min(1, '名稱不能為空'),
 *   departure_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '日期格式錯誤'),
 *   city_code: z.string().length(3, '城市代碼必須是3個字元'),
 * })
 *
 * export async function POST(request: NextRequest) {
 *   const result = await validateBody(request, CreateTourSchema)
 *   if (!result.success) {
 *     return result.error // 已經是 NextResponse 格式
 *   }
 *   const { name, departure_date, city_code } = result.data
 *   // ... 處理邏輯
 * }
 */

import { NextRequest, NextResponse } from 'next/server'
import { z, ZodSchema, ZodError } from 'zod'
import { errorResponse, ErrorCode } from './response'

/**
 * 驗證結果型別
 */
type ValidationResult<T> = { success: true; data: T } | { success: false; error: NextResponse }

/**
 * 格式化 Zod 錯誤訊息
 */
function formatZodError(error: ZodError): string {
  // Zod 4 使用 issues 陣列
  const issues = error.issues as Array<{ path: PropertyKey[]; message: string }>
  const messages = issues.map(issue => {
    const path = issue.path.map(String).join('.')
    return path ? `${path}: ${issue.message}` : issue.message
  })
  return messages.join('; ')
}

/**
 * 驗證請求 Body
 *
 * @param request - NextRequest 物件
 * @param schema - Zod schema
 * @returns 驗證結果，包含 data 或 error response
 *
 * @example
 * const result = await validateBody(request, CreateTourSchema)
 * if (!result.success) return result.error
 * const data = result.data // 已經是型別安全的
 */
export async function validateBody<T>(
  request: NextRequest,
  schema: ZodSchema<T>
): Promise<ValidationResult<T>> {
  try {
    const body = await request.json()
    const result = schema.safeParse(body)

    if (!result.success) {
      return {
        success: false,
        error: errorResponse(formatZodError(result.error), 400, ErrorCode.VALIDATION_ERROR),
      }
    }

    return { success: true, data: result.data }
  } catch (_err) {
    return {
      success: false,
      error: errorResponse('無法解析請求內容', 400, ErrorCode.INVALID_FORMAT),
    }
  }
}

/**
 * 驗證 URL Query 參數
 *
 * @param request - NextRequest 物件
 * @param schema - Zod schema
 * @returns 驗證結果
 *
 * @example
 * const QuerySchema = z.object({
 *   page: z.coerce.number().min(1).default(1),
 *   limit: z.coerce.number().min(1).max(100).default(20),
 * })
 * const result = validateQuery(request, QuerySchema)
 * if (!result.success) return result.error
 */
function _validateQuery<T>(request: NextRequest, schema: ZodSchema<T>): ValidationResult<T> {
  const searchParams = request.nextUrl.searchParams
  const params: Record<string, string | string[]> = {}

  searchParams.forEach((value, key) => {
    const existing = params[key]
    if (existing) {
      // 多個同名參數轉成陣列
      params[key] = Array.isArray(existing) ? [...existing, value] : [existing, value]
    } else {
      params[key] = value
    }
  })

  const result = schema.safeParse(params)

  if (!result.success) {
    return {
      success: false,
      error: errorResponse(formatZodError(result.error), 400, ErrorCode.VALIDATION_ERROR),
    }
  }

  return { success: true, data: result.data }
}

/**
 * 驗證路由參數
 *
 * @param params - 路由參數物件
 * @param schema - Zod schema
 * @returns 驗證結果
 *
 * @example
 * // 在 [id]/route.ts 中
 * export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
 *   const result = validateParams(params, z.object({ id: z.string().uuid() }))
 *   if (!result.success) return result.error
 * }
 */
function _validateParams<T>(
  params: Record<string, string | string[]>,
  schema: ZodSchema<T>
): ValidationResult<T> {
  const result = schema.safeParse(params)

  if (!result.success) {
    return {
      success: false,
      error: errorResponse(formatZodError(result.error), 400, ErrorCode.VALIDATION_ERROR),
    }
  }

  return { success: true, data: result.data }
}

/**
 * 常用的 Zod schema 片段
 */
const _CommonSchemas = {
  /** UUID 格式 */
  uuid: z.string().uuid('無效的 ID 格式'),

  /** 日期格式 YYYY-MM-DD */
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '日期格式應為 YYYY-MM-DD'),

  /** 非空字串 */
  nonEmptyString: z.string().min(1, '此欄位不能為空'),

  /** 電話號碼（台灣格式） */
  phone: z.string().regex(/^0[0-9]{8,9}$/, '電話號碼格式錯誤'),

  /** Email */
  email: z.string().email('Email 格式錯誤'),

  /** 分頁參數 */
  pagination: z.object({
    page: z.coerce.number().min(1).default(1),
    limit: z.coerce.number().min(1).max(100).default(20),
  }),

  /** 排序參數 */
  sorting: z.object({
    sortBy: z.string().optional(),
    sortOrder: z.enum(['asc', 'desc']).default('desc'),
  }),
}
