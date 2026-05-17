'use client'

/**
 * todos entity
 *
 * Realtime：createEntityHook 內建 useRealtimeSync()、publication 已於
 *   20260518000100_enable_realtime_for_all_entities.sql 開啟、broadcast 通了。
 *
 * 取代舊 src/hooks/useTodos.ts 自寫的 SWR + supabase + 樂觀更新（90 行）。
 * 舊 useTodos.ts 改成 wrapper、保留 callers interface（todos / create / update / delete）。
 */

import { createEntityHook } from '../core/createEntityHook'
import { CACHE_PRESETS } from '../core/types'
import type { Todo } from '@/stores/types'

const todoEntity = createEntityHook<Todo>('todos', {
  list: {
    // 對齊 src/lib/data/todos.ts:getAllTodos 既有 select
    select:
      'id, title, status, priority, deadline, completed, assignee, tour_id, task_type, visibility, related_items, sub_tasks, notes, enabled_quick_actions, is_public, needs_creator_notification, column_id, workspace_id, created_at, created_by, updated_at',
    orderBy: { column: 'created_at', ascending: false },
  },
  slim: {
    select: 'id, title, status, assignee, column_id',
  },
  detail: { select: '*' },
  cache: CACHE_PRESETS.high, // todos 高頻、Realtime 刷
  workspaceScoped: true,
})

export const useTodosEntity = todoEntity.useList
export const useTodosSlim = todoEntity.useListSlim
export const useTodoDetail = todoEntity.useDetail
export const createTodo = todoEntity.create
export const updateTodo = todoEntity.update
export const deleteTodo = todoEntity.delete
export const invalidateTodos = todoEntity.invalidate
