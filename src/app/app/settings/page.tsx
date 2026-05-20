'use client'

/**
 * /app/settings — 設定 placeholder
 *
 * 2026-05-21：from /app/more 有 3 個 menu item 連到 /app/settings
 *   通知設定、隱私與安全、幫助中心
 * 之前對應 page 不存在、按下去 404。
 * 先補一個 Coming Soon placeholder、避免死連結。
 * 真實內容上 6/1 之後實作。
 */

import { useRouter } from 'next/navigation'
import { ArrowLeft, Settings } from 'lucide-react'
import { useRequireAppAuth } from '../_hooks/useRequireAppAuth'

export default function AppSettingsPage() {
  useRequireAppAuth()
  const router = useRouter()

  return (
    <>
      <header className="app-page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button className="app-header-btn" onClick={() => router.back()}>
            <ArrowLeft size={20} />
          </button>
          <h1 className="app-page-title">設定</h1>
        </div>
      </header>

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '64px 24px',
          textAlign: 'center',
          color: '#666',
        }}
      >
        <Settings size={48} style={{ marginBottom: 16, opacity: 0.4 }} />
        <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>即將推出</h2>
        <p style={{ fontSize: 14, opacity: 0.7 }}>
          通知設定、隱私安全、幫助中心將於下個版本提供。
        </p>
      </div>
    </>
  )
}
