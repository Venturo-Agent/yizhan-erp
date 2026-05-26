'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/stores/auth-store'
import { useTranslations } from 'next-intl'
import { ContentPageLayout } from '@/components/layout/content-page-layout'
import { Card } from '@/components/ui/card'
import { Settings } from 'lucide-react'
import { useWidgets } from '@/app/(main)/dashboard/_hooks'
import { WidgetSettingsDialog, AVAILABLE_WIDGETS } from '@/app/(main)/dashboard/_components'
import type { WidgetType } from '@/app/(main)/dashboard/_types'
import { DndContext, closestCenter, DragEndEvent } from '@dnd-kit/core'
import { SortableContext, rectSortingStrategy, useSortable } from '@dnd-kit/sortable'
import { useLongPressDndSensors, getDragStyle } from '@/lib/dnd'

// Sortable Widget Component (remains the same)
function SortableWidget({ id, widget }: { id: string; widget: (typeof AVAILABLE_WIDGETS)[0] }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
  })

  const style = getDragStyle({ transform, transition, isDragging })

  const Component = widget.component

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`h-full min-h-0 ${widget.span === 2 ? 'md:col-span-2' : ''} touch-none`}
      {...attributes}
      {...listeners}
    >
      <Component />
    </div>
  )
}

export function DashboardClient() {
  const t = useTranslations('dashboard')
  const router = useRouter()
  const { isAuthenticated, _hasHydrated, user: _user } = useAuthStore()
  const [isLoading, setIsLoading] = useState(true)
  const { activeWidgets, toggleWidget, reorderWidgets, isLoading: widgetsLoading } = useWidgets()

  // 過濾可渲染的 widgets（確認 widget 在清單裡）
  const filteredActiveWidgets = useMemo(() => {
    return activeWidgets.filter(widgetId => AVAILABLE_WIDGETS.some(w => w.id === widgetId))
  }, [activeWidgets])

  const sensors = useLongPressDndSensors()

  // 處理拖拽結束
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (over && active.id !== over.id) {
      const oldIndex = activeWidgets.indexOf(active.id as WidgetType)
      const newIndex = activeWidgets.indexOf(over.id as WidgetType)
      reorderWidgets(oldIndex, newIndex)
    }
  }

  useEffect(() => {
    // 等待 zustand persist hydration 完成
    if (!_hasHydrated) {
      return
    }

    // Hydration 完成後，檢查登入狀態
    if (!isAuthenticated) {
      router.replace('/login')
    } else {
      setIsLoading(false)
    }
  }, [isAuthenticated, _hasHydrated, router])

  if (isLoading || widgetsLoading) {
    return null // ModuleGuard 已在外層顯示 loading、避免 cascade
  }

  return (
    <ContentPageLayout
      title={t('home')}
      breadcrumb={[{ label: t('home'), href: '/dashboard' }]}
      headerActions={
        <WidgetSettingsDialog activeWidgets={activeWidgets} onToggleWidget={toggleWidget} />
      }
      contentClassName="flex-1 overflow-visible min-h-0 flex flex-col"
    >
      {filteredActiveWidgets.length === 0 ? (
        <Card className="p-12 text-center border-morandi-gold/20 shadow-sm rounded-2xl bg-card">
          <div className="max-w-md mx-auto">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-r from-morandi-gold/10 to-morandi-container/10 flex items-center justify-center mx-auto mb-4 shadow-sm">
              <Settings className="h-8 w-8 text-morandi-gold" />
            </div>
            <h3 className="text-lg font-semibold text-morandi-primary mb-2">
              {t('noWidgetsTitle')}
            </h3>
            <p className="text-sm text-morandi-muted mb-6">{t('noWidgetsDescription')}</p>
          </div>
        </Card>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={filteredActiveWidgets} strategy={rectSortingStrategy}>
            <div className="@container flex-1 min-h-0">
              <div className="grid grid-cols-1 @md:grid-cols-2 @5xl:grid-cols-3 @min-[1500px]:grid-cols-4 grid-rows-2 auto-rows-fr gap-6 h-full">
                {filteredActiveWidgets.map(widgetId => {
                  const widget = AVAILABLE_WIDGETS.find(w => w.id === widgetId)
                  if (!widget) return null
                  return <SortableWidget key={widget.id} id={widget.id} widget={widget} />
                })}
              </div>
            </div>
          </SortableContext>
        </DndContext>
      )}
    </ContentPageLayout>
  )
}
