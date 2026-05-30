'use client'

/**
 * createEntityHook - 統一資料存取 Factory
 *
 * 所有 entity 都透過這個 factory 建立，確保一致性：
 * - 統一 CRUD 操作
 * - 統一快取策略
 * - 統一 loading/error 狀態
 * - 統一 TypeScript 型別
 * - Workspace 資料隔離
 * - 樂觀更新
 *
 * 重構：helpers / realtime / crud 已分拆到子模組
 *   - entityHookCache.ts    — generateUUID / getCurrentUserContext / useIdbFallback / WORKSPACE_SCOPED_TABLES / TABLE_CODE_PREFIX
 *   - entityHookRealtime.ts — useRealtimeSync
 *   - entityHookCrud.ts     — createEntity / updateEntity / removeEntity / batchRemoveEntities / invalidateEntity
 */

import { useEffect } from 'react'
import useSWR from 'swr'
import { supabase } from '@/lib/supabase/client'
import type {} from '@/lib/supabase/typed-client'
import { useAuthStore } from '@/stores/auth-store'
import { logger } from '@/lib/utils/logger'
import { set_cache } from '@/lib/cache/indexeddb-cache'
import type { UserRole } from '@/types/user.types'
import { enforceWorkspaceScope } from '@/lib/auth/enforce-workspace-scope'
import {
  BaseEntity,
  EntityConfig,
  EntityHook,
  ListResult,
  DetailResult,
  PaginatedParams,
  PaginatedResult,
  DictionaryResult,
  DEFAULT_CACHE_CONFIG,
  EntityCreateData,
} from './types'

// Sub-module imports
import { getCurrentUserContext, useIdbFallback, WORKSPACE_SCOPED_TABLES } from './entityHookCache'
import { useRealtimeSync } from './entityHookRealtime'
import { registerSwrKey, unregisterSwrKey } from './entityHookRegistry'
import {
  type CrudContext,
  createEntity,
  updateEntity,
  removeEntity,
  batchRemoveEntities,
  invalidateEntity,
} from './entityHookCrud'

// ============================================
// Entity Hook Factory
// ============================================

