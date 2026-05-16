// src/hooks/useTodos.ts
// Todos Hook (使用 SWR、走資料存取層 DAL)

import React, { useEffect } from 'react'
import useSWR, { mutate } from 'swr'
import { supabase } from '@/lib/supabase/client'
// 不使用 entity layer 的 create/update/delete，因為它們會呼叫 invalidate() 導致重新 fetch
// 直接用 Supabase client 操作
import { getAllTodos } from '@/lib/data/todos'
import { CACHE_STRATEGY } from '@/lib/swr'
import type { Todo } from '@/stores/types'
import type { Database } from '@/lib/supabase/types'
import { logger } from '@/lib/utils/logger'
import { useAuthStore } from '@/stores/auth-store'

// Supabase Insert 類型
type TodoInsert = Database['public']['Tables']['todos']['Insert']

/**
 * 生成 SWR key（包含 workspaceId 確保不同 workspace 的資料分開快取）
 */
function getTodosKey(workspaceId: string | null): string | null {
  if (!workspaceId) return null
  return `entity:todos:list:${workspaceId}`
}

/**
 * 生成 UUID（相容不支援 crypto.randomUUID 的瀏覽器）
 */
function generateUUID(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    return '10000000-1000-4000-8000-100000000000'.replace(/[018]/g, c =>
      (+c ^ (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (+c / 4)))).toString(16)
    )
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

// 使用 @/lib/workspace-helpers 的 getCurrentWorkspaceId

// ===== 主要 Hook =====
export function useTodos() {
  // 直接從 auth store 取得 user，確保資料是最新的（reactive）
  const { user } = useAuthStore()

  // 使用 useMemo 穩定 workspaceId，避免不必要的 re-render
  const workspaceId = React.useMemo(() => {
    // 優先使用 user.workspace_id（已經是 reactive 的）
    return user?.workspace_id || null
  }, [user?.workspace_id])

  // 使用 useMemo 穩定 swrKey
  const swrKey = React.useMemo(() => getTodosKey(workspaceId), [workspaceId])

  // 使用 DAL 的 getAllTodos 作為 SWR fetcher
  // Todos 使用 REALTIME 策略（即時更新）
  const {
    data: todos = [],
    error,
    isLoading,
    isValidating,
  } = useSWR<Todo[]>(
    swrKey,
    // SWR fetcher 接收 key，我們需要從 key 中提取 workspaceId
    async () => {
      if (!workspaceId) return []
      return getAllTodos(workspaceId)
    },
    {
      ...CACHE_STRATEGY.REALTIME,
      revalidateOnFocus: false, // 關閉 focus 時的 revalidate，避免閃爍
      revalidateIfStale: false, // 關閉 stale 時的 revalidate
    }
  )

  // Realtime 訂閱：暫時關閉
  // 目前以單人操作為主，純樂觀更新即可
  // 之後需要多人協作時再啟用（參考 docs/SWR_BEST_PRACTICES.md）

  // 新增待辦
  const create = async (todoData: Omit<Todo, 'id' | 'created_at' | 'updated_at'>) => {
    // 驗證必填欄位
    if (!todoData.creator) {
      throw new Error('新增待辦事項需要 creator 欄位')
    }

    const now = new Date().toISOString()

    // 自動注入 workspace_id（如果未提供）
    // 使用 hook 已計算好的 workspaceId、確保擁有平台管理資格的呼叫者也能正確取得
    const workspace_id = (todoData as { workspace_id?: string }).workspace_id || workspaceId

    const newTodo = {
      ...todoData,
      id: generateUUID(),
      ...(workspace_id && { workspace_id }),
      created_at: now,
      updated_at: now,
    }

    logger.log('[useTodos] 新增待辦:', {
      title: newTodo.title,
      creator: newTodo.creator,
      workspace_id,
      hook_workspaceId: workspaceId,
      user_workspace_id: user?.workspace_id,
    })

    // 樂觀更新：使用 functional update 避免 stale closure 問題
    mutate(swrKey, (currentTodos: Todo[] | undefined) => [...(currentTodos || []), newTodo], {
      revalidate: false,
    })

    try {
      // 確保 workspace_id 存在（Supabase 必填欄位）
      if (!workspace_id) {
        throw new Error('無法取得 workspace_id，請重新登入')
      }

      // 直接用 Supabase client 新增（不經過 entity layer，避免 invalidate）
      const { creator, ...todoWithoutCreator } = newTodo
      const { error } = await supabase.from('todos').insert({
        ...todoWithoutCreator,
        workspace_id: workspace_id!, // 確保有值
        created_by: creator,
      } as never)

      if (error) throw error

      // 成功後不需要 revalidate，樂觀更新已經是正確的資料
      return newTodo
    } catch (err) {
      // 失敗時回滾
      // 顯示完整的 Supabase 錯誤訊息
      const errorDetails =
        err && typeof err === 'object'
          ? {
              message: (err as { message?: string }).message,
              code: (err as { code?: string }).code,
              details: (err as { details?: string }).details,
              hint: (err as { hint?: string }).hint,
            }
          : err
      logger.error('[useTodos] 新增失敗:', errorDetails)
      mutate(swrKey)
      throw err
    }
  }

  // 更新待辦
  const update = async (id: string, updates: Partial<Todo>) => {
    const updatedTodo = {
      ...updates,
      updated_at: new Date().toISOString(),
    }

    // 樂觀更新：使用 functional update 避免 stale closure 問題
    mutate(
      swrKey,
      (currentTodos: Todo[] | undefined) =>
        (currentTodos || []).map(t => (t.id === id ? { ...t, ...updatedTodo } : t)),
      { revalidate: false }
    )

    try {
      // Supabase .update() 會忽略 undefined 欄位，導致無法清除資料。
      // 把 undefined 轉為 null，才能正確寫入資料庫。
      const dbPayload = Object.fromEntries(
        Object.entries(updatedTodo).map(([k, v]) => [k, v === undefined ? null : v])
      )
      // 直接用 Supabase client 更新（不經過 entity layer，避免 invalidate）
      const { error } = await supabase.from('todos').update(dbPayload).eq('id', id)
      if (error) throw error
      // 成功後不需要 revalidate，樂觀更新已經是正確的資料
    } catch (err) {
      // 失敗才需要 revalidate 回復正確狀態
      mutate(swrKey)
      throw err
    }
  }

  // 刪除待辦
  const remove = async (id: string) => {
    // 樂觀更新：使用 functional update 避免 stale closure 問題
    mutate(
      swrKey,
      (currentTodos: Todo[] | undefined) => (currentTodos || []).filter(t => t.id !== id),
      { revalidate: false }
    )

    try {
      // 直接用 Supabase client 刪除（不經過 entity layer，避免 invalidate）
      const { error } = await supabase.from('todos').delete().eq('id', id)
      if (error) throw error
      // 成功後不需要 revalidate，樂觀更新已經是正確的資料
    } catch (err) {
      // 失敗才需要 revalidate 回復正確狀態
      mutate(swrKey)
      throw err
    }
  }

  // 重新載入
  const refresh = () => mutate(swrKey)

  return {
    // 資料
    todos,
    items: todos, // 相容舊 store API

    // 狀態
    isLoading,
    isValidating,
    error,

    // 操作
    create,
    update,
    delete: remove,
    fetchAll: refresh, // 相容舊 store API
  }
}

