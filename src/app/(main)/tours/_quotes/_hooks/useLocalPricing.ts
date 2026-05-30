'use client'

/**
 * useLocalPricing
 * Local 報價檻次管理（還原、確認、同步到 categories + tierPricings）
 */

import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import {
  ParticipantCounts,
  SellingPrices,
  CostCategory,
  CostItem,
  TierPricing,
} from '@/app/(main)/tours/_quotes/_types'
import type { LocalTier } from '@/app/(main)/tours/_quotes/_components/LocalPricingDialog'
import {
  calculateTierParticipantCounts,
  calculateTierCosts,
  calculateIdentityProfits,
  generateUniqueId,
} from '@/app/(main)/tours/_quotes/_utils/priceCalculations'

interface UseLocalPricingOptions {
  categories: CostCategory[]
  setCategories: React.Dispatch<React.SetStateAction<CostCategory[]>>
  participantCounts: ParticipantCounts
  setParticipantCounts: React.Dispatch<React.SetStateAction<ParticipantCounts>>
  sellingPrices: SellingPrices
  setTierPricings: React.Dispatch<React.SetStateAction<TierPricing[]>>
  totalParticipants: number
}

interface UseLocalPricingReturn {
  localTiers: LocalTier[]
  showLocalPricingDialog: boolean
  openLocalPricingDialog: () => void
  closeLocalPricingDialog: () => void
  handleLocalPricingConfirm: (tiers: LocalTier[], matchedTierIndex: number) => void
}

export function useLocalPricing({
  categories,
  setCategories,
  participantCounts,
  setParticipantCounts,
  sellingPrices,
  setTierPricings,
  totalParticipants,
}: UseLocalPricingOptions): UseLocalPricingReturn {
  const [localTiers, setLocalTiers] = useState<LocalTier[]>([])
  const [showLocalPricingDialog, setShowLocalPricingDialog] = useState(false)

  // 從 categories 還原 Local 檻次（用於對話框顯示）
  useEffect(() => {
    const groupTransportCategory = categories.find(cat => cat.id === 'group-transport')
    if (groupTransportCategory) {
      const localItems = groupTransportCategory.items.filter(item =>
        item.name.startsWith('Local 報價')
      )
      if (localItems.length > 0) {
        setLocalTiers(
          localItems.map(item => {
            const match = item.name.match(/\((\d+)人\)/)
            return {
              id: item.id,
              participants: match ? parseInt(match[1]) : 0,
              unitPrice: item.unit_price || 0,
            }
          })
        )
      }
    }
  }, [categories])

  const handleLocalPricingConfirm = useCallback(
    (tiers: LocalTier[], _matchedTierIndex: number) => {
      setLocalTiers(tiers)
      if (tiers.length > 0 && tiers[0].participants > 0) {
        setParticipantCounts({
          adult: tiers[0].participants,
          child_with_bed: 0,
          child_no_bed: 0,
          single_room: 0,
          infant: 0,
        })
      }
      const sortedTiers = [...tiers].sort((a, b) => a.participants - b.participants)
      let currentTierIdx = 0
      for (let i = 0; i < sortedTiers.length; i++) {
        if (sortedTiers[i].participants <= totalParticipants) currentTierIdx = i
      }
      const _currentLocalPrice = sortedTiers[currentTierIdx]?.unitPrice || 0
      const newTierPricings = sortedTiers.map(tier => {
        const newCounts = calculateTierParticipantCounts(tier.participants, participantCounts)
        const baseCosts = calculateTierCosts(categories, newCounts, participantCounts)
        const newCosts = {
          adult: baseCosts.adult + tier.unitPrice,
          child_with_bed: baseCosts.child_with_bed + tier.unitPrice,
          child_no_bed: baseCosts.child_no_bed + tier.unitPrice,
          single_room: baseCosts.single_room + tier.unitPrice,
          infant: baseCosts.infant,
        }
        return {
          id: generateUniqueId(),
          participant_count: tier.participants,
          participant_counts: newCounts,
          identity_costs: newCosts,
          selling_prices: { ...sellingPrices },
          identity_profits: calculateIdentityProfits(sellingPrices, newCosts),
        }
      })
      setCategories(prev => {
        const newCategories = [...prev]
        const groupTransportCategory = newCategories.find(cat => cat.id === 'group-transport')
        if (groupTransportCategory) {
          groupTransportCategory.items = groupTransportCategory.items.filter(
            (item: CostItem) => !item.name.startsWith('Local 報價')
          )
          sortedTiers.forEach((tier, index) => {
            groupTransportCategory.items.push({
              id: `local-${tier.participants}-${Date.now()}-${index}`,
              name: `Local 報價 (${tier.participants}人)`,
              quantity: 1,
              unit_price: tier.unitPrice,
              total: 0,
              note: `$${tier.unitPrice.toLocaleString()}/人`,
            })
          })
        }
        return newCategories
      })
      setTierPricings(newTierPricings)
      toast.success(`Local 報價已套用，產生 ${newTierPricings.length} 個檻次`)
    },
    [
      totalParticipants,
      participantCounts,
      categories,
      sellingPrices,
      setParticipantCounts,
      setCategories,
      setTierPricings,
    ]
  )

  return {
    localTiers,
    showLocalPricingDialog,
    openLocalPricingDialog: () => setShowLocalPricingDialog(true),
    closeLocalPricingDialog: () => setShowLocalPricingDialog(false),
    handleLocalPricingConfirm,
  }
}
