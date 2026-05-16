import { describe, it, expect, beforeEach } from 'vitest'
import { useCalendarStore } from '@/stores/calendar-store'

describe('CalendarStore', () => {
  beforeEach(() => {
    // Reset to default state（不能依賴 persist 的舊資料）
    window.localStorage.clear()
    useCalendarStore.setState({
      selectedDate: new Date('2026-01-15T00:00:00Z'),
      view: 'month',
      settings: {
        showPersonal: true,
        showCompany: true,
        showTours: true,
        showBirthdays: true,
      },
    })
  })

  describe('Initial State', () => {
    it('should have month view by default', () => {
      expect(useCalendarStore.getState().view).toBe('month')
    })

    it('should have all settings flags enabled by default', () => {
      const { settings } = useCalendarStore.getState()
      expect(settings.showPersonal).toBe(true)
      expect(settings.showCompany).toBe(true)
      expect(settings.showTours).toBe(true)
      expect(settings.showBirthdays).toBe(true)
    })

    it('should have a Date as selectedDate', () => {
      const { selectedDate } = useCalendarStore.getState()
      expect(selectedDate).toBeInstanceOf(Date)
    })
  })

  describe('setSelectedDate', () => {
    it('should update selectedDate to a new Date', () => {
      const target = new Date('2026-06-30T12:00:00Z')
      useCalendarStore.getState().setSelectedDate(target)
      expect(useCalendarStore.getState().selectedDate).toEqual(target)
    })

    it('should accept null', () => {
      useCalendarStore.getState().setSelectedDate(null)
      expect(useCalendarStore.getState().selectedDate).toBeNull()
    })

    it('should overwrite previous selectedDate', () => {
      const a = new Date('2026-02-01T00:00:00Z')
      const b = new Date('2026-03-01T00:00:00Z')
      useCalendarStore.getState().setSelectedDate(a)
      useCalendarStore.getState().setSelectedDate(b)
      expect(useCalendarStore.getState().selectedDate).toEqual(b)
    })
  })

  describe('setView', () => {
    it('should switch view to week', () => {
      useCalendarStore.getState().setView('week')
      expect(useCalendarStore.getState().view).toBe('week')
    })

    it('should switch view to day', () => {
      useCalendarStore.getState().setView('day')
      expect(useCalendarStore.getState().view).toBe('day')
    })

    it('should switch view back to month', () => {
      useCalendarStore.getState().setView('day')
      useCalendarStore.getState().setView('month')
      expect(useCalendarStore.getState().view).toBe('month')
    })
  })

  describe('updateSettings', () => {
    it('should update a single flag without affecting others', () => {
      useCalendarStore.getState().updateSettings({ showPersonal: false })
      const { settings } = useCalendarStore.getState()
      expect(settings.showPersonal).toBe(false)
      expect(settings.showCompany).toBe(true)
      expect(settings.showTours).toBe(true)
      expect(settings.showBirthdays).toBe(true)
    })

    it('should update multiple flags at once', () => {
      useCalendarStore.getState().updateSettings({
        showCompany: false,
        showBirthdays: false,
      })
      const { settings } = useCalendarStore.getState()
      expect(settings.showPersonal).toBe(true)
      expect(settings.showCompany).toBe(false)
      expect(settings.showTours).toBe(true)
      expect(settings.showBirthdays).toBe(false)
    })

    it('should support empty partial without changing settings', () => {
      const before = { ...useCalendarStore.getState().settings }
      useCalendarStore.getState().updateSettings({})
      expect(useCalendarStore.getState().settings).toEqual(before)
    })

    it('should toggle the same flag back and forth', () => {
      useCalendarStore.getState().updateSettings({ showTours: false })
      expect(useCalendarStore.getState().settings.showTours).toBe(false)
      useCalendarStore.getState().updateSettings({ showTours: true })
      expect(useCalendarStore.getState().settings.showTours).toBe(true)
    })

    it('should not mutate the previous settings object reference', () => {
      const prev = useCalendarStore.getState().settings
      useCalendarStore.getState().updateSettings({ showPersonal: false })
      const next = useCalendarStore.getState().settings
      expect(next).not.toBe(prev) // 新 reference
      expect(prev.showPersonal).toBe(true) // 舊 object 沒被改
    })
  })

  describe('Persistence', () => {
    it('should write to localStorage on state changes', () => {
      useCalendarStore.getState().setView('week')
      const raw = window.localStorage.getItem('calendar-ui-storage')
      expect(raw).toBeTruthy()
      const parsed = JSON.parse(raw!)
      expect(parsed.state.view).toBe('week')
    })

    it('should persist updated settings', () => {
      useCalendarStore.getState().updateSettings({ showCompany: false })
      const raw = window.localStorage.getItem('calendar-ui-storage')
      const parsed = JSON.parse(raw!)
      expect(parsed.state.settings.showCompany).toBe(false)
    })
  })
})
