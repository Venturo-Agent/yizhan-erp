'use client'

import { formatDate, toTaipeiDateString, toTaipeiTimeString } from '@/lib/utils/format-date'

import { useMemo, useEffect, useRef, useState, useCallback } from 'react'
import { useCalendarStore, useAuthStore, useWorkspaceStore } from '@/stores'
import { useMyCapabilities } from '@/lib/permissions/useMyCapabilities'
import { CAPABILITIES } from '@/lib/permissions/capabilities'
import {
  useToursForCalendar,
  useCustomersSlim,
  useEmployeesSlim,
  useCalendarEvents as useCalendarEventList,
  invalidateCalendarEvents,
} from '@/data'
import { FullCalendarEvent } from '../_types'
import { useTourDisplayResolver } from '@/app/(main)/tours/_utils/tour-display'
import type { CalendarEvent } from '@/types/calendar.types'
import type { DatesSetArg } from '@fullcalendar/core'

// 從 ISO 時間字串取得顯示用的時間（HH:MM）
const getDisplayTime = (isoString: string, allDay?: boolean): string => {
  if (allDay) return ''
  return toTaipeiTimeString(isoString, { skipMidnight: true })
}

// 從 ISO 時間字串取得台灣時區的日期（YYYY-MM-DD）
// 用於全天事件，避免 FullCalendar 時區轉換問題
const getDateInTaipei = (isoString: string): string => {
  return toTaipeiDateString(isoString) || isoString
}

// 計算初始日期範圍（當前月份 ±1 個月）
const getInitialDateRange = () => {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const end = new Date(now.getFullYear(), now.getMonth() + 2, 0) // 下個月的最後一天
  return {
    start: formatDate(start),
    end: formatDate(end),
  }
}

