'use client'

import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/stores/auth-store'
import { useRequireAppAuth } from '../_hooks/useRequireAppAuth'
import { Bell, FileText, Calendar, Settings, Monitor, ChevronRight, LogOut } from 'lucide-react'

export default function AppDashboard() {
  useRequireAppAuth()
  const router = useRouter()
  const { user } = useAuthStore()

  const greeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return '早安'
    if (hour < 18) return '午安'
    return '晚安'
  }

  // 2026-05-21 修：拿掉 dead link `/app/todos` / `/app/messages`（pages 不存在、按下去 404）
  // 等對應 page 補完再加回 quickActions
  const quickActions = [
    {
      label: '我的訂單',
      icon: FileText,
      href: '/app/orders',
      desc: '查看與管理',
    },
    {
      label: '行事曆',
      icon: Calendar,
      href: '/app/calendar',
      desc: '行程安排',
    },
  ]

  const tools = [
    { label: '設定', icon: Settings, href: '/app/more' },
    { label: '網頁版', icon: Monitor, href: '/dashboard' },
  ]

  return (
    <>
      <header className="dash-header">
        <div className="dash-header-left">
          <span className="dash-greeting">{greeting()}</span>
          <h1 className="dash-title">{user?.display_name || user?.email?.split('@')[0]}</h1>
        </div>
        <button className="dash-icon-btn">
          <Bell size={20} />
          <span className="dash-badge" />
        </button>
      </header>

      <div className="dash-body">
        <section className="dash-section">
          <h2 className="dash-section-title">快捷功能</h2>
          <div className="dash-grid">
            {quickActions.map(item => {
              const Icon = item.icon
              return (
                <button
                  key={item.href}
                  className="dash-card"
                  onClick={() => router.push(item.href)}
                >
                  <div className="dash-card-icon">
                    <Icon size={22} strokeWidth={1.75} />
                  </div>
                  <div className="dash-card-content">
                    <span className="dash-card-label">{item.label}</span>
                    <span className="dash-card-desc">{item.desc}</span>
                  </div>
                  <ChevronRight size={18} className="dash-card-arrow" />
                </button>
              )
            })}
          </div>
        </section>

        <section className="dash-section">
          <h2 className="dash-section-title">工具</h2>
          <div className="dash-tools">
            {tools.map(item => {
              const Icon = item.icon
              return (
                <button
                  key={item.href}
                  className="dash-tool-btn"
                  onClick={() => router.push(item.href)}
                >
                  <Icon size={18} strokeWidth={1.75} />
                  <span>{item.label}</span>
                </button>
              )
            })}
          </div>
        </section>
      </div>
    </>
  )
}
