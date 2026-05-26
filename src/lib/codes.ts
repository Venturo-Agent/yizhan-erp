/**
 * 編號產生中央 module
 *
 * 所有「業務編號」的產生都走這裡、不准 caller 自己寫 `supabase.rpc('generate_*')`。
 *
 * 原則：
 *   - 每個編號都對應一個 DB RPC、RPC 內含 advisory lock 防競態
 *   - 函數名跟 RPC 名對齊（camelCase ↔ snake_case）
 *   - 錯誤統一拋 Error、caller 用 try/catch 處理
 *   - 不寫 fallback、不在前端算（DB RPC 是 SSOT）
 *
 * 新增規則：
 *   1. 先在 supabase/migrations/ 寫對應 RPC（advisory lock + workspace scoped）
 *   2. 在 src/lib/supabase/types.ts 的 Functions 加 type
 *   3. 在本檔加 typed wrapper
 *   4. caller 從本檔 import、不直接 call supabase.rpc
 *
 * Client / Server 共用：
 *   - 預設用 browser client（client component / hook 直接呼叫）
 *   - server 端（API route）傳 server client 進來：
 *       const client = await createSupabaseServerClient()
 *       const code = await generateVoucherNo(workspaceId, date, client)
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { supabase as browserClient } from '@/lib/supabase/client'
import type { Database } from '@/lib/supabase/types'

export type CodesDbClient = SupabaseClient<Database>

function pickClient(client?: CodesDbClient): CodesDbClient {
  return client ?? (browserClient as unknown as CodesDbClient)
}

function toDateString(value?: Date | string): string {
  if (typeof value === 'string') return value
  if (value) return value.toISOString().split('T')[0]
  return new Date().toISOString().split('T')[0]
}

/**
 * 產生下一個員工編號（E001、E002、…）
 * @param workspaceId 當前分公司 ID
 * @param client 選用、server 端傳 server client、client 端不傳走 browser
 * @returns 如 'E003'
 * @throws workspace_id 為 NULL、或 RPC 失敗
 */
export async function generateEmployeeNumber(
  workspaceId: string,
  client?: CodesDbClient
): Promise<string> {
  const { data, error } = await pickClient(client).rpc('generate_employee_number', {
    p_workspace_id: workspaceId,
  })
  if (error || !data) {
    throw error ?? new Error('generate_employee_number returned null')
  }
  return data as string
}

/**
 * 產生下一個供應商編號（S00001、S00002、…）
 * @param workspaceId 當前分公司 ID
 * @returns 如 'S00016'
 */
export async function generateSupplierCode(
  workspaceId: string,
  client?: CodesDbClient
): Promise<string> {
  const { data, error } = await pickClient(client).rpc('generate_supplier_code', {
    p_workspace_id: workspaceId,
  })
  if (error || !data) {
    throw error ?? new Error('generate_supplier_code returned null')
  }
  return data as string
}

/**
 * 產生下一個訂單編號（{tour_code}-O01、…）
 * @param tourId 對應 tour 的 id（系統會自動找 tour.code）
 * @returns 如 'CNX250128A-O02'
 */
export async function generateOrderNumber(tourId: string, client?: CodesDbClient): Promise<string> {
  const { data, error } = await pickClient(client).rpc('generate_order_number', {
    p_tour_id: tourId,
  })
  if (error || !data) {
    throw error ?? new Error('generate_order_number returned null')
  }
  return data as string
}

/**
 * 產生下一個會計子科目編號（{parent_code}-1、{parent_code}-2、…）
 * @param workspaceId 當前分公司 ID
 * @param parentCode 父科目代碼（如 '4111'）
 * @returns 如 '4111-3'
 */
export async function generateAccountChildCode(
  workspaceId: string,
  parentCode: string,
  client?: CodesDbClient
): Promise<string> {
  const { data, error } = await pickClient(client).rpc('generate_account_child_code', {
    p_workspace_id: workspaceId,
    p_parent_code: parentCode,
  })
  if (error || !data) {
    throw error ?? new Error('generate_account_child_code returned null')
  }
  return data as string
}

/**
 * 產生下一個團號（{city}{YYMMDD}{A-Z}）
 * @param workspaceId 當前分公司 ID
 * @param cityCode 城市代碼（自動 uppercase）
 * @param departureDate 出發日期（用 Date 物件、自動轉 ISO 日期）
 * @returns 如 'CNX250128A'
 * @throws 同日同城超過 26 團（A-Z 用完）
 */
export async function generateTourCode(
  workspaceId: string,
  cityCode: string,
  departureDate: Date,
  client?: CodesDbClient
): Promise<string> {
  const { data, error } = await pickClient(client).rpc('generate_tour_code', {
    p_workspace_id: workspaceId,
    p_city_code: cityCode.toUpperCase(),
    p_departure_date: departureDate.toISOString().split('T')[0],
  })
  if (error || !data) {
    throw error ?? new Error('generate_tour_code returned null')
  }
  return data as string
}

/**
 * 產生下一個收款單編號（{tour_code}-R{NN}）
 * @param tourId 對應 tour 的 id（系統會自動找 tour.code）
 * @returns 如 'BKK260610A-R03'
 */
export async function generateReceiptNo(tourId: string, client?: CodesDbClient): Promise<string> {
  const { data, error } = await pickClient(client).rpc('generate_receipt_no', {
    p_tour_id: tourId,
  })
  if (error || !data) {
    throw error ?? new Error('generate_receipt_no returned null')
  }
  return data as string
}

/**
 * 產生下一個請款單編號（{tour_code}-I{NN}、團體請款）
 * @param tourCode tour.code 字串（譬如 'BKK260610A'）
 * @returns 如 'BKK260610A-I02'
 */
