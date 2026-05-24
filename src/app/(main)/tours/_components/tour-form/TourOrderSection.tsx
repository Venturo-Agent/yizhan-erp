'use client'

import React from 'react'
import { AddOrderForm, type OrderFormData } from '@/app/(main)/orders/_components/add-order-form'
import { TOUR_ORDER_SECTION } from '../../_constants'

interface TourOrderSectionProps {
  newOrder: Partial<OrderFormData>
  setNewOrder: React.Dispatch<React.SetStateAction<Partial<OrderFormData>>>
}

export function TourOrderSection({ newOrder, setNewOrder }: TourOrderSectionProps) {
  return (
    <div>
      <h3 className="text-lg font-medium text-morandi-primary mb-4">{TOUR_ORDER_SECTION.title}</h3>

      <AddOrderForm
        tourId="embedded"
        value={newOrder}
        onChange={setNewOrder}
      />

      <div className="bg-morandi-container/20 p-3 rounded-lg mt-4">
        <p className="text-xs text-morandi-secondary">{TOUR_ORDER_SECTION.hint}</p>
      </div>
    </div>
  )
}
