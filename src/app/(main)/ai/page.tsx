'use client'

/**
 * /ai — AI Hub 主內容區
 *
 * 2026-05-21 William 拍板 v3.2：
 *
 * Sidebar 結構：
 *   - 對話（section header）+ 客戶列表（傳訊息進來的人、點 = 1-on-1 chat）
 *   - 齒輪 → AiSettingsDialog（總覽 / 對話管理 / 對話復盤 / 通道設定 / AI 機器人 / 全域 policy）
 *
 * 主內容區 view：
 *   - 預設（無 view）→ AiConversationsTab（多通路對話收件匣）
 *   - view=customer:<id> → 跟特定客戶 1-on-1 chat（Phase 2 接資料）
 */

import { useSearchParams } from 'next/navigation'
import { User } from 'lucide-react'
import { AiConversationsTab } from './_components/AiConversationsTab'

export default function AiHubPage() {
  const searchParams = useSearchParams()
  const view = searchParams.get('view') ?? ''

  // 客戶 1-on-1 對話（view=customer:UUID）
  if (view.startsWith('customer:')) {
    const customerId = view.slice('customer:'.length)
    return (
      <div className="flex-1 min-h-0 flex items-center justify-center p-8">
        <div className="text-center max-w-md">
          <User className="h-10 w-10 mx-auto text-morandi-gold opacity-70 mb-3" />
          <p className="font-medium text-morandi-primary mb-1">客戶 1-on-1 對話介面</p>
          <p className="text-sm text-morandi-secondary">
            customer_id: <code className="bg-morandi-container/30 px-1 rounded">{customerId}</code>
          </p>
          <p className="text-xs text-morandi-muted mt-3">
            Phase 2 接 line_user_profiles + line_conversation_messages
          </p>
        </div>
      </div>
    )
  }

  // 預設 → 多通路對話收件匣
  return (
    <div className="flex-1 min-h-0 overflow-auto">
      <AiConversationsTab />
    </div>
  )
}
