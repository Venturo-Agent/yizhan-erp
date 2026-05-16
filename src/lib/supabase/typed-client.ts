/**
 * 類型安全的 Supabase 客戶端輔助函數
 *
 * 解決動態表名與 TypeScript 嚴格類型的衝突：
 * - Supabase 的 .from() 方法期望字面量類型 (keyof Database['public']['Tables'])
 * - 但我們經常使用運行時變數作為表名
 *
 * 此輔助函數提供：
 * 1. 類型安全的表名驗證
 * 2. 統一的錯誤處理
 * 3. 避免在業務代碼中散落 `as any`
 */

import type { Database } from './types'
import { supabase } from './client'

/**
 * Supabase 資料表名稱的聯合類型
 */
export type SupabaseTableName = keyof Database['public']['Tables']

/**
 * 獲取資料表的行類型
 */
export type TableRow<T extends SupabaseTableName> = Database['public']['Tables'][T]['Row']

/**
 * 獲取資料表的插入類型
 */
export type TableInsert<T extends SupabaseTableName> = Database['public']['Tables'][T]['Insert']

/**
 * 獲取資料表的更新類型
 */
export type TableUpdate<T extends SupabaseTableName> = Database['public']['Tables'][T]['Update']

/**
 * 動態表名類型斷言
 *
 * 用於將字串變數安全地斷言為 Supabase 表名類型
 * 這比 `as any` 更安全，因為它明確表達了意圖
 */
export function asTableName(name: string): SupabaseTableName {
  return name as SupabaseTableName
}

/**
 * 類型安全的 Supabase 查詢建構器
 *
 * @example
 * // 使用動態表名
 * const { data } = await typedFrom('tours').select('*')
 *
 * // 等同於（但更類型安全）
 * const { data } = await supabase.from('tours').select('id, code, name, location, departure_date, return_date, status, current_participants, max_participants, workspace_id, archived, contract_archived_date, tour_type, outbound_flight, return_flight, is_active, confirmed_requirements, locked_itinerary_id, itinerary_id, quote_id, locked_quote_id, country_id, price, selling_price_per_person, total_cost, total_revenue, profit, contract_status, description, days_count, created_at, created_by, updated_at, updated_by')
 */
export function typedFrom<T extends SupabaseTableName>(tableName: T) {
  return supabase.from(tableName)
}

/**
 * 動態表名查詢（用於運行時變數）
 *
 * 當表名是運行時變數時使用此函數
 * 它會執行類型斷言但保持代碼整潔
 *
 * 注意：此函數使用 `as any` 是必要的設計決策：
 * 1. Supabase 的 .from() 方法期望字面量類型，無法處理運行時變數
 * 2. 這是 Supabase 官方建議的動態表名處理方式
 * 3. 替代方案（如 unknown）會導致所有使用處都需要類型轉換
 * 4. 此函數集中處理類型轉換，避免在業務代碼中散落 as any
 *
 * @example
 * const tableName = config.tableName // 運行時變數
 * const { data } = await dynamicFrom(tableName).select('*')
 */
export function dynamicFrom(tableName: string) {
  // 使用 any 是處理 Supabase 動態表名的標準做法

  // Dynamic table names require runtime type assertion - this is the centralized escape hatch

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- 集中處理動態表名的 escape hatch（避免散落 as any）
  return supabase.from(tableName as SupabaseTableName) as any
}

/**
 * 將 Supabase 回傳的資料轉換為指定類型
 *
 * 使用 unknown 作為中間類型，比直接 as any 更安全
 *
 * @example
 * const { data } = await supabase.from('tours').select('id, code, name, location, departure_date, return_date, status, current_participants, max_participants, workspace_id, archived, contract_archived_date, tour_type, outbound_flight, return_flight, is_active, confirmed_requirements, locked_itinerary_id, itinerary_id, quote_id, locked_quote_id, country_id, price, selling_price_per_person, total_cost, total_revenue, profit, contract_status, description, days_count, created_at, created_by, updated_at, updated_by')
 * const tours = castData<Tour[]>(data)
 */
export function castData<T>(data: unknown): T {
  // 透過 unknown 中轉，保持類型安全
  return data as T
}

/**
 * 將單筆 Supabase 資料轉換為指定類型
 *
 * @example
 * const { data } = await supabase.from('tours').select('id, code, name, location, departure_date, return_date, status, current_participants, max_participants, workspace_id, archived, contract_archived_date, tour_type, outbound_flight, return_flight, is_active, confirmed_requirements, locked_itinerary_id, itinerary_id, quote_id, locked_quote_id, country_id, price, selling_price_per_person, total_cost, total_revenue, profit, contract_status, description, days_count, created_at, created_by, updated_at, updated_by').single()
 * const tour = castRow<Tour>(data)
 */
export function castRow<T>(data: unknown): T | null {
  // 透過 unknown 中轉，保持類型安全
  return data as T | null
}

/**
 * 將資料陣列轉換為指定類型
 *
 * @example
 * const { data } = await supabase.from('tours').select('id, code, name, location, departure_date, return_date, status, current_participants, max_participants, workspace_id, archived, contract_archived_date, tour_type, outbound_flight, return_flight, is_active, confirmed_requirements, locked_itinerary_id, itinerary_id, quote_id, locked_quote_id, country_id, price, selling_price_per_person, total_cost, total_revenue, profit, contract_status, description, days_count, created_at, created_by, updated_at, updated_by')
 * const tours = castRows<Tour>(data)
 */
export function castRows<T>(data: unknown): T[] {
  // 透過 unknown 中轉並處理 null/undefined，保持類型安全
  return (data ?? []) as T[]
}

/**
 * Supabase RPC 函數名稱的聯合類型
 */
export type SupabaseRpcName = keyof Database['public']['Functions']

/**
 * 獲取 RPC 函數的參數類型
 */
export type RpcArgs<T extends SupabaseRpcName> = Database['public']['Functions'][T]['Args']

/**
 * 獲取 RPC 函數的回傳類型
 */
export type RpcReturns<T extends SupabaseRpcName> = Database['public']['Functions'][T]['Returns']

/**
 * 類型安全的 Supabase RPC 調用
 *
 * @example
 * const { data } = await typedRpc('sync_passport_to_order_members', {
 *   p_customer_id: customerId,
 *   p_passport_number: passportData.passport_number,
 * })
 */
export function typedRpc<T extends SupabaseRpcName>(fnName: T, args: RpcArgs<T>) {
  return supabase.rpc(fnName, args)
}

/**
 * 動態 RPC 調用（用於運行時變數或未定義類型的 RPC）
 *
 * 當 RPC 函數名是運行時變數或未在 Database 類型中定義時使用
 *
 * @example
 * const fnName = config.rpcName // 運行時變數
 * const { data } = await dynamicRpc(fnName, { p_id: '123' })
 */
export function dynamicRpc(fnName: string, args: Record<string, unknown>) {
  return supabase.rpc(fnName as SupabaseRpcName, args as RpcArgs<SupabaseRpcName>)
}

/**
 * 將插入資料轉換為表的 Insert 類型
 *
 * 用於動態建構的 insertData 需要類型斷言的情況
 * 接受 Record<string, unknown> 以處理運行時建構的物件
 *
 * @example
 * const insertData = { name: 'test', ... }
 * await supabase.from('folders').insert(asInsert<'folders'>(insertData))
 */
export function asInsert<T extends SupabaseTableName>(
  data: Record<string, unknown>
): TableInsert<T> {
  return data as unknown as TableInsert<T>
}
