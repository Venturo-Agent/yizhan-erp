'use client'

import { useState } from 'react'
import { Plug, Sliders, BookOpenCheck } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { AiSetupTab } from './AiSetupTab'

/**
 * AI Hub 設定 dialog — 從 sidebar header 齒輪打開
 *
 * 2026-05-21 William 拍板：
 *   - 滿版 dialog（max-w-[95vw] / h-[95vh]）、像 /channels 沉浸式的感覺
 *   - 內含分頁：通道設定（OA 接入、token、webhook）/ 全域 AI policy（語氣、人格、禁字）/ 對話復盤入口
 *   - 通道設定直接用既有的 AiSetupTab、不重寫
 *   - 全域 policy + 對話復盤入口先放 placeholder、之後填內容
 */

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
}

type SettingsTab = 'setup' | 'policy' | 'retrospective'

const TABS: Array<{ value: SettingsTab; label: string; icon: typeof Plug }> = [
  { value: 'setup', label: '通道設定', icon: Plug },
  { value: 'policy', label: '全域 AI Policy', icon: Sliders },
  { value: 'retrospective', label: '對話復盤入口', icon: BookOpenCheck },
]

export function AiSettingsDialog({ open, onOpenChange }: Props) {
  const [activeTab, setActiveTab] = useState<SettingsTab>('setup')

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        size="full"
        level={1}
        className="max-h-[95vh] h-[95vh] flex flex-col p-0 gap-0"
      >
        <DialogHeader className="px-6 h-[calc(3.75rem_-_1px)] border-b border-border flex flex-row items-center space-y-0 shrink-0">
          <DialogTitle className="text-base">AI Hub 設定</DialogTitle>
        </DialogHeader>

        {/* Tab 列 */}
        <div className="flex items-center gap-1 px-6 py-2 border-b border-border shrink-0">
          {TABS.map(tab => {
            const Icon = tab.icon
            const isActive = activeTab === tab.value
            return (
              <button
                key={tab.value}
                type="button"
                onClick={() => setActiveTab(tab.value)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md transition-colors',
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

        {/* 內容 */}
        <div className="flex-1 min-h-0 overflow-auto">
          {activeTab === 'setup' && <AiSetupTab />}
          {activeTab === 'policy' && (
            <div className="p-8 text-sm text-morandi-secondary">
              <p className="mb-2 font-medium text-morandi-primary">全域 AI Policy（規劃中）</p>
              <p>
                這裡將放租戶層級的 AI 語氣 / 人格設定、禁字清單、回應 SOP 等。
                跨所有 bot 共用。對應 schema：<code className="bg-morandi-container/30 px-1 rounded">workspace_ai_agents</code>。
              </p>
            </div>
          )}
          {activeTab === 'retrospective' && (
            <div className="p-8 text-sm text-morandi-secondary">
              <p className="mb-2 font-medium text-morandi-primary">對話復盤入口（規劃中）</p>
              <p>
                這裡可以快速跳轉至各 bot 的對話復盤頁、或執行整體復盤工作流。
                細節對話分析還是走左側「對話復盤」進去看完整介面。
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
