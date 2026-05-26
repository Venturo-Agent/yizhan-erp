'use client'

import React, { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import {
  ParticipantCounts,
  SellingPrices,
  IdentityCosts,
  IdentityProfits,
  AccommodationSummaryItem,
  TierPricing,
  CostCategory,
} from '../_types'
import {
  normalizeNumber,
  getRoomTypeCost,
  getRoomTypeProfit,
  calculateTierParticipantCounts,
  calculateTierCosts,
  calculateIdentityProfits,
  generateUniqueId,
} from '../_utils/priceCalculations'
import { PriceInputRow } from './PriceInputRow'
import { TierPricingCard } from './TierPricingCard'
import { CostIncludedExcludedCards } from './CostIncludedExcludedCards'
import { useTranslations } from 'next-intl'

interface LocalTier {
  id: string
  participants: number
  unitPrice: number
}

interface SellingPriceSectionProps {
  participantCounts: ParticipantCounts
  setParticipantCounts: React.Dispatch<React.SetStateAction<ParticipantCounts>>
  identityCosts: IdentityCosts
  sellingPrices: SellingPrices
  setSellingPrices: React.Dispatch<React.SetStateAction<SellingPrices>>
  identityProfits: IdentityProfits
  isReadOnly: boolean
  handleSave?: () => void
  handleGenerateQuotation: (
    tierParticipantCounts?: ParticipantCounts,
    tierSellingPrices?: SellingPrices,
    tierLabel?: string,
    allTierPricings?: Array<{
      participant_count: number
      selling_prices: {
        adult: number
        child_with_bed: number
        child_no_bed: number
        single_room: number
        infant: number
      }
    }>
  ) => void
  accommodationSummary: AccommodationSummaryItem[]
  categories: CostCategory[]
  tierPricings?: TierPricing[]
  setTierPricings?: React.Dispatch<React.SetStateAction<TierPricing[]>>
  localTiers?: LocalTier[]
  insuranceText?: string
  onInsuranceChange?: (text: string) => void
  excludedItems?: string[]
  onExcludedItemsChange?: (items: string[]) => void
}

export const SellingPriceSection: React.FC<SellingPriceSectionProps> = ({
  participantCounts,
  setParticipantCounts,
  identityCosts,
  sellingPrices,
  setSellingPrices,
  identityProfits,
  isReadOnly,
  handleSave: _handleSave,
  handleGenerateQuotation,
  accommodationSummary,
  categories,
  tierPricings: externalTierPricings,
  setTierPricings: externalSetTierPricings,
  localTiers,
  insuranceText: externalInsuranceText = '',
  onInsuranceChange,
  excludedItems: externalExcludedItems = [
    '個人護照費用',
    '行程外之自費行程',
    '個人消費及小費',
    '行李超重費用',
    '單人房差價',
  ],
  onExcludedItemsChange,
}) => {
  const t = useTranslations('orders')
  // 檢查是否有 Local 報價（人數欄位鎖定）
  const hasLocalPricing = localTiers && localTiers.length > 0
  const [localTierPricings, setLocalTierPricings] = useState<TierPricing[]>([])
  const tierPricings = externalTierPricings ?? localTierPricings
  const setTierPricings = externalSetTierPricings ?? setLocalTierPricings

  // 保險文字和不包含項目
  const [_insuranceText, setInsuranceText] = useState(externalInsuranceText)
  const [excludedItems, setExcludedItems] = useState(externalExcludedItems)

  // 拆成兩個獨立數字欄位，避免「一邊空就清空」造成輸入跳掉
  const parseInsurance = (txt: string) => {
    const m = txt.match(/^(\d+)萬旅責險\+(\d+)萬意外醫療$/)
    return { liability: m ? m[1] : '', medical: m ? m[2] : '' }
  }
  const [liability, setLiability] = useState(() => parseInsurance(externalInsuranceText).liability)
  const [medical, setMedical] = useState(() => parseInsurance(externalInsuranceText).medical)

  // 同步外部 prop 變更（讀檔/重置）
  useEffect(() => {
    setInsuranceText(externalInsuranceText)
    const p = parseInsurance(externalInsuranceText)
    setLiability(p.liability)
    setMedical(p.medical)
  }, [externalInsuranceText])

  const updateInsurance = (l: string, med: string) => {
    setLiability(l)
    setMedical(med)
    const next = l && med ? `${l}萬旅責險+${med}萬意外醫療` : ''
    setInsuranceText(next)
    onInsuranceChange?.(next)
  }

  const handlePriceChange = (identity: keyof SellingPrices, value: string) => {
    const normalized = normalizeNumber(value)
    const newPrice = Number(normalized) || 0

    setSellingPrices(prev => ({ ...prev, [identity]: newPrice }))

    // 同步更新第一個檻次的售價（確保存檔時不丟失）
    if (tierPricings.length > 0) {
      setTierPricings(prev =>
        prev.map((tier, index) => {
          if (index !== 0) return tier
          return {
            ...tier,
            selling_prices: { ...tier.selling_prices, [identity]: newPrice },
            identity_profits: {
              ...tier.identity_profits,
              [identity]: newPrice - tier.identity_costs[identity as keyof IdentityCosts],
            },
          }
        })
      )

      // 提醒：如果有多個檻次，售價需要各自設定
      if (tierPricings.length > 1) {
        toast.info('💡 不同人數的售價已分開設定，記得檢查其他檻次', { duration: 3000 })
      }
    }
  }

  const handleRoomTypePriceChange = (roomName: string, type: 'adult' | 'child', value: string) => {
    const normalized = normalizeNumber(value)
    setSellingPrices(prev => ({
      ...prev,
      room_types: {
        ...(prev.room_types || {}),
        [roomName]: {
          ...(prev.room_types?.[roomName] || { adult: 0, child: 0 }),
          [type]: Number(normalized) || 0,
        },
      },
    }))
  }

  const handleTierPriceChange = (tierId: string, identity: keyof SellingPrices, value: string) => {
    const normalized = normalizeNumber(value)
    setTierPricings(prev =>
      prev.map(tier => {
        if (tier.id !== tierId) return tier
        const newPrice = Number(normalized) || 0
        return {
          ...tier,
          selling_prices: { ...tier.selling_prices, [identity]: newPrice },
          identity_profits: {
            ...tier.identity_profits,
            [identity]: newPrice - tier.identity_costs[identity as keyof IdentityCosts],
          },
        }
      })
    )

    // 提醒：修改檻次售價時，提醒檢查其他檻次
    if (tierPricings.length > 1) {
      toast.info('💡 不同人數的售價已分開設定，記得檢查其他檻次', { duration: 3000 })
    }
  }

  const handleRemoveTier = (id: string) => {
    setTierPricings(prev => prev.filter(tier => tier.id !== id))
  }

  // 新增檻次（預設人數為 0）
  const _handleAddTier = () => {
    const newTier: TierPricing = {
      id: generateUniqueId(),
      participant_count: 0,
      participant_counts: {
        adult: 0,
        child_with_bed: 0,
        child_no_bed: 0,
        single_room: 0,
        infant: 0,
      },
      identity_costs: { adult: 0, child_with_bed: 0, child_no_bed: 0, single_room: 0, infant: 0 },
      selling_prices: { ...sellingPrices },
      identity_profits: { adult: 0, child_with_bed: 0, child_no_bed: 0, single_room: 0, infant: 0 },
    }
    setTierPricings(prev => [...prev, newTier])
  }

  // 更新檻次人數並重新計算成本
  const handleTierCountChange = (tierId: string, newCount: number) => {
    setTierPricings(prev =>
      prev.map(tier => {
        if (tier.id !== tierId) return tier
        const newCounts = calculateTierParticipantCounts(newCount, participantCounts)
        const newCosts = calculateTierCosts(categories, newCounts, participantCounts)
        return {
          ...tier,
          participant_count: newCount,
          participant_counts: newCounts,
          identity_costs: newCosts,
          identity_profits: calculateIdentityProfits(tier.selling_prices, newCosts),
        }
      })
    )
  }

  // 計算目前總人數
  const currentTotalCount =
    (participantCounts.adult || 0) +
    (participantCounts.child_with_bed || 0) +
    (participantCounts.child_no_bed || 0) +
    (participantCounts.single_room || 0)

  return (
    <div className="w-full space-y-4">
      {/* 按鈕列已全部搬到頁頂 toolbar（未確認 / 新增檻次 / 儲存 / 列印）、此區改放 cards */}

      {/* 檻次卡片 - 橫向排列，最多 3 個 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* 目前人數檻次卡片 */}
        <div className="bg-card border border-morandi-gold/40 rounded-xl overflow-hidden shadow-sm">
          <div
            className={cn(
              'bg-morandi-gold/15 px-4 py-2 flex items-center justify-between select-none',
              'border-b border-morandi-gold/30'
            )}
          >
            <div className="flex items-center gap-1">
              {tierPricings.length > 0 && (
                <span className="text-xs font-semibold text-morandi-gold mr-1">{'檻次 1'}</span>
              )}
              <input
                onClick={e => e.stopPropagation()}
                type="text"
                inputMode="decimal"
                value={currentTotalCount}
                onChange={e => {
                  const total = Number(normalizeNumber(e.target.value)) || 0
                  setParticipantCounts({
                    adult: total,
                    child_with_bed: 0,
                    child_no_bed: 0,
                    single_room: 0,
                    infant: 0,
                  })
                }}
                disabled={isReadOnly || hasLocalPricing}
                title={hasLocalPricing ? '人數由 Local 報價控制，請修改 Local 報價' : ''}
                className={cn(
                  'w-12 h-7 px-1 text-sm font-semibold text-center text-morandi-primary bg-card/50 border border-morandi-gold/30 rounded focus:outline-none focus:ring-1 focus:ring-morandi-gold [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none',
                  (isReadOnly || hasLocalPricing) && 'cursor-not-allowed opacity-60'
                )}
              />
              <span className="text-sm font-semibold text-morandi-primary">
                {t('quoteSellingPricePeopleUnit')}
              </span>
            </div>
          </div>
          <table className="w-full text-sm">
            <thead className="border-b border-morandi-container/60">
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
                cost={identityCosts.single_room}
                sellingPrice={sellingPrices.single_room}
                profit={identityProfits.single_room}
                onPriceChange={value => handlePriceChange('single_room', value)}
                isReadOnly={isReadOnly}
              />
              <PriceInputRow
                label={t('quoteCategoryAdult')}
                cost={identityCosts.adult}
                sellingPrice={sellingPrices.adult}
                profit={identityProfits.adult}
                onPriceChange={value => handlePriceChange('adult', value)}
                isReadOnly={isReadOnly}
              />
              <PriceInputRow
                label={t('quotePriceSummaryChild')}
                cost={identityCosts.child_with_bed}
                sellingPrice={sellingPrices.child_with_bed}
                profit={identityProfits.child_with_bed}
                onPriceChange={value => handlePriceChange('child_with_bed', value)}
                isReadOnly={isReadOnly}
              />
              <PriceInputRow
                label={t('quotePriceSummaryNobed')}
                cost={identityCosts.child_no_bed}
                sellingPrice={sellingPrices.child_no_bed}
                profit={identityProfits.child_no_bed}
                onPriceChange={value => handlePriceChange('child_no_bed', value)}
                isReadOnly={isReadOnly}
              />
              <PriceInputRow
                label={t('quoteCategoryInfantLabel')}
                cost={identityCosts.infant}
                sellingPrice={sellingPrices.infant}
                profit={identityProfits.infant}
                onPriceChange={value => handlePriceChange('infant', value)}
                isReadOnly={isReadOnly}
              />

              {/* 動態房型 */}
              {accommodationSummary.length > 1 &&
                accommodationSummary.slice(1).map(room => (
                  <React.Fragment key={room.name}>
                    <tr className="border-b border-morandi-container/60">
                      <td
                        colSpan={4}
                        className="py-2 px-3 text-xs font-medium text-morandi-secondary"
                      >
                        {room.name}
                      </td>
                    </tr>
                    <PriceInputRow
                      label={t('quoteCategoryAdult')}
                      cost={getRoomTypeCost(
                        room.name,
                        'adult',
                        accommodationSummary,
                        identityCosts
                      )}
                      sellingPrice={sellingPrices.room_types?.[room.name]?.adult || 0}
                      profit={getRoomTypeProfit(
                        room.name,
                        'adult',
                        sellingPrices,
                        accommodationSummary,
                        identityCosts
                      )}
                      onPriceChange={value => handleRoomTypePriceChange(room.name, 'adult', value)}
                      isReadOnly={isReadOnly}
                      indented
                    />
                    <PriceInputRow
                      label={t('quotePriceSummaryChild')}
                      cost={getRoomTypeCost(
                        room.name,
                        'child',
                        accommodationSummary,
                        identityCosts
                      )}
                      sellingPrice={sellingPrices.room_types?.[room.name]?.child || 0}
                      profit={getRoomTypeProfit(
                        room.name,
                        'child',
                        sellingPrices,
                        accommodationSummary,
                        identityCosts
                      )}
                      onPriceChange={value => handleRoomTypePriceChange(room.name, 'child', value)}
                      isReadOnly={isReadOnly}
                      indented
                    />
                  </React.Fragment>
                ))}
            </tbody>
          </table>
        </div>

        {/* 檻次表列表 */}
        {tierPricings.map((tier, tierIndex) => (
          <TierPricingCard
            key={tier.id}
            tier={tier}
            tierIndex={tierIndex}
            isReadOnly={isReadOnly}
            onCountChange={handleTierCountChange}
            onPriceChange={handleTierPriceChange}
            onRemove={handleRemoveTier}
            onGenerateQuotation={tier => {
              const tierLabel = `${t('quoteSellingPriceTierPrefix')}${tier.participant_count}${t('quoteSellingPriceTierSuffix')}`
              handleGenerateQuotation(tier.participant_counts, tier.selling_prices, tierLabel)
            }}
          />
        ))}

        {/* 費用包含 / 不含 */}
        <CostIncludedExcludedCards
          liability={liability}
          medical={medical}
          excludedItems={excludedItems}
          isReadOnly={isReadOnly}
          onLiabilityChange={val => updateInsurance(val, medical)}
          onMedicalChange={val => updateInsurance(liability, val)}
          onToggleItem={item => {
            const newItems = excludedItems.includes(item)
              ? excludedItems.filter(i => i !== item)
              : [...excludedItems, item]
            setExcludedItems(newItems)
            onExcludedItemsChange?.(newItems)
          }}
        />
      </div>
    </div>
  )
}
