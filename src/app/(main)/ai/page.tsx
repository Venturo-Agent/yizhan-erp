'use client'

/**
 * /ai — AI Hub 主內容區
 *
 * 2026-05-21 William 拍板（Phase 1）：
 *   - 拿掉 ContentPageLayout + 內嵌 tabs
 *   - layout.tsx 提供 sidebar + 滿版殼、本檔只負責「主內容區」
 *   - 切換靠 ?view=xxx search param、sidebar 用 Link 寫進 URL
 *
 * 對應 sidebar：
 *   概覽 section → view: dashboard / conversations / retrospective
 *   AI 機器人 section → view: bot-happy / bot-line / bot-fb
 *
 * Phase 1 暫時：bot-xxx view 共用 AiSettingsTab 的 bot 區（HAPPY/LINE/FB 三卡）
 * Phase 3 之後：各 bot 自己有獨立主內容區（對話列表 + 表現 / 設定快捷）
 */

import { useSearchParams } from 'next/navigation'
import { AiConversationsTab } from './_components/AiConversationsTab'
import { AiSettingsTab } from './_components/AiSettingsTab'
import { AiRetrospectiveTab } from './_components/AiRetrospectiveTab'
import { AiDashboardTab } from './_components/AiDashboardTab'

const VALID_VIEWS = new Set([
  'dashboard',
  'conversations',
  'retrospective',
  'bot-happy',
  'bot-line',
  'bot-fb',
])

export default function AiHubPage() {
  const searchParams = useSearchParams()
  const rawView = searchParams.get('view') ?? 'dashboard'
  const activeView = VALID_VIEWS.has(rawView) ? rawView : 'dashboard'

  // bot-xxx view 都導到 AiSettingsTab（三張 bot 卡）
  // Phase 3 之後可以做 per-bot 各自的主內容區、用 botView prop 切
  const isBot = activeView.startsWith('bot-')

  return (
    <div className="flex-1 min-h-0 overflow-auto">
      {activeView === 'dashboard' && <AiDashboardTab />}
      {activeView === 'conversations' && <AiConversationsTab />}
      {activeView === 'retrospective' && <AiRetrospectiveTab />}
      {isBot && <AiSettingsTab />}
    </div>
  )
}
