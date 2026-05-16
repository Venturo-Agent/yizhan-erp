'use client'

import { X } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from '@/components/ui/dialog'
import { LUXURY, ActivityInfo } from '../utils/itineraryLuxuryUtils'

interface ActivityDetailModalProps {
  activity: ActivityInfo | null
  onClose: () => void
}

export function ActivityDetailModal({ activity, onClose }: ActivityDetailModalProps) {
  return (
    <Dialog open={!!activity} onOpenChange={open => !open && onClose()}>
      <DialogContent level={1} className="max-w-lg p-0 overflow-hidden rounded-2xl">
        {activity?.image && (
          <div className="relative h-48">
            <img src={activity.image} alt={activity.title} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
            <div className="absolute bottom-4 left-4 text-white">
              <DialogHeader className="p-0">
                <DialogTitle
                  className="text-xl font-bold text-white"
                  style={{ fontFamily: LUXURY.font.serif }}
                >
                  {activity.title}
                </DialogTitle>
              </DialogHeader>
            </div>
            {/* Custom close button for image header */}
            <DialogClose className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full bg-black/10 hover:bg-black/20 flex items-center justify-center transition-colors">
              <X className="w-5 h-5 text-white" />
              <span className="sr-only">Close</span>
            </DialogClose>
          </div>
        )}
        <div className="p-6">
          {activity && !activity.image && (
            <DialogHeader className="p-0 mb-4">
              <DialogTitle
                className="text-xl font-bold pr-8"
                style={{
                  color: LUXURY.text,
                  fontFamily: LUXURY.font.serif,
                }}
              >
                {activity.title}
              </DialogTitle>
            </DialogHeader>
          )}
          {activity?.description && (
            <p className="leading-relaxed" style={{ color: LUXURY.muted }}>
              {activity.description}
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
