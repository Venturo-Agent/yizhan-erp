'use client'

import { getTodayString } from '@/lib/utils/format-date'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import { Plus, Calendar, CalendarDays, CalendarClock, Cake } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { CalendarSettingsDialog } from './_components/calendar-settings-dialog'
import { ContentPageLayout } from '@/components/layout/content-page-layout'
import { Button } from '@/components/ui/button'
import {
} from '@/components/ui/select'
import {
  CalendarStyles,
  AddEventDialog,
  EditEventDialog,
  EventDetailDialog,
  MoreEventsDialog,
  BirthdayListDialog,
} from './_components'

const CalendarGrid = dynamic(
  () => import('./_components/CalendarGrid').then(m => m.CalendarGrid),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-morandi-gold" />
      </div>
    ),
  }
)
import {
  useCalendarEvents,
  useCalendarNavigation,
  useEventOperations,
  useMoreEventsDialog,
} from './_hooks'

type CalendarView = 'dayGridMonth' | 'timeGridWeek' | 'timeGridDay'

export default function CalendarPage() {
  const t = useTranslations('calendarPage')
  const [currentView, setCurrentView] = useState<CalendarView>('dayGridMonth')
  const [birthdayDialogOpen, setBirthdayDialogOpen] = useState(false)

  // Custom hooks for calendar logic
  const {
    filteredEvents,
    onDatesChange,
  } = useCalendarEvents()
  const {
    calendarRef,
    handlePrevMonth,
    handleNextMonth,
    handleToday,
    syncCurrentDate,
    getCurrentMonthYear,
  } = useCalendarNavigation()

  const {
    eventDetailDialog,
    setEventDetailDialog,
    addEventDialog,
    setAddEventDialog,
    newEvent,
    setNewEvent,
    editEventDialog,
    setEditEventDialog,
    isUpdatingEvent,
    handleDateClick,
    handleAddEvent,
    handleEventClick,
    handleDeleteEvent,
    openEditDialog,
    handleUpdateEvent,
    resetEditEventForm,
    resetAddEventForm,
    handleEventDrop,
  } = useEventOperations()

  const {
    moreEventsDialog,
    getEventDuration,
    handleMoreLinkClick,
    handleCloseDialog,
    handleDialogEventClick,
  } = useMoreEventsDialog()

  return (
    <>
      <ContentPageLayout
        title={t('pageTitle')}
        headerActions={
          <div className="flex items-center gap-3">
            {/* 月份切換（點中間 = 回今天） */}
            <div className="flex items-center gap-2 bg-card border border-border rounded-lg shadow-sm">
              <Button
                variant="ghost"
                size="sm"
                onClick={handlePrevMonth}
                className="h-9 w-9 p-0 hover:bg-morandi-container/50 hover:text-morandi-gold transition-all rounded-l-lg"
              >
                ←
              </Button>
              <button
                type="button"
                onClick={handleToday}
                title={t('today')}
                className="text-sm font-semibold text-morandi-primary min-w-[120px] text-center px-2 py-1.5 hover:text-morandi-gold hover:bg-morandi-container/30 rounded transition-all cursor-pointer"
              >
                {getCurrentMonthYear()}
              </button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleNextMonth}
                className="h-9 w-9 p-0 hover:bg-morandi-container/50 hover:text-morandi-gold transition-all rounded-r-lg"
              >
                →
              </Button>
            </div>

            {/* 視圖切換按鈕 */}
            <div className="flex items-center bg-card border border-border rounded-lg shadow-sm overflow-hidden">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setCurrentView('dayGridMonth')
                  calendarRef.current?.getApi().changeView('dayGridMonth')
                }}
                className={`h-9 px-3 rounded-none border-r border-border ${
                  currentView === 'dayGridMonth'
                    ? 'bg-morandi-gold/10 text-morandi-gold'
                    : 'hover:bg-morandi-container/50'
                }`}
                title={t('monthView')}
              >
                <Calendar size={16} />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setCurrentView('timeGridWeek')
                  calendarRef.current?.getApi().changeView('timeGridWeek')
                }}
                className={`h-9 px-3 rounded-none border-r border-border ${
                  currentView === 'timeGridWeek'
                    ? 'bg-morandi-gold/10 text-morandi-gold'
                    : 'hover:bg-morandi-container/50'
                }`}
                title={t('weekView')}
              >
                <CalendarDays size={16} />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setCurrentView('timeGridDay')
                  calendarRef.current?.getApi().changeView('timeGridDay')
                }}
                className={`h-9 px-3 rounded-none ${
                  currentView === 'timeGridDay'
                    ? 'bg-morandi-gold/10 text-morandi-gold'
                    : 'hover:bg-morandi-container/50'
                }`}
                title={t('dayView')}
              >
                <CalendarClock size={16} />
              </Button>
            </div>

            {/* 生日名單按鈕 */}
            <Button
              variant="soft-gold"
              size="sm"
              onClick={() => setBirthdayDialogOpen(true)}
              className="h-9 px-3 gap-1.5 bg-card border border-border shadow-sm hover:bg-morandi-container/50 hover:border-morandi-gold/50 transition-all rounded-lg text-morandi-secondary hover:text-morandi-gold"
              title={t('viewBirthdayList')}
            >
              <Cake size={16} />
              <span className="text-xs">{t('birthday')}</span>
            </Button>

            <CalendarSettingsDialog />
          </div>
        }
        primaryAction={{
          label: t('addEvent'),
          icon: Plus,
          onClick: () => {
            const today = getTodayString()
            setAddEventDialog({ open: true, selectedDate: today })
          },
        }}
        contentClassName="flex-1 overflow-hidden"
      >
        <div className="h-full bg-card rounded-lg border border-border shadow-sm flex flex-col overflow-hidden">
          {/* 日曆主體 */}
          <div className="flex-1 overflow-hidden">
            <CalendarGrid
              calendarRef={calendarRef}
              events={filteredEvents}
              currentView={currentView}
              onDateClick={handleDateClick}
              onEventClick={handleEventClick}
              onMoreLinkClick={info => handleMoreLinkClick(info, filteredEvents)}
              onEventDrop={handleEventDrop}
              onDatesSet={info => {
                syncCurrentDate(info.view.currentStart)
                onDatesChange(info)
              }}
            />
          </div>
        </div>
      </ContentPageLayout>

      {/* 新增行事曆事項對話框 */}
      <AddEventDialog
        dialog={addEventDialog}
        newEvent={newEvent}
        onNewEventChange={setNewEvent}
        onDialogChange={setAddEventDialog}
        onSubmit={handleAddEvent}
        onClose={resetAddEventForm}
      />

      {/* 事件詳情對話框 */}
      <EventDetailDialog
        open={eventDetailDialog.open}
        event={eventDetailDialog.event}
        onClose={() => setEventDetailDialog({ open: false, event: null })}
        onEdit={openEditDialog}
        onDelete={handleDeleteEvent}
      />

      {/* 編輯行事曆事項對話框 */}
      <EditEventDialog
        dialog={editEventDialog}
        onDialogChange={setEditEventDialog}
        onSubmit={handleUpdateEvent}
        onClose={resetEditEventForm}
        loading={isUpdatingEvent}
      />

      {/* 更多事件對話框 */}
      <MoreEventsDialog
        dialog={moreEventsDialog}
        onClose={handleCloseDialog}
        onEventClick={handleDialogEventClick}
        getEventDuration={getEventDuration}
      />

      {/* 生日名單對話框 */}
      <BirthdayListDialog open={birthdayDialogOpen} onClose={() => setBirthdayDialogOpen(false)} />

      <CalendarStyles />
    </>
  )
}
