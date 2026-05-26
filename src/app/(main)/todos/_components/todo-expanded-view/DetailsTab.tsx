'use client'

import React from 'react'
import { useTranslations } from 'next-intl'
import { Textarea } from '@/components/ui/textarea'
import { Combobox, type ComboboxOption } from '@/components/ui/combobox'
import { QuickActionInstanceCard } from './QuickActionsSection'
import type { QuickActionInstance } from './types'
import type { Todo } from '@/stores/types'

const COMPONENT_LABELS = {
  TOUR_PLACEHOLDER: '選擇旅遊團...',
  TOUR_EMPTY: '找不到旅遊團',
  ORDER_PLACEHOLDER: '選擇訂單...',
  ORDER_NEED_TOUR_FIRST: '請先選擇旅遊團',
  ORDER_EMPTY_FOR_TOUR: '此團無訂單',
  DESCRIPTION_TITLE: '描述',
  DESCRIPTION_PLACEHOLDER: '新增描述...',
} as const

interface DetailsTabProps {
  todo: Todo
  instances: QuickActionInstance[]
  tourRelated?: { id: string; title?: string } | undefined
  orderRelated?: { id: string; title?: string } | undefined
  tourOptions: ComboboxOption[]
  orderOptions: ComboboxOption[]
  canEdit: boolean
  onUpdate: (updates: Partial<Todo>) => void
  onSelectTour: (tourId: string) => void
  onSelectOrder: (orderId: string) => void
  onRemoveInstance: (id: string) => void
}

export function DetailsTab({
  todo,
  instances,
  tourRelated,
  orderRelated,
  tourOptions,
  orderOptions,
  canEdit,
  onUpdate,
  onSelectTour,
  onSelectOrder,
  onRemoveInstance,
}: DetailsTabProps) {
  const t = useTranslations('todos')
  return (
    <div className="space-y-5">
      {/* 共享 instance 堆疊（receipt / invoice 已改用獨立 dialog） */}
      {instances.filter(i => i.type === 'share').length > 0 && (
        <div className="space-y-3">
          {instances
            .filter(i => i.type === 'share')
            .map(instance => (
              <QuickActionInstanceCard
                key={instance.id}
                instance={instance}
                todo={todo}
                onUpdate={onUpdate}
                onRemove={() => onRemoveInstance(instance.id)}
              />
            ))}
        </div>
      )}

      <div className="flex items-end gap-3">
        <div className="flex-1 min-w-0">
          <label className="text-xs text-morandi-primary mb-1 block">{t('todoTour')}</label>
          <Combobox
            value={tourRelated?.id || ''}
            onChange={onSelectTour}
            options={tourOptions}
            placeholder={COMPONENT_LABELS.TOUR_PLACEHOLDER}
            emptyMessage={COMPONENT_LABELS.TOUR_EMPTY}
            showClearButton
            disabled={!canEdit}
            disablePortal
            className="w-full"
          />
        </div>
        <div className="flex-1 min-w-0">
          <label className="text-xs text-morandi-primary mb-1 block">{t('customerOrder')}</label>
          <Combobox
            value={orderRelated?.id || ''}
            onChange={onSelectOrder}
            options={orderOptions}
            placeholder={
              tourRelated
                ? COMPONENT_LABELS.ORDER_PLACEHOLDER
                : COMPONENT_LABELS.ORDER_NEED_TOUR_FIRST
            }
            emptyMessage={
              tourRelated
                ? COMPONENT_LABELS.ORDER_EMPTY_FOR_TOUR
                : COMPONENT_LABELS.ORDER_NEED_TOUR_FIRST
            }
            showClearButton
            disabled={!canEdit || !tourRelated}
            disablePortal
            className="w-full"
          />
        </div>
      </div>

      <div>
        <h4 className="text-sm font-medium text-morandi-primary mb-2">
          {COMPONENT_LABELS.DESCRIPTION_TITLE}
        </h4>
        <Textarea
          placeholder={COMPONENT_LABELS.DESCRIPTION_PLACEHOLDER}
          value={todo.description || ''}
          onChange={e => canEdit && onUpdate({ description: e.target.value || undefined })}
          disabled={!canEdit}
          className="min-h-[80px] text-sm bg-card border-border resize-none focus-visible:ring-morandi-gold focus-visible:border-morandi-gold"
        />
      </div>
    </div>
  )
}
