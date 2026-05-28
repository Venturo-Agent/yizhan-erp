'use client'

import { useMemo, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { Tour } from '@/stores/types'
import { OrderListView } from '@/app/(main)/orders/_components/OrderListView'
import { useOrdersSlim } from '@/data'
import type { Order as OrderType } from '@/types/order.types'
import { toast } from 'sonner'
import { invalidateOrders } from '@/data'

interface TourOrdersProps {
  tour: Tour
}

export function TourOrders({ tour }: TourOrdersProps) {
  const t = useTranslations('tour')
  const { items: allOrders } = useOrdersSlim()
  const orders = useMemo(() => allOrders.filter(o => o.tour_id === tour.id), [allOrders, tour.id])

  const handleReceiptSuccess = useCallback(() => {
    invalidateOrders()
  }, [])

  const handleRequestSuccess = useCallback(() => {
    toast.success(t('ordersPaymentCreated'))
  }, [])

  // 「新增訂單」入口在 /tours 列表的「報名」按鈕、此分頁只負責顯示+操作既有訂單
  return (
    <div className="flex flex-col h-full" data-tutorial="tour-orders-content">
      <OrderListView
        orders={orders as OrderType[]}
        showTourInfo={false}
        onReceiptSuccess={handleReceiptSuccess}
        onRequestSuccess={handleRequestSuccess}
      />
    </div>
  )
}
