'use client'

import React from 'react'
import { Calendar, Check, MapPin, Trash2 } from 'lucide-react'
import { Draggable } from '@hello-pangea/dnd'
import { useTranslations } from 'next-intl'
import { cn } from '@/lib/utils'
import { formatDateCompact } from '@/lib/utils/format-date'
import { Todo } from '@/stores/types'

interface TodoCardProps {
  todo: Todo
  index: number
  assigneeName: string | null
  currentUserId: string | undefined
  onClick: (id: string) => void
  onToggleComplete: (todo: Todo) => void
  onDelete: (todo: Todo) => void
  onChangePriority: (todo: Todo, priority: number) => void
}

const PRIORITY_LABELS: Record<number, string> = {
  1: '很低',
  2: '低',
  3: '中',
  4: '高',
  5: '緊急',
}

function getPriorityBadgeClass(priority: number): string {
  switch (priority) {
    case 5:
      return 'bg-morandi-red/10 text-morandi-red border border-morandi-red/20'
    case 4:
      return 'bg-orange-50 text-orange-600 border border-orange-100'
    case 3:
      return 'bg-morandi-gold/10 text-morandi-gold border border-morandi-gold/20'
    case 2:
      return 'bg-sky-50 text-sky-600 border border-sky-100'
    default:
      return 'bg-morandi-muted/10 text-morandi-muted border border-morandi-muted/20'
  }
}

function getDeadlineBadge(deadline?: string) {
  if (!deadline) return null
  const date = new Date(deadline)
  const now = new Date()
  const diffDays = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  const formatted = formatDateCompact(date)
  if (diffDays < 0)
    return { text: `逾期 ${Math.abs(diffDays)} 天`, color: 'text-morandi-red bg-morandi-red/10' }
  if (diffDays === 0) return { text: '今天', color: 'text-morandi-gold bg-morandi-gold/10' }
  if (diffDays <= 3)
    return { text: `${diffDays} 天後`, color: 'text-morandi-gold/80 bg-morandi-gold/5' }
  return { text: formatted, color: 'text-morandi-secondary bg-morandi-container/50' }
}

