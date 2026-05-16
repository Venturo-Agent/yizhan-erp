'use client'
/**
 * LinkItineraryToTourDialog - 旅遊團設計對話框
 * 功能：選擇設計手冊或網頁行程表
 */

import React from 'react'
import { useRouter } from 'next/navigation'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Palette, BookOpen, Globe } from 'lucide-react'
import type { Tour } from '@/stores/types'
import { TOUR_LINK_ITINERARY } from '../_constants'

interface LinkItineraryToTourDialogProps {
  isOpen: boolean
  onClose: () => void
  tour: Tour
}

type DesignType = 'brochure' | 'web'

export function LinkItineraryToTourDialog({
  isOpen,
  onClose,
  tour,
}: LinkItineraryToTourDialogProps) {
  const router = useRouter()

  // 導航到設計頁面
  const handleOpenDesign = (type: DesignType) => {
    onClose()

    if (type === 'brochure') {
      router.push(`/brochure?tour_id=${tour.id}`)
    } else {
      router.push(`/brochure?tour_id=${tour.id}&mode=web`)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={open => !open && onClose()}>
      <DialogContent level={1} className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Palette className="w-5 h-5 text-morandi-gold" />
            <span>{TOUR_LINK_ITINERARY.button_label}</span>
            <span className="text-sm text-morandi-secondary font-normal">- {tour.code}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="py-4">
          <div className="space-y-4">
            <p className="text-sm text-morandi-secondary text-center">
              {TOUR_LINK_ITINERARY.select_type}
            </p>

            <div className="grid grid-cols-2 gap-3">
              {/* 手冊 */}
              <button
                onClick={() => handleOpenDesign('brochure')}
                className="p-4 rounded-lg border-2 border-border hover:border-morandi-gold/50 hover:bg-morandi-gold/5 transition-all text-left group"
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-10 h-10 rounded-full bg-morandi-gold/10 flex items-center justify-center group-hover:bg-morandi-gold/20 transition-colors">
                    <BookOpen className="w-5 h-5 text-morandi-gold" />
                  </div>
                </div>
                <span className="font-medium text-morandi-primary block mb-1">
                  {TOUR_LINK_ITINERARY.brochure}
                </span>
                <p className="text-xs text-morandi-secondary">
                  {TOUR_LINK_ITINERARY.brochure_desc}
                </p>
              </button>

              {/* 網頁行程表 */}
              <button
                onClick={() => handleOpenDesign('web')}
                className="p-4 rounded-lg border-2 border-border hover:border-morandi-gold/50 hover:bg-morandi-gold/5 transition-all text-left group"
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-10 h-10 rounded-full bg-morandi-gold/10 flex items-center justify-center group-hover:bg-morandi-gold/20 transition-colors">
                    <Globe className="w-5 h-5 text-morandi-gold" />
                  </div>
                </div>
                <span className="font-medium text-morandi-primary block mb-1">
                  {TOUR_LINK_ITINERARY.web_itinerary}
                </span>
                <p className="text-xs text-morandi-secondary">
                  {TOUR_LINK_ITINERARY.web_itinerary_desc}
                </p>
              </button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
