'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { useCapabilities, CAPABILITIES } from '@/lib/permissions'
import { useAuthStore } from '@/stores/auth-store'
import { cn } from '@/lib/utils'
import { ChannelsSidebar } from './_components/ChannelsSidebar'
import { CreateChannelDialog } from './_components/CreateChannelDialog'

/**
 * 5/13 William 拍板：頻道是沉浸式對話介面、跟列表頁性質不同
 *
 * - Layout 走 CUSTOM_LAYOUT_PAGES（無 framework p-4/p-6 padding、無 ContentPageLayout header）
 * - 自己 fixed 定位（top-14 / lg:top-[4.5rem] 留全站 TopBar 空間）
 * - 整個畫面給 sidebar + 對話區、Slack 風
 * - 新增頻道按鈕放 sidebar 頂部
 */
export default function ChannelsLayout({ children }: { children: React.ReactNode }) {
  const params = useParams<{ id?: string }>()
  const { can } = useCapabilities()
  const { sidebarCollapsed } = useAuthStore()
  const [isClient, setIsClient] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)

  useEffect(() => {
    setIsClient(true)
  }, [])

  if (!can(CAPABILITIES.CHANNELS_READ)) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-sm text-morandi-secondary">沒有權限存取頻道</p>
      </div>
    )
  }

  return (
    <>
      <main
        className={cn(
          'fixed right-0 overflow-hidden transition-all',
          // CUSTOM_LAYOUT 頁面沒 TopBar、貼頂、不留 top-14 空白
          'top-0 bottom-0 left-0',
          // 桌面：避開左側全站 sidebar 寬度（收合 4rem / 展開 11.25rem）
          !isClient ? 'lg:left-[4rem]' : sidebarCollapsed ? 'lg:left-[4rem]' : 'lg:left-[11.25rem]',
          // 整體 inset padding、讓對話卡片跟 viewport / 全站 sidebar 之間有空隙
          'p-3'
        )}
      >
        <div className="h-full flex bg-card rounded-xl border border-border overflow-hidden">
          <ChannelsSidebar
            activeChannelId={params?.id}
            onCreateChannel={() => setCreateOpen(true)}
          />
          <div className="flex-1 min-h-0 flex flex-col bg-card">{children}</div>
        </div>
      </main>

      <CreateChannelDialog open={createOpen} onOpenChange={setCreateOpen} />
    </>
  )
}
