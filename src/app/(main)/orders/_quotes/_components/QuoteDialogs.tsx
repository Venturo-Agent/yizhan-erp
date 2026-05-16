'use client'

/**
 * QuoteDialogs
 * 報價單所有 Dialog 集中管理
 * - SyncToItineraryDialog（同步到行程）
 * - PrintableQuotation（列印預覽）
 * - LinkTourDialog（關聯旅遊團）
 * - LocalPricingDialog（Local 報價）
 */

import React from 'react'
import { toast } from 'sonner'
import {
  SyncToItineraryDialog,
  PrintableQuotation,
  LinkTourDialog,
  LocalPricingDialog,
} from '@/app/(main)/orders/_quotes/_components'
import type { LocalTier } from '@/app/(main)/orders/_quotes/_components/LocalPricingDialog'
import type { MealDiff } from '@/app/(main)/orders/_quotes/_components'
import { ParticipantCounts, SellingPrices, CostCategory } from '@/app/(main)/orders/_quotes/_types'

// 只取 QuoteDialogs 需要的 quote 欄位
interface QuoteRef {
  id: string
  status?: string
  tour_id?: string | null
}

interface QuoteDialogsProps {
  quote: QuoteRef
  updateQuote: (id: string, data: Record<string, unknown>) => Promise<unknown>
  // SyncToItinerary
  isSyncDialogOpen: boolean
  syncDiffs: MealDiff[]
  syncItineraryTitle: string
  onCloseSyncDialog: () => void
  // PrintableQuotation
  showQuotationPreview: boolean
  quoteName: string
  previewParticipantCounts: ParticipantCounts | null
  previewSellingPrices: SellingPrices | null
  previewTierLabel: string | undefined
  previewTierPricings: Array<{ participant_count: number; selling_prices: SellingPrices }>
  updatedCategories: CostCategory[]
  total_cost: number
  accommodationSummary: unknown[]
  participantCounts: ParticipantCounts
  sellingPrices: SellingPrices
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  itinerary: any | null
  departureDate: string | null
  excludedItems: string[]
  insuranceText: string
  onCloseQuotationPreview: () => void
  onPrint: () => void
  onExcludedItemsChange: (items: string[]) => void
  // LinkTourDialog
  showLinkTourDialog: boolean
  onCloseLinkTourDialog: () => void
  handleCreateTour: () => void
  // LocalPricingDialog
  showLocalPricingDialog: boolean
  totalParticipants: number
  localTiers: LocalTier[]
  onCloseLocalPricingDialog: () => void
  onLocalPricingConfirm: (tiers: LocalTier[], matchedTierIndex: number) => void
}

export function QuoteDialogs({
  quote,
  updateQuote,
  isSyncDialogOpen,
  syncDiffs,
  syncItineraryTitle,
  onCloseSyncDialog,
  showQuotationPreview,
  quoteName,
  previewParticipantCounts,
  previewSellingPrices,
  previewTierLabel,
  previewTierPricings,
  updatedCategories,
  total_cost,
  accommodationSummary,
  participantCounts,
  sellingPrices,
  itinerary,
  departureDate,
  excludedItems,
  insuranceText,
  onCloseQuotationPreview,
  onPrint,
  onExcludedItemsChange,
  showLinkTourDialog,
  onCloseLinkTourDialog,
  handleCreateTour,
  showLocalPricingDialog,
  totalParticipants,
  localTiers,
  onCloseLocalPricingDialog,
  onLocalPricingConfirm,
}: QuoteDialogsProps) {
  return (
    <>
      <SyncToItineraryDialog
        isOpen={isSyncDialogOpen}
        onClose={onCloseSyncDialog}
        onConfirm={() => {}}
        diffs={syncDiffs}
        itineraryTitle={syncItineraryTitle}
      />

      <PrintableQuotation
        quote={quote as unknown as Parameters<typeof PrintableQuotation>[0]['quote']}
        quoteName={quoteName}
        participantCounts={previewParticipantCounts || participantCounts}
        sellingPrices={previewSellingPrices || sellingPrices}
        categories={updatedCategories}
        totalCost={total_cost}
        isOpen={showQuotationPreview}
        onClose={onCloseQuotationPreview}
        onPrint={onPrint}
        accommodationSummary={accommodationSummary}
        tierLabel={previewTierLabel}
        tierPricings={previewTierPricings}
        itinerary={itinerary}
        departureDate={departureDate}
        excludedItems={excludedItems}
        insuranceText={insuranceText}
      />

      <LinkTourDialog
        isOpen={showLinkTourDialog}
        onClose={onCloseLinkTourDialog}
        onCreateNew={() => {
          if (quote) {
            updateQuote(quote.id, { status: '待出發' })
            handleCreateTour()
          }
        }}
        onLinkExisting={async tour => {
          if (quote) {
            await updateQuote(quote.id, { status: '待出發', tour_id: tour.id })
            const { updateTour } = await import('@/data')
            await updateTour(tour.id, { quote_id: quote.id })
            toast.success(`已關聯旅遊團：${tour.code}`)
          }
        }}
      />

      <LocalPricingDialog
        isOpen={showLocalPricingDialog}
        onClose={onCloseLocalPricingDialog}
        totalParticipants={totalParticipants}
        onConfirm={onLocalPricingConfirm}
        initialTiers={localTiers}
      />
    </>
  )
}
