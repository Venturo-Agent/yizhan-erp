'use client'

/**
 * TourTabs - 團詳情頁籤（共用元件）
 *
 * 提供：
 * 1. TOUR_TABS - 頁籤定義（給 ResponsiveHeader 等使用）
 * 2. TourTabContent - 只渲染內容（不含頁籤列）
 * 3. TourTabs - 完整元件（含頁籤列，給詳細頁面用）
 */

import { useState, useCallback, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import dynamic from 'next/dynamic'
import { cn } from '@/lib/utils'
import type { Tour } from '@/stores/types'
import { useVisibleModuleTabs, useWorkspaceFeatures } from '@/lib/permissions/hooks'

import { Spinner } from '@/components/ui/spinner'
// Loading placeholder
const TabLoading = () => (
  <div className="flex items-center justify-center py-12">
    <Spinner size="lg" className="text-muted-foreground" />
  </div>
)

// 動態載入頁籤內容
const TourOverview = dynamic(
  () => import('@/app/(main)/tours/_components/tour-overview').then(m => m.TourOverview),
  { loading: () => <TabLoading /> }
)

const TourOrders = dynamic(
  () => import('@/app/(main)/tours/_components/tour-orders').then(m => m.TourOrders),
  { loading: () => <TabLoading /> }
)

const OrderMembersExpandable = dynamic(
  () =>
    import('@/app/(main)/orders/_components/OrderMembersExpandable').then(
      m => m.OrderMembersExpandable
    ),
  { loading: () => <TabLoading /> }
)

const TourCosts = dynamic(
  () => import('@/app/(main)/tours/_components/tour-costs').then(m => m.TourCosts),
  { loading: () => <TabLoading /> }
)

const TourReceipts = dynamic(
  () => import('@/app/(main)/tours/_components/tour-receipts').then(m => m.TourReceipts),
  { loading: () => <TabLoading /> }
)

const TourQuoteTab = dynamic(
  () => import('@/app/(main)/tours/_components/tour-quote-tab').then(m => m.TourQuoteTab),
  { loading: () => <TabLoading /> }
)

const TourItineraryTab = dynamic(
  () => import('@/app/(main)/tours/_components/tour-itinerary-tab').then(m => m.TourItineraryTab),
  { loading: () => <TabLoading /> }
)

const TourClosingSections = dynamic(
  () =>
    import('@/app/(main)/tours/_components/TourClosingSections').then(m => m.TourClosingSections),
  { loading: () => <TabLoading /> }
)

// TourContractTab：合約功能 William 重寫中、檔案被刪、暫時 stub
const TourContractTab = ({ tour: _tour }: { tour: unknown }) => {
  const t = useTranslations('tour')
  return (
    <div className="text-sm text-morandi-secondary text-center py-12">{t('tabContractRebuildNotice')}</div>
  )
}

// ============================================================================
// 頁籤定義（共用）
// ============================================================================

// 5/13 William 拍板：訂單為預設第一個、總覽移最右（業務最常看訂單）
export const TOUR_TABS = [
  { value: 'orders', label: '訂單' },
  { value: 'members', label: '團員' },
  { value: 'itinerary', label: '行程' },
  { value: 'quote', label: '報價' },
  { value: 'contract', label: '合約' },
  { value: 'overview', label: '總覽' },
  // 「結案」併在「總覽」、由 workspace feature `tours.closing` 控制可見性
] as const

type TourTabValue = (typeof TOUR_TABS)[number]['value']

// ============================================================================
// ConditionalClosingSections - 依 workspace feature `tours.closing` 決定是否渲染
// ============================================================================

function ConditionalClosingSections({ tour }: { tour: Tour }) {
  const { isTabEnabled, loading } = useWorkspaceFeatures()
  if (loading) return null
  if (!isTabEnabled('tours', 'closing')) return null
  return <TourClosingSections tour={tour} />
}

// ============================================================================
// TourTabContent - 只渲染內容（不含頁籤列）
// ============================================================================

interface TourTabContentProps {
  tour: Tour
  activeTab: string
  /** 額外 props 傳給 OrderMembersExpandable */
  workspaceId?: string
  forceShowPnr?: boolean
  /** PNR 配對 Dialog 控制 */
  showPnrMatchDialog?: boolean
  onPnrMatchDialogChange?: (show: boolean) => void
  onPnrMatchSuccess?: () => void
  /** 需求單回調 */
  onAddRequest?: () => void
  onOpenRequestDialog?: (data: {
    category: string
    supplierName: string
    items: { serviceDate: string | null; title: string; quantity: number; note?: string }[]
    startDate: string | null
  }) => void
}

export function TourTabContent({
  tour,
  activeTab,
  workspaceId,
  forceShowPnr,
  showPnrMatchDialog,
  onPnrMatchDialogChange,
  onPnrMatchSuccess,
  onAddRequest: _onAddRequest,
  onOpenRequestDialog: _onOpenRequestDialog,
}: TourTabContentProps) {
  switch (activeTab) {
    case 'members':
      return (
        <OrderMembersExpandable
          key={`members-${tour.id}`} // 強制重新掛載
          tourId={tour.id}
          workspaceId={workspaceId || ''}
          mode="tour"
          forceShowPnr={forceShowPnr}
          tour={tour}
          showPnrMatchDialog={showPnrMatchDialog}
          onPnrMatchDialogChange={onPnrMatchDialogChange}
          onPnrMatchSuccess={onPnrMatchSuccess}
        />
      )
    case 'orders':
      return <TourOrders tour={tour} />
    case 'quote':
      return <TourQuoteTab tour={tour} />
    case 'itinerary':
      return <TourItineraryTab tour={tour} />
    case 'overview':
      return (
        <div className="space-y-6">
          <TourOverview tour={tour} />
          <TourReceipts tour={tour} />
          <TourCosts tour={tour} showSummary={false} />
          <ConditionalClosingSections tour={tour} />
        </div>
      )
    case 'closing':
      // `?tab=closing` 自動 fallback 到總覽（內含結案區塊）
      return (
        <div className="space-y-6">
          <TourOverview tour={tour} />
          <TourReceipts tour={tour} />
          <TourCosts tour={tour} showSummary={false} />
          <ConditionalClosingSections tour={tour} />
        </div>
      )
    case 'contract':
      return <TourContractTab tour={tour} />
    default:
      return <TourOverview tour={tour} />
  }
}

// ============================================================================
// TourTabs - 完整元件（含頁籤列，給詳細頁面用）
// ============================================================================

interface TourTabsProps {
  tour: Tour
  defaultTab?: TourTabValue
  onTabChange?: (tab: TourTabValue) => void
  hiddenTabs?: TourTabValue[]
  onAddRequest?: () => void
}

function _TourTabs({
  tour,
  defaultTab = 'members',
  onTabChange,
  hiddenTabs = [],
  onAddRequest,
}: TourTabsProps) {
  const [activeTab, setActiveTab] = useState<TourTabValue>(defaultTab)
  const featureVisibleTabs = useVisibleModuleTabs('tours', TOUR_TABS)

  const handleTabChange = useCallback(
    (tab: TourTabValue) => {
      setActiveTab(tab)
      onTabChange?.(tab)
    },
    [onTabChange]
  )

  const visibleTabs = useMemo(
    () => featureVisibleTabs.filter(tab => !hiddenTabs.includes(tab.value)),
    [hiddenTabs, featureVisibleTabs]
  )

  return (
    <div className="flex flex-col h-full">
      {/* 頁籤列 */}
      <div className="flex border-b bg-muted/30 overflow-x-auto px-4">
        {visibleTabs.map(tab => (
          <button
            key={tab.value}
            onClick={() => handleTabChange(tab.value)}
            className={cn(
              'px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-colors',
              'border-b-2 -mb-px',
              activeTab === tab.value
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 內容區 */}
      <div className="flex-1 overflow-auto p-4">
        <TourTabContent tour={tour} activeTab={activeTab} onAddRequest={onAddRequest} />
      </div>
    </div>
  )
}
