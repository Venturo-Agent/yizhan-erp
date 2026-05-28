'use client'

import { useEffect } from 'react'
import { MapPin } from 'lucide-react'
import { cn } from '@/lib/utils'

interface CountryDropdownProps {
  countries: { id: string; name: string }[]
  resolvedCountryId: string | undefined
  onCountryChange: (id: string | undefined) => void
}

export function CountryDropdown({
  countries,
  resolvedCountryId,
  onCountryChange,
}: CountryDropdownProps) {
  const selectedCountryName = countries.find(c => c.id === resolvedCountryId)?.name || ''

  // 點擊外部關閉下拉選單
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const menu = document.getElementById('country-dropdown-menu')
      const btn = document.getElementById('country-dropdown-btn')
      if (menu && !menu.contains(e.target as Node) && !btn?.contains(e.target as Node)) {
        menu.classList.add('hidden')
      }
    }
    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [])

  return (
    <div className="relative border-r border-border group">
      <button
        onClick={() => {
          const menu = document.getElementById('country-dropdown-menu')
          if (menu) {
            menu.classList.toggle('hidden')
          }
        }}
        id="country-dropdown-btn"
        className={cn(
          'w-full h-full flex flex-col items-center justify-center py-2 text-xs font-medium transition-colors',
          'text-muted-foreground hover:text-foreground hover:bg-muted/30'
        )}
      >
        <div className="flex items-center gap-1">
          <MapPin size="0.875em" />
          <span>{selectedCountryName || '地區'}</span>
        </div>
      </button>

      {/* 下拉選單 */}
      <div
        id="country-dropdown-menu"
        className="hidden absolute top-full left-0 w-48 max-h-60 overflow-y-auto bg-card border border-border rounded-md shadow-lg z-50 mt-1"
      >
        <button
          onClick={() => {
            onCountryChange(undefined)
            document.getElementById('country-dropdown-menu')?.classList.add('hidden')
          }}
          className="w-full px-3 py-2 text-left text-xs hover:bg-muted/50 border-b border-border"
        >
          全部地區
        </button>
        {countries.map(c => (
          <button
            key={c.id}
            onClick={() => {
              onCountryChange(c.id)
              document.getElementById('country-dropdown-menu')?.classList.add('hidden')
            }}
            className={cn(
              'w-full px-3 py-2 text-left text-xs hover:bg-muted/50',
              resolvedCountryId === c.id && 'bg-morandi-gold/10 text-morandi-primary font-medium'
            )}
          >
            {c.name}
          </button>
        ))}
      </div>
    </div>
  )
}
