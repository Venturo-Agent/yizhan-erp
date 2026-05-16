'use client'
/**
 * TourItineraryDialog - 旅遊團行程表對話框
 * 直接從 Tour 資料建立 ItineraryEditorContext，不再繞道 proposal_packages
 */

import React, { useMemo } from 'react'
import type { Tour } from '@/stores/types'
import type { ItineraryEditorContext } from './itinerary-editor/types'
import { PackageItineraryDialog } from './itinerary-editor'
import { useTourDisplay } from '@/app/(main)/tours/_utils/tour-display'

interface TourItineraryDialogProps {
  isOpen: boolean
  onClose: () => void
  tour: Tour
}

export function TourItineraryDialog({ isOpen, onClose, tour }: TourItineraryDialogProps) {
  // SSOT：destination 從 country_id / airport_code 衍生
  const { displayString: tourDestinationDisplay } = useTourDisplay(tour)

  // 直接從 Tour 建立 ItineraryEditorContext
  const context = useMemo(
    (): ItineraryEditorContext => ({
      id: tour.id,
      itinerary_id: tour.itinerary_id || null,
      start_date: tour.departure_date || null,
      end_date: tour.return_date || null,
      days: null,
      country_id: tour.country_id || null,
      airport_code: tour.airport_code || null,
      destination: tourDestinationDisplay || null,
      version_name: '行程版本',
      group_size: tour.max_participants || null,
      workspace_id: tour.workspace_id || '',
      title: tour.name,
    }),
    [tour, tourDestinationDisplay]
  )

  return (
    <PackageItineraryDialog
      isOpen={isOpen}
      onClose={onClose}
      context={context}
      onItineraryCreated={() => {}}
    />
  )
}
