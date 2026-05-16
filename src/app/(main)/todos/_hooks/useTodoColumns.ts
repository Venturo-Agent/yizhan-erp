'use client'

import { useState, useCallback, useEffect } from 'react'
import { logger } from '@/lib/utils/logger'
import { alertError } from '@/lib/ui/alert-dialog'
import type { ConfirmDialogType } from '@/components/dialog'

export interface TodoColumn {
  id: string
  workspace_id: string
  name: string
  color: string
  sort_order: number
  is_system: boolean
  mapped_status: string | null
}

interface UseTodoColumnsReturn {
  columns: TodoColumn[]
  columnsLoading: boolean
  editingColumnId: string | null
  editingColumnName: string
  isAddingColumn: boolean
  newColumnName: string
  addingColumnInFlight: boolean
  setEditingColumnId: (id: string | null) => void
  setEditingColumnName: (name: string) => void
  setIsAddingColumn: (v: boolean) => void
  setNewColumnName: (name: string) => void
  handleAddColumn: () => Promise<void>
  handleRenameColumn: (columnId: string, name: string) => Promise<void>
  handleDeleteColumn: (
    column: TodoColumn,
    items: { id: string }[],
    onMoveTodo: (todoId: string, targetColId: string) => Promise<void>
  ) => Promise<void>
  reorderColumns: (withOrder: TodoColumn[]) => void
}

interface UseTodoColumnsOptions {
  confirm: (opts: {
    type?: ConfirmDialogType
    title: string
    message: string
    confirmLabel?: string
    cancelLabel?: string
  }) => Promise<boolean>
}

export function useTodoColumns({ confirm }: UseTodoColumnsOptions): UseTodoColumnsReturn {
  const [columns, setColumns] = useState<TodoColumn[]>([])
  const [columnsLoading, setColumnsLoading] = useState(true)
  const [editingColumnId, setEditingColumnId] = useState<string | null>(null)
  const [editingColumnName, setEditingColumnName] = useState('')
  const [isAddingColumn, setIsAddingColumn] = useState(false)
  const [newColumnName, setNewColumnName] = useState('')
  const [addingColumnInFlight, setAddingColumnInFlight] = useState(false)

  const loadColumns = useCallback(async () => {
    try {
      const res = await fetch('/api/todo-columns')
      if (res.ok) {
        const data = await res.json()
        setColumns(data || [])
      }
    } catch (err) {
      logger.error('載入欄位失敗:', err)
    } finally {
      setColumnsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadColumns()
  }, [loadColumns])

  const handleAddColumn = useCallback(async () => {
    if (!newColumnName.trim()) return
    if (addingColumnInFlight) return
    setAddingColumnInFlight(true)
    try {
      const res = await fetch('/api/todo-columns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newColumnName.trim(), color: 'gray' }),
      })
      if (res.ok) {
        const col = await res.json()
        setColumns(prev => [...prev, col])
        setNewColumnName('')
        setIsAddingColumn(false)
      }
    } catch (err) {
      logger.error('新增欄位失敗:', err)
    } finally {
      setAddingColumnInFlight(false)
    }
  }, [newColumnName, addingColumnInFlight])

  const handleRenameColumn = useCallback(async (columnId: string, name: string) => {
    if (!name.trim()) {
      setEditingColumnId(null)
      return
    }
    try {
      await fetch('/api/todo-columns', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: columnId, name: name.trim() }),
      })
      setColumns(prev => prev.map(c => (c.id === columnId ? { ...c, name: name.trim() } : c)))
    } catch (err) {
      logger.error('重命名失敗:', err)
    } finally {
      setEditingColumnId(null)
    }
  }, [])

  const handleDeleteColumn = useCallback(
    async (
      column: TodoColumn,
      items: { id: string }[],
      onMoveTodo: (todoId: string, targetColId: string) => Promise<void>
    ) => {
      const itemCount = items.length
      const confirmed = await confirm({
        type: 'danger',
        title: `刪除欄位「${column.name}」`,
        message:
          itemCount > 0
            ? `此欄位內有 ${itemCount} 張卡片，刪除後卡片會移到第一欄`
            : '確定要刪除這個欄位嗎？',
        confirmLabel: '刪除',
        cancelLabel: '取消',
      })
      if (!confirmed) return

      try {
        const res = await fetch(`/api/todo-columns?id=${column.id}`, { method: 'DELETE' })
        if (!res.ok) {
          const err = await res.json()
          await alertError(err.error || '刪除失敗')
          return
        }
        // 卡片移到第一欄
        const firstCol = columns.find(c => c.id !== column.id)
        if (firstCol && itemCount > 0) {
          for (const todo of items) {
            await onMoveTodo(todo.id, firstCol.id)
          }
        }
        setColumns(prev => prev.filter(c => c.id !== column.id))
      } catch (err) {
        logger.error('刪除欄位失敗:', err)
      }
    },
    [columns, confirm]
  )

  const reorderColumns = useCallback((withOrder: TodoColumn[]) => {
    setColumns(withOrder)
  }, [])

  return {
    columns,
    columnsLoading,
    editingColumnId,
    editingColumnName,
    isAddingColumn,
    newColumnName,
    addingColumnInFlight,
    setEditingColumnId,
    setEditingColumnName,
    setIsAddingColumn,
    setNewColumnName,
    handleAddColumn,
    handleRenameColumn,
    handleDeleteColumn,
    reorderColumns,
  }
}
