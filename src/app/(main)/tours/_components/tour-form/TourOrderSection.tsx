'use client'

import React from 'react'
import { AddOrderForm, type OrderFormData } from '@/app/(main)/orders/_components/add-order-form'
import { TOUR_ORDER_SECTION } from '../../_constants'

interface TourOrderSectionProps {
  newOrder: Partial<OrderFormData>
  setNewOrder: React.Dispatch<React.SetStateAction<Partial<OrderFormData>>>
  // 提案轉開團場景：助理在開團階段不在此處決定、隱藏
  hideAssistant?: boolean
}

export function TourOrderSection({ newOrder, setNewOrder, hideAssistant }: TourOrderSectionProps) {
  return (
    <div>
      <h3 className="text-lg font-medium text-morandi-primary mb-4">{TOUR_ORDER_SECTION.title}</h3>

      <AddOrderForm
        tourId="embedded"
        value={newOrder}
        onChange={setNewOrder}
        hideAssistant={hideAssistant}
      />

      <div className="bg-morandi-container/20 p-3 rounded-lg mt-4">
        <p className="text-xs text-morandi-secondary">{TOUR_ORDER_SECTION.hint}</p>
      </div>
    </div>
  )
}
