'use client'

import React, { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { Badge } from '@/components/ui/badge'
import { InputIME } from '@/components/ui/input-ime'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Eye } from 'lucide-react'
import { TodoExpandedViewProps } from './types'
import { useTodoExpandedView } from './useTodoExpandedView'
import { NotesSection } from './NotesSection'
import { TodoSidebar } from './TodoSidebar'
import { SubtasksTab } from './SubtasksTab'
import { DetailsTab } from './DetailsTab'
import { useAuthStore } from '@/stores/auth-store'
import { useEmployeesSlim, useToursSlim, useOrdersSlim } from '@/data'
import { cn } from '@/lib/utils'
import type { ComboboxOption } from '@/components/ui/combobox'
import { useTourOptions } from '@/hooks'

const STATUS_DOTS: Record<string, string> = {
  pending: 'bg-morandi-muted',
  in_progress: 'bg-morandi-gold',
  completed: 'bg-status-success',
  cancelled: 'bg-status-danger',
}

function getStatusDot(status: string): string {
  return STATUS_DOTS[status] || 'bg-morandi-muted'
}

export function TodoExpandedView({ todo, onUpdate, onClose, onDelete }: TodoExpandedViewProps) {
  const t = useTranslations('todos')
  const { instances, removeInstance } = useTodoExpandedView()
  const { user } = useAuthStore()
  const { items: employees } = useEmployeesSlim({ all: true })
  const { items: tours } = useToursSlim({ all: true })
  const { items: orders } = useOrdersSlim({ all: true })
  const [activeTab, setActiveTab] = useState('details')
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('')
  const [expandedSubtaskIds, setExpandedSubtaskIds] = useState<Set<string>>(new Set())

  const toggleExpand = (id: string) => {
    setExpandedSubtaskIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  useEffect(() => {
    if (todo) setActiveTab('details')
  }, [todo?.id])

  if (!todo) return null

  const getStatusLabel = (status: string): string => {
    const labels: Record<string, string> = {
      pending: t('statusPending'),
      in_progress: t('statusInProgress'),
      completed: t('statusCompleted'),
      cancelled: t('statusCancelled'),
    }
    return labels[status] || status
  }

  const currentUserId = user?.id
  const isCreator = todo.creator === currentUserId
  const isInVisibility = todo.visibility?.includes(currentUserId || '')
  const canEdit = isCreator || isInVisibility

  const subTasks = todo.sub_tasks || []
  const subTasksDone = subTasks.filter(s => s.done).length
  const subTasksTotal = subTasks.length

  const tourRelated = todo.related_items?.find(r => r.type === 'group')
  const orderRelated = todo.related_items?.find(r => r.type === 'order')

  const handleSubtaskToggle = (subtaskId: string) => {
    if (!canEdit) return
    onUpdate({
      sub_tasks: subTasks.map(st => (st.id === subtaskId ? { ...st, done: !st.done } : st)),
    })
  }

  const handleSubtaskDone = (subtaskId: string) => {
    if (!canEdit) return
    onUpdate({
      sub_tasks: subTasks.map(st => (st.id === subtaskId ? { ...st, done: true } : st)),
    })
    setExpandedSubtaskIds(prev => {
      const next = new Set(prev)
      next.delete(subtaskId)
      return next
    })
  }

  const handleDeleteSubtask = (subtaskId: string) => {
    if (!canEdit) return
    onUpdate({
      sub_tasks: subTasks.filter(st => st.id !== subtaskId),
    })
  }

  const handleAddSubtask = () => {
    if (!canEdit || !newSubtaskTitle.trim()) return
    onUpdate({
      sub_tasks: [
        ...subTasks,
        { id: `st-${Date.now()}`, title: newSubtaskTitle.trim(), done: false },
      ],
    })
    setNewSubtaskTitle('')
  }

  const SUBTASK_INLINE_FORMS = ['開團', '請款作業', '收款確認', '確認航班']

  const addPresetSubtask = (title: string) => {
    if (!canEdit) return
    const newId = `st-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    onUpdate({
      sub_tasks: [...subTasks, { id: newId, title, done: false }],
    })
    if (SUBTASK_INLINE_FORMS.includes(title)) {
      setExpandedSubtaskIds(prev => new Set(prev).add(newId))
      setActiveTab('subtasks')
    }
  }

  const handleTourCreated = (tour: {
    id: string
    code: string
    order?: { id: string; order_number: string }
  }) => {
    const newRelatedItems = [
      ...(todo.related_items?.filter(r => r.type !== 'group' && r.type !== 'order') || []),
      { type: 'group' as const, id: tour.id, title: tour.code },
    ]
    if (tour.order) {
      newRelatedItems.push({
        type: 'order' as const,
        id: tour.order.id,
        title: tour.order.order_number,
      })
    }
    onUpdate({
      related_items: newRelatedItems,
      tour_id: tour.id,
    })
  }

  const tourOptions: ComboboxOption[] = useTourOptions(tours)

  const orderOptions: ComboboxOption[] = (orders || [])
    .filter(o => !tourRelated || o.tour_id === tourRelated.id)
    .map(o => ({
      value: o.id,
      label: o.order_number || o.id,
    }))

  const handleSelectTour = (tourId: string) => {
    if (!canEdit) return
    const others = (todo.related_items || []).filter(r => r.type !== 'group')
    if (!tourId) {
      onUpdate({ related_items: others })
      return
    }
    const tour = tours.find(t => t.id === tourId)
    if (!tour) return
    onUpdate({
      related_items: [
        ...others,
        { type: 'group', id: tour.id, title: tour.code ? `${tour.code}｜${tour.name}` : tour.name },
      ],
      tour_id: tour.id,
    })
  }

  const handleSelectOrder = (orderId: string) => {
    if (!canEdit) return
    const others = (todo.related_items || []).filter(r => r.type !== 'order')
    if (!orderId) {
      onUpdate({ related_items: others })
      return
    }
    const order = orders.find(o => o.id === orderId)
    if (!order) return
    onUpdate({
      related_items: [
        ...others,
        {
          type: 'order',
          id: order.id,
          title: order.order_number || order.id,
        },
      ],
    })
  }

  return (
    <Dialog open={!!todo} onOpenChange={open => !open && onClose()}>
      <DialogContent
        level={1}
        className="max-w-6xl w-[94vw] max-h-[90vh] p-0 overflow-hidden flex flex-col gap-0"
      >
        {/* Header（永遠固定） */}
        <DialogHeader className="px-6 pt-4 pb-0 flex-shrink-0 space-y-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-morandi-secondary">
              <div className={cn('w-2 h-2 rounded-full', getStatusDot(todo.status))} />
              <span>{t('inList')}</span>
              <Badge variant="outline" className="text-xs font-normal border-border bg-card">
                {getStatusLabel(todo.status)}
              </Badge>
              <span>{t('inListIn')}</span>
            </div>
            {!canEdit && (
              <span className="flex items-center gap-1 bg-morandi-gold/10 text-morandi-gold px-2 py-1 rounded text-xs">
                <Eye size={12} />
                {t('readOnlyMode')}
              </span>
            )}
          </div>
          <DialogTitle asChild>
            {canEdit ? (
              <InputIME
                value={todo.title}
                onChange={value => onUpdate({ title: value })}
                placeholder="任務標題"
                className="text-xl font-semibold text-morandi-primary mt-1.5 text-left border-0 border-b border-transparent rounded-none px-0 py-0 h-auto bg-transparent shadow-none focus-visible:ring-0 focus-visible:border-morandi-gold transition-colors"
              />
            ) : (
              <h2 className="text-xl font-semibold text-morandi-primary mt-1.5 text-left">
                {todo.title}
              </h2>
            )}
          </DialogTitle>
        </DialogHeader>

        {/* 兩欄布局：左 = tabs 切換、右 = 永久 sidebar */}
        <div className="flex flex-1 overflow-hidden">
          {/* 左半部：tabs + 內容（可切換） */}
          <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
            <Tabs
              value={activeTab}
              onValueChange={setActiveTab}
              className="w-full flex-1 flex flex-col overflow-hidden"
            >
              <div className="px-6 border-b border-border flex-shrink-0 bg-card relative z-10">
                <TabsList className="bg-transparent rounded-none p-0 h-auto justify-start gap-0">
                  <TabsTrigger
                    value="details"
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-morandi-gold data-[state=active]:bg-transparent data-[state=active]:text-morandi-gold data-[state=active]:font-medium data-[state=active]:shadow-none px-4 py-3 text-sm text-morandi-secondary hover:text-morandi-primary -mb-px"
                  >
                    {t('tabDetails')}
                  </TabsTrigger>
                  <TabsTrigger
                    value="subtasks"
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-morandi-gold data-[state=active]:bg-transparent data-[state=active]:text-morandi-gold data-[state=active]:font-medium data-[state=active]:shadow-none px-4 py-3 text-sm text-morandi-secondary hover:text-morandi-primary -mb-px"
                  >
                    {t('tabSubtasks')} ({subTasksTotal})
                  </TabsTrigger>
                  <TabsTrigger
                    value="activity"
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-morandi-gold data-[state=active]:bg-transparent data-[state=active]:text-morandi-gold data-[state=active]:font-medium data-[state=active]:shadow-none px-4 py-3 text-sm text-morandi-secondary hover:text-morandi-primary -mb-px"
                  >
                    {t('tabActivity')}
                  </TabsTrigger>
                </TabsList>
              </div>

              {/* 詳情 */}
              <TabsContent value="details" className="mt-0 flex-1 overflow-y-auto px-6 py-4">
                <DetailsTab
                  todo={todo}
                  instances={instances}
                  tourRelated={tourRelated}
                  orderRelated={orderRelated}
                  tourOptions={tourOptions}
                  orderOptions={orderOptions}
                  canEdit={canEdit}
                  onUpdate={onUpdate}
                  onSelectTour={handleSelectTour}
                  onSelectOrder={handleSelectOrder}
                  onRemoveInstance={removeInstance}
                />
              </TabsContent>

              {/* 子任務 */}
              <TabsContent value="subtasks" className="mt-0 flex-1 overflow-y-auto px-6 py-4">
                <SubtasksTab
                  todo={todo}
                  subTasks={subTasks}
                  subTasksDone={subTasksDone}
                  subTasksTotal={subTasksTotal}
                  canEdit={canEdit}
                  expandedSubtaskIds={expandedSubtaskIds}
                  newSubtaskTitle={newSubtaskTitle}
                  onSubtaskToggle={handleSubtaskToggle}
                  onSubtaskDone={handleSubtaskDone}
                  onDeleteSubtask={handleDeleteSubtask}
                  onAddSubtask={handleAddSubtask}
                  onPresetSubtask={addPresetSubtask}
                  onToggleExpand={toggleExpand}
                  onTourCreated={handleTourCreated}
                  setNewSubtaskTitle={setNewSubtaskTitle}
                />
              </TabsContent>

              {/* 活動 */}
              <TabsContent value="activity" className="mt-0 flex-1 overflow-y-auto px-6 py-4">
                <NotesSection todo={todo} onUpdate={onUpdate} />
              </TabsContent>
            </Tabs>
          </div>

          {/* 右半部：永久 sidebar、不隨 tab 切換 */}
          <TodoSidebar
            todo={todo}
            canEdit={canEdit}
            currentUserId={currentUserId}
            employees={employees}
            onUpdate={onUpdate}
            onClose={onClose}
            onDelete={onDelete}
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}
