'use client'

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { useSearchParams } from 'next/navigation'
import { Plus } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { ContentPageLayout } from '@/components/layout/content-page-layout'
import { useTodos } from '@/hooks/useTodos'
import { useEmployeesSlim } from '@/data'
import { useAuthStore } from '@/stores/auth-store'
import { logger } from '@/lib/utils/logger'
import { TodoExpandedView } from './_components/todo-expanded-view/TodoExpandedView'
import { AddTodoForm } from './_components/AddTodoForm'
import { Todo } from '@/stores/types'
import { ConfirmDialog } from '@/components/dialog/confirm-dialog'
import { useConfirmDialog } from '@/hooks/useConfirmDialog'
import { apiMutate } from '@/lib/swr/api-mutate'
import { DragDropContext, Droppable, type DropResult } from '@hello-pangea/dnd'
import { TodoFiltersBar } from './_components/TodoFiltersBar'
import { KanbanColumn } from './_components/KanbanColumn'
import { TodoCard } from './_components/TodoCard'
import { AddColumnInput } from './_components/AddColumnInput'
import { useTodoColumns, TodoColumn } from './_hooks/useTodoColumns'
import { useTodoActions } from './_hooks/useTodoActions'

export const dynamic = 'force-dynamic'

export default function TodosPage() {
  const t = useTranslations('todos')
  const { todos, create: addTodo, update: updateTodo, delete: removeTodo } = useTodos()
  const { user } = useAuthStore()
  const { items: employees } = useEmployeesSlim()
  const searchParams = useSearchParams()
  const [expandedTodo, setExpandedTodo] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [priorityFilter, setPriorityFilter] = useState<number | 'all'>('all')
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [quickAddColumn, setQuickAddColumn] = useState<string | null>(null)
  const { confirm, confirmDialogProps } = useConfirmDialog()

  // 看板欄位（欄位狀態 + CRUD 全在 hook 裡）
  const {
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
  } = useTodoColumns({ confirm })

  // Todo 操作（新增/刪除/切換完成/切換優先級）
  const {
    isSubmitting,
    quickAddValue,
    setQuickAddValue,
    handleQuickAdd,
    handleAddTodo,
    handleChangePriority,
    handleToggleComplete,
    handleDeleteTodo,
  } = useTodoActions({ addTodo, updateTodo, removeTodo, columns })

  // 處理跳轉
  useEffect(() => {
    const expandId = searchParams.get('expand')
    if (expandId) setExpandedTodo(expandId)
  }, [searchParams])

  // 員工名稱
  const getEmployeeName = useCallback(
    (id?: string) => {
      if (!id) return null
      const emp = employees?.find(e => e.id === id)
      return emp?.chinese_name || emp?.display_name || null
    },
    [employees]
  )

  // 篩選後的 todos
  const visibleTodos = useMemo(() => {
    if (!todos || !Array.isArray(todos)) return []
    const currentUserId = user?.id
    return todos.filter(todo => {
      if (currentUserId) {
        const isCreator = (todo.creator || todo.created_by) === currentUserId
        const isAssignee = todo.assignee === currentUserId
        const inVisibility = todo.visibility?.includes(currentUserId)
        if (!isCreator && !isAssignee && !inVisibility) return false
      }
      if (searchTerm && !todo.title.toLowerCase().includes(searchTerm.toLowerCase())) return false
      if (priorityFilter !== 'all' && todo.priority !== priorityFilter) return false
      return true
    })
  }, [todos, searchTerm, priorityFilter, user?.id])

  // 按 column_id 分組
  const todosByColumn = useMemo(() => {
    const map: Record<string, Todo[]> = {}
    columns.forEach(col => {
      map[col.id] = []
    })
    const defaultCol = columns.find(c => c.mapped_status === 'pending') || columns[0]
    visibleTodos.forEach(todo => {
      // 配對的「被指派卡」(linked + assignee≠建立者) 只在被指派者的「任務指派」虛擬欄顯示、不進一般欄
      if (todo.linked_group_id && todo.assignee !== (todo.creator || todo.created_by)) return
      const colId = todo.column_id || defaultCol?.id
      if (colId && map[colId]) map[colId].push(todo)
    })
    Object.keys(map).forEach(key => {
      map[key].sort((a, b) => (b.priority || 1) - (a.priority || 1))
    })
    return map
  }, [visibleTodos, columns])

  // 「任務指派」虛擬欄：指派給我（且非我自己建）的卡；空就不顯示（William 2026-05-29 拍板）
  const ASSIGNED_DROPPABLE = '__assigned__'
  const assignedToMe = useMemo(() => {
    const uid = user?.id
    if (!uid) return []
    return visibleTodos
      .filter(todo => todo.assignee === uid && (todo.creator || todo.created_by) !== uid)
      .sort((a, b) => (b.priority || 1) - (a.priority || 1))
  }, [visibleTodos, user?.id])

  // 拖曳結束
  const handleDragEnd = useCallback(
    (result: DropResult) => {
      const { draggableId, destination, source, type } = result
      if (!destination) return
      // 任務指派虛擬欄：不參與拖移（卡片固定在收件欄、各自完成才消失）
      if (
        source.droppableId === ASSIGNED_DROPPABLE ||
        destination.droppableId === ASSIGNED_DROPPABLE
      )
        return

      if (type === 'column') {
        if (destination.index === source.index) return
        const reordered = Array.from(columns)
        const [moved] = reordered.splice(source.index, 1)
        reordered.splice(destination.index, 0, moved)
        const withOrder = reordered.map((col, idx) => ({ ...col, sort_order: idx + 1 }))
        reorderColumns(withOrder)
        apiMutate('/api/todo-columns', {
          method: 'PUT',
          body: { reorder: withOrder.map(c => ({ id: c.id, sort_order: c.sort_order })) },
          invalidate: ['/api/todo-columns'],
        }).catch(err => logger.error('欄位排序失敗:', err))
        return
      }

      const newColumnId = destination.droppableId
      const todo = todos?.find(t => t.id === draggableId)
      if (!todo || todo.column_id === newColumnId) return

      const targetColumn = columns.find(c => c.id === newColumnId)
      const updates: Partial<Todo> = { column_id: newColumnId }
      if (targetColumn?.mapped_status) {
        updates.status = targetColumn.mapped_status as Todo['status']
        updates.completed = targetColumn.mapped_status === 'completed'
      }
      updateTodo(draggableId, updates)
    },
    [columns, todos, updateTodo, reorderColumns]
  )

  return (
    <ContentPageLayout
      title={t('todosLabel')}
      showSearch
      searchTerm={searchTerm}
      onSearchChange={setSearchTerm}
      searchPlaceholder={t('searchPlaceholder')}
      badge={undefined}
      headerActions={
        <TodoFiltersBar priorityFilter={priorityFilter} onPriorityChange={setPriorityFilter} />
      }
      primaryAction={{
        label: t('addTask'),
        icon: Plus,
        onClick: () => setIsAddDialogOpen(true),
      }}
      className="h-full flex flex-col -m-4 lg:-m-6"
      contentClassName="flex-1 overflow-hidden"
    >
      {/* 看板 */}
      <div className="h-full flex flex-col">
        {columnsLoading ? (
          <div className="flex-1 flex items-center justify-center text-morandi-muted">
            載入中...
          </div>
        ) : (
          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="board" type="column" direction="horizontal">
              {provided => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className="flex-1 overflow-x-auto overflow-y-hidden px-4 py-4"
                >
                  <div className="flex gap-3 h-full min-w-max items-start">
                    {columns.map((column, index) => (
                      <KanbanColumn
                        key={column.id}
                        column={column}
                        index={index}
                        items={todosByColumn[column.id] || []}
                        quickAddColumn={quickAddColumn}
                        quickAddValue={quickAddValue}
                        isSubmitting={isSubmitting}
                        editingColumnId={editingColumnId}
                        editingColumnName={editingColumnName}
                        currentUserId={user?.id}
                        getEmployeeName={getEmployeeName}
                        onStartQuickAdd={id => {
                          setQuickAddColumn(id)
                          setQuickAddValue('')
                        }}
                        onCancelQuickAdd={() => setQuickAddColumn(null)}
                        onQuickAddValueChange={setQuickAddValue}
                        onQuickAdd={id =>
                          handleQuickAdd(id, quickAddColumn, () => setQuickAddColumn(null))
                        }
                        onStartEditColumn={(id, name) => {
                          setEditingColumnId(id)
                          setEditingColumnName(name)
                        }}
                        onEditingColumnNameChange={setEditingColumnName}
                        onRenameColumn={handleRenameColumn}
                        onCancelEditColumn={() => setEditingColumnId(null)}
                        onDeleteColumn={(col: TodoColumn) =>
                          handleDeleteColumn(
                            col,
                            todosByColumn[col.id] || [],
                            (todoId, targetColId) => updateTodo(todoId, { column_id: targetColId })
                          )
                        }
                        onCardClick={(id: string) => setExpandedTodo(id)}
                        onToggleComplete={handleToggleComplete}
                        onDeleteTodo={handleDeleteTodo}
                        onChangePriority={handleChangePriority}
                      />
                    ))}
                    {provided.placeholder}
                    {/* 任務指派虛擬欄（最右、空就不顯示、系統欄不可增刪） */}
                    {assignedToMe.length > 0 && (
                      <div className="flex flex-col w-[20rem] flex-shrink-0 max-h-full bg-morandi-container/40 rounded-xl border border-border/40 shadow-sm">
                        <div className="flex items-center gap-2 px-3 py-3 border-b-2 border-morandi-gold rounded-t-xl">
                          <span className="text-sm font-semibold text-morandi-primary">
                            任務指派
                          </span>
                          <span className="text-xs text-morandi-muted">{assignedToMe.length}</span>
                        </div>
                        <Droppable droppableId={ASSIGNED_DROPPABLE} type="card" isDropDisabled>
                          {dropProvided => (
                            <div
                              ref={dropProvided.innerRef}
                              {...dropProvided.droppableProps}
                              className="flex-1 overflow-y-auto space-y-2 p-2 min-h-[80px]"
                            >
                              {assignedToMe.map((todo, idx) => (
                                <TodoCard
                                  key={todo.id}
                                  todo={todo}
                                  index={idx}
                                  assigneeName={getEmployeeName(todo.assignee)}
                                  currentUserId={user?.id}
                                  onClick={(id: string) => setExpandedTodo(id)}
                                  onToggleComplete={handleToggleComplete}
                                  onDelete={handleDeleteTodo}
                                  onChangePriority={handleChangePriority}
                                />
                              ))}
                              {dropProvided.placeholder}
                            </div>
                          )}
                        </Droppable>
                      </div>
                    )}
                    <AddColumnInput
                      isAddingColumn={isAddingColumn}
                      newColumnName={newColumnName}
                      addingColumnInFlight={addingColumnInFlight}
                      onNewColumnNameChange={setNewColumnName}
                      onAddColumn={handleAddColumn}
                      onCancelAddColumn={() => {
                        setIsAddingColumn(false)
                        setNewColumnName('')
                      }}
                      onStartAddColumn={() => setIsAddingColumn(true)}
                    />
                  </div>
                </div>
              )}
            </Droppable>
          </DragDropContext>
        )}
      </div>

      {/* 展開卡片 */}
      {expandedTodo &&
        (() => {
          const todo = todos?.find(t => t.id === expandedTodo)
          if (!todo) return null
          return (
            <TodoExpandedView
              todo={todo}
              onUpdate={async updates => {
                try {
                  await updateTodo(expandedTodo, updates)
                } catch {
                  /* useTodos 已處理回滾 */
                }
              }}
              onClose={() => setExpandedTodo(null)}
              onDelete={async () => {
                // TodoSidebar 已自帶確認、這裡直接刪、不再二次確認（修雙重「刪除」彈窗 bug）
                try {
                  await removeTodo(todo.id)
                } catch {
                  /* useTodos 已處理回滾 */
                }
                setExpandedTodo(null)
              }}
            />
          )
        })()}

      {/* 新增 Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent level={1} className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('addTodo')}</DialogTitle>
            <DialogDescription>{t('addTodoDesc')}</DialogDescription>
          </DialogHeader>
          <AddTodoForm
            onSubmit={formData => handleAddTodo(formData, () => setIsAddDialogOpen(false))}
            onCancel={() => setIsAddDialogOpen(false)}
            isSubmitting={isSubmitting}
          />
        </DialogContent>
      </Dialog>

      <ConfirmDialog {...confirmDialogProps} />
    </ContentPageLayout>
  )
}
