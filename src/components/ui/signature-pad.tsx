'use client'

import { useRef, useEffect, useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Eraser, Check } from 'lucide-react'

const COMPONENT_LABELS = {
  PROMPT: '請在下方簽名：',
  HINT: '📱 手機觸控或 🖱️ 滑鼠繪製皆可',
} as const

interface SignaturePadProps {
  onSave: (signatureDataUrl: string) => void
  width?: number
  height?: number
  className?: string
}

export function SignaturePad({
  onSave,
  width = 400,
  height = 200,
  className = '',
}: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [hasSignature, setHasSignature] = useState(false)

  // 初始化 Canvas
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // 設定畫布大小
    const dpr = window.devicePixelRatio || 1
    canvas.width = width * dpr
    canvas.height = height * dpr
    canvas.style.width = `${width}px`
    canvas.style.height = `${height}px`
    ctx.scale(dpr, dpr)

    // 設定筆刷樣式
    ctx.strokeStyle = '#000'
    ctx.lineWidth = 2
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'

    // 填充白色背景
    ctx.fillStyle = '#fff'
    ctx.fillRect(0, 0, width, height)
  }, [width, height])

  // 取得座標（支援觸控和滑鼠）
  const getCoordinates = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }

    const rect = canvas.getBoundingClientRect()

    if ('touches' in e) {
      // 觸控事件
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top,
      }
    } else {
      // 滑鼠事件
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      }
    }
  }, [])

  // 開始繪製
  const startDrawing = useCallback(
    (e: React.TouchEvent | React.MouseEvent) => {
      e.preventDefault()
      const canvas = canvasRef.current
      const ctx = canvas?.getContext('2d')
      if (!ctx) return

      const { x, y } = getCoordinates(e)
      ctx.beginPath()
      ctx.moveTo(x, y)
      setIsDrawing(true)
      setHasSignature(true)
    },
    [getCoordinates]
  )

  // 繪製中
  const draw = useCallback(
    (e: React.TouchEvent | React.MouseEvent) => {
      if (!isDrawing) return
      e.preventDefault()

      const canvas = canvasRef.current
      const ctx = canvas?.getContext('2d')
      if (!ctx) return

      const { x, y } = getCoordinates(e)
      ctx.lineTo(x, y)
      ctx.stroke()
    },
    [isDrawing, getCoordinates]
  )

  // 結束繪製
  const stopDrawing = useCallback(() => {
    setIsDrawing(false)
  }, [])

  // 清除簽名
  const clearSignature = useCallback(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!ctx) return

    ctx.fillStyle = '#fff'
    ctx.fillRect(0, 0, width, height)
    setHasSignature(false)
  }, [width, height])

  // 儲存簽名
  const saveSignature = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas || !hasSignature) return

    const dataUrl = canvas.toDataURL('image/png')
    onSave(dataUrl)
  }, [hasSignature, onSave])

  return (
    <div className={`flex flex-col gap-3 ${className}`}>
      <div className="text-sm text-morandi-secondary mb-1">{COMPONENT_LABELS.PROMPT}</div>

      {/* 簽名區域 - touch-none 防止觸控時縮放/滾動 */}
      <div
        className="border-2 border-dashed border-morandi-gold/50 rounded-lg overflow-hidden bg-card touch-none"
        style={{ touchAction: 'none' }}
      >
        <canvas
          ref={canvasRef}
          className="touch-none cursor-crosshair"
          style={{ width, height, touchAction: 'none' }}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
        />
      </div>

      {/* 操作按鈕 */}
      <div className="flex gap-2 justify-end">
        <Button
          type="button"
          variant="soft-gold"
          size="sm"
          onClick={clearSignature}
          disabled={!hasSignature}
        >
          <Eraser className="w-4 h-4 mr-1" />
          清除
        </Button>
        <Button
          type="button"
          size="sm"
          onClick={saveSignature}
          disabled={!hasSignature}
          className="bg-morandi-gold hover:bg-morandi-gold/90"
        >
          <Check className="w-4 h-4 mr-1" />
          確認簽名
        </Button>
      </div>

      <p className="text-xs text-morandi-secondary text-center">{COMPONENT_LABELS.HINT}</p>
    </div>
  )
}
