'use client'

import { useState, useCallback } from 'react'
import { ParticipantCounts, SellingPrices } from '@/app/(main)/tours/_quotes/_types'

interface UseQuotationPreviewReturn {
  showQuotationPreview: boolean
  previewParticipantCounts: ParticipantCounts | null
  previewSellingPrices: SellingPrices | null
  previewTierLabel: string | undefined
  previewTierPricings: Array<{ participant_count: number; selling_prices: SellingPrices }>
  handleGenerateQuotation: (
    tierParticipantCounts?: ParticipantCounts,
    tierSellingPrices?: SellingPrices,
    tierLabel?: string,
    allTierPricings?: Array<{ participant_count: number; selling_prices: SellingPrices }>
  ) => void
  handlePrint: () => void
  handleClosePreview: () => void
}

export function useQuotationPreview(): UseQuotationPreviewReturn {
  const [showQuotationPreview, setShowQuotationPreview] = useState(false)
  const [previewParticipantCounts, setPreviewParticipantCounts] =
    useState<ParticipantCounts | null>(null)
  const [previewSellingPrices, setPreviewSellingPrices] = useState<SellingPrices | null>(null)
  const [previewTierLabel, setPreviewTierLabel] = useState<string | undefined>(undefined)
  const [previewTierPricings, setPreviewTierPricings] = useState<
    Array<{ participant_count: number; selling_prices: SellingPrices }>
  >([])

  const handleGenerateQuotation = useCallback(
    (
      tierParticipantCounts?: ParticipantCounts,
      tierSellingPrices?: SellingPrices,
      tierLabel?: string,
      allTierPricings?: Array<{ participant_count: number; selling_prices: SellingPrices }>
    ) => {
      setPreviewParticipantCounts(tierParticipantCounts || null)
      setPreviewSellingPrices(tierSellingPrices || null)
      setPreviewTierLabel(tierLabel)
      setPreviewTierPricings(allTierPricings || [])
      setShowQuotationPreview(true)
    },
    []
  )

  const handlePrint = useCallback(() => {
    window.print()
  }, [])

  const handleClosePreview = useCallback(() => {
    setShowQuotationPreview(false)
  }, [])

  return {
    showQuotationPreview,
    previewParticipantCounts,
    previewSellingPrices,
    previewTierLabel,
    previewTierPricings,
    handleGenerateQuotation,
    handlePrint,
    handleClosePreview,
  }
}
