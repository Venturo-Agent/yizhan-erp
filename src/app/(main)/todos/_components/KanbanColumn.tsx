'use client'

import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Draggable, Droppable } from '@hello-pangea/dnd'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Todo } from '@/stores/types'
import { TodoCard } from './TodoCard'
import { useTranslations } from 'next-intl'

interface TodoColumn {
  id: string
  workspace_id: string
  name: string
  color: string
  sort_order: number
  is_system: boolean
  mapped_status: string | null
}

// 欄位顏色對應（全部走設計變數，跟主題切換）
const COLOR_MAP: Record<string, { border: string; text: string }> = {
  gray: { border: 'border-morandi-muted', text: 'text-morandi-secondary' },
  gold: { border: 'border-morandi-gold', text: 'text-morandi-gold' },
  green: { border: 'border-morandi-green', text: 'text-morandi-green' },
  red: { border: 'border-morandi-red', text: 'text-morandi-red' },
  blue: { border: 'border-status-info', text: 'text-status-info' },
  purple: { border: 'border-cat-purple/30', text: 'text-cat-purple' },
  orange: { border: 'border-cat-orange/30', text: 'text-cat-orange' },
  pink: { border: 'border-cat-pink/30', text: 'text-cat-pink' },
  indigo: { border: 'border-cat-indigo/30', text: 'text-cat-indigo' },
}

interface KanbanColumnProps {
  column: TodoColumn
  index: number
  items: Todo[]
  // 快速新增狀態
  quickAddColumn: string | null
  quickAddValue: string
  isSubmitting: boolean
  // 重命名狀態
  editingColumnId: string | null
  editingColumnName: string
  // 員工 / 使用者
  currentUserId: string | undefined
  getEmployeeName: (id?: string) => string | null
  // 回呼
  onStartQuickAdd: (columnId: string) => void
  onCancelQuickAdd: () => void
  onQuickAddValueChange: (value: string) => void
  onQuickAdd: (columnId: string) => void
  onStartEditColumn: (columnId: string, name: string) => void
  onEditingColumnNameChange: (name: string) => void
  onRenameColumn: (columnId: string, name: string) => void
  onCancelEditColumn: () => void
  onDeleteColumn: (column: TodoColumn) => void
  onCardClick: (id: string) => void
  onToggleComplete: (todo: Todo) => void
  onDeleteTodo: (todo: Todo) => void
  onChangePriority: (todo: Todo, priority: number) => void
}

export function KanbanColumn({
  column,
  index,
  items,
  quickAddColumn,
  quickAddValue,
  isSubmitting,
  editingColumnId,
  editingColumnName,
  currentUserId,
  getEmployeeName,
  onStartQuickAdd,
  onCancelQuickAdd,
  onQuickAddValueChange,
  onQuickAdd,
  onStartEditColumn,
  onEditingColumnNameChange,
  onRenameColumn,
  onCancelEditColumn,
  onDeleteColumn,
  onCardClick,
  onToggleComplete,
  onDeleteTodo,
  onChangePriority,
}: KanbanColumnProps) {
  const t = useTranslations('todos')
  const colorClass = COLOR_MAP[column.color] || COLOR_MAP.gray

  return (
    <Draggable key={column.id} draggableId={column.id} index={index}>
      {provided => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          className="flex flex-col w-[20rem] flex-shrink-0 max-h-full bg-morandi-container/40 rounded-xl border border-border/40 shadow-sm"
        >
          {/* 欄位標題 */}
          <div
            {...provided.dragHandleProps}
            className={cn(
              'flex items-center justify-between px-3 py-3 cursor-grab border-b-2 rounded-t-xl',
              colorClass.border
            )}
          >
            <div className="flex items-center gap-2 flex-1 min-w-0">
              {editingColumnId === column.id ? (
                <Input
                  autoFocus
                  value={editingColumnName}
                  onChange={e => onEditingColumnNameChange(e.target.value)}
                  onBlur={() => onRenameColumn(column.id, editingColumnName)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') onRenameColumn(column.id, editingColumnName)
                    if (e.key === 'Escape') onCancelEditColumn()
                  }}
                  onClick={e => e.stopPropagation()}
                  className="h-7 text-sm"
                />
              ) : (
                <span
                  className="text-sm font-semibold text-morandi-primary truncate"
                  onDoubleClick={() => onStartEditColumn(column.id, column.name)}
                >
                  {column.name}
                </span>
              )}
            </div>
            <div className="flex items-center gap-0.5">
              <button
                onClick={e => {
                  e.stopPropagation()
                  onStartQuickAdd(column.id)
                }}
                className="p-1 rounded hover:bg-morandi-container/50 text-morandi-secondary hover:text-morandi-primary transition-colors"
                title={t('addCard')}
              >
                <Plus size={16} />
              </button>
              {!column.is_system && (
                <>
                  <button
                    onClick={e => {
                      e.stopPropagation()
                      onStartEditColumn(column.id, column.name)
                    }}
                    className="p-1 rounded hover:bg-morandi-container/50 text-morandi-secondary hover:text-morandi-primary transition-colors"
                    title={t('rename')}
                  >
                    <Pencil size={13} />
                  </button>
                  <button
                    onClick={e => {
                      e.stopPropagation()
                      onDeleteColumn(column)
                    }}
                    className="p-1 rounded hover:bg-morandi-red/10 text-morandi-secondary hover:text-morandi-red transition-colors"
                    title={t('deleteColumn')}
                  >
                    <Trash2 size={13} />
                  </button>
                </>
              )}
            </div>
          </div>

          {/* 快速新增 */}
          {quickAddColumn === column.id && (
            <div className="mx-2 mt-2 bg-card rounded-lg border border-border shadow-sm p-3">
              <Input
                autoFocus
                placeholder={t('enterTaskTitle')}
                value={quickAddValue}
                onChange={e => onQuickAddValueChange(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
                    e.preventDefault()
                    onQuickAdd(column.id)
                  }
                  if (e.key === 'Escape') onCancelQuickAdd()
                }}
                className="h-8 text-sm mb-2"
              />
              <div className="flex gap-2">
                <Button
                  variant="soft-gold"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => onQuickAdd(column.id)}
                  disabled={!quickAddValue.trim() || isSubmitting}
                >
                  新增
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 text-xs"
                  onClick={onCancelQuickAdd}
                >
                  取消
                </Button>
              </div>
            </div>
          )}

          {/* 卡片列表 */}
          <Droppable droppableId={column.id} type="card">
            {(provided, snapshot) => (
              <div
                ref={provided.innerRef}
                {...provided.droppableProps}
                className={cn(
                  'flex-1 overflow-y-auto space-y-2 p-2 transition-colors min-h-[80px]',
                  snapshot.isDraggingOver && 'bg-morandi-gold/10'
                )}
              >
                {items.map((todo, idx) => (
                  <TodoCard
                    key={todo.id}
                    todo={todo}
                    index={idx}
                    assigneeName={getEmployeeName(todo.assignee)}
                    currentUserId={currentUserId}
                    onClick={onCardClick}
                    onToggleComplete={onToggleComplete}
                    onDelete={onDeleteTodo}
                    onChangePriority={onChangePriority}
                  />
                ))}
                {provided.placeholder}
                {items.length === 0 && !snapshot.isDraggingOver && (
                  <div className="text-center py-8 text-sm text-morandi-muted/60">
                    拖曳卡片到這裡
                  </div>
                )}
              </div>
            )}
          </Droppable>
        </div>
      )}
    </Draggable>
  )
}
