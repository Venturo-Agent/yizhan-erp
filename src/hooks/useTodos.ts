// src/hooks/useTodos.ts
//
// Wrapper 保留舊 callers interface（todos / items / create / update / delete / fetchAll）。
// 內部改走 src/data/entities/todos.ts 的 createEntityHook、享 Realtime + 樂觀更新
// + 統一 cache 失效（William 2026-05-17 Phase 1.3 SWR 架構重構）。
//
// 舊 useTodos.ts 的 90 行自寫 SWR + supabase client + 樂觀更新邏輯全砍、
// 統一走 entity hook、解 6/11 註解寫的「之後需要 realtime 再啟用」、現在啟用了。

import { useMemo } from 'react'
import {
  useTodosEntity,
  createTodo as entityCreateTodo,
  updateTodo as entityUpdateTodo,
  deleteTodo as entityDeleteTodo,
  invalidateTodos,
} from '@/data/entities/todos'
import type { Todo } from '@/stores/types'
import type { EntityCreateData } from '@/data/core/types'

/**
 * useTodos — 撈當前 workspace 所有 todos、含 Realtime 同步。
 *
 * Return interface（保舊 callers 不破）：
 *   - todos / items：清單
 *   - isLoading / isValidating / error
 *   - create / update / delete：CRUD
 *   - fetchAll / refresh：手動 refetch
 */
export function useTodos() {
  const { items, loading, error, refresh } = useTodosEntity()

  // 把舊 useTodos.create 簽名（含 creator 欄）轉接到 entity hook create
  const create = useMemo(
    () => async (data: Omit<Todo, 'id' | 'created_at' | 'updated_at'>) => {
      const { creator, ...rest } = data as Todo & { creator?: string | null }
      const payload = {
        ...rest,
        ...(creator ? { created_by: creator } : {}),
      } as unknown as EntityCreateData<Todo>
      return entityCreateTodo(payload)
    },
    []
  )

  // 舊 callers update / delete 回 Promise<void>、wrapper 對齊
  const update = useMemo(
    () => async (id: string, updates: Partial<Todo>): Promise<void> => {
      await entityUpdateTodo(id, updates)
    },
    []
  )

  const remove = useMemo(
    () => async (id: string): Promise<void> => {
      await entityDeleteTodo(id)
    },
    []
  )

  return {
    // 資料
    todos: items,
    items,
    // 狀態
    isLoading: loading,
    isValidating: loading, // entity hook 沒分這兩個狀態、合一
    error: error as unknown,
    // 操作
    create,
    update,
    delete: remove,
    fetchAll: refresh,
    refresh,
    invalidate: invalidateTodos,
  }
}
