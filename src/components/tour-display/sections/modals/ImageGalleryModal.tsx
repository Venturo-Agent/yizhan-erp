'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { LUXURY, ImageGalleryState } from '../utils/itineraryLuxuryUtils'

interface ImageGalleryModalProps {
  imageGallery: ImageGalleryState | null
  onClose: () => void
  onPrev: () => void
  onNext: () => void
  onSelectIndex: (index: number) => void
}

export function ImageGalleryModal({
  imageGallery,
  onClose,
  onPrev,
  onNext,
  onSelectIndex,
}: ImageGalleryModalProps) {
  if (!imageGallery) return null

  const { images, currentIndex } = imageGallery
  const current = images[currentIndex]

  return (
    <Dialog open={true} onOpenChange={open => !open && onClose()}>
      <DialogContent
        level={1}
        overlayClassName="backdrop-blur-none bg-black/85"
        className="max-w-5xl w-full border-none p-0 gap-0 bg-transparent"
        aria-describedby={undefined}
      >
        <div className="relative flex items-center justify-center min-h-[60vh]">
          {images.length > 1 && (
            <>
              <button
                onClick={onPrev}
                className="absolute z-10 flex items-center justify-center transition-colors left-4 w-12 h-12 rounded-full bg-card/10 hover:bg-card/20"
                aria-label="Previous image"
              >
                <ChevronLeft className="w-8 h-8 text-white" />
              </button>
              <button
                onClick={onNext}
                className="absolute z-10 flex items-center justify-center transition-colors right-4 w-12 h-12 rounded-full bg-card/10 hover:bg-card/20"
                aria-label="Next image"
              >
                <ChevronRight className="w-8 h-8 text-white" />
              </button>
            </>
          )}

          <AnimatePresence mode="wait">
            <motion.div
              key={currentIndex}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.2 }}
              className="max-w-5xl max-h-[80vh] relative"
            >
              <img
                src={current.url}
                alt={current.title || ''}
                className="max-w-full max-h-[80vh] object-contain rounded-lg"
              />
              {(current.title || current.description) && (
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-6 rounded-b-lg">
                  {current.title && (
                    <h3
                      className="text-white text-xl font-bold mb-2"
                      style={{ fontFamily: LUXURY.font.serif }}
                    >
                      {current.title}
                    </h3>
                  )}
                  {current.description && (
                    <p className="text-white/80 text-sm">{current.description}</p>
                  )}
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          {images.length > 1 && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
              {images.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => onSelectIndex(idx)}
                  className={`w-16 h-12 rounded overflow-hidden border-2 transition-all ${
                    idx === currentIndex
                      ? 'border-white opacity-100'
                      : 'border-transparent opacity-50 hover:opacity-75'
                  }`}
                  aria-label={`View image ${idx + 1}`}
                >
                  <img src={img.url} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
