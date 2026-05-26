'use client'

import React, { useState, useCallback, useRef, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { ZoomIn, ZoomOut, RotateCcw, Move } from 'lucide-react'
import { UI_LABELS } from './constants/labels'

// 圖片位置設定的型別
export interface ImagePositionSettings {
  x: number // 水平位置 0-100 (百分比，50 = 置中)
  y: number // 垂直位置 0-100 (百分比，50 = 置中)
  scale: number // 縮放比例 1-3 (1 = 原始大小)
}

// 預設值
const defaultImagePosition: ImagePositionSettings = {
  x: 50,
  y: 50,
  scale: 1,
}

// 將設定轉換為 CSS style
export function getImagePositionStyle(
  settings?: ImagePositionSettings | string | null
): React.CSSProperties {
  // 相容舊格式 (字串如 'center', 'top', 'center 30%')
  if (!settings) {
    return { objectFit: 'cover', objectPosition: 'center' }
  }

  if (typeof settings === 'string') {
    // 嘗試解析 JSON 字串
    if (settings.startsWith('{')) {
      try {
        const parsed = JSON.parse(settings) as ImagePositionSettings
        const { x, y, scale } = parsed
        return {
          objectFit: 'cover',
          objectPosition: `${x}% ${y}%`,
          transform: scale !== 1 ? `scale(${scale})` : undefined,
          transformOrigin: `${x}% ${y}%`,
        }
      } catch {
        // 解析失敗，當作一般字串處理
      }
    }
    return { objectFit: 'cover', objectPosition: settings }
  }

  const { x, y, scale } = settings
  return {
    objectFit: 'cover',
    objectPosition: `${x}% ${y}%`,
    transform: scale !== 1 ? `scale(${scale})` : undefined,
    transformOrigin: `${x}% ${y}%`,
  }
}

// 解析舊格式字串為新格式
function parseImagePosition(value?: string | ImagePositionSettings | null): ImagePositionSettings {
  if (!value) return { ...defaultImagePosition }

  if (typeof value === 'object') {
    return {
      x: value.x ?? 50,
      y: value.y ?? 50,
      scale: value.scale ?? 1,
    }
  }

  // 嘗試解析 JSON 字串
  if (value.startsWith('{')) {
    try {
      const parsed = JSON.parse(value) as ImagePositionSettings
      return {
        x: parsed.x ?? 50,
        y: parsed.y ?? 50,
        scale: parsed.scale ?? 1,
      }
    } catch {
      // 解析失敗，繼續處理其他格式
    }
  }

  // 解析舊的字串格式
  if (value === 'center') return { x: 50, y: 50, scale: 1 }
  if (value === 'top') return { x: 50, y: 0, scale: 1 }
  if (value === 'bottom') return { x: 50, y: 100, scale: 1 }

  // 解析 'center 30%' 格式
  const match = value.match(/(\d+)%/)
  if (match) {
    return { x: 50, y: parseInt(match[1]), scale: 1 }
  }

  return { ...defaultImagePosition }
}

interface ImagePositionEditorProps {
  open: boolean
  onClose: () => void
  imageSrc: string
  currentPosition?: ImagePositionSettings | string | null
  onConfirm: (settings: ImagePositionSettings) => void
  aspectRatio?: number // 預覽框的比例，預設 16/9
  title?: string
}

export function ImagePositionEditor({
  open,
  onClose,
  imageSrc,
  currentPosition,
  onConfirm,
  aspectRatio = 16 / 9,
  title = '調整圖片顯示',
}: ImagePositionEditorProps) {
  const initialSettings = parseImagePosition(currentPosition)
  const [position, setPosition] = useState<ImagePositionSettings>(initialSettings)
  const [isDragging, setIsDragging] = useState(false)
  const previewRef = useRef<HTMLDivElement>(null)
  const dragStartRef = useRef({ x: 0, y: 0, posX: 0, posY: 0 })

  // 開啟時重置為當前設定
  useEffect(() => {
    if (open) {
      setPosition(parseImagePosition(currentPosition))
    }
  }, [open, currentPosition])

  const handleReset = useCallback(() => {
    setPosition({ ...defaultImagePosition })
  }, [])

  const handleConfirm = useCallback(() => {
    onConfirm(position)
    onClose()
  }, [position, onConfirm, onClose])

  // 拖曳開始
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      setIsDragging(true)
      dragStartRef.current = {
        x: e.clientX,
        y: e.clientY,
        posX: position.x,
        posY: position.y,
      }
    },
    [position]
  )

  // 拖曳中
  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging || !previewRef.current) return

      const rect = previewRef.current.getBoundingClientRect()
      const deltaX = e.clientX - dragStartRef.current.x
      const deltaY = e.clientY - dragStartRef.current.y

      // 將像素位移轉換為百分比（反向移動，因為是移動圖片而非視窗）
      const percentX = (deltaX / rect.width) * 100
      const percentY = (deltaY / rect.height) * 100

      // 縮放越大，移動範圍越大
      const moveMultiplier = position.scale

      setPosition(prev => ({
        ...prev,
        x: Math.max(0, Math.min(100, dragStartRef.current.posX - percentX * moveMultiplier)),
        y: Math.max(0, Math.min(100, dragStartRef.current.posY - percentY * moveMultiplier)),
      }))
    },
    [isDragging, position.scale]
  )

  // 拖曳結束
  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
  }, [])

  // 綁定全域事件
  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('mouseup', handleMouseUp)
      return () => {
        window.removeEventListener('mousemove', handleMouseMove)
        window.removeEventListener('mouseup', handleMouseUp)
      }
    }
  }, [isDragging, handleMouseMove, handleMouseUp])

  return (
    <Dialog open={open} onOpenChange={isOpen => !isOpen && onClose()}>
      <DialogContent level={1} className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* 預覽區域 */}
          <div
            ref={previewRef}
            className="relative bg-black rounded-lg overflow-hidden cursor-move select-none"
            style={{ aspectRatio: aspectRatio }}
            onMouseDown={handleMouseDown}
          >
            <img
              src={imageSrc}
              alt={UI_LABELS.PREVIEW}
              className="w-full h-full object-cover pointer-events-none"
              style={{
                objectPosition: `${position.x}% ${position.y}%`,
                transform: `scale(${position.scale})`,
                transformOrigin: `${position.x}% ${position.y}%`,
              }}
              draggable={false}
            />
            {/* 拖曳提示 */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div
                className={`bg-black/50 text-white px-3 py-1.5 rounded-full text-sm flex items-center gap-2 transition-opacity ${isDragging ? 'opacity-0' : 'opacity-70'}`}
              >
                <Move size="0.875em" />
                {UI_LABELS.LABEL_4538}
              </div>
            </div>
          </div>

          {/* 控制區 */}
          <div className="space-y-3">
            {/* 縮放控制 */}
            <div className="flex items-center gap-3">
              <ZoomOut size="1em" className="text-morandi-secondary flex-shrink-0" />
              <Slider
                value={[position.scale]}
                min={1}
                max={3}
                step={0.1}
                onValueChange={values => setPosition(prev => ({ ...prev, scale: values[0] }))}
                className="flex-1"
              />
              <ZoomIn size="1em" className="text-morandi-secondary flex-shrink-0" />
              <span className="text-xs text-morandi-secondary w-12 text-right flex-shrink-0">
                {Math.round(position.scale * 100)}%
              </span>
            </div>

            {/* 快速位置按鈕 */}
            <div className="flex gap-2 justify-center flex-wrap">
              {[
                { label: '左上', x: 0, y: 0 },
                { label: '上', x: 50, y: 0 },
                { label: '右上', x: 100, y: 0 },
                { label: '左', x: 0, y: 50 },
                { label: '置中', x: 50, y: 50 },
                { label: '右', x: 100, y: 50 },
                { label: '左下', x: 0, y: 100 },
                { label: '下', x: 50, y: 100 },
                { label: '右下', x: 100, y: 100 },
              ].map(preset => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => setPosition(prev => ({ ...prev, x: preset.x, y: preset.y }))}
                  className={`px-2 py-1 text-xs rounded transition-colors ${
                    position.x === preset.x && position.y === preset.y
                      ? 'bg-morandi-gold text-white'
                      : 'bg-morandi-container hover:bg-morandi-container/80 text-morandi-primary'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>

            {/* 操作按鈕 */}
            <div className="flex items-center justify-between pt-2">
              <Button
                type="button"
                variant="soft-gold"
                size="sm"
                onClick={handleReset}
                className="gap-1"
              >
                <RotateCcw size="0.875em" />
                {UI_LABELS.LABEL_8406}
              </Button>

              <div className="flex gap-2">
                <Button type="button" variant="soft-gold" onClick={onClose}>
                  {UI_LABELS.CANCEL}
                </Button>
                <Button variant="soft-gold" type="button" onClick={handleConfirm}>
                  {UI_LABELS.LABEL_4550}
                </Button>
              </div>
            </div>
          </div>

          {/* 提示文字 */}
          <p className="text-xs text-morandi-secondary text-center">{UI_LABELS.LABEL_5032}</p>
        </div>
      </DialogContent>
    </Dialog>
  )
}
