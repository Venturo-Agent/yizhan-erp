'use client'

import { useRouter } from 'next/navigation'
import { ArrowLeft, Search } from 'lucide-react'

export default function AppOrdersPage() {
  const router = useRouter()

  return (
    <>
      <header className="app-page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button className="app-header-btn" onClick={() => router.back()}>
            <ArrowLeft size={20} />
          </button>
          <h1 className="app-page-title">訂單管理</h1>
        </div>
        <div className="app-page-header-actions">
          <button className="app-header-btn">
            <Search size={20} />
          </button>
        </div>
      </header>

      <div className="app-placeholder">
        <div className="app-placeholder-icon">📋</div>
        <h2>訂單頁面</h2>
        <p>即將推出<br />可在網頁版查看完整訂單</p>
        <button
          className="app-button"
          style={{ maxWidth: '200px', marginTop: '16px' }}
          onClick={() => router.push('/orders')}
        >
          前往網頁版
        </button>
      </div>
    </>
  )
}