/**
 * 型別定義中央匯出
 * 統一從這裡匯入所有型別
 */

// 基礎型別
export type { Database, Json } from '@/lib/supabase/types'
export type {
  BaseEntity,
  PageRequest,
  PageResponse,
  Filter,
  FilterOperator,
  Sort,
  ApiResponse as ApiResponseBase,
  ApiError,
  LoadingState,
  AsyncState,
} from './base.types'

// 資料模型
export type {
  // 基礎型別
  ID,
  ISODateTime,
  Email,
  URL,

  // Supabase 表格
  Employee,
  Tour,
  Order,
  Customer,
  Member,
  Payment,
  Todo,
  Supplier,
  Quote,
  PaymentRequest,
  DisbursementOrder,
  // ReceiptOrder 已廢棄，改用 Receipt（見 ADR-001）

  // 工作區
  Workspace,
  WorkspaceSettings,

  // 文件/訊息
  Document,
  Message,
  Attachment,

  // 同步
  SyncStatus,
  PendingChange,
  SyncConflict,

  // API
  ApiSuccessResponse,
  ApiErrorResponse,
  ApiResponse,

  // 分頁
  PaginationParams,
  PaginatedResponse,

  // 表單
  FormState,
  FormErrors,
  FormTouched,

  // 過濾與搜尋
  FilterCondition,
  SearchParams,
} from './models.types'

// Store 型別（稍後添加）
// export type { AuthState, AuthActions } from './store-types'
