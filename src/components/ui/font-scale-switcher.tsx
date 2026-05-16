'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'

const FONT_SCALE_LABELS = {
  TITLE: '字體大小',
  ARIA_GROUP: '字體大小調整',
  XS_ARIA: '極小字體（13px）',
  SM_ARIA: '小字體（15px）',
  MD_ARIA: '預設字體（17px）',
  LG_ARIA: '大字體（19px）',
  XL_ARIA: '特大字體（21px）',
} as const

/**
 * 字體大小調整 5 階（accessibility feature、2026-05-16 William 拍板均勻 +2 階距）
 *
 * - xs (A⁻⁻) 13px 高密度
 * - sm (A−)  15px 年輕員工
 * - md (A)   17px 預設 ⭐
 * - lg (A+)  19px
 * - xl (A++) 21px 視覺需求
 *
 * 機制：在 <html> 設 data-font-scale="xs|sm|md|lg|xl"、
 * tokens.css 對應 --font-scale 倍率、html { font-size: calc(17px * var(--font-scale)) }
 * localStorage key: venturo-font-scale
 */

export type FontScale = 'xs' | 'sm' | 'md' | 'lg' | 'xl'

const STORAGE_KEY = 'venturo-font-scale'
const DEFAULT_SCALE: FontScale = 'md'

const SCALES: { value: FontScale; label: string; ariaLabel: string }[] = [
  { value: 'xs', label: 'A⁻⁻', ariaLabel: FONT_SCALE_LABELS.XS_ARIA },
  { value: 'sm', label: 'A⁻', ariaLabel: FONT_SCALE_LABELS.SM_ARIA },
  { value: 'md', label: 'A', ariaLabel: FONT_SCALE_LABELS.MD_ARIA },
  { value: 'lg', label: 'A⁺', ariaLabel: FONT_SCALE_LABELS.LG_ARIA },
  { value: 'xl', label: 'A⁺⁺', ariaLabel: FONT_SCALE_LABELS.XL_ARIA },
]

function isValidScale(v: string | null): v is FontScale {
  return v === 'xs' || v === 'sm' || v === 'md' || v === 'lg' || v === 'xl'
}

function applyScale(scale: FontScale): void {
  if (typeof document === 'undefined') return
  // 必須設在 <html>、因為 html 的 font-size 不受 body attribute 影響（CSS cascade）
  document.documentElement.setAttribute('data-font-scale', scale)
}

interface FontScaleSwitcherProps {
  className?: string
  /** 顯示 label（「字體大小」） */
  showLabel?: boolean
}

export function FontScaleSwitcher({ className, showLabel = true }: FontScaleSwitcherProps) {
  const [scale, setScale] = React.useState<FontScale>(DEFAULT_SCALE)
  const [hydrated, setHydrated] = React.useState(false)

  // 初次掛載：從 localStorage 讀取 + 套到 body
  React.useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY)
    const initial: FontScale = isValidScale(saved) ? saved : DEFAULT_SCALE
    setScale(initial)
    applyScale(initial)
    setHydrated(true)
  }, [])

  const handleSelect = (next: FontScale) => {
    setScale(next)
    applyScale(next)
    window.localStorage.setItem(STORAGE_KEY, next)
  }

  return (
    <div className={cn('flex items-center gap-3', className)}>
      {showLabel && (
        <span className="text-sm font-medium text-morandi-primary shrink-0">
          {FONT_SCALE_LABELS.TITLE}
        </span>
      )}
      <div
        role="radiogroup"
        aria-label={FONT_SCALE_LABELS.ARIA_GROUP}
        className="inline-flex items-center gap-1 rounded-lg border border-border bg-card p-1"
      >
        {SCALES.map(item => {
          const active = hydrated && scale === item.value
          return (
            <button
              key={item.value}
              type="button"
              role="radio"
              aria-checked={active}
              aria-label={item.ariaLabel}
              onClick={() => handleSelect(item.value)}
              className={cn(
                'min-w-9 h-8 px-2 rounded-md text-sm font-semibold transition-colors',
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
