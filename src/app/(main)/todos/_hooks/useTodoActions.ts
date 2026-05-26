'use client'

import { useState, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { useAuthStore } from '@/stores/auth-store'
import { alertError, confirm } from '@/lib/ui/alert-dialog'
import { logger } from '@/lib/utils/logger'
import { Todo } from '@/stores/types'
import { TodoColumn } from './useTodoColumns'

interface UseTodoActionsOptions {
  addTodo: (data: Omit<Todo, 'id' | 'created_at' | 'updated_at'>) => Promise<unknown>
  updateTodo: (id: string, updates: Partial<Todo>) => Promise<void>
  removeTodo: (id: string) => Promise<void>
  columns: TodoColumn[]
}

interface UseTodoActionsReturn {
  isSubmitting: boolean
  quickAddValue: string
  setQuickAddValue: (v: string) => void
  handleQuickAdd: (
    columnId: string,
    quickAddColumn: string | null,
    onDone: () => void
  ) => Promise<void>
  handleAddTodo: (
    formData: {
      title: string
      priority: 1 | 2 | 3 | 4 | 5
      deadline: string
      assignee: string
      enabled_quick_actions: ('receipt' | 'invoice' | 'group' | 'quote' | 'assign')[]
    },
    onSuccess: () => void
  ) => Promise<void>
  handleChangePriority: (todo: Todo, priority: number) => Promise<void>
  handleToggleComplete: (todo: Todo) => Promise<void>
  handleDeleteTodo: (todo: Todo) => Promise<void>
}

export function useTodoActions({
  addTodo,
  updateTodo,
  removeTodo,
  columns,
}: UseTodoActionsOptions): UseTodoActionsReturn {
  const t = useTranslations('todos')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [quickAddValue, setQuickAddValue] = useState('')

  const handleQuickAdd = useCallback(
    async (columnId: string, _quickAddColumn: string | null, onDone: () => void) => {
      if (!quickAddValue.trim() || isSubmitting) return
      const currentUser = useAuthStore.getState().user
      if (!currentUser?.id) {
        await alertError(t('pleaseLoginFirst'))
        return
      }
      const column = columns.find(c => c.id === columnId)
      const status = (column?.mapped_status || 'pending') as Todo['status']
      setIsSubmitting(true)
      try {
        await addTodo({
          title: quickAddValue.trim(),
          priority: 1,
          status,
          completed: status === 'completed',
          column_id: columnId,
          creator: currentUser.id,
          assignee: currentUser.id,
          visibility: [currentUser.id],
          related_items: [],
          sub_tasks: [],
          notes: [],
          enabled_quick_actions: ['receipt', 'quote'],
        })
        setQuickAddValue('')
        onDone()
      } catch (error) {
        logger.error('快速新增失敗:', error)
        await alertError(t('addFailed'))
      } finally {
        setIsSubmitting(false)
      }
    },
    [quickAddValue, isSubmitting, addTodo, columns]
  )

  const handleAddTodo = useCallback(
    async (
      formData: {
        title: string
        priority: 1 | 2 | 3 | 4 | 5
        deadline: string
        assignee: string
        enabled_quick_actions: ('receipt' | 'invoice' | 'group' | 'quote' | 'assign')[]
      },
      onSuccess: () => void
    ) => {
      if (isSubmitting) return
      const currentUser = useAuthStore.getState().user
      if (!currentUser?.id) {
        await alertError('請先登入')
        return
      }
      setIsSubmitting(true)
      try {
        const visibilityList = [currentUser.id]
        if (formData.assignee && formData.assignee !== currentUser.id) {
          visibilityList.push(formData.assignee)
        }
        const firstCol = columns.find(c => c.mapped_status === 'pending') || columns[0]
        await addTodo({
          title: formData.title,
          priority: formData.priority,
          deadline: formData.deadline || undefined,
          status: 'pending',
          completed: false,
          column_id: firstCol?.id,
          creator: currentUser.id,
          assignee: formData.assignee || currentUser.id,
          visibility: visibilityList,
          related_items: [],
          sub_tasks: [],
          notes: [],
          enabled_quick_actions: formData.enabled_quick_actions || ['receipt', 'quote'],
        })
        onSuccess()
      } catch (error) {
        logger.error('新增失敗:', error)
        await alertError(t('addFailed'))
      } finally {
        setIsSubmitting(false)
      }
    },
    [addTodo, columns, isSubmitting]
  )

  const handleChangePriority = useCallback(
    async (todo: Todo, priority: number) => {
      if (priority === todo.priority) return
      await updateTodo(todo.id, { priority: priority as 1 | 2 | 3 | 4 | 5 })
    },
    [updateTodo]
  )

  const handleToggleComplete = useCallback(
    async (todo: Todo) => {
      const nowCompleted = !todo.completed
      const targetStatus: Todo['status'] = nowCompleted ? 'completed' : 'pending'
      const targetColumn = columns.find(c => c.mapped_status === targetStatus) || columns[0]
      await updateTodo(todo.id, {
        completed: nowCompleted,
        status: targetStatus,
        column_id: targetColumn?.id,
      })
    },
    [updateTodo, columns]
  )

  const handleDeleteTodo = useCallback(
    async (todo: Todo) => {
      const confirmed = await confirm(`確定刪除「${todo.title}」？`, {
        title: '刪除任務',
        type: 'warning',
      })
      if (!confirmed) return
      try {
        await removeTodo(todo.id)
      } catch (err) {
        logger.error('刪除失敗:', err)
        await alertError(t('deleteFailed'))
      }
    },
    [removeTodo]
  )

  return {
    isSubmitting,
    quickAddValue,
    setQuickAddValue,
    handleQuickAdd,
    handleAddTodo,
    handleChangePriority,
    handleToggleComplete,
    handleDeleteTodo,
  }
}
