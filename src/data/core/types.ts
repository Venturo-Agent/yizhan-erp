/**
 * 統一資料層型別定義
 */

// ============================================
// 基礎型別
// ============================================

// Utility: make nullable fields optional for create/insert
type NullableKeys<T> = {
  [K in keyof T]: null extends T[K] ? K : never
}[keyof T]

type CreateInput<T> = Omit<T, 'id' | 'created_at' | 'updated_at' | 'code'>

/** Makes nullable fields optional — matches Supabase Insert semantics */
export type EntityCreateData<T> = Partial<Pick<CreateInput<T>, NullableKeys<CreateInput<T>>>> &
  Omit<CreateInput<T>, NullableKeys<CreateInput<T>>> & { code?: string }

export interface BaseEntity {
  id: string
  created_at?: string | null
  updated_at?: string | null
  workspace_id?: string | null
}

// ============================================
// 快取配置
// ============================================

interface CacheConfig {
  /** 快取存活時間（毫秒） */
  ttl?: number
  /** 資料視為新鮮的時間（毫秒） */
  staleTime?: number
  /** 是否去重複請求 */
  dedupe?: boolean
  /** 切換視窗時是否重新載入 */
  revalidateOnFocus?: boolean
  /** 重新連線時是否重新載入 */
  revalidateOnReconnect?: boolean
}

// 預設快取配置
// 策略：快取永不過期，靠 Supabase Realtime 異動通知刷新
// 參考：ERPNext 的 Redis + Socket.io 架構
export const DEFAULT_CACHE_CONFIG: Required<CacheConfig> = {
  ttl: Infinity,
  staleTime: Infinity,
  dedupe: true,
  revalidateOnFocus: false,
  revalidateOnReconnect: true,
}

// 快取配置預設值
// 所有層級都改為 Infinity — 靠 Realtime 推播刷新，不靠定時重查
export const CACHE_PRESETS = {
  /** 高頻資料（tours, orders）— Realtime 即時刷新 */
  high: {
    ttl: Infinity,
    staleTime: Infinity,
    dedupe: true,
    revalidateOnFocus: false,
    revalidateOnReconnect: true,
  },
  /** 中頻資料（quotes, itineraries）— Realtime 即時刷新 */
  medium: {
    ttl: Infinity,
    staleTime: Infinity,
    dedupe: true,
    revalidateOnFocus: false,
    revalidateOnReconnect: true,
  },
  /** 低頻資料（regions, settings）— Realtime 即時刷新 */
  low: {
    ttl: Infinity,
    staleTime: Infinity,
    dedupe: true,
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
  },
} as const

// ============================================
// Entity 配置
// ============================================

interface ListConfig {
  /** 要選取的欄位 */
  select: string
  /** 排序設定 */
  orderBy?: {
    column: string
    ascending: boolean
  }
  /** 預設過濾條件 */
  defaultFilter?: Record<string, unknown>
  /** 自動過濾軟刪除 row（加 .is('deleted_at', null)）— 只對有 deleted_at 欄位的表開啟 */
  filterSoftDeleted?: boolean
}

export interface EntityConfig {
  /** 列表查詢配置 */
  list?: ListConfig
  /** 精簡版查詢配置（列表顯示用）*/
  slim?: {
    select: string
  }
  /** 單筆查詢配置 */
  detail?: {
    select: string
  }
  /** 快取配置 */
  cache?: CacheConfig
  /** 是否啟用 workspace 隔離（預設根據表格名稱自動判斷）*/
  workspaceScoped?: boolean
  /** 跳過自動加入 created_by / updated_by 欄位（適用於沒有 audit 欄位的表）*/
  skipAuditFields?: boolean
  /**
   * Primary key 欄位名（detail / update / delete 用）。
   * 預設 'id'。
   * 非 id PK 的表（譬如 ref_banks.bank_code / ref_countries.code / ref_airports.iata_code）
   * 必傳此 option、否則 detail/update/delete 會炸。
   */
  pkColumn?: string
}

// ============================================
// Hook 選項
// ============================================

export interface ListOptions {
  /** 是否啟用載入（false 時不會發送請求） */
  enabled?: boolean
  /** 每頁筆數（預設 20、規範拍板）；設 0 等同 all=true */
  pageSize?: number
  /** 第幾頁（預設 1） */
  page?: number
  /** 全撈 opt-in（譯為「不分頁、撈到 100k 上限」、僅 dictionary / dropdown / aggregate 用途） */
  all?: boolean
  /** 撈最新 N 筆（用 entity orderBy 反向 + .limit(N) + reverse）、適用 channel / inbox 等 */
  limit?: number
  /** Server-side filter（譯為 .eq(key, value) 連環 chain） */
  filter?: Record<string, string | number | boolean | null>
}

// ============================================
// Hook 回傳型別
// ============================================

export interface ListResult<T> {
  items: T[]
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
}

export interface DetailResult<T> {
  item: T | null
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
}

export interface PaginatedParams {
  page: number
  pageSize: number
  filter?: Record<string, unknown>
  search?: string
  searchFields?: string[]
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  /**
   * 多欄複合排序（如財務頁「未付優先 + 日期 asc」）。
   * 提供時優先於 sortBy/sortOrder、依陣列順序套用多個 .order()（PostgREST 依序套用）。
   * 注意：每個元素是「真實欄位 + 升降序」；衍生優先序（如某狀態排前）需先有對應可排序欄位。
   */
  multiSort?: Array<{ column: string; ascending: boolean }>
}

export interface PaginatedResult<T> {
  items: T[]
  totalCount: number
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
}

export interface DictionaryResult<T> {
  /** ⚠️ 使用 Slim 資料，只包含 slim.select 指定的欄位 */
  dictionary: Record<string, T>
  loading: boolean
  get: (id: string) => T | undefined
}

// ============================================
// Entity Hook 型別
// ============================================

export interface EntityHook<T extends BaseEntity> {
  /** 列表 hook（支援 enabled 選項控制是否載入） */
  useList: (options?: ListOptions) => ListResult<T>
  /** 精簡列表 hook（支援 enabled 選項控制是否載入）⚠️ 返回完整類型 T，但只 fetch slim.select 的欄位 */
  useListSlim: (options?: ListOptions) => ListResult<T>
  /** 單筆 hook（支援 skip pattern）*/
  useDetail: (id: string | null) => DetailResult<T>
  /** 分頁 hook */
  usePaginated: (params: PaginatedParams) => PaginatedResult<T>
  /** Dictionary hook */
  useDictionary: () => DictionaryResult<T>
  /** 建立（code 可選，會自動生成）*/
  create: (data: EntityCreateData<T>) => Promise<T>
  /** 更新 */
  update: (id: string, data: Partial<T>) => Promise<T>
  /** 刪除 */
  delete: (id: string) => Promise<boolean>
  /** 批量刪除 */
  batchRemove: (ids: string[]) => Promise<boolean>
  /** 使快取失效 */
  invalidate: () => Promise<void>
}
