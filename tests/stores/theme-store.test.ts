import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useThemeStore } from '@/stores/theme-store'

const STORAGE_KEY = 'venturo-theme'

describe('ThemeStore', () => {
  beforeEach(() => {
    // Reset localStorage and store state
    window.localStorage.clear()
    useThemeStore.setState({ currentTheme: 'morandi' })
    // Reset DOM data-theme
    document.documentElement.removeAttribute('data-theme')
  })

  describe('Initial State', () => {
    it('should default to morandi theme', () => {
      expect(useThemeStore.getState().currentTheme).toBe('morandi')
    })
  })

  describe('setTheme', () => {
    it('should update currentTheme to morandi', () => {
      useThemeStore.getState().setTheme('morandi')
      expect(useThemeStore.getState().currentTheme).toBe('morandi')
    })

    it('should update currentTheme to iron', () => {
      useThemeStore.getState().setTheme('iron')
      expect(useThemeStore.getState().currentTheme).toBe('iron')
    })

    it('should update currentTheme to airtable', () => {
      useThemeStore.getState().setTheme('airtable')
      expect(useThemeStore.getState().currentTheme).toBe('airtable')
    })

    it('should set data-theme attribute on document.documentElement', () => {
      useThemeStore.getState().setTheme('iron')
      expect(document.documentElement.getAttribute('data-theme')).toBe('iron')
    })

    it('should persist theme to localStorage', () => {
      useThemeStore.getState().setTheme('airtable')
      expect(window.localStorage.getItem(STORAGE_KEY)).toBe('airtable')
    })

    it('should overwrite previously persisted theme', () => {
      useThemeStore.getState().setTheme('iron')
      useThemeStore.getState().setTheme('airtable')
      expect(window.localStorage.getItem(STORAGE_KEY)).toBe('airtable')
      expect(useThemeStore.getState().currentTheme).toBe('airtable')
    })
  })

  describe('initTheme', () => {
    it('should load saved valid theme from localStorage', () => {
      window.localStorage.setItem(STORAGE_KEY, 'iron')
      useThemeStore.getState().initTheme()
      expect(useThemeStore.getState().currentTheme).toBe('iron')
      expect(document.documentElement.getAttribute('data-theme')).toBe('iron')
    })

    it('should load airtable theme from localStorage', () => {
      window.localStorage.setItem(STORAGE_KEY, 'airtable')
      useThemeStore.getState().initTheme()
      expect(useThemeStore.getState().currentTheme).toBe('airtable')
      expect(document.documentElement.getAttribute('data-theme')).toBe('airtable')
    })

    it('should fall back to morandi when localStorage is empty', () => {
      useThemeStore.getState().initTheme()
      expect(useThemeStore.getState().currentTheme).toBe('morandi')
      expect(document.documentElement.getAttribute('data-theme')).toBe('morandi')
    })

    it('should fall back to morandi when localStorage has invalid value', () => {
      window.localStorage.setItem(STORAGE_KEY, 'not-a-real-theme')
      useThemeStore.getState().initTheme()
      expect(useThemeStore.getState().currentTheme).toBe('morandi')
      expect(document.documentElement.getAttribute('data-theme')).toBe('morandi')
    })

    it('should fall back to morandi when localStorage has empty string', () => {
      window.localStorage.setItem(STORAGE_KEY, '')
      useThemeStore.getState().initTheme()
      expect(useThemeStore.getState().currentTheme).toBe('morandi')
    })

    it('should reject malicious / arbitrary theme values', () => {
      window.localStorage.setItem(STORAGE_KEY, '<script>alert(1)</script>')
      useThemeStore.getState().initTheme()
      expect(useThemeStore.getState().currentTheme).toBe('morandi')
    })
  })

  describe('Switch flow', () => {
    it('should round-trip: setTheme → reload (initTheme) → same theme', () => {
      useThemeStore.getState().setTheme('iron')
      // 模擬 page reload：重置 in-memory state、保留 localStorage
      useThemeStore.setState({ currentTheme: 'morandi' })
      document.documentElement.removeAttribute('data-theme')

      useThemeStore.getState().initTheme()
      expect(useThemeStore.getState().currentTheme).toBe('iron')
      expect(document.documentElement.getAttribute('data-theme')).toBe('iron')
    })
  })
})
