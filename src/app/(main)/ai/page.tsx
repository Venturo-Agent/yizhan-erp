'use client'

/**
 * /ai — AI Hub 主內容區
 *
 * 2026-05-21 William 拍板 v3：sidebar 3 個 nav（對話 / 人員 / Rich Menu）+ 客戶對話列表
 *
 * - layout.tsx 提供 sidebar + 滿版殼、本檔只負責「主內容區」
 * - 切換靠 ?view=xxx search param、sidebar 用 Link 寫進 URL
 * - view 種類：
 *     conversations（預設）→ 多通路對話收件匣
 *     people               → LINE 客戶列表（傳訊息進來的人）
 *     richmenu             → LINE Rich Menu 配置
 *     customer:<id>        → 跟特定客戶的 1-on-1 對話介面（Phase 2 接資料）
 *
 * 機器人配置（HAPPY / LINE / FB）全進齒輪 dialog 的「AI 機器人」tab、不再在主畫面 / sidebar
 */

import { useSearchParams } from 'next/navigation'
import { Users, LayoutGrid, User } from 'lucide-react'
import { AiConversationsTab } from './_components/AiConversationsTab'

export default function AiHubPage() {
  const searchParams = useSearchParams()
  const view = searchParams.get('view') ?? 'conversations'

  // 客戶 1-on-1 對話 view（view=customer:UUID）
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
            Phase 2 之後接 line_user_profiles + line_conversation_messages
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 min-h-0 overflow-auto">
      {view === 'conversations' && <AiConversationsTab />}
      {view === 'people' && (
        <div className="p-8 text-sm">
          <div className="flex items-center gap-2 mb-3">
            <Users className="h-5 w-5 text-morandi-gold" />
            <h1 className="text-base font-semibold text-morandi-primary">人員</h1>
          </div>
          <p className="text-morandi-secondary">
            傳訊息到 LINE Bot 的客戶列表（規劃中）。
          </p>
          <p className="text-morandi-muted text-xs mt-2">
            Phase 2 接 <code className="bg-morandi-container/30 px-1 rounded">line_user_profiles</code>，
            支援綁定 ERP 客戶、查看歷史、agent 分配。
          </p>
        </div>
      )}
      {view === 'richmenu' && (
        <div className="p-8 text-sm">
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
      )}
    </div>
  )
}
