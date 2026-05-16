/**
 * Background Task Queue System
 * 使用 Supabase 作為任務佇列儲存
 */

import { supabase } from '@/lib/supabase/client'
import { logger } from '@/lib/utils/logger'
import type { Json } from '@/lib/supabase/types'

type TaskStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled'
type TaskPriority = 'low' | 'normal' | 'high' | 'critical'

interface TaskPayload {
  [key: string]: unknown
}

interface Task<T = TaskPayload> {
  id: string
  type: string
  payload: T
  status: TaskStatus
  priority: TaskPriority
  workspace_id: string
  created_by?: string
  attempts: number
  max_attempts: number
  scheduled_at?: string
  started_at?: string
  completed_at?: string
  error?: string
  result?: unknown
  created_at: string
  updated_at: string
}

interface TaskHandler<T = TaskPayload> {
  (payload: T, task: Task<T>): Promise<unknown>
}

// 任務處理器註冊表
const taskHandlers = new Map<string, TaskHandler>()

/**
 * 註冊任務處理器
 */
export function registerTaskHandler<T = TaskPayload>(
  taskType: string,
  handler: TaskHandler<T>
): void {
  taskHandlers.set(taskType, handler as TaskHandler)
  logger.info(`Task handler registered: ${taskType}`)
}

/**
 * 建立新任務
 */
async function _createTask<T = TaskPayload>(options: {
  type: string
  payload: T
  workspaceId: string
  createdBy?: string
  priority?: TaskPriority
  scheduledAt?: Date
  maxAttempts?: number
}): Promise<Task<T> | null> {
  const {
    type,
    payload,
    workspaceId,
    createdBy,
    priority = 'normal',
    scheduledAt,
    maxAttempts = 3,
  } = options

  const now = new Date().toISOString()

  const taskData = {
    type,
    payload: payload as Json, // TaskPayload is compatible with Json
    status: 'pending' as TaskStatus,
    priority,
    workspace_id: workspaceId,
    created_by: createdBy,
    attempts: 0,
    max_attempts: maxAttempts,
    scheduled_at: scheduledAt?.toISOString() || now,
    created_at: now,
    updated_at: now,
  }

  const { data, error } = await supabase.from('background_tasks').insert(taskData).select().single()

  if (error) {
    logger.error('Failed to create task', { error, type, workspaceId })
    return null
  }

  logger.info(`Task created: ${type}`, { taskId: data.id, priority })
  return data as Task<T>
}

/**
 * 取得待處理任務
 */
async function getPendingTasks(limit = 10): Promise<Task[]> {
  const now = new Date().toISOString()

  const { data, error } = await supabase
    .from('background_tasks')
    .select(
      'id, type, status, payload, result, error, priority, attempts, scheduled_at, started_at, completed_at, workspace_id, created_at, updated_at'
    )
    .eq('status', 'pending')
    .lte('scheduled_at', now)
    .order('priority', { ascending: false }) // critical > high > normal > low
    .order('created_at', { ascending: true })
    .limit(limit)

  if (error) {
    logger.error('Failed to fetch pending tasks', { error })
    return []
  }

  return (data || []) as Task[]
}

/**
 * 處理單一任務
 */
async function processTask(task: Task): Promise<boolean> {
  const handler = taskHandlers.get(task.type)

  if (!handler) {
    logger.error(`No handler registered for task type: ${task.type}`, { taskId: task.id })
    await updateTaskStatus(task.id, 'failed', { error: `No handler for type: ${task.type}` })
    return false
  }

  // 標記為處理中
  await supabase
    .from('background_tasks')
    .update({
      status: 'processing',
      started_at: new Date().toISOString(),
      attempts: task.attempts + 1,
      updated_at: new Date().toISOString(),
    })
    .eq('id', task.id)

  try {
    const timer = logger.time(`Task ${task.type}`)
    const result = await handler(task.payload, task)
    timer.end({ taskId: task.id })

    await updateTaskStatus(task.id, 'completed', { result })
    logger.info(`Task completed: ${task.type}`, { taskId: task.id })
    return true
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    logger.error(`Task failed: ${task.type}`, { taskId: task.id, error: errorMessage })

    // 檢查是否可以重試
    if (task.attempts + 1 < task.max_attempts) {
      await updateTaskStatus(task.id, 'pending', { error: errorMessage })
      logger.info(`Task will retry: ${task.type}`, {
        taskId: task.id,
        attempt: task.attempts + 1,
        maxAttempts: task.max_attempts,
      })
    } else {
      await updateTaskStatus(task.id, 'failed', { error: errorMessage })
    }

    return false
  }
}

/**
 * 更新任務狀態
 */
async function updateTaskStatus(
  taskId: string,
  status: TaskStatus,
  data?: { error?: string; result?: unknown }
): Promise<void> {
  const updateData: Record<string, unknown> = {
    status,
    updated_at: new Date().toISOString(),
  }

  if (status === 'completed') {
    updateData.completed_at = new Date().toISOString()
  }

  if (data?.error) {
    updateData.error = data.error
  }

  if (data?.result) {
    updateData.result = data.result
  }

  await supabase.from('background_tasks').update(updateData).eq('id', taskId)
}

/**
 * 處理佇列中的任務（批次處理）
 */
export async function processQueue(batchSize = 5): Promise<number> {
  const tasks = await getPendingTasks(batchSize)

  if (tasks.length === 0) {
    return 0
  }

  logger.info(`Processing ${tasks.length} tasks`)

  let processed = 0
  for (const task of tasks) {
    const success = await processTask(task)
    if (success) processed++
  }

  return processed
}

/**
 * 取消任務
 */
async function _cancelTask(taskId: string): Promise<boolean> {
  const { error } = await supabase
    .from('background_tasks')
    .update({
      status: 'cancelled',
      updated_at: new Date().toISOString(),
    })
    .eq('id', taskId)
    .eq('status', 'pending') // 只能取消待處理的任務

  if (error) {
    logger.error('Failed to cancel task', { taskId, error })
    return false
  }

  return true
}

/**
 * 取得任務統計
 */
async function _getTaskStats(workspaceId?: string): Promise<{
  pending: number
  processing: number
  completed: number
  failed: number
}> {
  let query = supabase.from('background_tasks').select('status', { count: 'exact' })

  if (workspaceId) {
    query = query.eq('workspace_id', workspaceId)
  }

  const { data, error } = await query

  if (error) {
    logger.error('Failed to get task stats', { error })
    return { pending: 0, processing: 0, completed: 0, failed: 0 }
  }

  const stats: Record<string, number> = { pending: 0, processing: 0, completed: 0, failed: 0 }

  for (const row of (data || []) as { status: string }[]) {
    const status = row.status
    if (status in stats) {
      stats[status]++
    }
  }

  return stats as { pending: number; processing: number; completed: number; failed: number }
}

// ==================== 預定義任務類型 ====================

export const TaskTypes = {
  GENERATE_REPORT: 'generate_report',
  SEND_EMAIL: 'send_email',
  SYNC_DATA: 'sync_data',
  PROCESS_PAYMENT: 'process_payment',
  GENERATE_PDF: 'generate_pdf',
  CLEANUP_OLD_DATA: 'cleanup_old_data',
  SEND_NOTIFICATION: 'send_notification',
} as const

type TaskType = (typeof TaskTypes)[keyof typeof TaskTypes]
