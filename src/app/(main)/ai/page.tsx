'use client'

/**
 * /ai — AI Hub
 *
 * 整合 Kimi 設計的 AI 平台、合併原 /messaging 多通路收件匣。
 *
 * 對應：src/modules/ai_hub.ts
 *   - feature: ai_hub (premium)
 *   - capabilities: ai_hub.read / ai_hub.write
 *
 * Layout：2026-05-15 William 拍板從沉浸式改回標準 ContentPageLayout（跟租戶管理頁一致）
 *
 * Tab 結構（UI 層、跟 capability 不一一對應、走粗顆粒）：
 *   - dashboard: AI 控制中心（統計卡 + 平台狀態 + 活動 feed + 7 日效能）
 *   - conversations: 多通路對話收件匣（合併原 /messaging）
 *   - setup: 通道設定（line / facebook / instagram）
 *   - settings: AI 助理設定（Phase 2 細化）
 *
 * 切 tab 走 search param ?tab=xxx、可分享 URL、瀏覽器 back / forward 行為對。
 *
 * 真正 AI 業務邏輯（intent 分級 / proposal 開團 / 估價 / 自動建單）待之後
 * 業務 spec 拍板再接、本檔只搭 UI 殼。
 */

import { useSearchParams, useRouter } from 'next/navigation'
import { Sparkles, MessageSquare, Plug, Settings2, BookOpenCheck } from 'lucide-react'
import { ContentPageLayout } from '@/components/layout/content-page-layout'
import { AiConversationsTab } from './_components/AiConversationsTab'
import { AiSetupTab } from './_components/AiSetupTab'
import { AiSettingsTab } from './_components/AiSettingsTab'
import { AiRetrospectiveTab } from './_components/AiRetrospectiveTab'

// AI 控制中心暫時隱藏（dashboard tab）：placeholder 頁面、待真實數據量足夠再做統計
// 之後恢復：加回 import AiDashboardTab + LayoutDashboard icon、TABS 加回 dashboard、default tab 改回 'dashboard'
const TABS = [
  { value: 'conversations', label: '對話管理', icon: MessageSquare },
  { value: 'retrospective', label: '對話復盤', icon: BookOpenCheck },
  { value: 'setup', label: '通道設定', icon: Plug },
  { value: 'settings', label: 'AI 設定', icon: Settings2 },
] as const

const VALID_TABS = new Set(TABS.map((t) => t.value))

export default function AiHubPage() {
  const searchParams = useSearchParams()
  const router = useRouter()

  const rawTab = searchParams.get('tab') ?? 'conversations'
  const activeTab = VALID_TABS.has(rawTab as (typeof TABS)[number]['value']) ? rawTab : 'conversations'

  const handleTabChange = (next: string) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('tab', next)
    router.replace(`/ai?${params.toString()}`, { scroll: false })
  }

  return (
    <ContentPageLayout
      title="AI Hub"
      icon={Sparkles}
      tabs={[...TABS]}
      activeTab={activeTab}
      onTabChange={handleTabChange}
    >
      {activeTab === 'conversations' && <AiConversationsTab />}
      {activeTab === 'retrospective' && <AiRetrospectiveTab />}
      {activeTab === 'setup' && <AiSetupTab />}
      {activeTab === 'settings' && <AiSettingsTab />}
    </ContentPageLayout>
  )
}
