/**
 * Zustand Store 工廠函數（簡化版）
 *
 * 架構：
 * - Supabase: 雲端資料庫（唯一的 Source of Truth）
 * - Zustand: UI 狀態管理
 *
 * 注意：此 Store 為向後相容、新功能請使用 @/data entity hooks
 */

import { create } from 'zustand'
import { BaseEntity } from '@/types'
import { TableName } from '@/lib/db/schemas'
import { memoryCache } from '@/lib/cache/memory-cache'
import { supabase } from '@/lib/supabase/client'
import { dynamicFrom, castRows, castRow } from '@/lib/supabase/typed-client'
import type { RealtimeChannel } from '@supabase/supabase-js'

// 型別定義
import type { StoreState, StoreConfig, CreateInput, UpdateInput } from './types'

// 工具
import { AbortManager } from '../utils/abort-manager'
import { logger } from '@/lib/utils/logger'
import {
  isValidUUID,
  generateUUID,
  getCurrentUserContext,
  getCurrentWorkspaceId,
  getCurrentEmployeeId,
  parseErrorMessage,
  isUniqueViolation,
  generateNextCode,
} from './store-utils'

/**
 * 建立 Store 工廠函數
 *
 * @example
 * // 配置物件
 * const useTourStore = createStore({ tableName: 'tours', codePrefix: 'T' });
 *
 * // 位置參數（簡寫）
 * const useOrderStore = createStore('orders', 'O');
 */
