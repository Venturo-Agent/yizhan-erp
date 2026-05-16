import { formatDate } from '@/lib/utils/format-date'
import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { MoreLinkArg } from '@fullcalendar/core'
import { MoreEventsDialogState, FullCalendarEvent } from '../_types'

export function useMoreEventsDialog() {
  const router = useRouter()
  const [moreEventsDialog, setMoreEventsDialog] = useState<MoreEventsDialogState>({
    open: false,
    date: '',
    events: [],
  })

  // 計算事件區間長度（用於排序）
  const getEventDuration = useCallback((event: FullCalendarEvent): number => {
    if (!event.end) return 0
    const start = new Date(event.start)
    const end = new Date(event.end)
    return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
  }, [])

  // 事件排序：短程在前，長程在後
  const compareEvents = useCallback(
    (a: FullCalendarEvent, b: FullCalendarEvent): number => {
      const durationA = getEventDuration(a)
      const durationB = getEventDuration(b)

      if (durationA !== durationB) {
        return durationA - durationB
      }

      return a.start.localeCompare(b.start)
    },
    [getEventDuration]
  )

  const handleMoreLinkClick = useCallback(
    (info: MoreLinkArg, filteredEvents: FullCalendarEvent[]) => {
      info.jsEvent.preventDefault()
      const clickedDate = formatDate(info.date)

      const dayEvents = (filteredEvents || []).filter((event: FullCalendarEvent) => {
        if (!event?.start) return false
        const eventStart = event.start.split('T')[0]
        const eventEnd = event?.end ? event.end.split('T')[0] : eventStart
        return clickedDate >= eventStart && clickedDate <= eventEnd
      })

      const sortedEvents = dayEvents.sort(compareEvents)

      setMoreEventsDialog({
        open: true,
        date: clickedDate,
        events: sortedEvents,
      })

      // 返回 'none' 防止 FullCalendar 顯示內建 popover（會導致 getBoundingClientRect 錯誤）
      // 改用我們自己的 Dialog 顯示
      return 'none' as const
    },
    [compareEvents]
  )

  const handleCloseDialog = () => {
    setMoreEventsDialog({
      open: false,
      date: '',
      events: [],
    })
  }

  const handleDialogEventClick = (event: FullCalendarEvent) => {
    if (event.extendedProps.type === 'tour') {
      router.push(`/tours?highlight=${event.extendedProps.tour_id}`)
    }
    handleCloseDialog()
  }

  return {
    moreEventsDialog,
    getEventDuration,
    handleMoreLinkClick,
    handleCloseDialog,
    handleDialogEventClick,
  }
}
