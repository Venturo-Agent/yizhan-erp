'use client'

import { Calendar as CalendarIcon, Clock, Trash2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { FullCalendarEvent } from '../_types'
import { ConfirmDialog } from '@/components/dialog/confirm-dialog'
import { useConfirmDialog } from '@/hooks/useConfirmDialog'
import { useAuthStore } from '@/stores/auth-store'
import { useMyCapabilities } from '@/lib/permissions/useMyCapabilities'
import { formatDateChineseWithWeekday } from '@/lib/utils/format-date'
import { useTranslations } from 'next-intl'

interface EventDetailDialogProps {
  open: boolean
  event: FullCalendarEvent | null
  onClose: () => void
  onEdit: (event: FullCalendarEvent) => void
  onDelete: (eventId: string) => void
}

export function EventDetailDialog({
  open,
  event,
  onClose,
  onEdit,
  onDelete,
}: EventDetailDialogProps) {
  const t = useTranslations('calendarPage')
  const { confirm, confirmDialogProps } = useConfirmDialog()
  const { user } = useAuthStore()
  const { has } = useMyCapabilities()
  const canManageCompanyEvents = has('calendar.write')

  if (!event) return null

  // 檢查是否可以編輯或刪除
  const canEditOrDelete = () => {
    // 旅遊團、生日事件不能編輯或刪除
    if (event.extendedProps?.type === 'tour' || event.extendedProps?.type === 'birthday') {
      return false
    }

    // 個人事項：只有自己可以
    if (event.extendedProps?.type === 'personal') {
      return true // 已經過濾只顯示自己的
    }

    // 公司事項：建立者、或有 calendar.write capability 的人
    if (event.extendedProps?.type === 'company') {
      const isCreator = event.extendedProps?.created_by === user?.id
      return isCreator || canManageCompanyEvents
    }

    return false
  }

  return (
    <>
      <Dialog open={open} onOpenChange={open => !open && onClose()}>
        <DialogContent level={1} className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('eventDetailTitle')}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* 標題 */}
            <div className="p-4 bg-morandi-container/20 rounded-lg">
              <h3 className="text-lg font-semibold text-morandi-primary">{event.title}</h3>
            </div>

            {/* 日期時間 */}
            <div className="space-y-2">
              {(() => {
                // 🔧 修正：全天事件使用日期字串直接解析（因為已經在 useCalendarEvents 轉換過）
                // 非全天事件才需要時區轉換
                const isAllDay = event.allDay ?? true
                const taipeiTZ = 'Asia/Taipei'

                if (isAllDay) {
                  // 全天事件：event.start 已經是正確的日期字串（YYYY-MM-DD 格式）
                  // 直接解析為本地日期，不需要 UTC 轉換
                  const startStr = event.start.split('T')[0] // 取日期部分
                  const endStr = event.end?.split('T')[0]

                  // 使用本地時區解析日期（避免 UTC 問題）
                  const [startYear, startMonth, startDay] = startStr.split('-').map(Number)
                  const start = new Date(startYear, startMonth - 1, startDay)

                  let actualEnd: Date | null = null
                  if (endStr) {
                    const [endYear, endMonth, endDay] = endStr.split('-').map(Number)
                    const end = new Date(endYear, endMonth - 1, endDay)
                    // FullCalendar 的全天事件 end 是隔天，所以要減一天
                    actualEnd = new Date(end.getTime() - 24 * 60 * 60 * 1000)
                  }

                  const isSameDay = !actualEnd || start.getTime() === actualEnd.getTime()

                  return (
                    <>
                      <div className="flex items-center gap-2 text-sm">
                        <CalendarIcon size={16} className="text-morandi-secondary" />
                        <span className="text-morandi-primary">
                          {formatDateChineseWithWeekday(start)}
                        </span>
                      </div>
                      {!isSameDay && actualEnd && (
                        <div className="flex items-center gap-2 text-sm">
                          <span className="text-morandi-secondary ml-6">{t('to')}</span>
                          <span className="text-morandi-primary">
                            {formatDateChineseWithWeekday(actualEnd)}
                          </span>
                        </div>
                      )}
                    </>
                  )
                } else {
                  // 指定時間事件：需要正確處理時區
                  const start = new Date(event.start)
                  const end = event.end ? new Date(event.end) : null

                  return (
                    <>
                      <div className="flex items-center gap-2 text-sm">
                        <CalendarIcon size={16} className="text-morandi-secondary" />
                        <span className="text-morandi-primary">
                          {formatDateChineseWithWeekday(start)}
                        </span>
                      </div>
                      {end && (
                        <div className="flex items-center gap-2 text-sm">
                          <Clock size={16} className="text-morandi-secondary" />
                          <span className="text-morandi-primary">
                            {start.toLocaleTimeString('zh-TW', {
                              timeZone: taipeiTZ,
                              hour: '2-digit',
                              minute: '2-digit',
                              hour12: false,
                            })}
                            {' - '}
                            {end.toLocaleTimeString('zh-TW', {
                              timeZone: taipeiTZ,
                              hour: '2-digit',
                              minute: '2-digit',
                              hour12: false,
                            })}
                          </span>
                        </div>
                      )}
                    </>
                  )
                }
              })()}
            </div>

            {/* 建立者（僅公司事項） */}
            {event.extendedProps?.type === 'company' && event.extendedProps?.creator_name && (
              <div className="flex items-center gap-2 text-sm">
                <span className="text-morandi-secondary">{t('createdBy')}</span>
                <span className="text-morandi-primary font-medium">
                  {event.extendedProps.creator_name}
                </span>
              </div>
            )}

            {/* 說明 */}
            {event.extendedProps?.description && (
              <div className="p-3 bg-morandi-container/10 rounded-lg">
                <p className="text-sm text-morandi-secondary mb-1">{t('description')}</p>
                <p className="text-sm text-morandi-primary">{event.extendedProps.description}</p>
              </div>
            )}

            {/* 操作按鈕 */}
            <div className="flex justify-end gap-3 pt-4 border-t border-border">
              {canEditOrDelete() && (
                <>
                  <Button
                    variant="soft-gold"
                    onClick={async () => {
                      const confirmed = await confirm({
                        type: 'danger',
                        title: t('deleteEventTitle'),
                        message: t('deleteEventMessage'),
                        details: [t('deleteEventDetail')],
                        confirmLabel: t('confirmDelete'),
                        cancelLabel: t('cancel'),
                      })
                      if (confirmed) {
                        onDelete(event.id)
                      }
                    }}
                    className="gap-1 text-status-danger hover:bg-status-danger hover:text-white"
                  >
                    <Trash2 size={16} />
                    {t('delete')}
                  </Button>
                  <Button
                    variant="soft-gold"
                    onClick={() => onEdit(event)}
                    className="text-morandi-gold hover:bg-morandi-gold hover:text-white"
                  >
                    {t('edit')}
                  </Button>
                </>
              )}
              <Button variant="soft-gold" onClick={onClose} className="gap-2">
                <X size={16} />
                {t('close')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      <ConfirmDialog {...confirmDialogProps} />
    </>
  )
}
