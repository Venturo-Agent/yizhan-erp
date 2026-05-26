'use client'

import React from 'react'
import { useTranslations } from 'next-intl'

const LABELS = {
  COST_INCLUDED: '費用包含',
  ACCIDENT_MEDICAL: '萬意外醫療',
  COST_EXCLUDED: '費用不含',
  ITINERARY_INCLUDED: '• 行程表所列交通、住宿、餐食、門票',
  GUIDE_SERVICE: '• 專業導遊服務',
  LIABILITY_PLUS: '萬旅責險 +',
  REMOVE: '移除',
  INCLUDE: '包含',
  EMPTY: '（無）',
} as const

// 預設不含項目清單（順序固定）
const ALL_TOGGLE_ITEMS = [
  '個人護照費用',
  '行程外之自費行程',
  '個人消費及小費',
  '行李超重費用',
  '單人房差價',
]

interface CostIncludedExcludedCardsProps {
  /** 保險責任險金額（萬），空字串表示未填 */
  liability: string
  /** 保險意外醫療金額（萬），空字串表示未填 */
  medical: string
  /** 費用不含的項目 */
  excludedItems: string[]
  isReadOnly?: boolean
  onLiabilityChange: (value: string) => void
  onMedicalChange: (value: string) => void
  onToggleItem: (item: string) => void
}

export function CostIncludedExcludedCards({
  liability,
  medical,
  excludedItems,
  isReadOnly,
  onLiabilityChange,
  onMedicalChange,
  onToggleItem,
}: CostIncludedExcludedCardsProps) {
  const t = useTranslations('orders')
  const includedToggleItems = ALL_TOGGLE_ITEMS.filter(i => !excludedItems.includes(i))
  const excludedToggleItems = ALL_TOGGLE_ITEMS.filter(i => excludedItems.includes(i))

  // 全形→半形 + 只留數字
  const normalizeDigits = (v: string) =>
    v.replace(/[０-９]/g, ch => String.fromCharCode(ch.charCodeAt(0) - 0xfee0)).replace(/\D/g, '')

  return (
    <>
      {/* 費用包含 */}
      <div className="bg-card border border-morandi-green/30 rounded-xl overflow-hidden shadow-sm">
        <div className="bg-morandi-green/10 px-4 py-2 border-b border-morandi-green/20">
          <span className="text-sm font-semibold text-morandi-green">{LABELS.COST_INCLUDED}</span>
        </div>
        <div className="px-4 py-3 space-y-1.5 text-sm text-morandi-secondary">
          <div>{LABELS.ITINERARY_INCLUDED}</div>
          <div>{LABELS.GUIDE_SERVICE}</div>
          <div className="flex items-center gap-2">
            <span>•</span>
            <input
              type="text"
              inputMode="numeric"
              value={liability}
              onChange={e => onLiabilityChange(normalizeDigits(e.target.value))}
              placeholder="200"
              disabled={isReadOnly}
              className="w-16 px-2 py-1 text-xs border rounded"
            />
            <span className="text-xs">{LABELS.LIABILITY_PLUS}</span>
            <input
              type="text"
              inputMode="numeric"
              value={medical}
              onChange={e => onMedicalChange(normalizeDigits(e.target.value))}
              placeholder="20"
              disabled={isReadOnly}
              className="w-16 px-2 py-1 text-xs border rounded"
            />
            <span className="text-xs">{LABELS.ACCIDENT_MEDICAL}</span>
          </div>
          {includedToggleItems.map(item => (
            <label key={item} className="flex items-center gap-2 cursor-pointer text-morandi-green">
              <span>•</span>
              <span>{item}</span>
              {!isReadOnly && (
                <button
                  onClick={() => onToggleItem(item)}
                  className="ml-auto text-xs text-morandi-secondary hover:text-morandi-red"
                  title={t('quoteMoveToExcluded')}
                >
                  {LABELS.REMOVE}
                </button>
              )}
            </label>
          ))}
        </div>
      </div>

      {/* 費用不含 */}
      <div className="bg-card border border-morandi-red/30 rounded-xl overflow-hidden shadow-sm">
        <div className="bg-morandi-red/10 px-4 py-2 border-b border-morandi-red/20">
          <span className="text-sm font-semibold text-morandi-red">{LABELS.COST_EXCLUDED}</span>
        </div>
        <div className="px-4 py-3 space-y-1.5 text-sm text-morandi-secondary">
          {excludedToggleItems.map(item => (
            <label key={item} className="flex items-center gap-2 cursor-pointer">
              <span>•</span>
              <span>{item}</span>
              {!isReadOnly && (
                <button
                  onClick={() => onToggleItem(item)}
                  className="ml-auto text-xs text-morandi-secondary hover:text-morandi-green"
                  title={t('quoteMoveToIncluded')}
                >
                  {LABELS.INCLUDE}
                </button>
              )}
            </label>
          ))}
          {excludedToggleItems.length === 0 && (
            <div className="text-xs text-morandi-muted">{LABELS.EMPTY}</div>
          )}
        </div>
      </div>
    </>
  )
}
