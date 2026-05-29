'use client'

/**
 * QuoteDetailEmbed - 可嵌入的報價單詳情元件
 *
 * 用於：
 * 1. 報價單頁面 /quotes/[id]
 * 2. 旅遊團報價單分頁
 *
 * 接收 quoteId 作為 prop，而不是從 URL 讀取
 */

import React, { useEffect, useCallback, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import {
  ParticipantCounts,
  SellingPrices,
  CostCategory,
  CostItem,
} from '@/app/(main)/orders/_quotes/_types'
import type { Tour } from '@/types/tour.types'
import { useQuotes } from '@/app/(main)/orders/_quotes/_hooks/useQuotes'
import { useQuote as useQuoteDetail, useTour } from '@/data'
import { useCategoryOperations } from '@/app/(main)/orders/_quotes/_hooks/useCategoryOperations'
import { useQuoteCalculations } from '@/app/(main)/orders/_quotes/_hooks/useQuoteCalculations'
import { useQuoteActions } from '@/app/(main)/orders/_quotes/_hooks/useQuoteActions'
import { useToursSlim, useItineraries, createTour } from '@/data'
import { useTourItineraryItemsByTour } from '@/app/(main)/tours/_hooks/useTourItineraryItems'
import { coreItemsToCostCategories } from '@/app/(main)/orders/_quotes/_utils/core-table-adapter'
import { useAuthStore } from '@/stores'
import { toast } from 'sonner'
import { SellingPriceSection } from '@/app/(main)/orders/_quotes/_components'
import type { LocalTier } from '@/app/(main)/orders/_quotes/_components/LocalPricingDialog'
import type { MealDiff } from '@/app/(main)/orders/_quotes/_components'
import type { CreateInput } from '@/stores/types'
import { EditingWarningBanner } from '@/components/EditingWarningBanner'
import { costCategories, TierPricing } from '@/app/(main)/orders/_quotes/_types'
import { useTranslations } from 'next-intl'
import { Spinner } from '@/components/ui/spinner'
import { QuoteActionsPortal } from './QuoteActionsPortal'
import { QuoteCostTable } from './QuoteCostTable'
import { QuoteDialogs } from './QuoteDialogs'
import { useQuotationPreview } from '@/app/(main)/orders/_quotes/_hooks/useQuotationPreview'
import { useLocalPricing } from '@/app/(main)/orders/_quotes/_hooks/useLocalPricing'
import { useQuoteVisibility } from '@/app/(main)/orders/_quotes/_hooks/useQuoteVisibility'

interface QuoteDetailEmbedProps {
  quoteId: string
  /** 是否顯示 header（在分頁模式下可能要隱藏） */
  showHeader?: boolean
  /** Portal 目標：actions 透過 React Portal 渲染到此容器（讓 actions 跟版本 tabs 同列） */
  actionsContainer?: HTMLElement | null
}

export function QuoteDetailEmbed({
  quoteId,
  showHeader = true,
  actionsContainer,
}: QuoteDetailEmbedProps) {
  const t = useTranslations('orders')
  const router = useRouter()
  const { updateQuote } = useQuotes()
  const { item: quote, loading: quoteLoading } = useQuoteDetail(quoteId)
  const { items: tours } = useToursSlim({ all: true })
  const { items: itineraries } = useItineraries({ all: true })
  const { user: _user } = useAuthStore()

  // 完整 tour（含定價欄位）
  const { item: fullTour } = useTour(quote?.tour_id ?? null)

  // 核心表資料
  const {
    items: coreItems,
    loading: coreItemsLoading,
    refresh: refreshCoreItems,
  } = useTourItineraryItemsByTour(quote?.tour_id ?? null)

  // 行程資料（用於列印報價單）
  const itinerary = useMemo(() => {
    if (!quote?.tour_id) return null
    return itineraries.find(i => i.tour_id === quote.tour_id) || null
  }, [itineraries, quote?.tour_id])

  // 關聯旅遊團（取出發日用）
  const relatedTour = quote?.tour_id ? tours.find(tour => tour.id === quote.tour_id) : null

  // 定案後鎖定編輯（業務確認、客戶確認、已成交）
  const isConfirmed =
    quote?.confirmation_status === 'staff_confirmed' ||
    quote?.confirmation_status === 'customer_confirmed' ||
    quote?.confirmation_status === 'closed'
  const isReadOnly = isConfirmed

  // 報價單核心狀態（categories / participantCounts / sellingPrices / tierPricings / insurance）
  const [categories, setCategories] = useState<CostCategory[]>([])
  const [accommodationDays, setAccommodationDays] = useState(0)
  const [participantCounts, setParticipantCounts] = useState<ParticipantCounts>({
    adult: 0,
    child_with_bed: 0,
    child_no_bed: 0,
    single_room: 0,
    infant: 0,
  })
  const [quoteName, setQuoteName] = useState('')
  const [_saveSuccess, setSaveSuccess] = useState(false)
  const [sellingPrices, setSellingPrices] = useState<SellingPrices>({
    adult: 0,
    child_with_bed: 0,
    child_no_bed: 0,
    single_room: 0,
    infant: 0,
  })
  const [tierPricings, setTierPricings] = useState<TierPricing[]>([])
  // 保險金額 SSOT 在 tours 表（單位：萬元），docs/QUOTES_SSOT.md
  const [liabilityInsurance, setLiabilityInsurance] = useState<number | null>(null)
  const [medicalInsurance, setMedicalInsurance] = useState<number | null>(null)
  const insuranceText = useMemo(
    () =>
      liabilityInsurance != null && medicalInsurance != null
        ? `${liabilityInsurance}萬旅責險+${medicalInsurance}萬意外醫療`
        : '',
    [liabilityInsurance, medicalInsurance]
  )
  const handleInsuranceChange = useCallback((text: string) => {
    const m = text.match(/^(\d+)萬旅責險\+(\d+)萬意外醫療$/)
    setLiabilityInsurance(m ? Number(m[1]) : null)
    setMedicalInsurance(m ? Number(m[2]) : null)
  }, [])
  const [hasLoaded, setHasLoaded] = useState(false)

  // 初始化資料：categories 從核心表讀取，定價 SSOT 從 quote 讀取（docs/QUOTES_SSOT.md）
  useEffect(() => {
    if (quote && !hasLoaded) {
      if (quote.tour_id && coreItemsLoading) return
      if (coreItems.length > 0) {
        setCategories(coreItemsToCostCategories(coreItems))
      } else if (quote.categories && quote.categories.length > 0) {
        setCategories(
          quote.categories.map(cat => ({
            ...cat,
            total: cat.items.reduce((sum: number, item: CostItem) => sum + (item.total || 0), 0),
          }))
        )
      } else {
        setCategories(costCategories)
      }
      setAccommodationDays(quote.accommodation_days ?? 0)
      setParticipantCounts(
        (quote.participant_counts as ParticipantCounts) || {
          adult: quote.group_size || 20,
          child_with_bed: 0,
          child_no_bed: 0,
          single_room: 0,
          infant: 0,
        }
      )
      setQuoteName(quote.name || '')
      setSellingPrices(
        (quote.selling_prices as SellingPrices) || {
          adult: 0,
          child_with_bed: 0,
          child_no_bed: 0,
          single_room: 0,
          infant: 0,
        }
      )
      setTierPricings((quote.tier_pricings ?? []) as TierPricing[])
      // 保險金額從 tour 讀（null = 未設定）
      setLiabilityInsurance(
        (fullTour as { liability_insurance_coverage?: number | null } | undefined)
          ?.liability_insurance_coverage ?? null
      )
      setMedicalInsurance(
        (fullTour as { medical_insurance_coverage?: number | null } | undefined)
          ?.medical_insurance_coverage ?? null
      )
      setHasLoaded(true)
    }
  }, [quote, hasLoaded, fullTour, coreItems, coreItemsLoading])

  const groupSize = useMemo(
    () =>
      (participantCounts.adult || 0) +
      (participantCounts.child_with_bed || 0) +
      (participantCounts.child_no_bed || 0) +
      (participantCounts.single_room || 0),
    [participantCounts]
  )
  const groupSizeForGuide = useMemo(
    () => groupSize + (participantCounts.infant || 0),
    [groupSize, participantCounts.infant]
  )
  const totalParticipants = groupSize

  // Category operations hook
  const categoryOps = useCategoryOperations({
    categories,
    setCategories,
    accommodationDays,
    setAccommodationDays,
    groupSize,
    groupSizeForGuide,
  })

  // 切換項目在報價單/需求單的顯示狀態
  const { handleToggleVisibility } = useQuoteVisibility({
    categories,
    setCategories,
    refreshCoreItems,
  })

  // Calculations hook
  const calculations = useQuoteCalculations({ categories, participantCounts, sellingPrices })
  const {
    accommodationSummary,
    accommodationTotal,
    updatedCategories,
    identityCosts,
    identityProfits,
    total_cost,
  } = calculations

  // Actions hook
  const actions = useQuoteActions({
    quote: quote || null,
    updateQuote,
    addTour: createTour as unknown as (data: CreateInput<Tour>) => Promise<Tour | undefined>,
    router,
    updatedCategories,
    total_cost,
    groupSize,
    groupSizeForGuide,
    quoteName,
    accommodationDays,
    participantCounts,
    sellingPrices,
    setSaveSuccess,
    setCategories,
    tierPricings,
    liabilityInsurance,
    medicalInsurance,
    coreItems,
    refreshCoreItems,
  })
  const { handleSave, handleCreateTour } = actions

  // 列印預覽狀態（hook 統一管理）
  const {
    showQuotationPreview,
    previewParticipantCounts,
    previewSellingPrices,
    previewTierLabel,
    previewTierPricings,
    handleGenerateQuotation,
    handlePrint,
    handleClosePreview,
  } = useQuotationPreview()

  // 同步到行程表 - 狀態
  const [isSyncDialogOpen, setIsSyncDialogOpen] = useState(false)
  const [syncDiffs, _setSyncDiffs] = useState<MealDiff[]>([])
  const [syncItineraryTitle, _setSyncItineraryTitle] = useState<string>('')

  // 對話框狀態
  const [showLinkTourDialog, setShowLinkTourDialog] = useState(false)
  const [excludedItems, setExcludedItems] = useState<string[]>([
    '個人護照費用',
    '行程外之自費行程',
    '個人消費及小費',
    '行李超重費用',
    '單人房差價',
  ])

  // Local 報價（檻次管理 + 還原 + 對話框）
  const {
    localTiers,
    showLocalPricingDialog,
    openLocalPricingDialog,
    closeLocalPricingDialog,
    handleLocalPricingConfirm,
  } = useLocalPricing({
    categories,
    setCategories,
    participantCounts,
    setParticipantCounts,
    sellingPrices,
    setTierPricings,
    totalParticipants,
  })

  // 處理狀態變更
  const _handleStatusChange = useCallback(
    (status: 'proposed' | 'approved', showLinkDialog?: boolean) => {
      if (!quote) return
      if (status === 'approved' && showLinkDialog) setShowLinkTourDialog(true)
      else updateQuote(quote.id, { status })
    },
    [quote, updateQuote]
  )

  // Loading state
  if (quoteLoading || !hasLoaded || !quote) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <div className="text-center">
          <Spinner size="lg" className="text-morandi-gold mx-auto mb-4" />
          <p className="text-morandi-secondary">{t('quoteDetailEmbedLoading')}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full max-w-full space-y-6 pb-6">
      <EditingWarningBanner
        resourceType="quote"
        resourceId={quote.id}
        resourceName={t('quoteDetailEmbedThisQuote')}
      />

      {/* 主操作 toolbar — 透過 React Portal 傳送到版本 tabs row 右側 */}
      {showHeader && quote && actionsContainer && (
        <QuoteActionsPortal
          actionsContainer={actionsContainer}
          isReadOnly={isReadOnly}
          sellingPrices={sellingPrices}
          tierPricings={tierPricings}
          onAddTierPricing={tier => setTierPricings(prev => [...prev, tier])}
          onSave={() => {
            handleSave()
            toast.success('已儲存')
          }}
          onGenerateQuotation={handleGenerateQuotation}
        />
      )}

      <div className="w-full pb-6">
        <div className="flex flex-col gap-6 w-full">
          {/* 上方：成本計算表格 */}
          <QuoteCostTable
            categories={categories}
            accommodationTotal={accommodationTotal}
            accommodationDays={accommodationDays}
            isReadOnly={isReadOnly}
            categoryOps={categoryOps}
            onToggleVisibility={handleToggleVisibility}
            onOpenLocalPricingDialog={openLocalPricingDialog}
          />

          {/* 下方：報價設定 */}
          <SellingPriceSection
            participantCounts={participantCounts}
            setParticipantCounts={setParticipantCounts}
            identityCosts={identityCosts}
            sellingPrices={sellingPrices}
            setSellingPrices={setSellingPrices}
            identityProfits={identityProfits}
            isReadOnly={isReadOnly}
            handleSave={handleSave}
            handleGenerateQuotation={handleGenerateQuotation}
            accommodationSummary={accommodationSummary}
            categories={categories}
            tierPricings={tierPricings}
            setTierPricings={setTierPricings}
            localTiers={localTiers}
            excludedItems={excludedItems}
            onExcludedItemsChange={setExcludedItems}
            insuranceText={insuranceText}
            onInsuranceChange={handleInsuranceChange}
          />
        </div>
      </div>

      {/* Dialogs */}
      <QuoteDialogs
        quote={quote}
        updateQuote={updateQuote as (id: string, data: Record<string, unknown>) => Promise<unknown>}
        isSyncDialogOpen={isSyncDialogOpen}
        syncDiffs={syncDiffs}
        syncItineraryTitle={syncItineraryTitle}
        onCloseSyncDialog={() => setIsSyncDialogOpen(false)}
        showQuotationPreview={showQuotationPreview}
        quoteName={quoteName}
        previewParticipantCounts={previewParticipantCounts}
        previewSellingPrices={previewSellingPrices}
        previewTierLabel={previewTierLabel}
        previewTierPricings={previewTierPricings}
        updatedCategories={updatedCategories}
        total_cost={total_cost}
        accommodationSummary={accommodationSummary}
        participantCounts={participantCounts}
        sellingPrices={sellingPrices}
        itinerary={itinerary}
        departureDate={relatedTour?.departure_date || null}
        excludedItems={excludedItems}
        insuranceText={insuranceText}
        onCloseQuotationPreview={handleClosePreview}
        onPrint={handlePrint}
        onExcludedItemsChange={setExcludedItems}
        showLinkTourDialog={showLinkTourDialog}
        onCloseLinkTourDialog={() => setShowLinkTourDialog(false)}
        handleCreateTour={handleCreateTour}
        showLocalPricingDialog={showLocalPricingDialog}
        totalParticipants={totalParticipants}
        localTiers={localTiers}
        onCloseLocalPricingDialog={closeLocalPricingDialog}
        onLocalPricingConfirm={handleLocalPricingConfirm}
      />
    </div>
  )
}
