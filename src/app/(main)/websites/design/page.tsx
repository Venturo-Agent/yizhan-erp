'use client'

/**
 * /websites/design — 全螢幕 Canvas 編輯器
 *
 * 設計：跳脫 (main) 的 sidebar / header 框、佔滿整個 viewport（fixed inset-0 z-50）。
 * Day 1 是 skeleton、之後填左欄 component 庫 / 中央 canvas / 右欄 properties。
 *
 * 退出：按 Esc 或左上「返回」回 /websites/products
 */

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { X, Layout as LayoutIcon, Loader2 } from 'lucide-react'

export default function WebsiteDesignPage() {
  const router = useRouter()

  // Esc 退出
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') router.push('/websites/products')
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [router])

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#FDFAF6]">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-card shadow-sm">
        <div className="flex items-center gap-3">
          <LayoutIcon className="w-5 h-5 text-morandi-primary" />
          <span className="text-sm font-semibold text-morandi-primary">官網版面設計</span>
          <span className="text-xs text-morandi-muted">— Esc 退出</span>
        </div>
        <button
          type="button"
          onClick={() => router.push('/websites/products')}
          className="flex items-center gap-1 px-3 py-1 text-xs text-morandi-secondary hover:text-morandi-primary hover:bg-morandi-container/50 rounded-md transition-colors"
        >
          <X className="w-4 h-4" />
          退出
        </button>
      </div>

      {/* Editor body：3 欄 layout（Day 1 skeleton）*/}
      <div className="flex-1 flex min-h-0">
        {/* 左欄：component 庫 */}
        <aside className="w-64 border-r border-border bg-card overflow-y-auto p-3">
          <div className="text-xs font-semibold text-morandi-secondary uppercase tracking-wider mb-2">
            元件庫
          </div>
          <div className="text-xs text-morandi-muted py-8 text-center">
            <Loader2 className="w-5 h-5 mx-auto mb-2 text-morandi-muted/40" />
            Day 1 skeleton
            <br />
            Day 4 落地
          </div>
        </aside>

        {/* 中央：Canvas */}
        <main className="flex-1 overflow-y-auto bg-morandi-container/20 flex items-center justify-center">
          <div className="text-center text-morandi-muted">
            <LayoutIcon className="w-12 h-12 mx-auto mb-3 text-morandi-muted/40" />
            <div className="text-sm font-medium text-morandi-secondary">Canvas 預覽區</div>
            <div className="text-xs mt-1">Day 5-6 落地</div>
          </div>
        </main>

        {/* 右欄：properties */}
        <aside className="w-72 border-l border-border bg-card overflow-y-auto p-3">
          <div className="text-xs font-semibold text-morandi-secondary uppercase tracking-wider mb-2">
            屬性
          </div>
          <div className="text-xs text-morandi-muted py-8 text-center">
            選取元件後顯示屬性
          </div>
        </aside>
      </div>
    </div>
  )
}
