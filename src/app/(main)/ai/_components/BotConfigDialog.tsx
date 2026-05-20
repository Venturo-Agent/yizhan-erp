'use client'

import { Bot, MessageCircle, Facebook, type LucideIcon } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'

/**
 * 單一 AI 機器人設定 dialog — 從 sidebar 內個別 bot 旁的齒輪打開
 *
 * 2026-05-21 William 拍板（Phase 2）：每個 bot 自己一份設定
 *   - HAPPY：對內查資料客服、不可改（紅線）→ 顯示「不可修改」說明
 *   - LINE Bot：對外客服、可改 prompt / shortcut / few-shot
 *   - FB Bot：未開放
 *
 * Phase 2 第一版：滿版 dialog 殼 + 區別 bot 的提示文案。
 * Phase 3 之後再填具體的 prompt 編輯器 / shortcut 列表 / few-shot UI。
 *
 * 註：當前 LINE Bot 寫法仍掛 employees 表（Phase 0 後改 ai_agents）、
 *     這裡的 prompt 編輯入口會在 Phase 0 落地後接到 ai_agents.capabilities 上。
 */

interface Props {
  botView: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface BotMeta {
  label: string
  icon: LucideIcon
  description: string
  immutable?: boolean
  placeholder?: string
}

const BOT_META: Record<string, BotMeta> = {
  'bot-happy': {
    label: 'HAPPY',
    icon: Bot,
    description: '對內查資料客服、一棧 ERP 預設身份、紅線不可修改',
    immutable: true,
  },
  'bot-line': {
    label: 'LINE Bot',
    icon: MessageCircle,
    description: '對外客服、客戶自綁 LINE OA、可自訂 prompt / shortcut / few-shot',
    placeholder: 'Phase 3 將接入 prompt 編輯器 / shortcut 模板 / few-shot 範例 UI',
  },
  'bot-fb': {
    label: 'Facebook Bot',
    icon: Facebook,
    description: '未開放（Phase 2+）',
    immutable: true,
  },
}

export function BotConfigDialog({ botView, open, onOpenChange }: Props) {
  const meta = BOT_META[botView]
  if (!meta) return null

  const Icon = meta.icon

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        size="full"
        level={1}
        className="max-h-[95vh] h-[95vh] flex flex-col p-0 gap-0"
      >
        <DialogHeader className="px-6 h-[calc(3.75rem_-_1px)] border-b border-border flex flex-row items-center gap-2 space-y-0 shrink-0">
          <Icon className="h-4 w-4 text-morandi-gold" />
          <DialogTitle className="text-base">{meta.label} 設定</DialogTitle>
          <DialogDescription className="sr-only">{meta.description}</DialogDescription>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-auto p-8">
          <div className="max-w-2xl space-y-4 text-sm">
            <div className="flex items-start gap-2">
              <Icon className="h-5 w-5 text-morandi-gold mt-0.5 shrink-0" />
              <div>
                <p className="font-medium text-morandi-primary">{meta.label}</p>
                <p className="text-morandi-secondary mt-1">{meta.description}</p>
              </div>
            </div>

            {meta.immutable ? (
              <div className="rounded-md border border-border bg-morandi-container/30 p-4 text-morandi-muted">
                此機器人為系統內建、不開放修改。
              </div>
            ) : (
              <div className="rounded-md border border-dashed border-border p-6 text-center text-morandi-muted">
                {meta.placeholder ?? '尚未實作'}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
