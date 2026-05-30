/**
 * 核心資料模型定義
 * 統一的型別定義，供整個應用使用
 */

import { Database } from '@/lib/supabase/types'

// ==================== 基礎型別 ====================

export type ID = string // 統一使用 string
export type ISODateTime = string // ISO 8601 格式時間戳記
export type Email = string
export type URL = string

// ==================== Supabase 表格型別映射 ====================

export type Employee = Database['public']['Tables']['employees']['Row']
// Tour 的 canonical source 在 @/types/tour（手寫 interface、含業務註解與衍生型別）
export type { Tour } from './tour'
export type Order = Database['public']['Tables']['orders']['Row']
export type Customer = Database['public']['Tables']['customers']['Row']
// Member 來自手寫 interface（@/types/tour）、實際資料用 order_members 表
export type { Member } from './tour'
// Payment 走手寫 interface（@/types/base.types）
export type { Payment } from './base.types'
export type Todo = Database['public']['Tables']['todos']['Row']
export type Supplier = Database['public']['Tables']['suppliers']['Row']
export type Quote = Database['public']['Tables']['quotes']['Row']
// export type QuoteItem = Database['public']['Tables']['quote_items']['Row']
export type PaymentRequest = Database['public']['Tables']['payment_requests']['Row']
export type DisbursementOrder = Database['public']['Tables']['disbursement_orders']['Row']
// ReceiptOrder 已廢棄，改用 Receipt（見 ADR-001）
// export type ReceiptOrder = Database['public']['Tables']['receipt_orders']['Row']

// ==================== 工作區相關 ====================

/**
 * 工作區
 */
export interface Workspace {
  id: ID
  name: string
  code: string // 辦公室代碼（如 TP, TC）
  description?: string
  owner_id: ID
  member_ids: ID[]
  settings: WorkspaceSettings
  created_at: ISODateTime
  updated_at: ISODateTime
}

export interface WorkspaceSettings {
  theme?: 'light' | 'dark' | 'auto'
  language?: 'zh-TW' | 'en-US'
  timezone?: string
}

// ==================== 文件/訊息相關 ====================

/**
 * 通用文件介面
 */
export interface Document {
  id: ID
  title: string
  content: string
  author_id: ID
  created_at: ISODateTime
  updated_at: ISODateTime
  tags?: string[]
}

/**
 * 頻道訊息
 */
export interface Message {
  id: ID
  channel_id: ID
  author_id: ID
  content: string
  type: 'text' | 'image' | 'file' | 'system'
  attachments?: Attachment[]
  created_at: ISODateTime
  updated_at?: ISODateTime
  is_active?: boolean
}

export interface Attachment {
  id: ID
  name: string
  url: URL
  size: number
  type: string
}

// ==================== 同步相關 ====================

/**
 * 同步狀態
 */
export interface SyncStatus {
  isOnline: boolean
  isSyncing: boolean
  pendingCount: number
  lastSyncTime: ISODateTime | null
  error: string | null
}

/**
 * 待同步項目
 */
export interface PendingChange {
  id: ID
  table: string
  operation: 'create' | 'update' | 'delete'
  data: unknown
  timestamp: ISODateTime
  retries: number
}

/**
 * 同步衝突
 */
export interface SyncConflict {
  id: ID
  table: string
  recordId: ID
  localData: unknown
  remoteData: unknown
  timestamp: ISODateTime
}

// ==================== API 響應 ====================

/**
 * API 成功響應
 */
export interface ApiSuccessResponse<T = unknown> {
  success: true
  data: T
  message?: string
}

/**
 * API 錯誤響應
 */
export interface ApiErrorResponse {
  success: false
  error: string
  code?: string
  details?: unknown
}

export type ApiResponse<T = unknown> = ApiSuccessResponse<T> | ApiErrorResponse

// ==================== 分頁 ====================

/**
 * 分頁參數
 */
export interface PaginationParams {
  page: number
  pageSize: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

/**
 * 分頁響應
 */
export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

// ==================== 表單 ====================

/**
 * 表單狀態
 */
export interface FormState<T = unknown> {
  data: T
  errors: FormErrors<T>
  touched: FormTouched<T>
  isSubmitting: boolean
  isValid: boolean
}

export type FormErrors<T> = Partial<Record<keyof T, string>>
export type FormTouched<T> = Partial<Record<keyof T, boolean>>

// ==================== 過濾與搜尋 ====================

/**
 * 過濾條件
 */
export interface FilterCondition<T = unknown> {
  field: keyof T
  operator: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'like'
  value: unknown
}

/**
 * 搜尋參數
 */
export interface SearchParams {
  query: string
  fields?: string[]
  filters?: FilterCondition[]
  pagination?: PaginationParams
}
