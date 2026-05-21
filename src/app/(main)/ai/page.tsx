'use client'

/**
 * /ai — AI Hub 主內容區
 *
 * 2026-05-21 William 拍板 v3.3：
 *   - sidebar 已 render 對話列表（AiSidebar 內 fetch /api/messaging/conversations）
 *   - 主畫面只 render AiConversationsTab 的 thread 部分（hideList=true）
 *   - selectedId 兩邊共用 URL `?conv=<id>`
 *
 * 齒輪 → AiSettingsDialog（總覽 / 對話管理 / 對話復盤 / 通道設定 / AI 機器人 / 全域 policy）
 */

import { AiConversationsTab } from './_components/AiConversationsTab'

export default function AiHubPage() {
  return (
    <div className="flex-1 min-h-0 overflow-auto">
      <AiConversationsTab hideList />
    </div>
  )
}
