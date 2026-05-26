'use client'

import { useRouter } from 'next/navigation'
import { ArrowLeft, Search } from 'lucide-react'
import { useRequireAppAuth } from '../_hooks/useRequireAppAuth'

export default function AppOrdersPage() {
  useRequireAppAuth()
  const router = useRouter()

  return (
    <>
      <header className="app-page-header">
        <div className="app-page-header-left">
          <button className="app-back-btn" onClick={() => router.back()}>
            <ArrowLeft size={20} />
          </button>
          <h1 className="app-page-title">訂單管理</h1>
        </div>
        <div className="app-page-actions">
          <button className="app-page-btn">
            <Search size={20} />
          </button>
        </div>
      </header>

      <div className="app-placeholder">
        <div className="app-placeholder-icon">
          <Search size={32} />
        </div>
        <h2>訂單頁面</h2>
        <p>
          即將推出
          <br />
          可在網頁版查看完整訂單
        </p>
        <button className="app-placeholder-btn" onClick={() => router.push('/orders')}>
          前往網頁版
        </button>
      </div>
    </>
  )
}