export async function generateRequestNo(tourCode: string, client?: CodesDbClient): Promise<string> {
  const { data, error } = await pickClient(client).rpc('generate_request_no', {
    p_tour_code: tourCode,
  })
  if (error || !data) {
    throw error ?? new Error('generate_request_no returned null')
  }
  return data as string
}

/**
 * 產生下一個出納單編號（DO{YYMMDD}-{NNN}）
 * @param workspaceId 當前分公司 ID
 * @param disbursementDate 出納日期（用 Date 物件或 ISO 日期字串、預設今天）
 * @returns 如 'DO260423-001'
 */
export async function generateDisbursementNo(
  workspaceId: string,
  disbursementDate?: Date | string,
  client?: CodesDbClient
): Promise<string> {
  const { data, error } = await pickClient(client).rpc('generate_disbursement_no', {
    p_workspace_id: workspaceId,
    p_disbursement_date: toDateString(disbursementDate),
  })
  if (error || !data) {
    throw error ?? new Error('generate_disbursement_no returned null')
  }
  return data as string
}

/**
 * 產生下一個傳票編號
 * @param workspaceId 當前分公司 ID
 * @param voucherDate 傳票日期（用 Date 物件或 ISO 日期字串、預設今天）
 * @returns 如 '202601-005'
 */
export async function generateVoucherNo(
  workspaceId: string,
  voucherDate?: Date | string,
  client?: CodesDbClient
): Promise<string> {
  const { data, error } = await pickClient(client).rpc('generate_voucher_no', {
    p_workspace_id: workspaceId,
    p_voucher_date: toDateString(voucherDate),
  })
  if (error || !data) {
    throw error ?? new Error('generate_voucher_no returned null')
  }
  return data as string
}

/**
 * 產生下一個報價單編號（{tour_code}-Q{NN} 或 -QQ{NN}）
 * @param tourId 對應 tour 的 id（系統會自動找 tour.code）
 * @param quoteType 'standard'（主報價、Q）或 'quick'（快速報價、QQ）
 * @returns 如 'BKK260610A-Q02' / 'BKK260610A-QQ01'
 */
export async function generateQuoteCode(
  tourId: string,
  quoteType: 'standard' | 'quick' = 'standard',
  client?: CodesDbClient
): Promise<string> {
  const { data, error } = await pickClient(client).rpc('generate_quote_code', {
    p_tour_id: tourId,
    p_quote_type: quoteType,
  })
  if (error || !data) {
    throw error ?? new Error('generate_quote_code returned null')
  }
  return data as string
}

/**
 * 產生下一個公司請款單編號（{TYPE}-{YYYYMM}-{NNN}）
 * @param workspaceId 當前分公司 ID
 * @param expenseType 費用類型代碼（SAL/ENT/TRV/BNS 等、自動 uppercase）
 * @param requestDate 請款日期（用 Date 物件或 ISO 日期字串、預設今天）
 * @returns 如 'SAL-202501-001'
 */
export async function generateCompanyPaymentRequestCode(
  workspaceId: string,
  expenseType: string,
  requestDate?: Date | string,
  client?: CodesDbClient
): Promise<string> {
  const { data, error } = await pickClient(client).rpc('generate_company_payment_request_code', {
    p_workspace_id: workspaceId,
    p_expense_type: expenseType.toUpperCase(),
    p_request_date: toDateString(requestDate),
  })
  if (error || !data) {
    throw error ?? new Error('generate_company_payment_request_code returned null')
  }
  return data as string
}

/**
 * 產生下一個請款品項編號（{request.code}-{index}）
 * @param requestId 對應 payment_request 的 id（系統會自動找 request.code）
 * @returns 如 'TYO241218A-R01-3'
 * @throws 找不到 request 或 code 為空
 *
 * 走 advisory lock 防並發撞號（migration 20260513200000）。
 * 對齊 generate_voucher_no / generate_receipt_no / generate_request_no 同 pattern。
 */
export async function nextPaymentRequestItemNumber(
  requestId: string,
  client?: CodesDbClient
): Promise<string> {
  const { data, error } = await pickClient(client).rpc('next_payment_request_item_number', {
    p_request_id: requestId,
  })
  if (error || !data) {
    throw error ?? new Error('next_payment_request_item_number returned null')
  }
  return data as string
}

/**
 * 批次產生 N 個請款品項編號（{request.code}-{index1..N}）
 *
 * ⚠ 加新 items 必用本批次 wrapper、不可在迴圈呼叫單個 nextPaymentRequestItemNumber：
 *   單個 RPC 每次新 transaction、讀 DB 內既有 max+1、但 loop 中新 items 還沒 insert、
 *   max 不變、N 個新 items 拿到同 item_number → 撞 unique constraint。
 *
 * 本 RPC 在單一 transaction 內 advisory lock + 內部遞增、保證 N 個編號全不同。
 *
 * @param requestId 對應 payment_request 的 id
 * @param count 要拿幾個編號（必 > 0、上限 1000）
 * @returns 如 ['TYO241218A-R01-3', 'TYO241218A-R01-4', 'TYO241218A-R01-5']
 * @throws 找不到 request、count 不合法、或 RPC fail
 *
 * 走 advisory lock 防並發撞號（migration 20260521061500）。
 */
export async function nextPaymentRequestItemNumbers(
  requestId: string,
  count: number,
  client?: CodesDbClient
): Promise<string[]> {
  if (count <= 0) {
    return []
  }
  const { data, error } = await pickClient(client).rpc('next_payment_request_item_numbers', {
    p_request_id: requestId,
    p_count: count,
  })
  if (error || !data) {
    throw error ?? new Error('next_payment_request_item_numbers returned null')
  }
  return data as string[]
}
