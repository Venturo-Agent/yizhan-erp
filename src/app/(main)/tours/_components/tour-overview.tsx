'use client'

import React from 'react'
import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { useMemo } from 'react'
import { Tour } from '@/stores/types'
import { useOrdersSlim, useMembers, useTourPL } from '@/data'
import { useTourDisplay } from '@/app/(main)/tours/_utils/tour-display'
import { formatCurrency } from '@/lib/utils/format-currency'
import {
  Calendar,
  MapPin,
  DollarSign,
  Users,
  FileText,
  Wallet,
  HandCoins,
} from 'lucide-react'
import { getTourStatusLabel } from '@/lib/constants/status-maps'
import { StatusBadge, type StatusTone } from '@/components/ui/status-badge'

const COMPONENT_LABELS = {
  TOTAL_EXPENSE: '總支出',
  TOTAL_ORDERS: '總訂單數',
} as const

interface TourOverviewProps {
  tour: Tour
  orderFilter?: string // 選填：顯示特定訂單的總覽信息
  onEdit?: () => void // 選填：編輯基本資料的回調
  onManageQuote?: () => void // 選填：管理報價單的回調
  onManageItinerary?: () => void // 選填：管理行程表的回調
  onArchive?: () => void // 選填：封存的回調
}

export const TourOverview = React.memo(function TourOverview({
  tour,
  orderFilter,
  onEdit: _onEdit,
  onManageQuote: _onManageQuote,
  onManageItinerary: _onManageItinerary,
  onArchive: _onArchive,
}: TourOverviewProps) {
  const t = useTranslations('tour')
  const _router = useRouter()
  const { items: orders } = useOrdersSlim({ all: true })
  const { items: allMembers } = useMembers({ all: true })
  const { displayString: tourDestinationDisplay } = useTourDisplay(tour)

  // 訂單與團員計算
  const orderIds = useMemo(
    () => new Set((orders ?? []).filter(o => o.tour_id === tour.id).map(o => o.id)),
    [orders, tour.id]
  )
  const memberCount = useMemo(
    () => (allMembers ?? []).filter(m => m.order_id && orderIds.has(m.order_id)).length,
    [allMembers, orderIds]
  )

  // P&L 數字用 RPC、一次 SQL aggregate（避免 client-side 分別撈 receipts / payment_requests 再 sum）
  const { data: plData } = useTourPL(tour.id)
  const estimatedIncome = plData?.estimated_revenue ?? 0
  const confirmedIncome = plData?.confirmed_revenue ?? 0
  const totalExpense = plData?.cost ?? 0
  const confirmedProfit = plData?.gross_profit ?? 0
  const estimatedProfit = plData?.estimated_profit ?? 0

  // 如果有 orderFilter、取得該訂單的資料
  const order = orderFilter ? orders.find(o => o.id === orderFilter) : null

  // 根據是否為訂單視圖，顯示不同的卡片資料
  const _overviewCards: Array<{
    title: string
    value?: string
    amount?: number
    icon: typeof DollarSign
    color: string
  }> = order
    ? [
        {
          title: t('overviewOrderAmount'),
          amount: order.total_amount ?? 0,
          icon: DollarSign,
          color: 'text-morandi-gold',
        },
        {
          title: t('overviewPaidAmount'),
          amount: order.paid_amount ?? 0,
          icon: Wallet,
          color: 'text-morandi-green',
        },
        {
          title: t('overviewUnpaidAmount'),
          amount: order.remaining_amount ?? 0,
          icon: Wallet,
          color: 'text-morandi-red',
        },
        {
          title: t('overviewOrderCount'),
          value: `${order.member_count ?? 0} 人`,
          icon: Users,
          color: 'text-morandi-gold',
        },
        {
          title: t('overviewContactPerson'),
          value: order.contact_person || '-',
          icon: Users,
          color: 'text-morandi-primary',
        },
      ]
    : [
        {
          title: '總收入（預估／實收）',
          value: `${formatCurrency(estimatedIncome)} / ${formatCurrency(confirmedIncome)}`,
          icon: Wallet,
          color: 'text-morandi-green',
        },
        {
          title: t('overviewTotalExpense'),
          amount: totalExpense,
          icon: HandCoins,
          color: 'text-morandi-red',
        },
        {
          title: '總利潤（預估／實收）',
          value: `${formatCurrency(estimatedProfit)} / ${formatCurrency(confirmedProfit)}`,
          icon: DollarSign,
          color: confirmedProfit >= 0 ? 'text-morandi-green' : 'text-morandi-red',
        },
        {
          title: t('overviewTotalOrders'),
          value: `${orders.filter(o => o.tour_id === tour.id).length} 筆`,
          icon: FileText,
          color: 'text-morandi-gold',
        },
      ]

  const getStatusTone = (status: string | undefined): StatusTone => {
    const tones: Record<string, StatusTone> = {
      提案: 'pending',
      進行中: 'success',
      待結案: 'warning',
      結案: 'neutral',
    }
    return tones[status || ''] || 'neutral'
  }

  return (
    <div className="border border-border rounded-lg overflow-hidden bg-card">
      {/* 標題列：基本資訊 + 狀態 */}
      <div className="px-5 py-2.5 border-b border-border/60 bg-morandi-gold-header">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6 text-sm">
            <span className="text-sm font-semibold text-morandi-primary">{tour.code}</span>
            <div className="flex items-center gap-1.5 text-morandi-secondary">
              <MapPin size={14} />
              <span>{tourDestinationDisplay}</span>
            </div>
            <div className="flex items-center gap-1.5 text-morandi-secondary">
              <Calendar size={14} />
              <span>
                {tour.departure_date} ~ {tour.return_date}
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-morandi-secondary">
              <Users size={14} />
              <span>
                {memberCount} {t('overviewMemberCount')}
              </span>
            </div>
            <StatusBadge
              tone={getStatusTone(tour.status ?? '')}
              label={getTourStatusLabel(tour.status)}
            />
          </div>
        </div>
      </div>

      {/* 財務概況 — 與結案統一 */}
      <div className="px-5 py-3">
        <div className="flex items-stretch">
          <div className="flex-1 flex items-center gap-2.5 px-3">
            <Wallet size={16} className="text-morandi-green shrink-0" />
            <div className="min-w-0">
              <p className="text-[0.647rem] text-morandi-secondary leading-tight">
                {t('overviewTotalIncome')}
              </p>
              <p className="text-sm font-semibold text-morandi-primary">
                {formatCurrency(estimatedIncome)} / {formatCurrency(confirmedIncome)}
              </p>
            </div>
          </div>
          <div className="flex-1 flex items-center gap-2.5 px-3">
            <HandCoins size={16} className="text-morandi-red shrink-0" />
            <div className="min-w-0">
              <p className="text-[0.647rem] text-morandi-secondary leading-tight">
                {COMPONENT_LABELS.TOTAL_EXPENSE}
              </p>
              <p className="text-sm font-semibold text-morandi-primary">
                {formatCurrency(totalExpense)}
              </p>
            </div>
          </div>
          <div className="flex-1 flex items-center gap-2.5 px-3">
            <DollarSign
              size={16}
              className={`shrink-0 ${confirmedProfit >= 0 ? 'text-morandi-green' : 'text-morandi-red'}`}
            />
            <div className="min-w-0">
              <p className="text-[0.647rem] text-morandi-secondary leading-tight">
                {t('overviewTotalProfit')}
              </p>
              <p className="text-sm font-semibold text-morandi-primary">
                {formatCurrency(estimatedProfit)} / {formatCurrency(confirmedProfit)}
              </p>
            </div>
          </div>
          <div className="flex-1 flex items-center gap-2.5 px-3">
            <FileText size={16} className="text-morandi-gold shrink-0" />
            <div className="min-w-0">
              <p className="text-[0.647rem] text-morandi-secondary leading-tight">
                {COMPONENT_LABELS.TOTAL_ORDERS}
              </p>
              <p className="text-sm font-semibold text-morandi-primary">
                {orders.filter(o => o.tour_id === tour.id).length} {t('overviewOrderUnit')}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
})
