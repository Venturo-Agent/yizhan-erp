'use client'

import { useState, useEffect } from 'react'
import { useCapabilities, CAPABILITIES } from '@/lib/permissions'
import { useAuthStore } from '@/stores/auth-store'
import { cn } from '@/lib/utils'
import { AiSidebar } from './_components/AiSidebar'

/**
 * AI Hub layout
 *
 * - 2026-05-15 William 拍板從沉浸式改回標準（找不到設定切換）
 * - 2026-05-21 William 翻回沉浸式：跟 /channels 視覺統一、sidebar header 加齒輪 / 收側欄 / 新增
 *   設定本身走 sidebar header 的齒輪 → 滿版 dialog、不再需要主標題區、不再有「找不到切換」問題
 *
 * Layout 結構：
 * - 整頁 fixed top:0 left:[全局sidebar寬] right:0 bottom:0、外層 p-3 留間隙
 * - 內層 rounded-xl card 包 AiSidebar + 主內容
 * - 主內容靠 ?view=xxx search param 切換（dashboard / conversations / retrospective / bot-xxx）
 *
 * 對應：src/modules/ai_hub.ts
 *   - feature: ai_hub (premium)
 *   - capabilities: ai_hub.read / ai_hub.write
 */
export default function AiHubLayout({ children }: { children: React.ReactNode }) {
  const { can } = useCapabilities()
  const { sidebarCollapsed } = useAuthStore()
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
  }, [])

  if (!can(CAPABILITIES.AI_HUB_READ)) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-sm text-morandi-secondary">沒有權限存取 AI Hub</p>
      </div>
    )
  }

  return (
    <main
      className={cn(
        'fixed right-0 overflow-hidden transition-all',
        'top-0 bottom-0 left-0',
        !isClient ? 'lg:left-[4rem]' : sidebarCollapsed ? 'lg:left-[4rem]' : 'lg:left-[11.25rem]',
        'p-3'
      )}
    >
      <div className="h-full flex gap-3">
        <div className="flex-1 min-w-0 flex bg-card rounded-xl border border-border overflow-hidden">
          <AiSidebar />
          <div className="flex-1 min-h-0 flex flex-col bg-card">{children}</div>
        </div>
        {/* 業務面板 portal mount — AiConversationsTab 用 createPortal 送進來、跟外卡保持 gap-3 */}
        <div id="ai-hub-business-panel-mount" className="flex-shrink-0 h-full empty:hidden" />
      </div>
    </main>
  )
}
