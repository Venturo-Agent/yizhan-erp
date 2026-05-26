'use client'

import React from 'react'
import { Calendar, MapPin, Paperclip } from 'lucide-react'
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

const PRIORITY_COLORS: Record<number, { bg: string; text: string; dot: string; label: string }> = {
  5: {
    bg: 'bg-status-danger-bg',
    text: 'text-status-danger',
    dot: 'bg-status-danger',
    label: '緊急',
  },
  4: {
    bg: 'bg-status-danger-bg',
    text: 'text-status-danger',
    dot: 'bg-status-danger',
    label: '高',
  },
  3: {
    bg: 'bg-status-warning-bg',
    text: 'text-status-warning',
    dot: 'bg-status-warning',
    label: '中',
  },
  2: {
    bg: 'bg-status-neutral-bg',
    text: 'text-status-neutral',
    dot: 'bg-status-neutral',
    label: '低',
  },
  1: {
    bg: 'bg-status-neutral-bg',
    text: 'text-morandi-muted',
    dot: 'bg-morandi-muted',
    label: '很低',
  },
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
    const priority = todo.priority || 3
    const priorityConfig = PRIORITY_COLORS[priority]
    const subTasksDone = todo.sub_tasks?.filter(s => s.done).length || 0
    const subTasksTotal = todo.sub_tasks?.length || 0
    const relatedTour = todo.related_items?.find(r => r.type === 'group')
    const hasAttachments = (todo.notes?.length || 0) > 0 || subTasksTotal > 0

    const deadline = todo.deadline ? new Date(todo.deadline) : null
    const now = new Date()
    const diffDays = deadline
      ? Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      : null
    const isOverdue = deadline && diffDays !== null && diffDays < 0
    const isToday = deadline && diffDays === 0
    const isSoon = deadline && diffDays !== null && diffDays > 0 && diffDays <= 3

    return (
      <Draggable draggableId={todo.id} index={index}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.draggableProps}
            {...provided.dragHandleProps}
            onClick={() => onClick(todo.id)}
            className={cn(
              'group relative cursor-pointer rounded-lg border bg-card transition-all',
              snapshot.isDragging
                ? 'shadow-lg ring-2 ring-morandi-gold rotate-[1deg]'
                : 'border-border/60 hover:border-morandi-gold/30 hover:shadow-sm',
              todo.status === 'completed' && 'opacity-50'
            )}
          >
            <div className="p-3 space-y-2.5">
              {/* Header: Priority + Tour */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <div className={cn('w-1.5 h-1.5 rounded-full', priorityConfig.dot)} />
                  <span className={cn('text-xs font-medium', priorityConfig.text)}>
                    {priorityConfig.label}
                  </span>
                </div>
                {relatedTour && (
                  <span className="inline-flex items-center gap-1 text-xs text-morandi-gold bg-morandi-gold/8 px-1.5 py-0.5 rounded-md">
                    <MapPin size={10} />
                    <span className="truncate max-w-[100px]">{relatedTour.title}</span>
                  </span>
                )}
              </div>

              {/* Title */}
              <p
                className={cn(
                  'text-sm font-medium text-foreground leading-snug',
                  todo.status === 'completed' && 'line-through text-muted-foreground'
                )}
              >
                {todo.title}
              </p>

              {/* Meta row */}
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <div className="flex items-center gap-2">
                  {deadline && (
                    <span
                      className={cn(
                        'flex items-center gap-1',
                        isOverdue && 'text-status-danger',
                        isToday && 'text-status-warning',
                        isSoon && !isOverdue && 'text-status-warning',
                        !isOverdue && !isToday && !isSoon && 'text-muted-foreground'
                      )}
                    >
                      <Calendar size={11} />
                      {isOverdue
                        ? `逾期${Math.abs(diffDays!)}天`
                        : isToday
                          ? '今天'
                          : formatDateCompact(deadline)}
                    </span>
                  )}
                  {subTasksTotal > 0 && (
                    <span className="flex items-center gap-1">
                      <Paperclip size={11} />
                      {subTasksDone}/{subTasksTotal}
                    </span>
                  )}
                </div>
                {assigneeName && (
                  <div className="flex items-center gap-1">
                    <div className="w-5 h-5 rounded-full bg-morandi-gold/20 text-morandi-gold text-[10px] font-medium flex items-center justify-center">
                      {assigneeName.slice(0, 1)}
                    </div>
                    <span className="truncate max-w-[60px]">{assigneeName}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </Draggable>
    )
  },
  (prev, next) =>
    prev.todo.id === next.todo.id &&
    prev.todo.title === next.todo.title &&
    prev.todo.status === next.todo.status &&
    prev.todo.priority === next.todo.priority &&
    prev.todo.deadline === next.todo.deadline &&
    prev.todo.column_id === next.todo.column_id &&
    prev.todo.sub_tasks?.length === next.todo.sub_tasks?.length &&
    prev.todo.related_items === next.todo.related_items &&
    prev.index === next.index
)
