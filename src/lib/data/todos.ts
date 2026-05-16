/**
 * Todos 資料存取層 (Data Access Layer)
 *
 * 客戶端資料存取函式、用於待辦事項相關的查詢。
 * 將查詢邏輯從 Hooks 中抽離、實現關注點分離。
 *
 * 🔒 所有查詢都需要傳入 workspaceId
 */

import { supabase } from '@/lib/supabase/client'
import type { Todo } from '@/stores/types'
import { logger } from '@/lib/utils/logger'

// ============================================
// 查詢函式（客戶端）
// ============================================

/**
 * 取得所有待辦事項
 * 🔒 需要傳入 workspaceId
 */
export async function getAllTodos(workspaceId: string): Promise<Todo[]> {
  if (!workspaceId) {
    logger.error('getAllTodos: workspaceId 必須提供')
    return []
  }

  const { data, error } = await supabase
    .from('todos')
    .select(
      'id, title, status, priority, deadline, completed, assignee, tour_id, task_type, visibility, related_items, sub_tasks, notes, enabled_quick_actions, is_public, needs_creator_notification, column_id, workspace_id, created_at, created_by, updated_at'
    )
    .eq('workspace_id', workspaceId) // 🔒 Workspace 過濾
    .order('created_at', { ascending: false })
    .limit(500)

  if (error) {
    logger.error('Error fetching todos:', error)
    throw new Error(error.message)
  }

  return (data || []) as unknown as Todo[]
}

/**
 * 根據 ID 取得單一待辦事項
 * 🔒 需要傳入 workspaceId
 */
async function _getTodoById(id: string, workspaceId: string): Promise<Todo | null> {
  if (!workspaceId) {
    logger.error('getTodoById: workspaceId 必須提供')
    return null
  }

  const { data, error } = await supabase
    .from('todos')
    .select(
      'id, title, status, priority, deadline, completed, assignee, tour_id, task_type, visibility, related_items, sub_tasks, notes, enabled_quick_actions, is_public, needs_creator_notification, column_id, workspace_id, created_at, created_by, updated_at'
    )
    .eq('id', id)
    .eq('workspace_id', workspaceId) // 🔒 Workspace 過濾
    .single()

  if (error) {
    logger.error('Error fetching todo:', error)
    return null
  }

  return data as unknown as Todo
}

/**
 * 根據狀態取得待辦事項
 * 🔒 需要傳入 workspaceId
 */
async function _getTodosByStatus(status: string, workspaceId: string): Promise<Todo[]> {
  if (!workspaceId) {
    logger.error('getTodosByStatus: workspaceId 必須提供')
    return []
  }

  const { data, error } = await supabase
    .from('todos')
    .select(
      'id, title, status, priority, deadline, completed, assignee, tour_id, task_type, visibility, related_items, sub_tasks, notes, enabled_quick_actions, is_public, needs_creator_notification, column_id, workspace_id, created_at, created_by, updated_at'
    )
    .eq('status', status)
    .eq('workspace_id', workspaceId) // 🔒 Workspace 過濾
    .order('created_at', { ascending: false })
    .limit(500)

  if (error) {
    logger.error('Error fetching todos by status:', error)
    return []
  }

  return (data || []) as unknown as Todo[]
}

/**
 * 根據指派者取得待辦事項
 * 🔒 需要傳入 workspaceId
 */
async function _getTodosByAssignee(assigneeId: string, workspaceId: string): Promise<Todo[]> {
  if (!workspaceId) {
    logger.error('getTodosByAssignee: workspaceId 必須提供')
    return []
  }

  const { data, error } = await supabase
    .from('todos')
    .select(
      'id, title, status, priority, deadline, completed, assignee, tour_id, task_type, visibility, related_items, sub_tasks, notes, enabled_quick_actions, is_public, needs_creator_notification, column_id, workspace_id, created_at, created_by, updated_at'
    )
    .eq('assignee', assigneeId)
    .eq('workspace_id', workspaceId) // 🔒 Workspace 過濾
    .order('created_at', { ascending: false })
    .limit(500)

  if (error) {
    logger.error('Error fetching todos by assignee:', error)
    return []
  }

  return (data || []) as unknown as Todo[]
}

/**
 * 根據關聯實體取得待辦事項
 * 🔒 需要傳入 workspaceId
 */
async function _getTodosByEntity(
  entityType: string,
  entityId: string,
  workspaceId: string
): Promise<Todo[]> {
  if (!workspaceId) {
    logger.error('getTodosByEntity: workspaceId 必須提供')
    return []
  }

  // 用 contains 查 related_items
  const { data, error } = await supabase
    .from('todos')
    .select(
      'id, title, status, priority, deadline, completed, assignee, tour_id, task_type, visibility, related_items, sub_tasks, notes, enabled_quick_actions, is_public, needs_creator_notification, column_id, workspace_id, created_at, created_by, updated_at'
    )
    .contains('related_items', [{ type: entityType, id: entityId }])
    .eq('workspace_id', workspaceId) // 🔒 Workspace 過濾
    .order('created_at', { ascending: false })
    .limit(500)

  if (error) {
    logger.error('Error fetching todos by entity:', error)
    return []
  }

  return (data || []) as unknown as Todo[]
}
