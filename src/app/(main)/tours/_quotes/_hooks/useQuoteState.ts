'use client'

/**
 * useQuoteState
 * 報價單核心狀態管理（categories / participantCounts / sellingPrices / tierPricings / insurance）
 * 包含初始化 useEffect（從 quote + coreItems + fullTour 同步資料）
 */

import { useState, useEffect, useMemo, useCallback } from 'react'
import {
  ParticipantCounts,
  SellingPrices,
  CostCategory,
  CostItem,
  TierPricing,
  costCategories,
} from '@/app/(main)/tours/_quotes/_types'
import { coreItemsToCostCategories } from '@/app/(main)/tours/_quotes/_utils/core-table-adapter'
import type { TourItineraryItem } from '@/app/(main)/tours/_types/tour-itinerary-item.types'

// 只取 useQuoteState 需要的 quote 欄位
interface QuoteRef {
  tour_id?: string | null
  categories?: { id: string; name: string; items: CostItem[]; hiddenItems?: CostItem[] }[] | null
  accommodation_days?: number | null
  participant_counts?: unknown
  group_size?: number | null
  name?: string | null
  selling_prices?: unknown
  tier_pricings?: unknown[] | null
}

interface UseQuoteStateOptions {
  quote: QuoteRef | null | undefined
  coreItems: TourItineraryItem[]
  coreItemsLoading: boolean
  fullTour:
    | { liability_insurance_coverage?: number | null; medical_insurance_coverage?: number | null }
    | null
    | undefined
}

interface UseQuoteStateReturn {
  categories: CostCategory[]
  setCategories: React.Dispatch<React.SetStateAction<CostCategory[]>>
  accommodationDays: number
  setAccommodationDays: React.Dispatch<React.SetStateAction<number>>
  participantCounts: ParticipantCounts
  setParticipantCounts: React.Dispatch<React.SetStateAction<ParticipantCounts>>
  quoteName: string
  setSaveSuccess: React.Dispatch<React.SetStateAction<boolean>>
  sellingPrices: SellingPrices
  setSellingPrices: React.Dispatch<React.SetStateAction<SellingPrices>>
  tierPricings: TierPricing[]
  setTierPricings: React.Dispatch<React.SetStateAction<TierPricing[]>>
  liabilityInsurance: number | null
  medicalInsurance: number | null
  insuranceText: string
  handleInsuranceChange: (text: string) => void
  hasLoaded: boolean
  groupSize: number
  groupSizeForGuide: number
  totalParticipants: number
}

export function useQuoteState({
  quote,
  coreItems,
  coreItemsLoading,
  fullTour,
}: UseQuoteStateOptions): UseQuoteStateReturn {
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
  const [hasLoaded, setHasLoaded] = useState(false)

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

  // 初始化資料：categories 從核心表讀取，定價 SSOT 從 quote 讀取（docs/QUOTES_SSOT.md）
  useEffect(() => {
    if (quote && !hasLoaded) {
      // 有 tour_id 時，等核心表載入完成再決定資料來源（避免 race condition）
      if (quote.tour_id && coreItemsLoading) return

      // categories 優先從核心表讀取
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

      // 定價欄位 SSOT 在 quotes 表
      setAccommodationDays(quote.accommodation_days ?? 0)
      setParticipantCounts(
        (quote.participant_counts as ParticipantCounts) || {
          adult: (quote.group_size as number) || 20,
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
      // 保險金額從 tour 讀（null = 未設定、不 fallback 預設）
      setLiabilityInsurance(fullTour?.liability_insurance_coverage ?? null)
      setMedicalInsurance(fullTour?.medical_insurance_coverage ?? null)
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

  const totalParticipants = useMemo(
    () =>
      (participantCounts.adult || 0) +
      (participantCounts.child_with_bed || 0) +
      (participantCounts.child_no_bed || 0) +
      (participantCounts.single_room || 0),
    [participantCounts]
  )

  return {
    categories,
    setCategories,
    accommodationDays,
    setAccommodationDays,
    participantCounts,
    setParticipantCounts,
    quoteName,
    setSaveSuccess,
    sellingPrices,
    setSellingPrices,
    tierPricings,
    setTierPricings,
    liabilityInsurance,
    medicalInsurance,
    insuranceText,
    handleInsuranceChange,
    hasLoaded,
    groupSize,
    groupSizeForGuide,
    totalParticipants,
  }
}
