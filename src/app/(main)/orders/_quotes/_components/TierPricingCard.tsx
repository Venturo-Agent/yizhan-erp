'use client'

import React from 'react'
import { Button } from '@/components/ui/button'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  SellingPrices,
  IdentityCosts,
  IdentityProfits,
  TierPricing,
} from '../_types'
import { normalizeNumber } from '../_utils/priceCalculations'
import { PriceInputRow } from './PriceInputRow'
import { useTranslations } from 'next-intl'

interface TierPricingCardProps {
  tier: TierPricing
  tierIndex: number // 0-based index in the tierPricings array (card shown as tierIndex+2)
  isReadOnly: boolean
  onCountChange: (tierId: string, newCount: number) => void
  onPriceChange: (tierId: string, identity: keyof SellingPrices, value: string) => void
  onRemove: (tierId: string) => void
  onGenerateQuotation: (tier: TierPricing) => void
}

export function TierPricingCard({
  tier,
  tierIndex,
  isReadOnly,
  onCountChange,
  onPriceChange,
  onRemove,
  onGenerateQuotation,
}: TierPricingCardProps) {
  const t = useTranslations('orders')
  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
      <div
        className={cn(
          'bg-morandi-container/30 px-4 py-2 flex items-center justify-between select-none',
          'border-b border-border'
        )}
      >
        <div className="flex items-center gap-1">
          <span className="text-xs font-semibold text-morandi-secondary mr-1">
            {'檻次'} {tierIndex + 2}
          </span>
          <input
            onClick={e => e.stopPropagation()}
            type="text"
            inputMode="decimal"
            value={tier.participant_count}
            onChange={e => {
              const newCount = Number(normalizeNumber(e.target.value)) || 0
              onCountChange(tier.id, newCount)
            }}
            disabled={isReadOnly}
            className={cn(
              'w-12 h-7 px-1 text-sm font-medium text-center text-morandi-primary bg-card/50 border border-border rounded focus:outline-none focus:ring-1 focus:ring-morandi-gold [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none',
              isReadOnly && 'cursor-not-allowed opacity-60'
            )}
          />
          <span className="text-sm font-medium text-morandi-primary">
            {t('quoteSellingPricePeopleUnit')}
          </span>
        </div>
        <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
          <Button
            onClick={() => onGenerateQuotation(tier)}
            size="sm"
            className="h-6 px-2 text-xs bg-morandi-secondary hover:bg-morandi-secondary/90 text-white"
            type="button"
          >
            {t('quoteSellingPricePrint')}
          </Button>
          {!isReadOnly && (
            <button
              onClick={() => onRemove(tier.id)}
              className="text-morandi-red hover:bg-morandi-red/10 p-1 rounded transition-colors"
              type="button"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>
      <table className="w-full text-sm">
        <thead className="border-b border-border/60">
          <tr>
            <th className="text-left py-2 px-4 text-xs font-medium text-morandi-secondary">
              {t('quoteSellingPriceIdentity')}
            </th>
            <th className="text-center py-2 px-4 text-xs font-medium text-morandi-secondary">
              {t('quoteSellingPriceCost')}
            </th>
            <th className="text-center py-2 px-4 text-xs font-medium text-morandi-secondary">
              {t('quoteSellingPriceSalePrice')}
            </th>
            <th className="text-center py-2 px-4 text-xs font-medium text-morandi-secondary">
              {t('quoteSellingPriceProfit')}
            </th>
          </tr>
        </thead>
        <tbody>
          <PriceInputRow
            label={t('quotePriceSummarySingleRoom')}
            cost={tier.identity_costs.single_room}
            sellingPrice={tier.selling_prices.single_room}
            profit={tier.identity_profits.single_room}
            onPriceChange={value => onPriceChange(tier.id, 'single_room', value)}
            isReadOnly={isReadOnly}
          />
          <PriceInputRow
            label={t('quoteCategoryAdult')}
            cost={tier.identity_costs.adult}
            sellingPrice={tier.selling_prices.adult}
            profit={tier.identity_profits.adult}
            onPriceChange={value => onPriceChange(tier.id, 'adult', value)}
            isReadOnly={isReadOnly}
          />
          <PriceInputRow
            label={t('quotePriceSummaryChild')}
            cost={tier.identity_costs.child_with_bed}
            sellingPrice={tier.selling_prices.child_with_bed}
            profit={tier.identity_profits.child_with_bed}
            onPriceChange={value => onPriceChange(tier.id, 'child_with_bed', value)}
            isReadOnly={isReadOnly}
          />
          <PriceInputRow
            label={t('quotePriceSummaryNobed')}
            cost={tier.identity_costs.child_no_bed}
            sellingPrice={tier.selling_prices.child_no_bed}
            profit={tier.identity_profits.child_no_bed}
            onPriceChange={value => onPriceChange(tier.id, 'child_no_bed', value)}
            isReadOnly={isReadOnly}
          />
          <PriceInputRow
            label={t('quoteCategoryInfantLabel')}
            cost={tier.identity_costs.infant}
            sellingPrice={tier.selling_prices.infant}
            profit={tier.identity_profits.infant}
            onPriceChange={value => onPriceChange(tier.id, 'infant', value)}
            isReadOnly={isReadOnly}
          />
        </tbody>
      </table>
    </div>
  )
}