export function createStore<T extends BaseEntity>(
  tableNameOrConfig: TableName | StoreConfig,
  codePrefixParam?: string,
  _enableSupabaseParam = true
) {
  // 支援兩種調用方式：1. 位置參數 2. 配置物件
  let config: StoreConfig
  if (typeof tableNameOrConfig === 'string') {
    // 位置參數寫法
    config = {
      tableName: tableNameOrConfig,
      codePrefix: codePrefixParam,
      enableSupabase: true,
      fastInsert: true,
    }
  } else {
    // 新版配置物件
    config = {
      ...tableNameOrConfig,
      enableSupabase: true,
      fastInsert: tableNameOrConfig.fastInsert ?? true,
    }
  }

  const { tableName, codePrefix } = config

  // 建立 AbortController 管理器
  const abortManager = new AbortManager()
  let subscription: RealtimeChannel | null = null

  // 建立 Zustand Store
  const store = create<StoreState<T>>()((set, get) => ({
    // 初始狀態
    items: [],
    loading: false,
    error: null,

    // 設定載入狀態
    setLoading: (loading: boolean) => set({ loading }),

    // 設定錯誤
    setError: (error: string | null) => set({ error }),

    // 取得所有資料（直接從 Supabase，含重試機制）
    fetchAll: async () => {
      const MAX_RETRIES = 3
      const RETRY_DELAY = 1000 // 1 秒

      for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
          // 取消前一個請求
          abortManager.abort()

          set({ loading: true, error: null })

          // 建立基礎查詢（使用 dynamicFrom 處理動態表名）
          // listFields 設定時只抓列表需要的欄位（減少 payload）；未設定則 select('*')
          const selectFields = config.listFields ?? '*'
          let query = dynamicFrom(tableName)
            .select(selectFields)
            .order('created_at', { ascending: false })
            .limit(500)

          // 🔒 Workspace 隔離：若啟用 workspaceScoped，自動過濾 workspace_id
          if (config.workspaceScoped) {
            const { workspaceId } = getCurrentUserContext()

            // 所有用戶都強制過濾到自己的 workspace
            if (workspaceId) {
              // 驗證 workspaceId 格式（防止 SQL injection）
              if (!isValidUUID(workspaceId)) {
                throw new Error(`Invalid workspace ID format: ${workspaceId}`)
              }
              // 預設模式：過濾到自己的 workspace（不論是否擁有平台管理資格）
              query = query.or(`workspace_id.eq.${workspaceId},workspace_id.is.null`)
            }
          }

          // 加上 limit 防止全表掃描
          const fetchLimit = config.fetchLimit ?? 1000
          query = query.limit(fetchLimit)

          const { data, error } = await query

          if (error) throw error

          const items = castRows<T>(data)
          set({ items, loading: false })
          return items
        } catch (error) {
          const isNetworkError = error instanceof TypeError && error.message === 'Failed to fetch'
          const isLastAttempt = attempt === MAX_RETRIES

          // 如果是網路錯誤且還有重試機會，等待後重試
          if (isNetworkError && !isLastAttempt) {
            logger.warn(
              `[${tableName}] 網路錯誤，${RETRY_DELAY}ms 後重試 (${attempt}/${MAX_RETRIES})`
            )
            await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * attempt))
            continue
          }

          // 處理各種錯誤格式
          let errorMessage = '無法載入資料'
          if (error instanceof Error) {
            errorMessage = error.message
          } else if (error && typeof error === 'object') {
            const err = error as Record<string, unknown>
            errorMessage = (err.message as string) || (err.error as string) || JSON.stringify(error)
          }
          logger.error(`[${tableName}] fetchAll 失敗:`, errorMessage)
          set({ error: errorMessage, loading: false })
          return []
        }
      }
      return []
    },

    // 根據 ID 取得單筆
    fetchById: async (id: string) => {
      try {
        set({ loading: true, error: null })

        const { data, error } = await dynamicFrom(tableName).select('*').eq('id', id).single()

        if (error) throw error

        set({ loading: false })
        return castRow<T>(data)
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : '讀取失敗'
        set({ error: errorMessage, loading: false })
        return null
      }
    },

    // 建立資料
    create: async (data: CreateInput<T>) => {
      try {
        set({ loading: true, error: null })

        // 生成 UUID（如果未提供）
        const id = (data as Record<string, unknown>).id || generateUUID()

        // 取得當前員工 ID（用於追蹤，未來可用）
        const _currentEmployeeId = getCurrentEmployeeId()

        const insertData: Record<string, unknown> = {
          ...data,
          id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }

        // 只有啟用 workspaceScoped 的表才自動注入 workspace_id
        // 注意：不是所有表都有 created_by（如 employees），所以不強制注入
        if (config.workspaceScoped) {
          const workspace_id =
            (data as Record<string, unknown>).workspace_id || getCurrentWorkspaceId()
          if (workspace_id) {
            insertData.workspace_id = workspace_id
          } else {
            throw new Error(`[${tableName}] 無法取得 workspace_id，請確認已登入並重新整理頁面`)
          }
        }

        // 使用樂觀鎖重試機制處理 code 生成的競態條件
        const maxInsertRetries = 3
        let lastError: unknown = null

        for (let insertAttempt = 0; insertAttempt < maxInsertRetries; insertAttempt++) {
          if (codePrefix && !(data as Record<string, unknown>).code) {
            insertData.code = await generateNextCode(tableName, codePrefix, insertAttempt)
          }

          // 🔧 特殊處理：employees 表沒有 created_by 欄位，需要移除
          if (tableName === 'employees' && 'created_by' in insertData) {
            delete insertData.created_by
          }

          const { data: newItem, error } = await dynamicFrom(tableName)
            .insert(insertData as Record<string, unknown>)
            .select()
            .single()

          if (!error) {
            const createdItem = castRow<T>(newItem) as T
            set(state => ({ items: [createdItem, ...state.items], loading: false }))
            return createdItem
          }

          if (isUniqueViolation(error) && codePrefix && insertAttempt < maxInsertRetries - 1) {
            logger.warn(`[${tableName}] Code 重複，重試第 ${insertAttempt + 1} 次`)
            lastError = error
            continue
          }

          throw error
        }

        throw lastError || new Error('建立失敗：已達最大重試次數')
      } catch (error) {
        const errorMessage = parseErrorMessage(error, '建立失敗')
        logger.error(`[${tableName}] create 失敗:`, error, 'errorMessage:', errorMessage)
        set({ error: errorMessage, loading: false })
        throw new Error(errorMessage)
      }
    },

    update: async (id: string, data: UpdateInput<T>) => {
      try {
        set({ loading: true, error: null })

        // 取得當前員工 ID（用於追蹤）
        const currentEmployeeId = getCurrentEmployeeId()

        const updateData: Record<string, unknown> = {
          ...data,
          updated_at: new Date().toISOString(),
        }

        // 自動填入 updated_by（如果資料有這個欄位）
        if (currentEmployeeId) {
          updateData.updated_by = currentEmployeeId
        }

        const { data: updatedItem, error } = await dynamicFrom(tableName)
          .update(updateData as Record<string, unknown>)
          .eq('id', id)
          .select()
          .single()

        if (error) throw error

        const result = castRow<T>(updatedItem) as T
        // 樂觀更新 UI
        set(state => ({
          items: state.items.map(item => (item.id === id ? result : item)),
          loading: false,
        }))

        return result
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : '更新失敗'
        set({ error: errorMessage, loading: false })
        throw error
      }
    },

    // 刪除資料
    delete: async (id: string) => {
      try {
        set({ loading: true, error: null })

        const { error, count } = await dynamicFrom(tableName)
          .delete({ count: 'exact' })
          .eq('id', id)

        if (error) throw error
        if (count === 0) throw new Error('刪除失敗：資料不存在或沒有權限')

        // 樂觀更新 UI
        set(state => ({
          items: state.items.filter(item => item.id !== id),
          loading: false,
        }))
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : '刪除失敗'
        set({ error: errorMessage, loading: false })
        throw error
      }
    },

    // 批次建立
    createMany: async (dataArray: CreateInput<T>[]) => {
      const results: T[] = []

      for (const data of dataArray) {
        const newItem = await get().create(data)
        results.push(newItem)
      }

      return results
    },

    // 批次刪除
    deleteMany: async (ids: string[]) => {
      const { error } = await dynamicFrom(tableName).delete().in('id', ids)

      if (error) throw error

      // 樂觀更新 UI
      set(state => ({
        items: state.items.filter(item => !ids.includes(item.id)),
      }))
    },

    // 根據欄位查詢
    findByField: (field: keyof T, value: unknown) => {
      return get().items.filter(item => item[field] === value)
    },

    // 自訂過濾
    filter: (predicate: (item: T) => boolean) => {
      return get().items.filter(predicate)
    },

    // 計數
    count: () => {
      return get().items.length
    },

    // 清空資料
    clear: async () => {
      set({ items: [], error: null })
      memoryCache.invalidatePattern(`${tableName}:`)
    },

    cancelRequests: () => {
      abortManager.abort()
      set({ loading: false })
      logger.log(`🛑 [${tableName}] 已取消進行中的請求`)
    },

    // ============================================
    // Realtime Subscription
    // ============================================
    subscribe: () => {
      if (subscription) {
        logger.log(`[${tableName}] 已有訂閱，無需重複訂閱`)
        return
      }

      logger.log(`[${tableName}] 建立 Realtime 訂閱...`)
      subscription = supabase
        .channel(`public:${tableName}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: tableName }, payload => {
          logger.log(`[${tableName}] Realtime event:`, payload)
          const { eventType, new: newRecord, old: oldRecord } = payload

          const { workspaceId: currentWorkspaceId } = getCurrentUserContext()

          switch (eventType) {
            case 'INSERT': {
              const inserted = newRecord as T
              // 🔒 Workspace 隔離
              if (config.workspaceScoped && inserted.workspace_id !== currentWorkspaceId) return
              set(state => ({ items: [inserted, ...state.items] }))
              break
            }
            case 'UPDATE': {
              const updated = newRecord as T
              // 🔒 Workspace 隔離
              if (config.workspaceScoped && updated.workspace_id !== currentWorkspaceId) return
              set(state => ({
                items: state.items.map(item => (item.id === updated.id ? updated : item)),
              }))
              break
            }
            case 'DELETE': {
              const deleted = oldRecord as Partial<T>
              // 刪除操作，我們只需要 id
              if (!deleted.id) return
              set(state => ({
                items: state.items.filter(item => item.id !== deleted.id),
              }))
              break
            }
          }
        })
        .subscribe((status, err) => {
          if (status === 'SUBSCRIBED') {
            logger.log(`✅ [${tableName}] Realtime 訂閱成功！`)
          }
          if (status === 'CHANNEL_ERROR') {
            logger.error(`[${tableName}] Realtime 訂閱錯誤:`, err)
            set({ error: `Realtime 訂閱錯誤: ${err?.message}` })
          }
          if (status === 'TIMED_OUT') {
            logger.warn(`[${tableName}] Realtime 訂閱超時`)
            set({ error: 'Realtime 訂閱超時' })
          }
        })
    },

    unsubscribe: () => {
      if (subscription) {
        logger.log(`[${tableName}] 取消 Realtime 訂閱...`)
        supabase.removeChannel(subscription)
        subscription = null
      }
    },
  }))

  return store
}
