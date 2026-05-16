'use client'

import { RefObject } from 'react'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import interactionPlugin, { EventDragStopArg } from '@fullcalendar/interaction'
import { EventClickArg, MoreLinkAction, EventDropArg, DatesSetArg } from '@fullcalendar/core'
import { DateClickArg } from '@fullcalendar/interaction'
import { FullCalendarEvent } from '../_types'
import { useTranslations } from 'next-intl'

interface CalendarGridProps {
  calendarRef: RefObject<FullCalendar | null>
  events: FullCalendarEvent[]
  currentView: 'dayGridMonth' | 'timeGridWeek' | 'timeGridDay'
  onDateClick: (info: DateClickArg) => void
  onEventClick: (info: EventClickArg) => void
  onMoreLinkClick: MoreLinkAction
  onEventDrop?: (info: EventDropArg) => void
  onEventDragStop?: (info: EventDragStopArg) => void
  onDatesSet?: (info: DatesSetArg) => void
}

export function CalendarGrid({
  calendarRef,
  events,
  currentView,
  onDateClick,
  onEventClick,
  onMoreLinkClick,
  onEventDrop,
  onEventDragStop,
  onDatesSet,
}: CalendarGridProps) {
  const t = useTranslations('calendarPage')
  return (
    <div className="calendar-container h-full">
      <FullCalendar
        ref={calendarRef}
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
        initialView={currentView}
        headerToolbar={false}
        events={events}
        dateClick={onDateClick}
        eventClick={onEventClick}
        datesSet={onDatesSet}
        locale="zh-tw"
        // 🔧 修正：明確指定台灣時區，避免時間跳動問題
        timeZone="Asia/Taipei"
        dayCellContent={arg => arg.dayNumberText.replace('日', '')}
        height="100%"
        dayMaxEvents={7}
        eventMinHeight={20}
        moreLinkClick={onMoreLinkClick}
        moreLinkText={t('more')}
        weekends={true}
        firstDay={1}
        eventDisplay="auto"
        eventDidMount={info => {
          // 為事件添加 data 屬性以便 CSS 選擇器使用
          const eventType = info.event.extendedProps.type
          info.el.setAttribute('data-event-type', eventType)
        }}
        displayEventTime={currentView !== 'dayGridMonth'}
        eventOrder="start,-duration,title"
        buttonText={{
          today: t('buttonToday'),
          month: t('buttonMonth'),
          week: t('buttonWeek'),
          day: t('buttonDay'),
        }}
        // 拖曳功能
        editable={true}
        droppable={true}
        eventDrop={onEventDrop}
        eventDragStop={onEventDragStop}
        // 限制只有 personal 和 company 事件可以拖曳
        eventStartEditable={true}
        eventDurationEditable={true}
        // 週/日視圖設定
        slotMinTime="06:00:00"
        slotMaxTime="22:00:00"
        slotDuration="00:30:00"
        slotLabelInterval="01:00:00"
        slotLabelFormat={{
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        }}
        eventTimeFormat={{
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        }}
        allDaySlot={true}
        allDayText={t('allDay')}
        nowIndicator={true}
        // 自動滾動到現在時間（往前 1 小時，讓現在時間線在畫面中間偏上）
        scrollTime={(() => {
          const now = new Date()
          const hour = Math.max(6, now.getHours() - 1) // 至少從 06:00 開始
          return `${String(hour).padStart(2, '0')}:00:00`
        })()}
        scrollTimeReset={false}
      />
    </div>
  )
}
