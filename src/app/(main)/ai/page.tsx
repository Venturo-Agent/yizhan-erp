'use client'

/**
 * /ai — AI Hub 主內容區
 *
 * 2026-05-21 William 拍板 v2：sidebar 純 bot 列表、進 AI Hub 預設 = 第一個 bot 的對話畫面
 *
 * - 拿掉 ContentPageLayout + 內嵌 tabs
 * - layout.tsx 提供 sidebar + 滿版殼、本檔只負責「主內容區」
 * - 切換靠 ?view=xxx search param、sidebar 用 Link 寫進 URL
 * - 主內容 = 選中 bot 的對話介面（暫時用 AiConversationsTab、Phase 3 之後加 bot filter）
 *
 * 對應 sidebar：只有 AI 機器人 section（HAPPY / LINE / FB）
 * 對應齒輪 dialog：總覽 / 對話管理 / 對話復盤 / 通道設定 / 全域 policy
 *
 * 預設 view：'bot-happy'（HAPPY 對所有 workspace 開、最安全的 fallback）
 */

import { useSearchParams } from 'next/navigation'
import { AiConversationsTab } from './_components/AiConversationsTab'

const VALID_VIEWS = new Set(['bot-happy', 'bot-line', 'bot-fb'])

export default function AiHubPage() {
  const searchParams = useSearchParams()
  const rawView = searchParams.get('view') ?? 'bot-happy'
  const activeView = VALID_VIEWS.has(rawView) ? rawView : 'bot-happy'

  // Phase 1 暫時：所有 bot view 共用 AiConversationsTab（多通路收件匣）
  // Phase 3 之後：依 activeView prop filter 對話、或拆獨立 BotChatView 元件
  return (
    <div className="flex-1 min-h-0 overflow-auto">
      <AiConversationsTab />
    </div>
  )
}
