'use client'
/**
 * QuotationPricingTable - 團費報價表
 */

import React from 'react'
import { MORANDI_COLORS, TABLE_STYLES } from '@/lib/print'

interface SellingPrices {
  adult: number
  child_with_bed: number
  child_no_bed: number
  single_room: number
  infant: number
}

interface TierPricing {
  participant_count: number
  selling_prices: SellingPrices
}

interface QuotationPricingTableProps {
  sellingPrices: SellingPrices
  tierPricings?: TierPricing[]
}

export const QuotationPricingTable: React.FC<QuotationPricingTableProps> = ({
  sellingPrices,
  tierPricings = [],
}) => {
  const priceItems = [
    { key: 'adult', label: '成人', value: sellingPrices.adult },
    { key: 'child_with_bed', label: '小孩佔床', value: sellingPrices.child_with_bed },
    { key: 'child_no_bed', label: '小孩不佔床', value: sellingPrices.child_no_bed },
    { key: 'single_room', label: '單人房差價', value: sellingPrices.single_room },
    { key: 'infant', label: '嬰兒', value: sellingPrices.infant },
  ]

  return (
    <div className="mb-6">
      <h3 className="text-lg font-semibold mb-3" style={{ color: MORANDI_COLORS.brown }}>
        {'團費報價 ▽'}
      </h3>
      <table className="w-full text-sm" style={TABLE_STYLES}>
        <thead>
          <tr style={{ backgroundColor: MORANDI_COLORS.lightBrown }}>
            <th
              className="px-4 py-3 text-center"
              style={{
                borderBottom: `1px solid ${MORANDI_COLORS.border}`,
                color: MORANDI_COLORS.brown,
                fontWeight: 600,
              }}
            >
              {'身份'}
            </th>
            <th
              className="px-4 py-3 text-center"
              style={{
                borderBottom: `1px solid ${MORANDI_COLORS.border}`,
                borderLeft: `1px solid ${MORANDI_COLORS.border}`,
                color: MORANDI_COLORS.brown,
                fontWeight: 600,
              }}
            >
              {'基本報價'}
            </th>
            {tierPricings.map(tier => (
              <th
                key={tier.participant_count}
                className="px-4 py-3 text-center"
                style={{
                  borderBottom: `1px solid ${MORANDI_COLORS.border}`,
                  borderLeft: `1px solid ${MORANDI_COLORS.border}`,
                  color: MORANDI_COLORS.brown,
                  fontWeight: 600,
                }}
              >
                {tier.participant_count} {'人'}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {priceItems.map((item, index) => {
            if (item.value <= 0) return null

            const isLast = index === priceItems.filter(i => i.value > 0).length - 1

            return (
              <tr key={item.key}>
                <td
                  className="px-4 py-3 text-center"
                  style={{
                    borderBottom: isLast ? 'none' : `1px solid ${MORANDI_COLORS.border}`,
                    color: MORANDI_COLORS.gray,
                  }}
                >
                  {item.label}
                </td>
                <td
                  className="px-4 py-3 text-center text-lg font-semibold"
                  style={{
                    borderBottom: isLast ? 'none' : `1px solid ${MORANDI_COLORS.border}`,
                    borderLeft: `1px solid ${MORANDI_COLORS.border}`,
                    color: MORANDI_COLORS.brown,
                  }}
                >
                  {item.value.toLocaleString()}
                </td>
                {tierPricings.map(tier => (
                  <td
                    key={tier.participant_count}
                    className="px-4 py-3 text-center text-lg font-semibold"
                    style={{
                      borderBottom: isLast ? 'none' : `1px solid ${MORANDI_COLORS.border}`,
                      borderLeft: `1px solid ${MORANDI_COLORS.border}`,
                      color: MORANDI_COLORS.brown,
                    }}
                  >
                    {tier.selling_prices[item.key as keyof SellingPrices].toLocaleString()}
                  </td>
                ))}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
