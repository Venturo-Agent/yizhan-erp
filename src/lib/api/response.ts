/**
 * 統一 API 回應格式工具
 *
 * 所有 API 回應應遵循此標準格式：
 *
 * interface ApiResponse<T = unknown> {
 *   success: boolean
 *   data?: T
 *   error?: string
 *   code?: string  // 錯誤代碼，如 'VALIDATION_ERROR', 'NOT_FOUND' 等
 * }
 */

import { NextResponse } from 'next/server'

/**
 * 標準 API 回應格式
 */
interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
  code?: string
}

/**
 * 常用錯誤代碼
 */
export const ErrorCode = {
  // 驗證相關
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  MISSING_FIELD: 'MISSING_FIELD',
  INVALID_FORMAT: 'INVALID_FORMAT',

  // 資源相關
  NOT_FOUND: 'NOT_FOUND',
  ALREADY_EXISTS: 'ALREADY_EXISTS',

  // 認證/授權相關
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',

  // 伺服器錯誤
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
  EXTERNAL_API_ERROR: 'EXTERNAL_API_ERROR',

  // 業務邏輯錯誤
  QUOTA_EXCEEDED: 'QUOTA_EXCEEDED',
  RATE_LIMITED: 'RATE_LIMITED',
  OPERATION_FAILED: 'OPERATION_FAILED',
} as const

type ErrorCodeType = (typeof ErrorCode)[keyof typeof ErrorCode]

/**
 * 建立成功回應
 *
 * @param data - 回傳的資料
 * @param status - HTTP 狀態碼，預設 200
 * @returns NextResponse
 *
 * @example
 * // 基本用法
 * return successResponse({ id: '123', name: 'Test' })
 *
 * // 指定狀態碼
 * return successResponse({ id: '123' }, 201)
 */
export function successResponse<T>(data: T, status: number = 200): NextResponse<ApiResponse<T>> {
  return NextResponse.json(
    {
      success: true,
      data,
    },
    { status }
  )
}

/**
 * 建立錯誤回應
 *
 * @param error - 錯誤訊息
 * @param status - HTTP 狀態碼
 * @param code - 錯誤代碼
 * @returns NextResponse
 *
 * @example
 * // 基本用法
 * return errorResponse('缺少必要參數', 400)
 *
 * // 帶錯誤代碼
 * return errorResponse('找不到資源', 404, 'NOT_FOUND')
 */
export function errorResponse(
  error: string,
  status: number,
  code?: ErrorCodeType | string
): NextResponse<ApiResponse<never>> {
  const response: ApiResponse<never> = {
    success: false,
    error,
  }

  if (code) {
    response.code = code
  }

  return NextResponse.json(response, { status })
}

/**
 * 常用錯誤回應的快捷方法
 */
export const ApiError = {
  /**
   * 400 Bad Request - 驗證錯誤
   */
  validation: (message: string = '請求參數驗證失敗') =>
    errorResponse(message, 400, ErrorCode.VALIDATION_ERROR),

  /**
   * 400 Bad Request - 缺少必要欄位
   */
  missingField: (field: string) =>
    errorResponse(`缺少必要欄位：${field}`, 400, ErrorCode.MISSING_FIELD),

  /**
   * 400 Bad Request - 格式錯誤
   */
  invalidFormat: (message: string = '資料格式錯誤') =>
    errorResponse(message, 400, ErrorCode.INVALID_FORMAT),

  /**
   * 401 Unauthorized - 未授權
   */
  unauthorized: (message: string = '請先登入') =>
    errorResponse(message, 401, ErrorCode.UNAUTHORIZED),

  /**
   * 403 Forbidden - 禁止存取
   */
  forbidden: (message: string = '權限不足') => errorResponse(message, 403, ErrorCode.FORBIDDEN),

  /**
   * 404 Not Found - 找不到資源
   */
  notFound: (resource: string = '資源') =>
    errorResponse(`找不到${resource}`, 404, ErrorCode.NOT_FOUND),

  /**
   * 409 Conflict - 資源已存在
   */
  alreadyExists: (resource: string = '資源') =>
    errorResponse(`${resource}已存在`, 409, ErrorCode.ALREADY_EXISTS),

  /**
   * 429 Too Many Requests - 請求過於頻繁
   */
  rateLimited: (message: string = '請求過於頻繁，請稍後再試') =>
    errorResponse(message, 429, ErrorCode.RATE_LIMITED),

  /**
   * 500 Internal Server Error - 伺服器錯誤
   */
  internal: (message: string = '伺服器錯誤') =>
    errorResponse(message, 500, ErrorCode.INTERNAL_ERROR),

  /**
   * 500 - 資料庫錯誤
   */
  database: (message: string = '資料庫操作失敗') =>
    errorResponse(message, 500, ErrorCode.DATABASE_ERROR),

  /**
   * 502 Bad Gateway - 外部 API 錯誤
   */
  externalApi: (message: string = '外部服務暫時無法使用') =>
    errorResponse(message, 502, ErrorCode.EXTERNAL_API_ERROR),
}
