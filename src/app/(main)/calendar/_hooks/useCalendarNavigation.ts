import { useState, useRef } from 'react'
import FullCalendar from '@fullcalendar/react'
import { formatYearMonth } from '@/lib/utils/format-date'

export function useCalendarNavigation() {
  const calendarRef = useRef<FullCalendar>(null)
  const [currentDate, setCurrentDate] = useState(new Date())

  // 讓 FullCalendar 自己依當前視圖決定要切一月/一週/一天、我們不猜
  const handlePrevMonth = () => {
    calendarRef.current?.getApi().prev()
  }

  const handleNextMonth = () => {
    calendarRef.current?.getApi().next()
  }

  const handleToday = () => {
    calendarRef.current?.getApi().today()
  }

  // 由 FullCalendar 的 datesSet callback 呼叫、同步中間顯示的月份 label
  const syncCurrentDate = (date: Date) => {
    setCurrentDate(date)
  }

  // 格式化當前月份
  const getCurrentMonthYear = () => {
    return formatYearMonth(currentDate)
  }

  return {
    calendarRef,
    currentDate,
    handlePrevMonth,
    handleNextMonth,
    handleToday,
    syncCurrentDate,
    getCurrentMonthYear,
  }
}
