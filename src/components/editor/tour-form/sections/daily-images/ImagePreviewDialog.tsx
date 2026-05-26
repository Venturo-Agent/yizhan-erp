'use client'

import React, { useEffect, useState, useRef } from 'react'
import { X, Check } from 'lucide-react'
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { VisuallyHidden } from '@radix-ui/react-visually-hidden'
import { Button } from '@/components/ui/button'
import { DailyImage } from '../../types'
import { COMP_EDITOR_LABELS } from '../../../constants/labels'

// 工具函數：取得圖片 URL
function getImageUrl(image: string | DailyImage): string {
  return typeof image === 'string' ? image : image.url
}

// 工具函數：取得圖片 position
function getImagePosition(image: string | DailyImage): string {
  return typeof image === 'string' ? 'center' : image.position || 'center'
}

// 圖片預覽 Modal
interface ImagePreviewModalProps {
  images: (string | DailyImage)[]
  currentIndex: number
  onClose: () => void
  onNavigate: (index: number) => void
}

export function ImagePreviewModal({
  images,
  currentIndex,
  onClose,
  onNavigate,
}: ImagePreviewModalProps) {
  const currentImage = images[currentIndex]
  const imageUrl = getImageUrl(currentImage)

  // 鍵盤導航
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft' && currentIndex > 0) onNavigate(currentIndex - 1)
      if (e.key === 'ArrowRight' && currentIndex < images.length - 1) onNavigate(currentIndex + 1)
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [currentIndex, images.length, onClose, onNavigate])

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent level={1} className="max-w-5xl p-0 bg-black/95 border-none">
        <VisuallyHidden>
          <DialogTitle>{COMP_EDITOR_LABELS.PREVIEW_8043}</DialogTitle>
          <DialogDescription>{COMP_EDITOR_LABELS.PREVIEW_331}</DialogDescription>
        </VisuallyHidden>
        <div className="relative">
          {/* 關閉按鈕 */}
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 z-10 p-2 bg-black/50 hover:bg-black/70 rounded-full text-white transition-colors"
          >
            <X size="1.25em" />
          </button>

          {/* 圖片 */}
          <div className="flex items-center justify-center min-h-[60vh] p-4">
            <img
              src={imageUrl}
              alt={`圖片 ${currentIndex + 1}`}
              className="max-w-full max-h-[80vh] object-contain rounded-lg"
            />
          </div>

          {/* 導航按鈕 */}
          {images.length > 1 && (
            <>
              {currentIndex > 0 && (
                <button
                  type="button"
                  onClick={() => onNavigate(currentIndex - 1)}
                  className="absolute left-4 top-1/2 -translate-y-1/2 p-3 bg-black/50 hover:bg-black/70 rounded-full text-white transition-colors"
                >
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <polyline points="15,18 9,12 15,6" />
                  </svg>
                </button>
              )}
              {currentIndex < images.length - 1 && (
                <button
                  type="button"
                  onClick={() => onNavigate(currentIndex + 1)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 p-3 bg-black/50 hover:bg-black/70 rounded-full text-white transition-colors"
                >
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <polyline points="9,6 15,12 9,18" />
                  </svg>
                </button>
              )}
            </>
          )}

          {/* 計數器 */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-3 py-1 bg-black/50 rounded-full text-white text-sm">
            {currentIndex + 1} / {images.length}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// 圖片位置編輯器
interface ImagePositionEditorProps {
  image: string | DailyImage
  onSave: (position: string) => void
  onClose: () => void
}

export function ImagePositionEditor({ image, onSave, onClose }: ImagePositionEditorProps) {
  const imageUrl = getImageUrl(image)
  const initialPosition = getImagePosition(image)

  const containerRef = useRef<HTMLDivElement>(null)
  const [position, setPosition] = useState(initialPosition)
  const [isDragging, setIsDragging] = useState(false)

  // 解析 position 字串為百分比
  const parsePosition = (pos: string): { x: number; y: number } => {
    // 處理預設關鍵字
    const keywords: Record<string, { x: number; y: number }> = {
      center: { x: 50, y: 50 },
      top: { x: 50, y: 0 },
      bottom: { x: 50, y: 100 },
      left: { x: 0, y: 50 },
      right: { x: 100, y: 50 },
      'center top': { x: 50, y: 0 },
      'center bottom': { x: 50, y: 100 },
      'left top': { x: 0, y: 0 },
      'right top': { x: 100, y: 0 },
      'left bottom': { x: 0, y: 100 },
      'right bottom': { x: 100, y: 100 },
    }

    if (keywords[pos]) return keywords[pos]

    // 解析百分比格式 "50% 30%"
    const match = pos.match(/(\d+)%?\s+(\d+)%?/)
    if (match) {
      return { x: parseInt(match[1]), y: parseInt(match[2]) }
    }

    return { x: 50, y: 50 }
  }

  const { x, y } = parsePosition(position)

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !containerRef.current) return

    const rect = containerRef.current.getBoundingClientRect()
    const newX = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100))
    const newY = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100))

    setPosition(`${Math.round(newX)}% ${Math.round(newY)}%`)
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  // 快速預設位置
  const presetPositions = [
    { label: COMP_EDITOR_LABELS.置中, value: 'center' },
    { label: COMP_EDITOR_LABELS.上方, value: 'center top' },
    { label: COMP_EDITOR_LABELS.下方, value: 'center bottom' },
    { label: COMP_EDITOR_LABELS.左上, value: 'left top' },
    { label: COMP_EDITOR_LABELS.右上, value: 'right top' },
    { label: COMP_EDITOR_LABELS.左下, value: 'left bottom' },
    { label: COMP_EDITOR_LABELS.右下, value: 'right bottom' },
  ]

  return (
    <div className="space-y-4">
      {/* 預覽區域 */}
      <div className="relative">
        <p className="text-sm text-morandi-secondary mb-2">{COMP_EDITOR_LABELS.LABEL_7288}</p>
        {/* 模擬橫向裁切框 */}
        <div
          ref={containerRef}
          className="relative w-full aspect-[16/9] bg-foreground rounded-lg overflow-hidden cursor-crosshair"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          <img
            src={imageUrl}
            alt={COMP_EDITOR_LABELS.調整位置}
            className="w-full h-full object-cover"
            style={{ objectPosition: position }}
            draggable={false}
          />
          {/* 定位點指示器 */}
          <div
            className="absolute w-6 h-6 bg-morandi-gold border-2 border-white rounded-full shadow-lg transform -translate-x-1/2 -translate-y-1/2 pointer-events-none"
            style={{ left: `${x}%`, top: `${y}%` }}
          />
          {/* 網格線 */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute left-1/3 top-0 bottom-0 w-px bg-card/20" />
            <div className="absolute left-2/3 top-0 bottom-0 w-px bg-card/20" />
            <div className="absolute top-1/3 left-0 right-0 h-px bg-card/20" />
            <div className="absolute top-2/3 left-0 right-0 h-px bg-card/20" />
          </div>
        </div>
      </div>

      {/* 快速預設按鈕 */}
      <div className="flex flex-wrap gap-2">
        {presetPositions.map(preset => (
          <button
            key={preset.value}
            type="button"
            onClick={() => setPosition(preset.value)}
            className={`px-3 py-1.5 text-xs rounded-lg border transition-colors ${
              position === preset.value
                ? 'bg-morandi-gold text-white border-morandi-gold'
                : 'bg-card text-morandi-secondary border-morandi-container hover:border-morandi-gold'
            }`}
          >
            {preset.label}
          </button>
        ))}
      </div>

      {/* 目前位置值 */}
      <div className="text-xs text-morandi-secondary">
        目前位置：<code className="bg-morandi-container/50 px-2 py-0.5 rounded">{position}</code>
      </div>

      {/* 操作按鈕 */}
      <div className="flex justify-end gap-2 pt-2 border-t border-morandi-container">
        <Button type="button" variant="ghost" className="gap-1" onClick={onClose}>
          <X size="1em" />
          {COMP_EDITOR_LABELS.取消}
        </Button>
        <Button variant="soft-gold" type="button" onClick={() => onSave(position)}>
          <Check size="1em" className="mr-1" />
          {COMP_EDITOR_LABELS.LABEL_4550}
        </Button>
      </div>
    </div>
  )
}
