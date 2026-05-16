import { create } from 'zustand'

export type ThemeType = 'morandi' | 'iron' | 'airtable' | 'klein-blue'

export const THEMES: {
  value: ThemeType
  label: string
  description: string
}[] = [
  { value: 'morandi', label: '莫蘭迪金', description: '溫暖米棕，預設主題' },
  { value: 'iron', label: '鐵灰', description: '冷調深灰，專業沉穩' },
  { value: 'airtable', label: 'Airtable 藍', description: '白底深海軍藍，企業 SaaS 風' },
  { value: 'klein-blue', label: '克萊因藍', description: '北歐簡約藍灰，沉穩中性' },
]

const STORAGE_KEY = 'venturo-theme'
const DEFAULT_THEME: ThemeType = 'morandi'

function isValidTheme(value: string | null): value is ThemeType {
  return (
    value === 'morandi' ||
    value === 'iron' ||
    value === 'airtable' ||
    value === 'klein-blue'
  )
}

interface ThemeState {
  currentTheme: ThemeType
  initTheme: () => void
  setTheme: (theme: ThemeType) => void
}

export const useThemeStore = create<ThemeState>(set => ({
  currentTheme: DEFAULT_THEME,

  initTheme: () => {
    if (typeof window === 'undefined') return
    const saved = window.localStorage.getItem(STORAGE_KEY)
    const theme: ThemeType = isValidTheme(saved) ? saved : DEFAULT_THEME
    set({ currentTheme: theme })
    document.documentElement.setAttribute('data-theme', theme)
  },

  setTheme: theme => {
    set({ currentTheme: theme })
    document.documentElement.setAttribute('data-theme', theme)
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, theme)
    }
  },
}))
