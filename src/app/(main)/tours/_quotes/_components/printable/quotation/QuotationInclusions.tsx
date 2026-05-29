'use client'
/**
 * QuotationInclusions - 費用包含/不包含說明
 */

import React from 'react'
import { MORANDI_COLORS } from '@/lib/print'

interface QuotationInclusionsProps {
  insuranceText?: string
  excludedItems?: string[]
}

export const QuotationInclusions: React.FC<QuotationInclusionsProps> = ({
  insuranceText = '200萬旅責險+20萬意外醫療',
  excludedItems = [
    '個人護照費用',
    '行程外之自費行程',
    '個人消費及小費',
    '行李超重費用',
    '單人房差價',
  ],
}) => {
  // 從「不包含」移到「包含」的項目
  const allToggleItems = [
    '個人護照費用',
    '行程外之自費行程',
    '個人消費及小費',
    '行李超重費用',
    '單人房差價',
  ]
  const includedExtra = allToggleItems.filter(i => !excludedItems.includes(i))

  return (
    <div className="grid grid-cols-2 gap-6 mb-6">
      <div>
        <h4 className="font-semibold mb-2" style={{ color: MORANDI_COLORS.brown }}>
          {'費用包含'}
        </h4>
        <ul className="space-y-1 text-sm" style={{ color: MORANDI_COLORS.gray }}>
          <li>{'• 交通、住宿、餐食、門票'}</li>
          <li>{'• 專業導遊服務'}</li>
          <li>• {insuranceText}</li>
          {includedExtra.map((item, idx) => (
            <li key={idx}>• {item}</li>
          ))}
        </ul>
      </div>
      <div>
        <h4 className="font-semibold mb-2" style={{ color: MORANDI_COLORS.brown }}>
          {'費用不含'}
        </h4>
        <ul className="space-y-1 text-sm" style={{ color: MORANDI_COLORS.gray }}>
          {excludedItems.map((item, idx) => (
            <li key={idx}>• {item}</li>
          ))}
        </ul>
      </div>
    </div>
  )
}
