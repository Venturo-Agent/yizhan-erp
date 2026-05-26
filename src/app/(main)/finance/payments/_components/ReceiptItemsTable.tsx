'use client'

/**
 * ReceiptItemsTable
 * 收款項目表格（團體 / 公司 tab 共用）
 * 包含 loading skeleton 狀態
 */

import { Skeleton } from '@/components/ui/skeleton'
import { InlineEditTable, type InlineEditColumn } from '@/components/ui/inline-edit-table'
import { PaymentItemRow } from './PaymentItemRow'
import { useTranslations } from 'next-intl'
import type { PaymentItem } from '../_types'

interface OrderInfo {
  order_number?: string
  tour_name?: string
  contact_person?: string
  contact_email?: string
}

interface PaymentMethodOption {
  id: string
  code: string
  name: string
  description?: string | null
  placeholder?: string | null
}

interface ReceiptItemsTableProps {
  rows: PaymentItem[]
  columns: InlineEditColumn<PaymentItem>[]
  isConfirmed: boolean
  isEditMode: boolean
  dialogLoading?: boolean
  onAdd: (() => void) | undefined
  onUpdate: (id: string, updates: Partial<PaymentItem>) => void
  onRemove: (id: string) => void
  paymentMethods: PaymentMethodOption[]
  /** 'tour' = 帶 orderInfo；'company' = 無 orderInfo */
  mode?: 'tour' | 'company'
  orderInfo?: OrderInfo
}

export function ReceiptItemsTable({
  rows,
  columns,
  isConfirmed,
  isEditMode,
  dialogLoading = false,
  onAdd,
  onUpdate,
  onRemove,
  paymentMethods,
  mode = 'tour',
  orderInfo,
}: ReceiptItemsTableProps) {
  const t = useTranslations('finance')
  if (dialogLoading) {
    return (
      <div className="space-y-4 py-6 px-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-[60%]" />
      </div>
    )
  }

  return (
    <div className="pt-4 border-t border-morandi-container/30">
      <InlineEditTable<PaymentItem>
        title={t('receiptItems')}
        rows={rows}
        columns={columns}
        onAdd={isConfirmed ? undefined : onAdd}
        addLabel={t('receiptAddItem')}
        readonly={isConfirmed}
        className="flex-1 overflow-auto"
        rowRender={(item, index) => (
          <PaymentItemRow
            key={item.id}
            item={item}
            index={index}
            onUpdate={onUpdate}
            onRemove={onRemove}
            canRemove={rows.length > 1}
            isNewRow={!isEditMode && index === rows.length - 1}
            mode={mode === 'company' ? 'company' : undefined}
            readonly={isConfirmed}
            canConfirmReceipt={columns.some(c => c.key === 'actual')}
            paymentMethods={paymentMethods}
            orderInfo={mode === 'tour' ? orderInfo : undefined}
          />
        )}
      />
    </div>
  )
}