export function useCalendarEvents() {
  // 日期範圍狀態（用於分月載入團資料）
  const [dateRange, setDateRange] = useState(getInitialDateRange)

  // 使用日期範圍載入團資料（只載入需要的月份）
  const { items: tours } = useToursForCalendar(dateRange)
  // SSOT：從 country_id / airport_code 解析目的地顯示字串
  const resolveTourDisplay = useTourDisplayResolver()
  const { items: customers } = useCustomersSlim({ all: true })
  const { settings } = useCalendarStore()
  const { items: calendarEvents } = useCalendarEventList()
  const { user } = useAuthStore()
  const { items: employees } = useEmployeesSlim({ all: true })
  const { workspaces, loadWorkspaces } = useWorkspaceStore()

  // Workspace 篩選狀態（只有有 workspaces.read capability 的 user 能用、隱含跨 workspace 能力）
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string | null>(null)
  const { has: hasCapability } = useMyCapabilities()
  const canManageWorkspaces = hasCapability(CAPABILITIES.WORKSPACES_READ)

  // 初始化時從 localStorage 讀取篩選狀態
  const workspaceInitRef = useRef(false)
  useEffect(() => {
    if (canManageWorkspaces && !workspaceInitRef.current) {
      workspaceInitRef.current = true
      const saved = localStorage.getItem('calendar_workspace_filter')
      setSelectedWorkspaceId(saved)
      loadWorkspaces()
    }
  }, [canManageWorkspaces, loadWorkspaces])

  // 當 FullCalendar 視圖日期改變時更新日期範圍
  const handleDatesChange = useCallback((arg: DatesSetArg) => {
    // FullCalendar 的 start/end 是 Date 物件，需要擴展範圍以確保跨月團正確顯示
    const viewStart = arg.start
    const viewEnd = arg.end

    // 擴展範圍：前後各加 1 個月，確保跨月事件能正確載入
    const expandedStart = new Date(viewStart)
    expandedStart.setMonth(expandedStart.getMonth() - 1)
    const expandedEnd = new Date(viewEnd)
    expandedEnd.setMonth(expandedEnd.getMonth() + 1)

    const newRange = {
      start: formatDate(expandedStart),
      end: formatDate(expandedEnd),
    }

    // 只在範圍實際變化時才更新（避免不必要的重新查詢）
    setDateRange(prev => {
      if (prev.start === newRange.start && prev.end === newRange.end) {
        return prev
      }
      return newRange
    })
  }, [])

  // 2026-05-29 B11：移除散刻 supabase.channel（calendar_events 已由 useCalendarEventList()
  // 內建 useRealtimeSync 訂閱、entity hook 自動 invalidate cache、不需要這條重複訂閱）。

  // 根據類型取得顏色 - 使用莫蘭迪配色
  const getEventColor = useCallback((type: string, status?: string) => {
    if (type === 'tour' && status) {
      const colors: Record<string, { bg: string; border: string }> = {
        draft: { bg: '#9BB5D6', border: '#8AA4C5' }, // 提案
        active: { bg: '#A8C4A2', border: '#97B391' }, // 進行中
        pending_close: { bg: '#D4B896', border: '#C3A785' }, // 待結案
        closed: { bg: '#B8B3AE', border: '#A7A29D' }, // 結案
        cancelled: { bg: '#B8B3AE', border: '#A7A29D' }, // 已取消
      }
      return colors[status] || colors.draft
    }

    const colors = {
      personal: { bg: '#B8A9D1', border: '#A798C0' },
      birthday: { bg: '#E6B8C8', border: '#D5A7B7' },
      company: { bg: '#E0C3A0', border: '#CFB28F' },
    }
    return colors[type as keyof typeof colors] || { bg: '#B8B3AE', border: '#A7A29D' }
  }, [])

  // 轉換旅遊團為日曆事件（過濾掉已封存的）
  const tourEvents: FullCalendarEvent[] = useMemo(() => {
    return (tours || [])
      .filter(tour => !tour.archived) // 過濾掉已封存的（特殊團 2026-05 已退役、無此狀態）
      .map(tour => {
        const color = getEventColor('tour', tour.status || '開團')
        // 🔧 優化：直接使用 tour.current_participants，不再遍歷 orders/members
        const actualMembers = tour.current_participants || 0

        // 修正 FullCalendar 的多日事件顯示問題
        // 如果有 return_date，則需要加一天才能正確顯示跨日事件
        let end_date = tour.return_date
        if (end_date && end_date !== tour.departure_date) {
          const returnDateObj = new Date(end_date)
          returnDateObj.setDate(returnDateObj.getDate() + 1)
          end_date = formatDate(returnDateObj)
        }

        return {
          id: `tour-${tour.id}`,
          title: tour.name || '',
          start: tour.departure_date || '',
          end: end_date || '',
          backgroundColor: color.bg,
          borderColor: color.border,
          extendedProps: {
            type: 'tour' as const,
            tour_id: tour.id,
            code: tour.code || '',
            location: resolveTourDisplay(tour).displayString,
            participants: actualMembers,
            max_participants: tour.max_participants || 0,
            status: tour.status || '',
          },
        } as FullCalendarEvent
      })
  }, [tours, getEventColor, resolveTourDisplay])

  // 轉換個人事項為日曆事件（只顯示當前用戶的個人事項）
  const personalCalendarEvents: FullCalendarEvent[] = useMemo(() => {
    if (!user?.id) return []

    return (calendarEvents || [])
      .filter(event => event.visibility === 'personal' && event.created_by === user.id)
      .map(event => {
        const color = getEventColor('personal')
        const isAllDay = event.all_day ?? false // 轉換 null 為 false
        const timeStr = getDisplayTime(event.start, isAllDay)
        const displayTitle = timeStr ? `${timeStr} ${event.title}` : event.title

        // 🔧 修正：全天事件只傳日期字串，避免 FullCalendar 時區轉換問題
        const startDate = isAllDay ? getDateInTaipei(event.start) : event.start
        const endDate = event.end ? (isAllDay ? getDateInTaipei(event.end) : event.end) : undefined

        return {
          id: event.id,
          title: displayTitle,
          start: startDate,
          end: endDate,
          allDay: isAllDay || undefined, // FullCalendar 期望 boolean | undefined
          backgroundColor: color.bg,
          borderColor: color.border,
          extendedProps: {
            type: 'personal' as const,
            description: event.description ?? undefined,
          },
        }
      })
  }, [calendarEvents, getEventColor, user?.id])

  // 轉換公司事項為日曆事件
  const companyCalendarEvents: FullCalendarEvent[] = useMemo(() => {
    return (calendarEvents || [])
      .filter(event => {
        if (event.visibility !== 'company') return false
        // 有 workspaces.read capability、且有選擇特定 workspace、只顯示該 workspace 的事項
        if (canManageWorkspaces && selectedWorkspaceId) {
          return (event as CalendarEvent).workspace_id === selectedWorkspaceId
        }
        return true
      })
      .map(event => {
        const color = getEventColor('company')

        // 找出建立者姓名（用於詳細頁面）
        // 優先檢查當前登入用戶，再檢查員工列表
        let creatorName = '未知使用者'
        if (user && user.id === event.created_by) {
          creatorName =
            user.display_name ||
            user.chinese_name ||
            user.english_name ||
            user.personal_info?.email ||
            '未知使用者'
        } else {
          const creator = employees?.find(emp => emp.id === event.created_by)
          creatorName =
            creator?.display_name || creator?.chinese_name || creator?.english_name || '未知使用者'
        }

        const isAllDay = event.all_day ?? false // 轉換 null 為 false
        const timeStr = getDisplayTime(event.start, isAllDay)
        const displayTitle = timeStr ? `${timeStr} 公司｜${event.title}` : `公司｜${event.title}`

        // 🔧 修正：全天事件只傳日期字串，避免 FullCalendar 時區轉換問題
        const startDate = isAllDay ? getDateInTaipei(event.start) : event.start
        const endDate = event.end ? (isAllDay ? getDateInTaipei(event.end) : event.end) : undefined

        return {
          id: event.id,
          title: displayTitle,
          start: startDate,
          end: endDate,
          allDay: isAllDay || undefined, // FullCalendar 期望 boolean | undefined
          backgroundColor: color.bg,
          borderColor: color.border,
          extendedProps: {
            type: 'company' as const,
            description: event.description ?? undefined,
            created_by: event.created_by ?? undefined,
            creator_name: creatorName, // 保留在 extendedProps，詳細頁面可以用
          },
        } as FullCalendarEvent
      })
  }, [calendarEvents, getEventColor, employees, user, canManageWorkspaces, selectedWorkspaceId])

  // 轉換客戶生日為日曆事件
  // 🔧 優化：移除 memberBirthdayEvents，因不再載入 members 資料
  const customerBirthdayEvents: FullCalendarEvent[] = useMemo(() => {
    const currentYear = new Date().getFullYear()

    return (customers || [])
      .map(customer => {
        if (!customer?.birth_date) return null

        // 計算今年的生日日期
        const birthdayThisYear = `${currentYear}-${customer.birth_date.slice(5)}`

        return {
          id: `customer-birthday-${customer.id}`,
          title: `🎂 ${customer.name} 生日`,
          start: birthdayThisYear,
          backgroundColor: getEventColor('birthday').bg,
          borderColor: getEventColor('birthday').border,
          extendedProps: {
            type: 'birthday' as const,
            customer_id: customer.id,
            customer_name: customer.name,
            source: 'customer' as const,
          },
        }
      })
      .filter(Boolean) as FullCalendarEvent[]
  }, [customers, getEventColor])

  // 合併所有生日事件（目前只有客戶生日）
  const _birthdayEvents = useMemo(() => {
    return [...customerBirthdayEvents]
  }, [customerBirthdayEvents])

  // 合併所有事件（生日改用獨立彈窗顯示、不在行事曆上顯示）
  const allEvents = useMemo(() => {
    return [...tourEvents, ...personalCalendarEvents, ...companyCalendarEvents]
  }, [tourEvents, personalCalendarEvents, companyCalendarEvents])

  // 過濾事件（根據 settings）
  const filteredEvents = useMemo(() => {
    return allEvents.filter(event => {
      const type = event.extendedProps.type

      if (type === 'tour' && !settings.showTours) return false
      if (type === 'personal' && !settings.showPersonal) return false
      if (type === 'company' && !settings.showCompany) return false

      return true
    })
  }, [allEvents, settings])

  // 切換 workspace 篩選
  const handleWorkspaceFilterChange = useCallback((workspaceId: string | null) => {
    setSelectedWorkspaceId(workspaceId)
    if (workspaceId) {
      localStorage.setItem('calendar_workspace_filter', workspaceId)
    } else {
      localStorage.removeItem('calendar_workspace_filter')
    }
  }, [])

  return {
    filteredEvents,
    allEvents,
    // 日期範圍變更處理（給 FullCalendar 的 datesSet 使用）
    onDatesChange: handleDatesChange,
    // 手動 refetch（postgres realtime 自動觸發、但 update 後想立刻刷新可呼叫）
    refresh: invalidateCalendarEvents,
    // Workspace 篩選相關（需要 workspaces.read capability、隱含跨 workspace 能力）
    canManageWorkspaces,
    workspaces,
    selectedWorkspaceId,
    onWorkspaceFilterChange: handleWorkspaceFilterChange,
  }
}
