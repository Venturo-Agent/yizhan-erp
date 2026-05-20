'use client'

import { useRouter } from 'next/navigation'
import {
  User,
  Bell,
  Shield,
  HelpCircle,
  ChevronRight,
  LogOut,
} from 'lucide-react'
import { useAuthStore } from '@/stores/auth-store'

export default function AppMorePage() {
  const router = useRouter()
  const { logout } = useAuthStore()

  const menuItems = [
    { icon: User, label: '個人資料', href: '/hr' },
    { icon: Bell, label: '通知設定', href: '/app/settings' },
    { icon: Shield, label: '隱私與安全', href: '/app/settings' },
    { icon: HelpCircle, label: '幫助中心', href: '/app/settings' },
  ]

  const handleLogout = async () => {
    await logout()
    router.push('/app')
  }

  return (
    <>
      <header className="app-page-header">
        <h1 className="app-page-title">更多</h1>
      </header>

      <div className="app-menu-section">
        <div className="app-menu-group">
          {menuItems.map((item, index) => {
            const Icon = item.icon
            return (
              <button
                key={index}
                className="app-menu-item"
                onClick={() => router.push(item.href)}
              >
                <div className="app-menu-item-left">
                  <div className="app-menu-icon">
                    <Icon size={20} strokeWidth={1.75} />
                  </div>
                  <span className="app-menu-label">{item.label}</span>
                </div>
                <ChevronRight size={18} className="app-menu-arrow" />
              </button>
            )
          })}
        </div>

        <div className="app-menu-divider" />

        <button className="app-menu-item app-menu-danger" onClick={handleLogout}>
          <div className="app-menu-item-left">
            <div className="app-menu-icon">
              <LogOut size={20} strokeWidth={1.75} />
            </div>
            <span className="app-menu-label">登出</span>
          </div>
        </button>
      </div>
    </>
  )
}