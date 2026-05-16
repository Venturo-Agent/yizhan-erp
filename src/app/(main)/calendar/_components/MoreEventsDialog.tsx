'use client'

import { MapPin, Cake, Briefcase, CheckSquare, X } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { MoreEventsDialogState, FullCalendarEvent } from '../_types'
import { useTranslations } from 'next-intl'

interface MoreEventsDialogProps {
  dialog: MoreEventsDialogState
  onClose: () => void
  onEventClick: (event: FullCalendarEvent) => void
  getEventDuration: (event: FullCalendarEvent) => number
}

export function MoreEventsDialog({
  dialog,
  onClose,
  onEventClick,
  getEventDuration,
}: MoreEventsDialogProps) {
  const t = useTranslations('calendarPage')
  return (
    <Dialog open={dialog.open} onOpenChange={open => !open && onClose()}>
      <DialogContent level={1} className="max-w-lg [&>button:last-child]:hidden">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>
              {dialog.date}
              {t('allEventsSuffix')} ({dialog.events.length})
            </DialogTitle>
            <button onClick={onClose} className="text-morandi-secondary hover:text-morandi-primary">
              <X size={20} />
            </button>
          </div>
        </DialogHeader>

        <div className="space-y-2 max-h-[60vh] overflow-y-auto">
          {dialog.events.map((event, index) => {
            const duration = getEventDuration(event)
            const Icon =
              event.extendedProps.type === 'tour'
                ? MapPin
                : event.extendedProps.type === 'personal'
                  ? CheckSquare
                  : event.extendedProps.type === 'birthday'
                    ? Cake
                    : Briefcase

            return (
              <button
                key={index}
                onClick={() => onEventClick(event)}
                className="w-full p-4 border border-border rounded-lg hover:bg-morandi-container/10 transition-colors text-left"
              >
                <div className="flex items-start gap-3">
                  <div
                    className="w-3 h-3 rounded mt-1 flex-shrink-0"
                    style={{ backgroundColor: event.backgroundColor }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-morandi-primary mb-1 truncate">
                      {event.title}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-morandi-secondary">
                      <div className="flex items-center gap-1">
                        <Icon size={14} />
                        <span className="capitalize">{event.extendedProps.type}</span>
                      </div>
                      {event.extendedProps.location && <span>{event.extendedProps.location}</span>}
                      {(event.extendedProps.max_participants ?? 0) > 0 && (
                        <span>
                          {event.extendedProps.participants ?? 0}/
                          {event.extendedProps.max_participants}
                          {t('personUnit')}
                        </span>
                      )}
                      {duration > 0 && (
                        <span className="text-morandi-gold font-medium">
                          {duration}
                          {t('dayUnit')}
                        </span>
                      )}
                    </div>
                    {event.extendedProps.description && (
                      <div className="mt-1 text-xs text-morandi-secondary">
                        {event.extendedProps.description}
                      </div>
                    )}
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      </DialogContent>
    </Dialog>
  )
}
