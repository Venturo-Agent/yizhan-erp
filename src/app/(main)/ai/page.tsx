'use client'

/**
 * /ai — AI Hub 主內容區
 *
 * 2026-05-21 William 拍板 v3.1（修正）：
 *
 * Sidebar 結構：
 *   - 對話（section header）+ 客戶列表（傳訊息進來的人、點 = 1-on-1 chat）
 *   - 人員（單獨 nav）→ view=people
 *   - Rich Menu（單獨 nav）→ view=richmenu
 *   - 齒輪 → AiSettingsDialog（總覽 / 對話管理 / 對話復盤 / 通道設定 / AI 機器人 / 全域 policy）
 *
 * 主內容區 view：
 *   - 預設（無 view）→ 空狀態提示「從左邊選對話 / 人員 / Rich Menu」
 *   - view=customer:<id>  → 跟特定客戶 1-on-1 chat（Phase 2 接資料）
 *   - view=people         → LINE 客戶總列表（Phase 2 placeholder）
 *   - view=richmenu       → LINE Rich Menu 配置（Phase 2 placeholder）
 */

import { useSearchParams } from 'next/navigation'
import { Users, LayoutGrid, User } from 'lucide-react'
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

  if (view === 'people') {
    return (
      <div className="flex-1 min-h-0 overflow-auto p-8 text-sm">
        <div className="flex items-center gap-2 mb-3">
          <Users className="h-5 w-5 text-morandi-gold" />
          <h1 className="text-base font-semibold text-morandi-primary">人員</h1>
        </div>
        <p className="text-morandi-secondary">
          傳訊息到 LINE Bot 的客戶總列表（規劃中）。
        </p>
        <p className="text-morandi-muted text-xs mt-2">
          Phase 2 接 <code className="bg-morandi-container/30 px-1 rounded">line_user_profiles</code>，
          支援綁定 ERP 客戶、查看歷史、agent 分配。
        </p>
      </div>
    )
  }

  if (view === 'richmenu') {
    return (
      <div className="flex-1 min-h-0 overflow-auto p-8 text-sm">
        <div className="flex items-center gap-2 mb-3">
          <LayoutGrid className="h-5 w-5 text-morandi-gold" />
          <h1 className="text-base font-semibold text-morandi-primary">Rich Menu</h1>
        </div>
        <p className="text-morandi-secondary">
          LINE OA Rich Menu 配置（規劃中）。
        </p>
        <p className="text-morandi-muted text-xs mt-2">
          Phase 2 之後做：建 / 編輯 / 排版 / 套用到 OA。
        </p>
      </div>
    )
  }

  // 預設（無 view、沒選客戶）→ 多通路對話收件匣（AiConversationsTab）
  // 這保留以前 AI Hub「對話」tab 的 UI、進 /ai 馬上就能看到所有對話
  return (
    <div className="flex-1 min-h-0 overflow-auto">
      <AiConversationsTab />
    </div>
  )
}
