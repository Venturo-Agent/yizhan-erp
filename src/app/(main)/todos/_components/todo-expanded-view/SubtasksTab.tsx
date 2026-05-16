'use client'

import React, { lazy, Suspense } from 'react'
import { useTranslations } from 'next-intl'
import { Input } from '@/components/ui/input'
import { CheckCircle2, Plus, Trash2, ChevronDown, ChevronUp } from 'lucide-react'
import { cn } from '@/lib/utils'
import { PRESET_BUSINESS_SUBTASKS } from '@/app/(main)/todos/_constants/labels'
import { PnrToolContent } from '@/app/(main)/todos/_components/PnrToolDialog'
import { InlineTourCreate } from '@/app/(main)/tours/_components/InlineTourCreate'
import type { Todo } from '@/stores/types'

const QuickReceiptLazy = lazy(() =>
  import('../quick-actions/quick-receipt').then(m => ({ default: m.QuickReceipt }))
)
const QuickDisbursementLazy = lazy(() =>
  import('../quick-actions/quick-disbursement').then(m => ({ default: m.QuickDisbursement }))
)

const LABELS = {
  SUBTASK_COLLAPSE: '收合',
  SUBTASK_EXPAND: '展開操作',
  LOADING_REQUEST_FORM: '載入請款表單中...',
  LOADING_RECEIPT_FORM: '載入收款表單中...',
  NO_SUBTASKS: '尚無子任務',
  ADD_SUBTASK_PLACEHOLDER: '新增子任務（按 Enter 送出）...',
  TAB_SUBTASKS: '子任務',
  SUBTASK_OPEN_TOUR: '開團',
  SUBTASK_REQUEST: '請款作業',
  SUBTASK_RECEIVE: '收款確認',
  SUBTASK_FLIGHT: '確認航班',
} as const

const SUBTASK_INLINE_FORMS: string[] = [
  LABELS.SUBTASK_OPEN_TOUR,
  LABELS.SUBTASK_REQUEST,
  LABELS.SUBTASK_RECEIVE,
  LABELS.SUBTASK_FLIGHT,
]
const hasInlineForm = (title: string) => SUBTASK_INLINE_FORMS.includes(title)

interface SubTask {
  id: string
  title: string
  done: boolean
}

interface SubtasksTabProps {
  todo: Todo
  subTasks: SubTask[]
  subTasksDone: number
  subTasksTotal: number
  canEdit: boolean
  expandedSubtaskIds: Set<string>
  newSubtaskTitle: string
  onSubtaskToggle: (id: string) => void
  onSubtaskDone: (id: string) => void
  onDeleteSubtask: (id: string) => void
  onAddSubtask: () => void
  onPresetSubtask: (title: string) => void
  onToggleExpand: (id: string) => void
  onTourCreated: (tour: { id: string; code: string; order?: { id: string; order_number: string } }) => void
  setNewSubtaskTitle: (v: string) => void
}

