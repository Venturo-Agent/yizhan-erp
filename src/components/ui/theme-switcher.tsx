'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import { useThemeStore } from '@/stores/theme-store'

const THEME_SWITCHER_LABELS = {
  TITLE: '主題',
  ARIA_GROUP: 'UI 配色主題切換',
} as const

/**
 * UI 配色主題切換器
 *
 * - 從 theme-store 拿 currentTheme + setTheme
 * - segmented control 風格、跟 FontScaleSwitcher 同 layout pattern
 * - 不寫死主題清單、由 theme-store 提供（支援多主題擴充）
 * - Click 後立即套用 <html data-theme>、persist localStorage（store 處理）
 *
 * 機制：tokens.css 用 [data-theme='morandi'] / [data-theme='klein-blue'] 切換 CSS variable
 */

export interface ThemeOption {
  value: string
  label: string
  description?: string
}

// SSOT：theme-store 內 THEMES list 不是 export、本檔重新宣告供 UI 使用
// 維持跟 store 的 ThemeType 對齊（morandi / iron / airtable / klein-blue）
const THEME_OPTIONS: ThemeOption[] = [
  { value: 'morandi', label: '莫蘭迪', description: '溫暖米棕，預設主題' },
  { value: 'iron', label: '鐵灰', description: '冷調深灰，專業沉穩' },
  { value: 'airtable', label: 'Airtable 藍', description: '白底深海軍藍，企業 SaaS 風' },
  { value: 'klein-blue', label: '克萊因藍', description: '北歐簡約，深藍主色' },
]

interface ThemeSwitcherProps {
  className?: string
  /** 顯示 label（「主題」） */
  showLabel?: boolean
}

export function ThemeSwitcher({ className, showLabel = true }: ThemeSwitcherProps) {
  const currentTheme = useThemeStore(s => s.currentTheme)
  const setTheme = useThemeStore(s => s.setTheme)
  const [hydrated, setHydrated] = React.useState(false)

  // 等 store 初始化完成才標 active（避免 SSR 不一致）
  React.useEffect(() => {
    setHydrated(true)
  }, [])

  return (
    <div className={cn('flex items-center gap-3 flex-wrap', className)}>
      {showLabel && (
        <span className="text-sm font-medium text-morandi-primary shrink-0">
          {THEME_SWITCHER_LABELS.TITLE}
        </span>
      )}
      <div
        role="radiogroup"
        aria-label={THEME_SWITCHER_LABELS.ARIA_GROUP}
        className="inline-flex items-center gap-1 rounded-lg border border-border bg-card p-1"
      >
        {THEME_OPTIONS.map(item => {
          const active = hydrated && currentTheme === item.value
          return (
            <button
              key={item.value}
              type="button"
              role="radio"
              aria-checked={active}
              aria-pressed={active}
              aria-label={item.description ?? item.label}
              title={item.description ?? item.label}
              onClick={() => {
                // theme-store setTheme 接受 ThemeType union；用對應字面值呼叫
                if (
                  item.value === 'morandi' ||
                  item.value === 'iron' ||
                  item.value === 'airtable' ||
                  item.value === 'klein-blue'
                ) {
                  setTheme(item.value)
                }
              }}
              className={cn(
                'h-8 px-3 rounded-md text-sm font-semibold transition-colors',
                active
                  ? 'bg-morandi-gold/15 text-morandi-primary border border-morandi-gold/40'
                  : 'text-morandi-secondary border border-transparent hover:bg-morandi-container/40 hover:text-morandi-primary'
              )}
            >
              {item.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
