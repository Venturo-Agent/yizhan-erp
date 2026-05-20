'use client'

import { usePathname, useRouter } from 'next/navigation'
import {
  Home,
  Receipt,
  CalendarDays,
  MoreHorizontal,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const tabs = [
  { href: '/app/dashboard', label: '首頁', icon: Home },
  { href: '/app/orders', label: '訂單', icon: Receipt },
  { href: '/app/calendar', label: '行事曆', icon: CalendarDays },
  { href: '/app/more', label: '更多', icon: MoreHorizontal },
]

export function AppTabBar() {
  const pathname = usePathname()
  const router = useRouter()

  if (pathname === '/app') return null

  const isActive = (href: string) => {
    if (href === '/app/dashboard') return pathname === '/app/dashboard'
    return pathname.startsWith(href)
  }

  return (
    <nav className="app-tab-bar">
      {tabs.map(tab => {
        const active = isActive(tab.href)
        const Icon = tab.icon
        return (
          <button
            key={tab.href}
            className={cn('app-tab-item', active && 'active')}
            onClick={() => router.push(tab.href)}
          >
            <Icon size={22} />
            <span>{tab.label}</span>
          </button>
        )
      })}
    </nav>
  )
}