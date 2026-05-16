/**
 * 行事曆 UI 狀態 Store
 * 只管理 UI 狀態（view, selectedDate, settings）
 * 事件資料請使用 useCalendarEventStore
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface CalendarSettings {
  showPersonal: boolean
  showCompany: boolean
  showTours: boolean
  showBirthdays: boolean
}

interface CalendarStore {
  selectedDate: Date | null
  view: 'month' | 'week' | 'day'
  settings: CalendarSettings

  // Actions
  setSelectedDate: (date: Date | null) => void
  setView: (view: 'month' | 'week' | 'day') => void
  updateSettings: (settings: Partial<CalendarSettings>) => void
}

export const useCalendarStore = create<CalendarStore>()(
  persist(
    set => ({
      selectedDate: new Date(),
      view: 'month',
      settings: {
        showPersonal: true,
        showCompany: true,
        showTours: true,
        showBirthdays: true,
      },

      setSelectedDate: date => {
        set({ selectedDate: date })
      },

      setView: view => {
        set({ view })
      },

      updateSettings: newSettings => {
        set(state => ({
          settings: { ...state.settings, ...newSettings },
        }))
      },
    }),
    {
      name: 'calendar-ui-storage',
    }
  )
)
