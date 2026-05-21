'use client'

import { useRouter } from 'next/navigation'
import { ArrowLeft, Plus } from 'lucide-react'

export default function AppCalendarPage() {
  const router = useRouter()

  return (
    <>
      <header className="app-page-header">
        <div className="app-page-header-left">
          <button className="app-back-btn" onClick={() => router.back()}>
            <ArrowLeft size={20} />
          </button>
          <h1 className="app-page-title">行事曆</h1>
        </div>
        <div className="app-page-actions">
          <button className="app-page-btn">
            <Plus size={20} />
          </button>
        </div>
      </header>

      <div className="app-placeholder">
        <div className="app-placeholder-icon">
          <Plus size={32} />
        </div>
        <h2>行事曆頁面</h2>
        <p>即將推出<br />可在網頁版查看完整行事曆</p>
        <button
          className="app-placeholder-btn"
          onClick={() => router.push('/calendar')}
        >
          前往網頁版
        </button>
      </div>
    </>
  )
}