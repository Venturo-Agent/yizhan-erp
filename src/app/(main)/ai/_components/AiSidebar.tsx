'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useSearchParams } from 'next/navigation'
import {
  Sparkles,
  MessageSquare,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { AiSettingsDialog } from './AiSettingsDialog'

/**
 * AI Hub Sidebar — 2026-05-21 William 拍板 v3.2
 *
 * 結構：
 *   Header（h-[calc(3.75rem-1px)]）：標題 + 收側欄 + 設定齒輪
 *   Body — 對話（section header + 客戶列表）：
 *     - 列出傳訊息到 LINE Bot 的客戶（進行中對話）
 *     - Phase 1 暫 placeholder、之後接 line_user_profiles
 *     - 點客戶 row → 主畫面跟他 1-on-1 對話
 *
 *   v3.2 砍：人員 / Rich Menu nav（William 拍板：Rich Menu 已經在齒輪 AI 機器人 tab 裡了、人員不需要）
 *
 * 齒輪 → 滿版 AiSettingsDialog：總覽 / 對話管理 / 對話復盤 / 通道設定 / AI 機器人 / 全域 policy
 */

export function AiSidebar() {
  const searchParams = useSearchParams()
  const activeView = searchParams.get('view') ?? ''

  const [collapsed, setCollapsed] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)

  // Phase 1：客戶列表暫無資料源、show empty placeholder
  // Phase 2 接 line_user_profiles + line_conversation_messages 算出進行中對話
  const activeCustomers: Array<{ id: string; displayName: string; avatarUrl: string | null }> = []

  const buildHref = (view: string) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('view', view)
    return `/ai?${params.toString()}`
  }

  // 收起狀態：sidebar 變窄、顯示 3 個 nav icon + 客戶頭像（跟 ChannelsSidebar 同款）
  if (collapsed) {
    return (
      <>
        <aside className="w-12 shrink-0 border-r border-border bg-card flex flex-col transition-all">
          <div className="w-full h-[calc(3.75rem_-_1px)] flex items-center justify-center border-b border-border shrink-0">
            <button
              type="button"
              onClick={() => setCollapsed(false)}
              className="p-1.5 rounded hover:bg-morandi-gold-light text-morandi-secondary hover:text-morandi-primary transition-colors"
              title="展開 AI Hub 側邊欄"
            >
              <PanelLeftOpen className="h-4 w-4" />
            </button>
          </div>

          <div className="flex-1 w-full overflow-y-auto py-2 flex flex-col items-center gap-1">
            {/* 對話客戶頭像列 */}
            {activeCustomers.map(c => {
              const initial = c.displayName[0] ?? '?'
              const isActive = activeView === `customer:${c.id}`
              return (
                <Link
                  key={c.id}
                  href={buildHref(`customer:${c.id}`)}
                  title={c.displayName}
                  className={cn(
                    'w-9 h-9 rounded-full flex items-center justify-center bg-morandi-gold/20 text-morandi-gold text-xs font-medium shrink-0 transition-all',
                    isActive ? 'ring-2 ring-morandi-gold ring-offset-1 ring-offset-card' : 'hover:ring-2 hover:ring-morandi-gold/50'
                  )}
                >
                  {c.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={c.avatarUrl} alt={c.displayName} className="w-full h-full rounded-full object-cover" />
                  ) : (
                    initial
                  )}
                </Link>
              )
            })}

          </div>
        </aside>

        <AiSettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
      </>
    )
  }

  return (
    <>
      <aside className="w-72 shrink-0 border-r border-border bg-card flex flex-col transition-all">
        {/* Header — 高度對齊全局側欄 h-18 logo 區的 divider */}
        <div className="flex items-center justify-between px-4 h-[calc(3.75rem_-_1px)] border-b border-border">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-morandi-gold" />
            <h2 className="text-sm font-semibold text-morandi-primary">AI Hub</h2>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setCollapsed(true)}
              className="p-1 rounded hover:bg-morandi-gold-light text-morandi-secondary hover:text-morandi-primary transition-colors"
              title="收起 AI Hub 側邊欄"
            >
              <PanelLeftClose className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setSettingsOpen(true)}
              className="p-1 rounded hover:bg-morandi-gold-light text-morandi-secondary hover:text-morandi-primary transition-colors"
              title="AI Hub 設定"
            >
              <Settings className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto py-2">
          {/* 對話 — section header + 客戶列表 */}
          <div className="mb-4">
            <div className="flex items-center gap-1.5 px-4 py-1 text-[0.647rem] text-morandi-muted uppercase tracking-wide">
              <MessageSquare className="h-3 w-3" />
              對話
            </div>
            {activeCustomers.length === 0 ? (
              <p className="px-4 py-2 text-xs text-morandi-muted">
                尚無對話、客戶傳訊息進來會列在這
              </p>
            ) : (
              <ul>
                {activeCustomers.map(c => {
                  const isActive = activeView === `customer:${c.id}`
                  const initial = c.displayName[0] ?? '?'
                  return (
                    <li key={c.id}>
                      <Link
                        href={buildHref(`customer:${c.id}`)}
                        className={cn(
                          'flex items-center gap-2 px-4 py-1.5 text-sm hover:bg-morandi-gold-light transition-colors',
                          isActive
                            ? 'bg-morandi-gold-light text-morandi-primary font-medium'
                            : 'text-morandi-secondary'
                        )}
                      >
                        <div className="shrink-0 w-5 h-5 rounded-full bg-morandi-gold/20 overflow-hidden flex items-center justify-center text-[0.588rem] font-medium text-morandi-gold">
                          {c.avatarUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={c.avatarUrl} alt={c.displayName} className="w-full h-full object-cover" />
                          ) : (
                            <span>{initial}</span>
                          )}
                        </div>
                        <span className="flex-1 truncate">{c.displayName}</span>
                      </Link>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>

        </div>
      </aside>

      <AiSettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
    </>
  )
}
