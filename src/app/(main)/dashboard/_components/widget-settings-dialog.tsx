'use client'

import { Button } from '@/components/ui/button'
import { Settings } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Checkbox } from '@/components/ui/checkbox'
import { useTranslations } from 'next-intl'
import type { WidgetType } from '../_types'
import { AVAILABLE_WIDGETS } from './widget-config'

interface WidgetSettingsDialogProps {
  activeWidgets: WidgetType[]
  onToggleWidget: (widgetId: WidgetType) => void
}

export function WidgetSettingsDialog({ activeWidgets, onToggleWidget }: WidgetSettingsDialogProps) {
  const t = useTranslations('dashboard')
  const visibleWidgets = AVAILABLE_WIDGETS

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="header-outline" size="sm">
          <Settings className="h-4 w-4" />
          {t('settings4196')}
        </Button>
      </DialogTrigger>
      <DialogContent
        level={1}
        className="sm:max-w-2xl border-morandi-gold/20 shadow-lg rounded-2xl"
      >
        <DialogHeader>
          <DialogTitle className="text-xl text-morandi-primary">
            {t('select1019')}
          </DialogTitle>
          <p className="text-sm text-morandi-muted mt-1">{t('label5024')}</p>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3 py-4">
          {visibleWidgets.map(widget => {
            const Icon = widget.icon as React.ComponentType<{ className?: string }>
            return (
              <div
                key={widget.id}
                className="flex items-center space-x-3 p-3 rounded-xl border border-morandi-gold/20 bg-card hover:border-morandi-gold cursor-pointer transition-all shadow-sm"
                onClick={() => onToggleWidget(widget.id as WidgetType)}
              >
                <Checkbox
                  checked={activeWidgets.includes(widget.id as WidgetType)}
                  onCheckedChange={() => onToggleWidget(widget.id as WidgetType)}
                />
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-morandi-gold/10 to-morandi-container/10 flex items-center justify-center shadow-sm flex-shrink-0">
                    <Icon className="h-4 w-4 text-morandi-gold" />
                  </div>
                  <span className="font-medium text-morandi-primary text-sm truncate">
                    {widget.name}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      </DialogContent>
    </Dialog>
  )
}