export const TodoCard = React.memo(
  function TodoCard({
    todo,
    index,
    assigneeName,
    currentUserId,
    onClick,
    onToggleComplete,
    onDelete,
  }: TodoCardProps) {
    const t = useTranslations('todos')
    const deadlineInfo = getDeadlineBadge(todo.deadline)
    const subTasksDone = todo.sub_tasks?.filter(s => s.done).length || 0
    const subTasksTotal = todo.sub_tasks?.length || 0
    const unreadNotes = (todo.notes || []).filter(
      n => n.author_id !== currentUserId && !n.read_by?.includes(currentUserId || '')
    ).length

    return (
      <Draggable draggableId={todo.id} index={index}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.draggableProps}
            {...provided.dragHandleProps}
            onClick={() => onClick(todo.id)}
            className={cn(
              'group relative cursor-pointer transition-all rounded-md',
              'bg-card/60 border border-border/40 hover:bg-card hover:border-morandi-gold/40 hover:shadow-sm',
              snapshot.isDragging && 'bg-card shadow-xl ring-2 ring-morandi-gold rotate-[1deg]',
              todo.status === 'completed' && 'opacity-60'
            )}
          >
            <div className="p-2.5 relative">
              <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  type="button"
                  onClick={e => {
                    e.stopPropagation()
                    onToggleComplete(todo)
                  }}
                  title={todo.completed ? '標為未完成' : '標為完成'}
                  className="p-1 rounded bg-card/80 border border-border hover:bg-morandi-green/10 hover:border-morandi-green hover:text-morandi-green text-morandi-secondary transition-colors"
                >
                  <Check size={12} />
                </button>
                <button
                  type="button"
                  onClick={e => {
                    e.stopPropagation()
                    onDelete(todo)
                  }}
                  title={t('delete')}
                  className="p-1 rounded bg-card/80 border border-border hover:bg-morandi-red/10 hover:border-morandi-red hover:text-morandi-red text-morandi-secondary transition-colors"
                >
                  <Trash2 size={12} />
                </button>
              </div>

              <div className="flex items-start gap-2 pr-14">
                <p
                  className={cn(
                    'flex-1 text-sm font-medium text-morandi-primary leading-snug',
                    todo.status === 'completed' && 'line-through'
                  )}
                >
                  {todo.title}
                </p>
                {unreadNotes > 0 && (
                  <span className="flex-shrink-0 min-w-[18px] h-[18px] bg-morandi-red text-white text-[0.588rem] font-bold rounded-full flex items-center justify-center px-1">
                    {unreadNotes}
                  </span>
                )}
              </div>

              {todo.description && (
                <p className="text-xs text-morandi-secondary mt-1.5 line-clamp-2 leading-relaxed">
                  {todo.description}
                </p>
              )}

              <div className="flex items-center gap-1.5 mt-2.5 flex-wrap">
                <span
                  className={cn(
                    'text-[0.588rem] font-medium px-1.5 py-0.5 rounded',
                    getPriorityBadgeClass(todo.priority || 1)
                  )}
                >
                  {PRIORITY_LABELS[todo.priority || 1]}
                </span>

                {todo.related_items && todo.related_items.length > 0 && (
                  <>
                    <span className="text-[0.588rem] inline-flex items-center gap-1 px-1.5 py-0.5 rounded border border-morandi-gold/20 bg-morandi-gold/5 text-morandi-primary max-w-[150px]">
                      <MapPin size={10} className="text-morandi-gold flex-shrink-0" />
                      <span className="truncate">{todo.related_items[0].title}</span>
                    </span>
                    {todo.related_items.length > 1 && (
                      <span
                        className="text-[0.588rem] bg-morandi-container/50 text-morandi-secondary px-1.5 py-0.5 rounded flex-shrink-0"
                        title={todo.related_items
                          .slice(1)
                          .map(i => i.title)
                          .join('、')}
                      >
                        +{todo.related_items.length - 1}
                      </span>
                    )}
                  </>
                )}
              </div>

              {subTasksTotal > 0 && (
                <div className="flex items-center gap-2 mt-2">
                  <div className="flex-1 h-1 bg-morandi-container/50 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-morandi-green rounded-full"
                      style={{ width: `${(subTasksDone / subTasksTotal) * 100}%` }}
                    />
                  </div>
                  <span className="text-[0.588rem] text-morandi-muted">
                    {subTasksDone}/{subTasksTotal}
                  </span>
                </div>
              )}

              <div className="flex items-center justify-between mt-2.5">
                {assigneeName ? (
                  <div className="flex items-center gap-1.5">
                    <div className="w-5 h-5 rounded-full bg-morandi-gold/20 flex items-center justify-center text-[0.588rem] font-medium text-morandi-gold">
                      {assigneeName.slice(0, 1)}
                    </div>
                    <span className="text-[0.647rem] text-morandi-secondary">{assigneeName}</span>
                  </div>
                ) : (
                  <div />
                )}

                {deadlineInfo && (
                  <span
                    className={cn(
                      'flex items-center gap-1 text-[0.647rem]',
                      deadlineInfo.color
                    )}
                  >
                    <Calendar size={10} />
                    {deadlineInfo.text}
                  </span>
                )}
              </div>
            </div>
          </div>
        )}
      </Draggable>
    )
  },
  (prev, next) => {
    return (
      prev.todo.id === next.todo.id &&
      prev.todo.title === next.todo.title &&
      prev.todo.description === next.todo.description &&
      prev.todo.status === next.todo.status &&
      prev.todo.priority === next.todo.priority &&
      prev.todo.deadline === next.todo.deadline &&
      prev.todo.column_id === next.todo.column_id &&
      prev.todo.sub_tasks === next.todo.sub_tasks &&
      prev.todo.notes === next.todo.notes &&
      prev.todo.related_items === next.todo.related_items &&
      prev.index === next.index &&
      prev.assigneeName === next.assigneeName &&
      prev.currentUserId === next.currentUserId
    )
  }
)
