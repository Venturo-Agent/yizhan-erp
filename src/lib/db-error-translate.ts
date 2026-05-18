/**
 * DB 錯誤翻譯層
 *
 * 把 Postgres / Supabase 錯誤碼翻成中文業務語言、給使用者看。
 *
 * 規則（William 2026-05-12 拍板：業務友善口吻）：
 *   - 23505 unique_violation → 「這個 X 已經有人在用了、請改別的」
 *   - 23503 foreign_key_violation → 「找不到對應的 X、請先建立後再回來」
 *   - 23502 not_null_violation → 「X 是必填、請填寫」
 *   - 23514 check_violation → 「X 格式或範圍不符規定」
 *   - 23P01 exclusion_violation → 「X 與既有資料衝突」
 *   - 其他 → 「系統錯誤、請稍後再試或聯絡 IT」
 *
 * 用法：
 *   API route: catch (err) { return jsonError(translateDbError(err), 400 / 409) }
 *   前端 toast: catch (err) { alertError(translateDbError(err).message) }
 *
 * 反 pattern：不准在 API 直接 return `error.message`、不准前端直接 toast `error.message`。
 */

import { logger } from '@/lib/utils/logger'

export interface TranslatedDbError {
  /** 中文業務語言訊息、可以直接 toast 給使用者看 */
  message: string
  /** 對應 HTTP status（API route return 用） */
  httpStatus: number
  /** 原始 error code（除錯用） */
  code?: string
  /** 出問題的欄位（如能解析） */
  field?: string
}

/**
 * 把 DB error 翻成中文業務訊息
 *
 * 接受任何 unknown error、保險：
 *   - Supabase PostgrestError（有 code / details / message）
 *   - 一般 Error 物件
 *   - 字串
 *   - 任何 unknown
 */
export function translateDbError(error: unknown): TranslatedDbError {
  // 記 log（除錯用）
  logger.error('DB error', error)

  if (!error) {
    return {
      message: '系統錯誤、請稍後再試或聯絡 IT',
      httpStatus: 500,
    }
  }

  // Supabase PostgrestError / 普通 PG error
  const e = error as {
    code?: string
    details?: string
    message?: string
    hint?: string
    constraint?: string
  }

  const code = e.code
  const constraint = e.constraint ?? parseConstraintName(e.details ?? e.message ?? '')
  const fieldGuess = guessFieldFromConstraint(constraint)

  switch (code) {
    case '23505': {
      // unique violation
      const fieldDisplay = humanizeField(fieldGuess) ?? '這筆資料'
      return {
        message: `這個${fieldDisplay}已經有人在用了、請改別的`,
        httpStatus: 409,
        code,
        field: fieldGuess,
      }
    }

    case '23503': {
      // foreign key violation
      const fieldDisplay = humanizeField(fieldGuess) ?? '對應資料'
      return {
        message: `找不到${fieldDisplay}、請先建立後再回來`,
        httpStatus: 400,
        code,
        field: fieldGuess,
      }
    }

    case '23502': {
      // not null violation
      const fieldDisplay = parseNotNullField(e.message ?? '') ?? '必填欄位'
      return {
        message: `${humanizeField(fieldDisplay) ?? fieldDisplay}是必填、請填寫後再儲存`,
        httpStatus: 400,
        code,
        field: fieldDisplay,
      }
    }

    case '23514': {
      // check violation
      const fieldDisplay = humanizeField(fieldGuess) ?? '資料'
      return {
        message: `${fieldDisplay}格式或範圍不符規定、請檢查`,
        httpStatus: 400,
        code,
        field: fieldGuess,
      }
    }

    case '23P01': {
      // exclusion violation (rare)
      return {
        message: '這筆資料與既有資料時段或範圍衝突、請調整',
        httpStatus: 409,
        code,
      }
    }

    case '42501': {
      // insufficient_privilege（RLS 擋）
      return {
        message: '你沒有權限做這件事、請聯絡分公司管理員',
        httpStatus: 403,
        code,
      }
    }

    case 'PGRST116': {
      // PostgREST: row not found
      return {
        message: '找不到對應資料、可能已被刪除',
        httpStatus: 404,
        code,
      }
    }
  }

  // 沒對應到、給通用訊息（保留原 code 供 debug）
  return {
    message: '系統錯誤、請稍後再試或聯絡 IT',
    httpStatus: 500,
    code,
  }
}

/**
 * 從 Postgres error details 解析 constraint name
 * 例如：'Key (workspace_id, lower(email))=(xxx, yyy) already exists.'
 *       → 解析不到 constraint、靠 caller 傳 e.constraint
 */
function parseConstraintName(text: string): string | undefined {
  // Postgres error message 有時候會包含 'constraint "xxx"'
  const match = text.match(/constraint "([^"]+)"/i)
  return match?.[1]
}

/**
 * 從 not null violation message 解析欄位名
 * 例如：'null value in column "email" of relation "employees" violates not-null'
 */
function parseNotNullField(message: string): string | undefined {
  const match = message.match(/column "([^"]+)"/i)
  return match?.[1]
}

/**
 * 從 constraint name 猜對應的欄位 / 業務名稱
 * 例如：'employees_workspace_email_unique' → 'email'
 *       'suppliers_workspace_code_key' → 'code'
 */
function guessFieldFromConstraint(constraint?: string): string | undefined {
  if (!constraint) return undefined

  // 常見 pattern：{table}_{field}_{type} 或 {table}_workspace_{field}_{type}
  const fieldGuesses = constraint
    .replace(/^[a-z_]+?_workspace_/, '')
    .replace(/_(key|unique|fkey|check|excl)$/, '')

  return fieldGuesses
}

/**
 * 欄位代號翻成中文業務名稱
 * 之後可以擴充、現在先涵蓋最常見的
 */
function humanizeField(field?: string): string | undefined {
  if (!field) return undefined
  const map: Record<string, string> = {
    email: 'email',
    code: '編號',
    name: '名稱',
    phone: '電話',
    tax_id: '統一編號',
    employee_number: '員工編號',
    order_number: '訂單編號',
    tour_id: '旅遊團',
    customer_id: '客戶',
    supplier_id: '廠商',
    workspace_id: '分公司',
    role_id: '職務',
    branch_id: '分公司',
    parent_id: '上層',
    parent_code: '上層代碼',
  }
  return map[field]
}

/**
 * 給 API route 用的 helper：把 error 轉成 NextResponse JSON
 *
 * 用法：
 *   import { NextResponse } from 'next/server'
 *   import { dbErrorResponse } from '@/lib/db-error-translate'
 *
 *   try { ... }
 *   catch (err) { return dbErrorResponse(err) }
 */
export function dbErrorResponse(error: unknown): Response {
  const translated = translateDbError(error)
  return new Response(
    JSON.stringify({
      error: translated.message,
      code: translated.code,
      field: translated.field,
    }),
    {
      status: translated.httpStatus,
      headers: { 'Content-Type': 'application/json' },
    }
  )
}