export function createEntityHook<T extends BaseEntity>(
  tableName: string,
  config: EntityConfig
): EntityHook<T> {
  // 快取 key 前綴
  // 2026-05-15 cache key 含 select 字串的 hash：select 改動 → key 變 → idb miss → 強制 re-fetch
  // 修以前 staleTime=Infinity 配 dedupe 導致 entity select 演進後 idb 仍卡 stale 的 bug
  function _hash(s: string): string {
    let h = 0
    for (let i = 0; i < s.length; i++) {
      h = ((h << 5) - h + s.charCodeAt(i)) | 0
    }
    return Math.abs(h).toString(36)
  }
  const cacheKeyPrefix = `entity:${tableName}`
  const listSelectHash = _hash(config.list?.select || '*')
  const slimSelectHash = _hash(config.slim?.select || 'id')
  const cacheKeyList = `${cacheKeyPrefix}:list:v${listSelectHash}`
  const cacheKeySlim = `${cacheKeyPrefix}:slim:v${slimSelectHash}`

  // 判斷是否需要 workspace 隔離
  const isWorkspaceScoped = config.workspaceScoped ?? WORKSPACE_SCOPED_TABLES.includes(tableName)
  const skipAudit = config.skipAuditFields ?? false

  // 合併快取配置
  const cacheConfig = {
    ...DEFAULT_CACHE_CONFIG,
    ...config.cache,
  }

  // SWR 配置
  // 5/18 修：dedupingInterval 解綁 staleTime、不用 Infinity。
  //
  // 原本綁 staleTime = Infinity → dedupingInterval = Infinity、假設「Realtime 推送一定通、
  // 寫入靠推送更新、不靠 mutate revalidate」。實際 Realtime 因 supabase-js + ssr cookie
  // INITIAL_SESSION 漏接 JWT bug 沒通（已修但生效要 hard reload），這個假設崩盤、
  // 所有寫入後的 mutate revalidate 都被 Infinity dedupe 砍掉、UI 永遠卡 stale 要 F5。
  //
  // 改 2000ms（SWR 預設）：同 key 2 秒內重複 fetch 才 dedupe、mutate 強制 revalidate 不卡。
  // staleTime 仍 Infinity（cache 永不過期、不主動 polling、不增加 Supabase 讀取量）。
  const swrConfig = {
    revalidateOnFocus: cacheConfig.revalidateOnFocus,
    revalidateOnReconnect: cacheConfig.revalidateOnReconnect,
    dedupingInterval: 2000,
  }

  // PK 欄位（5/19 健檢補：支援非 id PK 表、ref_banks.bank_code 等）
  const pkColumn = config.pkColumn ?? 'id'

  // CRUD context（傳入各 CRUD 函式）
  const crudCtx: CrudContext = {
    tableName,
    cacheKeyPrefix,
    cacheKeyList,
    isWorkspaceScoped,
    skipAudit,
    pkColumn,
  }

  // ============================================
  // 認證檢查 Hook
  // ============================================
  function useAuth() {
    const user = useAuthStore(state => state.user)
    const isAuthenticated = useAuthStore(state => state.isAuthenticated)
    const hasHydrated = useAuthStore(state => state._hasHydrated)

    return {
      isReady: hasHydrated && isAuthenticated && !!user?.id,
      hasHydrated,
      workspaceId: user?.workspace_id || null,
      // userRole 僅供 SWR cache scoping、不用於權限決策
      userRole: 'staff' as UserRole,
    }
  }

  /**
   * 套用 workspace 過濾（雙保險、配 RLS）
   *
   * 走 `enforceWorkspaceScope` helper（ADR-0001 / refactor-backlog #15 SSOT）。
   * 模式：includeNullWorkspace=true、相容 workspace_id=NULL 的資料。
   *
   * Silent skip 場景：
   *   - 表非 workspaceScoped → 不過濾
   *   - 當前無 workspaceId（hydration 前 / 未登入）→ 不過濾、由 SWR `enabled` 守住
   */
  function applyWorkspaceScope<Q>(query: Q): Q {
    if (!isWorkspaceScoped) return query

    const { workspaceId } = getCurrentUserContext()
    if (!workspaceId) return query

    // PostgrestFilterBuilder 介面比 helper 約束的 ChainableQuery 寬、安全 cast
    // helper 內部只用 .eq() / .or()、PostgrestFilterBuilder 都實作
    return enforceWorkspaceScope(
      query as unknown as { eq: (c: string, v: unknown) => unknown; or: (f: string) => unknown },
      { workspaceId },
      { includeNullWorkspace: true }
    ) as unknown as Q
  }

  // ============================================
  // useList - 列表 Hook
  // 支援 filter (server-side eq()) 跟 enabled。
  // all 參數 caller 為相容歷史 API 可傳但目前無作用（useList 本來就 internal paginate 撈全）。
  // limit 參數（2026-05-23 William）：撈最新 N 則、不 paginate 全表
  //   - 用 orderBy 反向 + .limit(N) → 拿到「最新 N 則 desc 順」、reverse 回原本 asc 順
  //   - 適用 channel_messages / inbox_messages 等「只看最近」場景
  // ============================================
  function useList(options?: {
    enabled?: boolean
    filter?: Record<string, unknown>
    all?: boolean
    /** 撈最新 N 筆、不 paginate；走 entity orderBy column 反向撈、再 reverse 回正向 */
    limit?: number
  }): ListResult<T> {
    const { isReady, hasHydrated } = useAuth()
    useRealtimeSync(tableName, cacheKeyPrefix)
    const enabled = options?.enabled !== false // 預設為 true
    const filter = options?.filter
    const limit = options?.limit
    // cache key 必須包 filter / limit、不然不同 filter 的 result 會共用 cache 互相覆蓋
    const filterKey = filter ? JSON.stringify(filter) : ''
    const limitKey = limit ? `:limit=${limit}` : ''
    const swrKey =
      isReady && enabled ? `${cacheKeyList}${filterKey ? ':' + filterKey : ''}${limitKey}` : null
    const idb_fallback = useIdbFallback<T[]>(swrKey)

    // 註冊 swrKey 進 registry、invalidateEntity 才能對具體 key 呼叫 mutate
    useEffect(() => {
      if (!swrKey) return
      registerSwrKey(tableName, swrKey)
      return () => {
        unregisterSwrKey(tableName, swrKey)
      }
    }, [swrKey])

    const { data, error, isLoading, mutate } = useSWR<T[]>(
      swrKey,
      async () => {
        const selectFields = config.list?.select || '*'

        // limit 模式（撈最新 N 筆）：反向 order + .limit(N)、最後 reverse 回正向
        if (limit && limit > 0) {
          let q = supabase
            .from(tableName as never /* dynamic table name requires runtime assertion */)
            .select(selectFields)
          q = applyWorkspaceScope(q)
          if (config.list?.orderBy) {
            // 反向撈：原 asc → desc、原 desc → asc、撈最近 N 筆
            q = q.order(config.list.orderBy.column, {
              ascending: !config.list.orderBy.ascending,
            })
          }
          if (config.list?.defaultFilter) {
            Object.entries(config.list.defaultFilter).forEach(([key, value]) => {
              if (value !== undefined && value !== null) q = q.eq(key, value)
            })
          }
          if (filter) {
            Object.entries(filter).forEach(([key, value]) => {
              if (value !== undefined && value !== null) {
                q = (q as never as { eq: (col: string, val: unknown) => typeof q }).eq(
                  key,
                  value
                ) as typeof q
              }
            })
          }
          if (config.list?.filterSoftDeleted) {
            q = (q as never as { is: (col: string, val: null) => typeof q }).is(
              'deleted_at',
              null
            ) as typeof q
          }
          q = q.limit(limit)
          const { data: rows, error } = await q
          if (error) {
            logger.error(`[${tableName}] List(limit=${limit}) fetch error:`, error.message)
            throw error
          }
          // reverse 回原本 orderBy 順序
          return ((rows || []) as unknown as T[]).slice().reverse()
        }

        // Supabase PostgREST hard caps at 1000 rows per request.
        // Auto-paginate with .range() to fetch all rows.
        const PAGE = 1000
        const all: unknown[] = []
        let from = 0
        while (true) {
          let q = supabase
            .from(tableName as never /* dynamic table name requires runtime assertion */)
            .select(selectFields)
          q = applyWorkspaceScope(q)
          if (config.list?.orderBy) {
            q = q.order(config.list.orderBy.column, {
              ascending: config.list.orderBy.ascending,
            })
          }
          if (config.list?.defaultFilter) {
            Object.entries(config.list.defaultFilter).forEach(([key, value]) => {
              if (value !== undefined && value !== null) q = q.eq(key, value)
            })
          }
          if (filter) {
            // caller 傳的 filter（如 { tour_id: 'xxx' }）→ supabase .eq()
            Object.entries(filter).forEach(([key, value]) => {
              if (value !== undefined && value !== null) {
                q = (q as never as { eq: (col: string, val: unknown) => typeof q }).eq(
                  key,
                  value
                ) as typeof q
              }
            })
          }
          if (config.list?.filterSoftDeleted) {
            // 過濾已軟刪除的 row（deleted_at IS NULL = 活的）
            q = (q as never as { is: (col: string, val: null) => typeof q }).is(
              'deleted_at',
              null
            ) as typeof q
          }
          q = q.range(from, from + PAGE - 1)
          const { data: page, error } = await q
          if (error) {
            logger.error(`[${tableName}] List fetch error:`, error.message)
            throw error
          }
          const rows = page || []
          all.push(...rows)
          if (rows.length < PAGE) break
          from += PAGE
          if (from > 100000) break // safety cap
        }
        return all as unknown as T[]
      },
      {
        ...swrConfig,
        fallbackData: idb_fallback,
        onSuccess: (fresh_data: T[]) => {
          if (swrKey) set_cache(swrKey, fresh_data)
        },
      }
    )

    return {
      items: data || [],
      loading: !hasHydrated || isLoading,
      error: error?.message || null,
      refresh: async () => {
        await mutate()
      },
    }
  }

  // ============================================
  // useListSlim - 精簡列表 Hook
  // ⚠️ 返回完整類型 T，但只 fetch slim.select 指定的欄位
  // 開發者需自行確保只存取 slim 包含的欄位
  // ============================================
  function useListSlim(options?: { enabled?: boolean }): ListResult<T> {
    const { isReady, hasHydrated } = useAuth()
    useRealtimeSync(tableName, cacheKeyPrefix)
    const enabled = options?.enabled !== false // 預設為 true
    const swrKey = isReady && enabled ? cacheKeySlim : null
    const idb_fallback = useIdbFallback<T[]>(swrKey)

    // 註冊 swrKey 進 registry（invalidateEntity 對具體 key call mutate）
    useEffect(() => {
      if (!swrKey) return
      registerSwrKey(tableName, swrKey)
      return () => {
        unregisterSwrKey(tableName, swrKey)
      }
    }, [swrKey])

    const { data, error, isLoading, mutate } = useSWR<T[]>(
      swrKey,
      async () => {
        const selectFields = config.slim?.select || 'id'
        const PAGE = 1000
        const all: unknown[] = []
        let from = 0
        while (true) {
          let q = supabase
            .from(tableName as never /* dynamic table name requires runtime assertion */)
            .select(selectFields)
          q = applyWorkspaceScope(q)
          if (config.list?.filterSoftDeleted) {
            q = (q as never as { is: (col: string, val: null) => typeof q }).is(
              'deleted_at',
              null
            ) as typeof q
          }
          q = q.range(from, from + PAGE - 1)
          const { data: page, error } = await q
          if (error) {
            logger.error(`[${tableName}] Slim fetch error:`, error.message)
            throw error
          }
          const rows = page || []
          all.push(...rows)
          if (rows.length < PAGE) break
          from += PAGE
          if (from > 100000) break
        }
        return all as unknown as T[]
      },
      {
        ...swrConfig,
        fallbackData: idb_fallback,
        onSuccess: (fresh_data: T[]) => {
          set_cache(cacheKeySlim, fresh_data)
        },
      }
    )

    return {
      items: data || [],
      loading: !hasHydrated || isLoading,
      error: error?.message || null,
      refresh: async () => {
        await mutate()
      },
    }
  }

  // ============================================
  // useDetail - 單筆 Hook（Skip Pattern）
  // ============================================
  function useDetail(id: string | null): DetailResult<T> {
    const { isReady, hasHydrated } = useAuth()
    // Skip pattern: id 為 null 時不發請求
    const swrKey = isReady && id ? `${cacheKeyPrefix}:detail:${id}` : null
    const idb_fallback = useIdbFallback<T | null>(swrKey)

    // 註冊 swrKey 進 registry
    useEffect(() => {
      if (!swrKey) return
      registerSwrKey(tableName, swrKey)
      return () => {
        unregisterSwrKey(tableName, swrKey)
      }
    }, [swrKey])

    const { data, error, isLoading, mutate } = useSWR<T | null>(
      swrKey,
      async () => {
        if (!id) return null

        const selectFields = config.detail?.select || '*'

        const { data, error } = await supabase
          .from(tableName as never /* dynamic table name requires runtime assertion */)
          .select(selectFields)
          .eq(pkColumn, id)
          .maybeSingle()

        if (error) {
          logger.error(`[${tableName}] Detail fetch error:`, error.message)
          throw error
        }

        // maybeSingle() 返回 null 表示記錄不存在，這不是錯誤
        if (!data) {
          return null
        }

        return data as unknown as T
      },
      {
        ...swrConfig,
        fallbackData: idb_fallback,
        onSuccess: (fresh_data: T | null) => {
          if (swrKey && fresh_data) {
            set_cache(swrKey, fresh_data)
          }
        },
      }
    )

    return {
      item: data || null,
      loading: !hasHydrated || isLoading,
      error: error?.message || null,
      refresh: async () => {
        await mutate()
      },
    }
  }

  // ============================================
  // usePaginated - 分頁 Hook
  // ============================================
  function usePaginated(params: PaginatedParams): PaginatedResult<T> {
    const { isReady, hasHydrated } = useAuth()
    const swrKey = isReady ? `${cacheKeyPrefix}:paginated:${JSON.stringify(params)}` : null

    // 註冊 swrKey 進 registry
    useEffect(() => {
      if (!swrKey) return
      registerSwrKey(tableName, swrKey)
      return () => {
        unregisterSwrKey(tableName, swrKey)
      }
    }, [swrKey])

    const { data, error, isLoading, mutate } = useSWR(
      swrKey,
      async () => {
        const { page, pageSize, filter, search, searchFields, sortBy, sortOrder, multiSort } =
          params
        const from = (page - 1) * pageSize
        const to = from + pageSize - 1

        const selectFields = config.list?.select || '*'

        let query = supabase
          .from(tableName as never /* dynamic table name requires runtime assertion */)
          .select(selectFields, { count: 'exact' })
          .range(from, to)

        // 套用 workspace 過濾
        // 走 enforceWorkspaceScope helper（含 includeNullWorkspace 向後相容）
        query = applyWorkspaceScope(query)

        // 排序
        // 5/24：multiSort（多欄複合排序、如財務頁「未付優先 + 日期」）優先；依序套用多個 .order()。
        //       否則維持單欄 sortBy/sortOrder（向後相容、舊 caller 不受影響）。
        if (multiSort && multiSort.length > 0) {
          for (const s of multiSort) {
            query = query.order(s.column, { ascending: s.ascending })
          }
        } else {
          const orderColumn = sortBy || config.list?.orderBy?.column || 'created_at'
          const orderAsc =
            sortOrder === 'asc' ||
            (sortOrder === undefined && config.list?.orderBy?.ascending) ||
            false
          query = query.order(orderColumn, { ascending: orderAsc })
        }

        // 軟刪除過濾
        if (config.list?.filterSoftDeleted) {
          query = (query as never as { is: (col: string, val: null) => typeof query }).is(
            'deleted_at',
            null
          ) as typeof query
        }

        // 過濾
        // 5/24：value 是陣列 → .in()（支援 capability 聯集等多值篩選、如 request_category IN (...)）；
        //       否則維持 .eq()。additive、舊 caller 不受影響。
        if (filter) {
          Object.entries(filter).forEach(([key, value]) => {
            if (Array.isArray(value)) {
              if (value.length > 0) {
                query = (
                  query as never as { in: (col: string, vals: unknown[]) => typeof query }
                ).in(key, value)
              }
            } else if (value !== undefined && value !== null && value !== '' && value !== 'all') {
              query = query.eq(key, value)
            }
          })
        }

        // 搜尋
        if (search && searchFields && searchFields.length > 0) {
          const searchConditions = searchFields.map(field => `${field}.ilike.%${search}%`).join(',')
          query = query.or(searchConditions)
        }

        const { data, count, error } = await query

        if (error) {
          logger.error(`[${tableName}] Paginated fetch error:`, error.message)
          throw error
        }

        return {
          items: (data || []) as unknown as T[],
          totalCount: count || 0,
        }
      },
      { ...swrConfig, keepPreviousData: true }
    )

    return {
      items: data?.items || [],
      totalCount: data?.totalCount || 0,
      loading: !hasHydrated || isLoading,
      error: error?.message || null,
      refresh: async () => {
        await mutate()
      },
    }
  }

  // ============================================
  // useDictionary - Dictionary Hook（O(1) 查詢）
  // ⚠️ 使用 Slim 資料，只包含 slim.select 指定的欄位
  // ============================================
  function useDictionary(): DictionaryResult<T> {
    const { items, loading } = useListSlim()

    const dictionary = (items || []).reduce(
      (acc, item) => {
        if (item.id) {
          acc[item.id] = item
        }
        return acc
      },
      {} as Record<string, T>
    )

    return {
      dictionary,
      loading,
      get: (id: string) => dictionary[id],
    }
  }

  // ============================================
  // invalidate - 使快取失效（委託 entityHookCrud）
  // ============================================
  async function invalidate(): Promise<void> {
    return invalidateEntity(crudCtx)
  }

  // ============================================
  // Return
  // ============================================
  return {
    useList,
    useListSlim,
    useDetail,
    usePaginated,
    useDictionary,
    create: (data: EntityCreateData<T>) => createEntity<T>(crudCtx, data),
    update: (id: string, data: Partial<T>) => updateEntity<T>(crudCtx, id, data),
    delete: (id: string) => removeEntity<T>(crudCtx, id),
    batchRemove: (ids: string[]) => batchRemoveEntities<T>(crudCtx, ids),
    invalidate,
  }
}
