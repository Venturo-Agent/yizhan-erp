'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useSearchParams } from 'next/navigation'
import {
  Sparkles,
  Bot,
  MessageCircle,
  Facebook,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  type LucideIcon,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { useWorkspaceFeatures } from '@/lib/permissions'
import { AiSettingsDialog } from './AiSettingsDialog'
import { BotConfigDialog } from './BotConfigDialog'

/**
 * AI Hub Sidebar — 2026-05-21 William 拍板 v2：sidebar 純 bot 列表
 *
 * 結構：
 *   Header（h-[calc(3.75rem-1px)]）：標題 + 兩顆 icon（收側欄 / 設定齒輪）
 *     - 砍掉「新增」按鈕（AI Hub 不需要使用者自己新增 bot）
 *   Body：只有 AI 機器人 section（HAPPY / LINE / FB）
 *     - 概覽 / 對話管理 / 對話復盤全進齒輪 dialog
 *
 * 收側欄狀態：w-12、只顯示 bot icon column（跟 ChannelsSidebar 同款）
 *
 * 「設定齒輪」(header) → 滿版 AiSettingsDialog：放總覽 / 對話管理 / 對話復盤 / 通道設定 / 全域 policy
 * 「Bot 卡片小齒輪」(每行) → BotConfigDialog：放該 bot 的個別 prompt / shortcut / few-shot
 */

interface BotItem {
  view: string
  label: string
  icon: LucideIcon
  disabled?: boolean
  /** 該 bot 對應的 feature flag、沒開就不顯示 */
  requireFeature?: string
}

const BOT_ITEMS: BotItem[] = [
  { view: 'bot-happy', label: 'HAPPY', icon: Bot, requireFeature: 'channels.happy' },
  { view: 'bot-line', label: 'LINE Bot', icon: MessageCircle, requireFeature: 'line_bot' },
  { view: 'bot-fb', label: 'Facebook Bot', icon: Facebook, disabled: true },
]

export function AiSidebar() {
  const searchParams = useSearchParams()
  const activeView = searchParams.get('view') ?? 'dashboard'
  const { isFeatureEnabled } = useWorkspaceFeatures()

  const [collapsed, setCollapsed] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [botConfigOpen, setBotConfigOpen] = useState<string | null>(null)

  const visibleBots = BOT_ITEMS.filter(b => !b.requireFeature || isFeatureEnabled(b.requireFeature))

  const buildHref = (view: string) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('view', view)
    return `/ai?${params.toString()}`
  }

  // 收起狀態：sidebar 變窄、顯示三區 icon 列（跟 ChannelsSidebar 同款）
  if (collapsed) {
    return (
      <>
        <aside className="w-12 shrink-0 border-r border-border bg-card flex flex-col transition-all">
          {/* Header */}
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

          {/* Icon 列 — 只有 bot 列表 */}
          <div className="flex-1 w-full overflow-y-auto py-2 flex flex-col items-center gap-1">
            {visibleBots.map(bot => {
              const Icon = bot.icon
              const isActive = activeView === bot.view
              return (
                <Link
                  key={bot.view}
                  href={bot.disabled ? '#' : buildHref(bot.view)}
                  onClick={e => {
                    if (bot.disabled) {
                      e.preventDefault()
                      toast.info(`${bot.label} 尚未開放`)
                    }
                  }}
                  title={bot.label}
                  className={cn(
                    'w-9 h-9 rounded-lg flex items-center justify-center transition-colors shrink-0',
                    bot.disabled
                      ? 'text-morandi-muted opacity-50'
                      : isActive
                        ? 'bg-morandi-gold-light text-morandi-primary'
                        : 'text-morandi-secondary hover:bg-morandi-gold-light hover:text-morandi-primary'
                  )}
                >
                  <Icon className="h-4 w-4" />
                </Link>
              )
            })}
          </div>
        </aside>

        <AiSettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
        {botConfigOpen && (
          <BotConfigDialog
            botView={botConfigOpen}
            open={!!botConfigOpen}
            onOpenChange={open => !open && setBotConfigOpen(null)}
          />
        )}
      </>
    )
  }

  return (
    <>
      <aside className="w-72 shrink-0 border-r border-border bg-card flex flex-col transition-all">
        {/* Header — 高度對齊全局側欄 h-18 logo 區的 divider：
            h-18 (4.5rem) - layout p-3 (0.75rem) - card border (1px) = calc(3.75rem - 1px) */}
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
          {/* AI 機器人（唯一 section） — 概覽 / 對話管理 / 對話復盤都搬進齒輪 dialog */}
          {visibleBots.length > 0 && (
            <div className="mb-4">
              <div className="flex items-center gap-1.5 px-4 py-1 text-[0.647rem] text-morandi-muted uppercase tracking-wide">
                <Bot className="h-3 w-3" />
                AI 機器人
              </div>
              <ul>
                {visibleBots.map(bot => {
                  const Icon = bot.icon
                  const isActive = activeView === bot.view
                  return (
                    <li key={bot.view} className="group">
                      <div
                        className={cn(
                          'flex items-center gap-2 px-4 py-1.5 text-sm transition-colors',
                          bot.disabled
                            ? 'text-morandi-muted opacity-50'
                            : isActive
                              ? 'bg-morandi-gold-light text-morandi-primary font-medium'
                              : 'text-morandi-secondary hover:bg-morandi-gold-light'
                        )}
                      >
                        {bot.disabled ? (
                          <>
                            <Icon className="h-3.5 w-3.5 shrink-0 opacity-70" />
                            <span className="flex-1 truncate">{bot.label}</span>
                          </>
                        ) : (
                          <>
                            <Link
                              href={buildHref(bot.view)}
                              className="flex items-center gap-2 flex-1 min-w-0"
                            >
                              <Icon className="h-3.5 w-3.5 shrink-0 opacity-70" />
                              <span className="flex-1 truncate">{bot.label}</span>
                            </Link>
                            <button
                              type="button"
                              onClick={() => setBotConfigOpen(bot.view)}
                              className="p-0.5 rounded text-morandi-muted hover:text-morandi-primary hover:bg-morandi-gold-light/50 opacity-0 group-hover:opacity-100 transition-opacity"
                              title={`${bot.label} 設定`}
                            >
                              <Settings className="h-3.5 w-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </li>
                  )
                })}
              </ul>
            </div>
          )}
        </div>
      </aside>

      <AiSettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
      {botConfigOpen && (
        <BotConfigDialog
          botView={botConfigOpen}
          open={!!botConfigOpen}
          onOpenChange={open => !open && setBotConfigOpen(null)}
        />
      )}
    </>
  )
}