export function SubtasksTab({
  todo,
  subTasks,
  subTasksDone,
  subTasksTotal,
  canEdit,
  expandedSubtaskIds,
  newSubtaskTitle,
  onSubtaskToggle,
  onSubtaskDone,
  onDeleteSubtask,
  onAddSubtask,
  onPresetSubtask,
  onToggleExpand,
  onTourCreated,
  setNewSubtaskTitle,
}: SubtasksTabProps) {
  const t = useTranslations('todos')
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-morandi-primary">
          {LABELS.TAB_SUBTASKS} ({subTasksTotal})
        </h4>
        {subTasksTotal > 0 && (
          <span className="text-xs text-morandi-secondary">
            {t('subtasksProgress')} {subTasksDone}/{subTasksTotal}
          </span>
        )}
      </div>

      {subTasksTotal > 0 && (
        <div className="h-1.5 bg-morandi-container/40 rounded-full overflow-hidden">
          <div
            className="h-full bg-morandi-green rounded-full transition-all"
            style={{ width: `${(subTasksDone / subTasksTotal) * 100}%` }}
          />
        </div>
      )}

      {/* 快速新增業務子任務（chip 按鈕區） */}
      {canEdit && (
        <div className="bg-card border border-border rounded-lg p-3">
          <h5 className="text-xs font-medium text-morandi-secondary mb-2">
            {t('quickAddSubtasks')}
          </h5>
          <div className="flex flex-wrap gap-1.5">
            {PRESET_BUSINESS_SUBTASKS.map(title => (
              <button
                key={title}
                onClick={() => onPresetSubtask(title)}
                className="flex items-center gap-1 px-2.5 py-1 rounded-md border border-morandi-green/30 text-xs text-morandi-green hover:bg-morandi-green/10 transition-colors"
              >
                <Plus className="w-3 h-3" />
                {title}
              </button>
            ))}
          </div>
        </div>
      )}

      {subTasksTotal > 0 ? (
        <div className="space-y-2">
          {subTasks.map(sub => {
            const isExpanded = expandedSubtaskIds.has(sub.id)
            const showForm = hasInlineForm(sub.title)
            return (
              <div
                key={sub.id}
                className="bg-card rounded-lg border border-border overflow-hidden"
              >
                <div className="flex items-center gap-3 p-3">
                  <button
                    onClick={() => onSubtaskToggle(sub.id)}
                    disabled={!canEdit}
                    className={cn(
                      'w-5 h-5 rounded border flex items-center justify-center transition-colors disabled:cursor-not-allowed flex-shrink-0',
                      sub.done
                        ? 'bg-morandi-green border-morandi-green text-white'
                        : 'border-border hover:border-morandi-gold'
                    )}
                  >
                    {sub.done && <CheckCircle2 className="w-3.5 h-3.5" />}
                  </button>
                  <span
                    className={cn(
                      'text-sm flex-1',
                      sub.done ? 'line-through text-morandi-muted' : 'text-morandi-primary'
                    )}
                  >
                    {sub.title}
                  </span>
                  {showForm && (
                    <button
                      onClick={() => onToggleExpand(sub.id)}
                      className="text-morandi-secondary hover:text-morandi-primary p-1 rounded transition-colors"
                      title={isExpanded ? LABELS.SUBTASK_COLLAPSE : LABELS.SUBTASK_EXPAND}
                    >
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </button>
                  )}
                  {canEdit && (
                    <button
                      onClick={() => onDeleteSubtask(sub.id)}
                      className="text-morandi-muted hover:text-morandi-red p-1 rounded transition-colors"
                      title={t('deleteSubtask')}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                {isExpanded && showForm && (
                  <div className="border-t border-border p-3 bg-morandi-container/10">
                    {sub.title === LABELS.SUBTASK_OPEN_TOUR && (
                      <InlineTourCreate
                        defaultTourName={todo.title}
                        onCreated={tour => {
                          onTourCreated(tour)
                          onSubtaskDone(sub.id)
                        }}
                        onCancel={() => onToggleExpand(sub.id)}
                      />
                    )}
                    {sub.title === LABELS.SUBTASK_REQUEST && (
                      <Suspense
                        fallback={
                          <div className="text-xs text-morandi-muted text-center py-3">
                            {LABELS.LOADING_REQUEST_FORM}
                          </div>
                        }
                      >
                        <QuickDisbursementLazy
                          onSubmit={() => onSubtaskDone(sub.id)}
                          defaultTourId={todo.tour_id || undefined}
                          defaultOrderId={todo.related_items?.find(r => r.type === 'order')?.id || undefined}
                        />
                      </Suspense>
                    )}
                    {sub.title === LABELS.SUBTASK_RECEIVE && (
                      <Suspense
                        fallback={
                          <div className="text-xs text-morandi-muted text-center py-3">
                            {LABELS.LOADING_RECEIPT_FORM}
                          </div>
                        }
                      >
                        <QuickReceiptLazy
                          onSubmit={() => onSubtaskDone(sub.id)}
                          defaultTourId={todo.tour_id || undefined}
                          defaultOrderId={todo.related_items?.find(r => r.type === 'order')?.id || undefined}
                        />
                      </Suspense>
                    )}
                    {sub.title === LABELS.SUBTASK_FLIGHT && <PnrToolContent todo={todo} />}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      ) : (
        <p className="text-sm text-morandi-muted py-4 text-center">{LABELS.NO_SUBTASKS}</p>
      )}

      {canEdit && (
        <div className="relative mt-4">
          <Input
            placeholder={LABELS.ADD_SUBTASK_PLACEHOLDER}
            value={newSubtaskTitle}
            onChange={e => setNewSubtaskTitle(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
                e.preventDefault()
                onAddSubtask()
              }
            }}
            className="text-sm bg-card border-border focus-visible:ring-morandi-gold focus-visible:border-morandi-gold pr-9"
          />
          {newSubtaskTitle.trim() && (
            <button
              onClick={onAddSubtask}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1 rounded text-morandi-gold hover:bg-morandi-gold/10 transition-colors"
              title={t('addBtn')}
            >
              <Plus className="w-4 h-4" />
            </button>
          )}
        </div>
      )}
    </div>
  )
}
