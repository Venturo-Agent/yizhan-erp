'use client'

import { useRouter } from 'next/navigation'
import { ArrowLeft, Plus } from 'lucide-react'

export default function AppCalendarPage() {
  const router = useRouter()

  return (
    <>
      <header className="app-page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button className="app-header-btn" onClick={() => router.back()}>
            <ArrowLeft size={20} />
          </button>
          <h1 className="app-page-title">行事曆</h1>
        </div>
        <div className="app-page-header-actions">
          <button className="app-header-btn">
            <Plus size={20} />
          </button>
        </div>
      </header>

      <div className="app-placeholder">
        <div className="app-placeholder-icon">📅</div>
        <h2>行事曆頁面</h2>
        <p>即將推出<br />可在網頁版查看完整行事曆</p>
        <button
          className="app-button"
          style={{ maxWidth: '200px', marginTop: '16px' }}
          onClick={() => router.push('/calendar')}
        >
          前往網頁版
        </button>
      </div>
    </>
  )
}