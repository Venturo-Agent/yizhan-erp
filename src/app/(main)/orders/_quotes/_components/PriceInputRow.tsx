'use client'

import React from 'react'
import { cn } from '@/lib/utils'

interface PriceInputRowProps {
  label: string
  cost: number
  sellingPrice: number
  profit: number
  onPriceChange: (value: string) => void
  isReadOnly: boolean
  indented?: boolean
}

export const PriceInputRow: React.FC<PriceInputRowProps> = ({
  label,
  cost,
  sellingPrice,
  profit,
  onPriceChange,
  isReadOnly,
  indented = false,
}) => {
  return (
    <tr className="border-b border-morandi-container/60">
      <td className={cn('py-2 px-3 text-xs font-medium text-morandi-primary', indented && 'pl-6')}>
        {label}
      </td>
      <td className="py-2 px-2 text-center text-xs text-morandi-primary">
        {cost.toLocaleString()}
      </td>
      <td className="py-2 px-2 text-center">
        <input
          type="text"
          inputMode="decimal"
          value={sellingPrice || ''}
          onChange={e => onPriceChange(e.target.value)}
          disabled={isReadOnly}
          className={cn(
            'input-no-focus w-full px-1 py-1 text-sm text-center bg-transparent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none',
            isReadOnly && 'cursor-not-allowed opacity-60'
          )}
        />
      </td>
      <td
        className={cn(
          'py-2 px-2 text-center text-xs font-medium',
          profit >= 0 ? 'text-morandi-green' : 'text-morandi-red'
        )}
      >
        {profit.toLocaleString()}
      </td>
    </tr>
  )
}
