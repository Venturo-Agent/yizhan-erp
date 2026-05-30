'use client'

import { useRouter } from 'next/navigation'
import { CostCategory, ParticipantCounts, SellingPrices, TierPricing } from '../_types'
import type { Quote, Tour } from '@/stores/types'
import type { CreateInput } from '@/stores/core/types'
import type { QuickQuoteItem } from '@/types/quote.types'
import type { TourItineraryItem } from '@/app/(main)/tours/_types/tour-itinerary-item.types'
import { useQuoteSave } from './useQuoteSave'
import { useQuoteTour } from './useQuoteTour'
import { useQuoteGroupCostUpdate } from './useQuoteGroupCostUpdate'

interface QuickQuoteCustomerInfo {
  customer_name: string
  contact_phone: string
  contact_address: string
  tour_code: string
  handler_name: string
  issue_date: string
  received_amount: number
  expense_description: string
}

interface UseQuoteActionsProps {
  quote: Quote | null | undefined
  updateQuote: (id: string, data: Partial<Quote>) => void
  addTour: (data: CreateInput<Tour>) => Promise<Tour | undefined>
  router: ReturnType<typeof useRouter>
  updatedCategories: CostCategory[]
  total_cost: number
  groupSize: number
  groupSizeForGuide: number
  quoteName: string
  accommodationDays: number
  participantCounts: ParticipantCounts
  sellingPrices: SellingPrices
  setSaveSuccess: (value: boolean) => void
  setCategories: React.Dispatch<React.SetStateAction<CostCategory[]>>
  // 快速報價單相關
  quickQuoteItems?: QuickQuoteItem[]
  quickQuoteCustomerInfo?: QuickQuoteCustomerInfo
  // 檻次表相關
  tierPricings?: TierPricing[]
  // 保險金額（tours 表，單位：萬元）
  liabilityInsurance?: number | null
  medicalInsurance?: number | null
  // 核心表相關
  coreItems?: TourItineraryItem[]
  refreshCoreItems?: () => Promise<TourItineraryItem[] | undefined>
}

export const useQuoteActions = ({
  quote,
  updateQuote,
  addTour,
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
  quickQuoteItems,
  quickQuoteCustomerInfo,
  tierPricings,
  liabilityInsurance,
  medicalInsurance,
  coreItems,
  refreshCoreItems,
}: UseQuoteActionsProps) => {
  // 使用分離的 hooks
  const { handleSave } = useQuoteSave({
    quote,
    updateQuote,
    updatedCategories,
    total_cost,
    groupSize,
    quoteName,
    accommodationDays,
    participantCounts,
    sellingPrices,
    setSaveSuccess,
    setCategories,
    quickQuoteItems,
    quickQuoteCustomerInfo,
    tierPricings,
    liabilityInsurance,
    medicalInsurance,
    coreItems,
    refreshCoreItems,
  })

  const { handleCreateTour } = useQuoteTour({
    quote,
    updateQuote,
    addTour,
    router,
    updatedCategories,
    total_cost,
    groupSize,
    quoteName,
    accommodationDays,
    participantCounts,
    sellingPrices,
  })

  // 團體成本自動更新
  useQuoteGroupCostUpdate({
    groupSize,
    groupSizeForGuide,
    setCategories,
  })

  return {
    handleSave,
    handleCreateTour,
  }
}
