'use client'

import { useState } from 'react'
import { LayoutDashboard, BookOpenCheck, Plug, Settings, Bot, type LucideIcon } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { AiSetupTab } from './AiSetupTab'
import { AiSettingsTab } from './AiSettingsTab'
import { AiDashboardTab } from './AiDashboardTab'
import { AiRetrospectiveTab } from './AiRetrospectiveTab'

/**
 * AI Hub 設定 dialog — 從 sidebar header 齒輪打開
 *
 * 2026-05-21 William 拍板 v2：sidebar 純 bot 列表、所有「管理 / 復盤 / 設定」進這個齒輪 dialog
 *
 * 滿版 dialog（max-w-[95vw] / h-[95vh]）、像 /channels 沉浸式的感覺、tabs：
 *   1. 總覽（AiDashboardTab）
 *   2. 對話復盤（AiRetrospectiveTab）
 *   3. 通道設定（AiSetupTab — OA 接入、token、webhook）
 *   4. AI 機器人（AiSettingsTab）
 *   5. 全域 AI Policy（語氣、人格、禁字 — placeholder）
 *
 * 2026-05-23：拿掉「對話管理」tab（跟 sidebar bot 點進去同一個 AiConversationsTab、重複）。
 *   tabs 移到標題同一排。
 */

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
}

type SettingsTab = 'dashboard' | 'retrospective' | 'setup' | 'bots' | 'policy'

const TABS: Array<{ value: SettingsTab; label: string; icon: LucideIcon }> = [
  { value: 'dashboard', label: '總覽', icon: LayoutDashboard },
  { value: 'retrospective', label: '對話復盤', icon: BookOpenCheck },
  { value: 'setup', label: '通道設定', icon: Plug },
  { value: 'bots', label: 'AI 機器人', icon: Bot },
  { value: 'policy', label: '全域 AI Policy', icon: Settings },
]

export function AiSettingsDialog({ open, onOpenChange }: Props) {
  const [activeTab, setActiveTab] = useState<SettingsTab>('dashboard')

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        size="full"
        level={1}
        className="max-h-[95vh] h-[95vh] flex flex-col p-0 gap-0"
      >
        {/* 標題 + 分頁同一排 */}
        <DialogHeader className="px-6 h-[calc(3.75rem_-_1px)] border-b border-border flex flex-row items-center gap-4 space-y-0 shrink-0">
          <DialogTitle className="text-base shrink-0">AI Hub 設定</DialogTitle>
          <div className="flex items-center gap-1 overflow-x-auto">
            {TABS.map(tab => {
              const Icon = tab.icon
              const isActive = activeTab === tab.value
              return (
                <button
                  key={tab.value}
                  type="button"
                  onClick={() => setActiveTab(tab.value)}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md transition-colors shrink-0',
                    isActive
                      ? 'bg-morandi-gold-light text-morandi-primary font-medium'
                      : 'text-morandi-secondary hover:bg-morandi-gold-light/50 hover:text-morandi-primary'
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </button>
              )
            })}
          </div>
        </DialogHeader>

        {/* 內容 */}
        <div className="flex-1 min-h-0 overflow-auto">
          {activeTab === 'dashboard' && <AiDashboardTab />}
          {activeTab === 'retrospective' && <AiRetrospectiveTab />}
          {activeTab === 'setup' && <AiSetupTab />}
          {activeTab === 'bots' && <AiSettingsTab />}
          {activeTab === 'policy' && (
            <div className="p-8 text-sm text-morandi-secondary">
              <p className="mb-2 font-medium text-morandi-primary">全域 AI Policy（規劃中）</p>
              <p>
                這裡將放租戶層級的 AI 語氣 / 人格設定、禁字清單、回應 SOP 等。 跨所有 bot 共用。對應
                schema：
                <code className="bg-morandi-container/30 px-1 rounded">workspace_ai_agents</code>。
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
