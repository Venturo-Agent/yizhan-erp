'use client'

/**
 * QuoteActionsPortal
 * 透過 React Portal 把操作按鈕渲染到外部容器（版本 tabs 同列右側）
 */

import { createPortal } from 'react-dom'
import { CheckSquare, Printer, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { TierPricing, SellingPrices } from '@/app/(main)/tours/_quotes/_types'
import { generateUniqueId } from '@/app/(main)/tours/_quotes/_utils/priceCalculations'
import { useTranslations } from 'next-intl'

interface QuoteActionsPortalProps {
  actionsContainer: HTMLElement
  isReadOnly: boolean
  sellingPrices: SellingPrices
  tierPricings: TierPricing[]
  onAddTierPricing: (tier: TierPricing) => void
  onSave: () => void
  onGenerateQuotation: (
    tierParticipantCounts?: undefined,
    tierSellingPrices?: undefined,
    tierLabel?: undefined,
    allTierPricings?: Array<{ participant_count: number; selling_prices: SellingPrices }>
  ) => void
}

export function QuoteActionsPortal({
  actionsContainer,
  isReadOnly,
  sellingPrices,
  tierPricings,
  onAddTierPricing,
  onSave,
  onGenerateQuotation,
}: QuoteActionsPortalProps) {
  const t = useTranslations('orders')
  return createPortal(
    <>
      {!isReadOnly && (
        <Button
          onClick={() => {
            onAddTierPricing({
              id: generateUniqueId(),
              participant_count: 0,
              participant_counts: {
                adult: 0,
                child_with_bed: 0,
                child_no_bed: 0,
                single_room: 0,
                infant: 0,
              },
              identity_costs: {
                adult: 0,
                child_with_bed: 0,
                child_no_bed: 0,
                single_room: 0,
                infant: 0,
              },
              selling_prices: { ...sellingPrices },
              identity_profits: {
                adult: 0,
                child_with_bed: 0,
                child_no_bed: 0,
                single_room: 0,
                infant: 0,
              },
            })
          }}
          variant="soft-gold"
          className="h-9 text-sm gap-1.5 border-dashed"
          type="button"
        >
          <Plus size={14} />
          {t('quoteDetailEmbedAddTier')}
        </Button>
      )}
      <Button
        onClick={() => {
          onSave()
        }}
        disabled={isReadOnly}
        variant="morandi-gold"
        className="h-9 text-sm gap-1.5"
        type="button"
      >
        <CheckSquare size={14} />
        {t('quoteDetailEmbedSave')}
      </Button>
      <Button
        onClick={() => {
          const tierPricingsData = tierPricings.map(tier => ({
            participant_count: tier.participant_count,
            selling_prices: tier.selling_prices,
          }))
          onGenerateQuotation(undefined, undefined, undefined, tierPricingsData)
        }}
        variant="soft-gold"
        className="h-9 text-sm gap-1.5"
        type="button"
      >
        <Printer size={14} />
        {t('quoteDetailEmbedPrint')}
      </Button>
    </>,
    actionsContainer
  )
}
