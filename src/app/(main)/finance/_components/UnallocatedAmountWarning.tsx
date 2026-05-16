'use client'

import React from 'react'
import { AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { CurrencyCell } from '@/components/table-cells'

interface UnallocatedAmountWarningProps {
  /** 未分配金額（正數 = 還沒分配完、負數 = 超出總金額） */
  amount: number
  /** 正值時顯示的訊息（通常是「還有金額未分配」） */
  underMessage: string
  /** 負值時顯示的訊息（通常是「分配金額超過總金額」） */
  overMessage: string
  /** 尾端標籤（通常是「未分配」或「超出」） */
  labelSuffix: string
}

/**
 * 批量收款 / 批量請款的「未分配金額警告」共用組件。
 * amount === 0 時不渲染；正負值套用不同顏色語意。
 */
export function UnallocatedAmountWarning({
  amount,
  underMessage,
  overMessage,
  labelSuffix,
}: UnallocatedAmountWarningProps) {
  if (amount === 0) return null

  const isUnder = amount > 0
  return (
    <div
      className={cn(
        'flex items-center justify-between px-3 py-2 rounded-lg text-sm',
        isUnder ? 'bg-morandi-gold/10 text-morandi-gold' : 'bg-morandi-red/10 text-morandi-red'
      )}
    >
      <div className="flex items-center gap-2">
        <AlertCircle className="h-4 w-4 shrink-0" />
        <span>{isUnder ? underMessage : overMessage}</span>
      </div>
      <div className="font-medium">
        {labelSuffix}：
        <CurrencyCell amount={Math.abs(amount)} className="inline" />
      </div>
    </div>
  )
}
