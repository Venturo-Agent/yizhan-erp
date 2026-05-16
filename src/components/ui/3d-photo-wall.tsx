'use client'

import React, { useEffect } from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { X } from 'lucide-react'
import {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogContent,
  DialogClose,
} from '@/components/ui/dialog'
import { UI_LABELS } from './constants/labels'

interface PhotoWallProps {
  images: string[]
  onClose: () => void
  className?: string
  open?: boolean
}

export function ThreeDPhotoWall({ images, onClose, className, open = true }: PhotoWallProps) {
  // 關閉時按 ESC (Dialog handles this automatically, but we need body overflow control)
  useEffect(() => {
    // 防止背景滾動
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [])

  // 將圖片分成 4 欄
  const columns = 4
  const columnImages: string[][] = Array.from({ length: columns }, () => [])

  images.forEach((image, index) => {
    columnImages[index % columns].push(image)
  })

  // 確保每欄至少有一些圖片（重複填充）
  const minPerColumn = 8
  columnImages.forEach(col => {
    while (col.length < minPerColumn && images.length > 0) {
      col.push(images[col.length % images.length])
    }
  })

  return (
    <Dialog open={open} onOpenChange={isOpen => !isOpen && onClose()}>
      <DialogPortal>
        <DialogOverlay className="bg-black z-[99999]" />
        <DialogContent
          level={2}
          className={cn(
            'fixed inset-0 flex items-center justify-center bg-transparent border-none shadow-none p-0 max-w-none w-full h-full translate-x-0 translate-y-0 left-0 top-0 rounded-none overflow-hidden',
            className
          )}
          style={{ zIndex: 99999 }}
          onClick={onClose}
        >
          {/* 關閉按鈕 */}
          <DialogClose asChild>
            <button
              type="button"
              onClick={onClose}
              className="absolute top-6 right-6 z-[100000] p-3 bg-card/10 hover:bg-card/20 rounded-full text-white transition-colors backdrop-blur-sm"
            >
              <X size="1.5em" />
            </button>
          </DialogClose>

          {/* 標題 */}
          <div className="absolute top-6 left-6 z-[100000]">
            <h2 className="text-2xl font-bold text-white/90">{UI_LABELS.LABEL_7722}</h2>
            <p className="text-sm text-white/60 mt-1">{images.length} 張照片</p>
          </div>

          {/* 3D 照片牆 */}
          <div
            className="absolute inset-0 flex items-center justify-center"
            style={{
              perspective: '75rem',
              perspectiveOrigin: 'center center',
            }}
            onClick={e => e.stopPropagation()}
          >
            <div
              className="flex items-center justify-center"
              style={{
                transform: 'rotateX(35deg) rotateZ(-20deg) scale(1.3)',
                transformStyle: 'preserve-3d',
              }}
            >
              <div className="flex gap-5">
                {columnImages.map((column, colIndex) => (
                  <MarqueeColumn
                    key={colIndex}
                    images={column}
                    direction={colIndex % 2 === 0 ? 'up' : 'down'}
                    duration={50 + colIndex * 5}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* 漸層遮罩 */}
          <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-black via-transparent to-black opacity-50" />
          <div className="absolute inset-0 pointer-events-none bg-gradient-to-r from-black via-transparent to-black opacity-30" />

          {/* 提示文字 */}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-white/50 text-sm z-[100000]">
            {UI_LABELS.LABEL_1891}
          </div>
        </DialogContent>
      </DialogPortal>
    </Dialog>
  )
}

// 單欄滾動組件 - 使用 CSS animation 避免停頓
function MarqueeColumn({
  images,
  direction = 'up',
  duration = 60,
}: {
  images: string[]
  direction?: 'up' | 'down'
  duration?: number
}) {
  // 複製圖片以實現無縫滾動
  const duplicatedImages = [...images, ...images]

  return (
    <div className="relative h-[68.75rem] w-80 overflow-hidden">
      <motion.div
        className="flex flex-col gap-6"
        animate={{
          y: direction === 'up' ? ['0%', '-50%'] : ['-50%', '0%'],
        }}
        transition={{
          y: {
            duration: duration,
            repeat: Infinity,
            ease: 'linear',
            repeatType: 'loop',
          },
        }}
      >
        {duplicatedImages.map((image, index) => (
          <motion.div
            key={`${image}-${index}`}
            className="relative w-80 h-52 rounded-2xl overflow-hidden shadow-lg flex-shrink-0 border border-white/10"
            whileHover={{
              scale: 1.08,
              zIndex: 10,
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.8)',
            }}
            transition={{ duration: 0.2 }}
          >
            <img src={image} alt="" className="w-full h-full object-cover" loading="lazy" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
          </motion.div>
        ))}
      </motion.div>
    </div>
  )
}
