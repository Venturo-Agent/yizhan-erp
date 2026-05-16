'use client'

import React from 'react'
import { Input } from '@/components/ui/input'

// ============================================
// 餐廳 Combobox（即時搜尋 + 鍵盤操作）
// ============================================

export interface RestaurantItem {
  id: string
  name?: string | null
  english_name?: string | null
}

export interface MealComboboxProps {
  mealKey: 'breakfast' | 'lunch' | 'dinner'
  placeholder: string
  restaurants: RestaurantItem[]
  onPick: (restaurant: { id: string; name: string }) => void
  onPlainText: (text: string) => void
  extraRightPadding: boolean
}

export function MealCombobox({
  placeholder,
  restaurants,
  onPick,
  onPlainText,
  extraRightPadding,
}: MealComboboxProps) {
  const [text, setText] = React.useState('')
  const [open, setOpen] = React.useState(false)
  const [highlight, setHighlight] = React.useState(-1)
  const wrapperRef = React.useRef<HTMLDivElement>(null)

  const filtered = React.useMemo(() => {
    const q = text.trim().toLowerCase()
    if (!q) return [] as RestaurantItem[]
    return restaurants
      .filter(r => {
        const name = (r.name || '').toLowerCase()
        const en = (r.english_name || '').toLowerCase()
        return name.includes(q) || en.includes(q)
      })
      .slice(0, 10)
  }, [restaurants, text])

  React.useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleOutside)
    return () => document.removeEventListener('mousedown', handleOutside)
  }, [])

  const commit = (r: RestaurantItem) => {
    const name = r.name || ''
    onPick({ id: r.id, name })
    setText('')
    setOpen(false)
    setHighlight(-1)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (filtered.length > 0) {
        setOpen(true)
        setHighlight(h => (h < filtered.length - 1 ? h + 1 : h))
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlight(h => (h > 0 ? h - 1 : 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (open && highlight >= 0 && highlight < filtered.length) {
        commit(filtered[highlight])
      } else if (text.trim()) {
        onPlainText(text.trim())
        setText('')
        setOpen(false)
        setHighlight(-1)
      }
    } else if (e.key === 'Escape') {
      e.preventDefault()
      setOpen(false)
      setHighlight(-1)
    }
  }

  return (
    <div ref={wrapperRef} className="relative w-full">
      <Input
        value={text}
        onChange={e => {
          setText(e.target.value)
          setOpen(true)
          setHighlight(-1)
        }}
        onFocus={() => {
          if (text.trim()) setOpen(true)
        }}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={`h-8 text-sm border-0 shadow-none focus-visible:ring-0 rounded-none px-2 bg-transparent placeholder:text-muted-foreground/70 ${extraRightPadding ? 'pr-6' : ''}`}
      />
      {open && filtered.length > 0 && (
        <div className="absolute left-0 right-0 top-full mt-1 z-50 bg-card border border-border rounded-md shadow-lg overflow-hidden max-h-64 overflow-y-auto">
          {filtered.map((r, i) => (
            <button
              key={r.id}
              type="button"
              onMouseDown={e => {
                e.preventDefault()
                commit(r)
              }}
              onMouseEnter={() => setHighlight(i)}
              className={`w-full px-3 py-1.5 text-left text-xs transition-colors ${
                highlight === i ? 'bg-morandi-gold/15' : 'hover:bg-morandi-container/40'
              }`}
            >
              <span className="text-morandi-primary">{r.name}</span>
              {r.english_name && (
                <span className="ml-1 text-muted-foreground">{r.english_name}</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
