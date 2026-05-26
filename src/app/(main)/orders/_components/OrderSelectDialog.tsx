'use client'
/**
 * OrderSelectDialog - 訂單選擇對話框
 * 團體模式新增成員時選擇訂單
 */

import React, { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Combobox } from '@/components/ui/combobox'
import { FormLabel } from '@/components/ui/form-label'
import { CheckSquare, X } from 'lucide-react'
import { useTranslations } from 'next-intl'

interface TourOrder {
  id: string
  order_number: string | null
}

interface OrderSelectDialogProps {
  isOpen: boolean
  orders: TourOrder[]
  onClose: () => void
  onSelect: (orderId: string) => void
}

export function OrderSelectDialog({ isOpen, orders, onClose, onSelect }: OrderSelectDialogProps) {
  const t = useTranslations('orders')
  const [selectedOrderId, setSelectedOrderId] = useState<string>('')

  // 將 orders 轉換為 Combobox 選項格式
  const orderOptions = orders.map(order => ({
    value: order.id,
    label: order.order_number || t('unnamedOrder'),
    data: order,
  }))

  const handleConfirm = () => {
    if (selectedOrderId) {
      onSelect(selectedOrderId)
      onClose()
      setSelectedOrderId('')
    }
  }

  const handleClose = () => {
    onClose()
    setSelectedOrderId('')
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent
        nested
        level={2}
        className="max-w-md"
        onInteractOutside={e => {
          const target = e.target as HTMLElement
          if (
            target.closest('[role="listbox"]') ||
            target.closest('[data-radix-select-viewport]') ||
            target.closest('[cmdk-root]')
          ) {
            e.preventDefault()
          }
        }}
      >
        <DialogHeader>
          <DialogTitle>{t('selectOrder')}</DialogTitle>
        </DialogHeader>

        <div className="py-4">
          <FormLabel>{t('pleaseSelectOrder')}</FormLabel>
          <Combobox
            options={orderOptions}
            value={selectedOrderId}
            onChange={setSelectedOrderId}
            placeholder={t('searchOrSelectOrder')}
            emptyMessage={t('noMatchingOrder')}
            showSearchIcon
            showClearButton
          />
        </div>

        <DialogFooter>
          <Button variant="soft-gold" onClick={handleClose} className="gap-2">
            <X size={16} />
            {t('cancel')}
          </Button>
          <Button
            variant="morandi-gold"
            onClick={handleConfirm}
            disabled={!selectedOrderId}
            className="gap-2"
          >
            <CheckSquare size={16} />
            {t('selectOrder')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
