'use client'

/**
 * CropFrame — 裁切 / 視角校正 overlay
 *
 * 兩種模式 兩種互動：
 * - crop（滑鼠框）：mousedown 在圖上任意位置開始、drag 即時更新矩形、mouseup 完成
 *   - 沒框過時 (cornerOffsets 是 default = 整張圖)、4 角不顯示、user 直接 drag 開新框
 *   - 框完後顯示 4 角拖曳點 + 半透明遮罩、可微調
 * - perspective（4 角自由拖）：4 角各自任意拖動、CropFrame 不限制矩形約束
 *
 * 5/14 重寫：原版 crop 走 4 角拖曳、跟 user 期望「滑鼠框」不符。
 * 5/14 拔 aspect ratio：William「不要無端限制客戶」、永遠自由比例。
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import type { CornerOffsets, EditorMode } from './types'
import { DEFAULT_CORNER_OFFSETS } from './types'

interface CropFrameProps {
  cornerOffsets: CornerOffsets
  onChange: (next: CornerOffsets) => void
  mode: EditorMode
  /** viewport 像素寬度 */
  viewportWidth: number
  /** viewport 像素高度 */
  viewportHeight: number
}

type CornerKey = 'tl' | 'tr' | 'br' | 'bl'

const CORNERS: CornerKey[] = ['tl', 'tr', 'br', 'bl']

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v))
}

/** 判斷 cornerOffsets 是否還是預設（=整張圖、沒框過）*/
function isDefault(c: CornerOffsets): boolean {
  const d = DEFAULT_CORNER_OFFSETS
  return (
    c.tl.x === d.tl.x &&
    c.tl.y === d.tl.y &&
    c.tr.x === d.tr.x &&
    c.tr.y === d.tr.y &&
    c.br.x === d.br.x &&
    c.br.y === d.br.y &&
    c.bl.x === d.bl.x &&
    c.bl.y === d.bl.y
  )
}

/** 由 (x, y, width, height) 百分比建 cornerOffsets（crop 模式用、永遠矩形）*/
function rectToCorners(x: number, y: number, w: number, h: number): CornerOffsets {
  const x2 = x + w
  const y2 = y + h
  return {
    tl: { x, y },
    tr: { x: x2, y },
    br: { x: x2, y: y2 },
    bl: { x, y: y2 },
  }
}

/** crop 模式拖角時、維持矩形約束 */
function applyRectConstraint(
  prev: CornerOffsets,
  movedKey: CornerKey,
  next: { x: number; y: number }
): CornerOffsets {
  const result: CornerOffsets = {
    tl: { ...prev.tl },
    tr: { ...prev.tr },
    br: { ...prev.br },
    bl: { ...prev.bl },
  }
  result[movedKey] = next
  if (movedKey === 'tl') {
    result.tr.y = next.y
    result.bl.x = next.x
  } else if (movedKey === 'tr') {
    result.tl.y = next.y
    result.br.x = next.x
  } else if (movedKey === 'br') {
    result.bl.y = next.y
    result.tr.x = next.x
  } else if (movedKey === 'bl') {
    result.br.y = next.y
    result.tl.x = next.x
  }
  return result
}

export function CropFrame({
  cornerOffsets,
  onChange,
  mode,
  viewportWidth,
  viewportHeight,
}: CropFrameProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [draggingCorner, setDraggingCorner] = useState<CornerKey | null>(null)
  const dragCornerStartRef = useRef<{
    pointerX: number
    pointerY: number
    cornerX: number
    cornerY: number
  } | null>(null)
  // 滑鼠框新框：mousedown 在 viewport 起點（百分比）
  const drawStartRef = useRef<{ x: number; y: number } | null>(null)
  const [isDrawing, setIsDrawing] = useState(false)

  const showCorners = mode === 'perspective' || !isDefault(cornerOffsets)

  // ─── crop 模式：滑鼠在圖上 drag 框出新矩形 ───
  const handleViewportPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (mode !== 'crop') return
      // 只在「沒框過」狀態接受 drag-to-create
      if (!isDefault(cornerOffsets)) return
      const rect = containerRef.current?.getBoundingClientRect()
      if (!rect) return
      const xPct = clamp(((e.clientX - rect.left) / rect.width) * 100, 0, 100)
      const yPct = clamp(((e.clientY - rect.top) / rect.height) * 100, 0, 100)
      drawStartRef.current = { x: xPct, y: yPct }
      setIsDrawing(true)
      ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    },
    [mode, cornerOffsets]
  )

  useEffect(() => {
    if (!isDrawing) return
    function handleMove(e: PointerEvent) {
      const start = drawStartRef.current
      const rect = containerRef.current?.getBoundingClientRect()
      if (!start || !rect) return
      const xPct = clamp(((e.clientX - rect.left) / rect.width) * 100, 0, 100)
      const yPct = clamp(((e.clientY - rect.top) / rect.height) * 100, 0, 100)
      const x1 = Math.min(start.x, xPct)
      const y1 = Math.min(start.y, yPct)
      const w = Math.abs(xPct - start.x)
      const h = Math.abs(yPct - start.y)
      onChange(rectToCorners(x1, y1, w, h))
    }
    function handleUp() {
      setIsDrawing(false)
      drawStartRef.current = null
    }
    window.addEventListener('pointermove', handleMove)
    window.addEventListener('pointerup', handleUp)
    return () => {
      window.removeEventListener('pointermove', handleMove)
      window.removeEventListener('pointerup', handleUp)
    }
  }, [isDrawing, onChange])

  // ─── 4 角拖曳（perspective 模式 + crop 模式微調用）───
  const handleCornerPointerDown = useCallback(
    (key: CornerKey) => (e: React.PointerEvent) => {
      e.preventDefault()
      e.stopPropagation()
      const corner = cornerOffsets[key]
      dragCornerStartRef.current = {
        pointerX: e.clientX,
        pointerY: e.clientY,
        cornerX: corner.x,
        cornerY: corner.y,
      }
      setDraggingCorner(key)
      ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    },
    [cornerOffsets]
  )

  useEffect(() => {
    if (!draggingCorner) return
    function handleMove(e: PointerEvent) {
      if (!dragCornerStartRef.current || !draggingCorner) return
      // 即時量 container size、避免 viewport prop stale (initial 1 害 dxPct 爆炸)
      const rect = containerRef.current?.getBoundingClientRect()
      if (!rect || rect.width < 10 || rect.height < 10) return
      const dx = e.clientX - dragCornerStartRef.current.pointerX
      const dy = e.clientY - dragCornerStartRef.current.pointerY
      const dxPct = (dx / rect.width) * 100
      const dyPct = (dy / rect.height) * 100
      const nextX = clamp(dragCornerStartRef.current.cornerX + dxPct, 0, 100)
      const nextY = clamp(dragCornerStartRef.current.cornerY + dyPct, 0, 100)
      const nextPoint = { x: nextX, y: nextY }

      const nextOffsets: CornerOffsets =
        mode === 'crop'
          ? applyRectConstraint(cornerOffsets, draggingCorner, nextPoint)
          : { ...cornerOffsets, [draggingCorner]: nextPoint }
      onChange(nextOffsets)
    }
    function handleUp() {
      setDraggingCorner(null)
      dragCornerStartRef.current = null
    }
    window.addEventListener('pointermove', handleMove)
    window.addEventListener('pointerup', handleUp)
    return () => {
      window.removeEventListener('pointermove', handleMove)
      window.removeEventListener('pointerup', handleUp)
    }
  }, [draggingCorner, cornerOffsets, onChange, mode])

  // 4 角的 SVG points（百分比）
  const points = `${cornerOffsets.tl.x},${cornerOffsets.tl.y} ${cornerOffsets.tr.x},${cornerOffsets.tr.y} ${cornerOffsets.br.x},${cornerOffsets.br.y} ${cornerOffsets.bl.x},${cornerOffsets.bl.y}`

  // pointer-events：crop 模式 + 還沒框時、整層接 down 等 user drag；其他時候只 4 角接
  const containerPointerEvents = mode === 'crop' && isDefault(cornerOffsets) ? 'auto' : 'none'

  return (
    <div
      ref={containerRef}
      className="absolute inset-0"
      style={{
        pointerEvents: containerPointerEvents,
        cursor: containerPointerEvents === 'auto' ? 'crosshair' : undefined,
      }}
      onPointerDown={handleViewportPointerDown}
      aria-label={mode === 'crop' ? '裁切框（拖滑鼠框出範圍）' : '視角校正框'}
    >
      {/* 框已存在時、render 半透明遮罩 + 邊框 + 4 角 */}
      {showCorners && (
        <>
          <svg
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            className="absolute inset-0 w-full h-full pointer-events-none"
            style={{ overflow: 'visible' }}
          >
            <defs>
              <mask id="crop-mask">
                <rect x="0" y="0" width="100" height="100" fill="white" />
                <polygon points={points} fill="black" />
              </mask>
            </defs>
            <rect
              x="0"
              y="0"
              width="100"
              height="100"
              fill="rgba(0,0,0,0.4)"
              mask="url(#crop-mask)"
            />
            <polygon
              points={points}
              fill="none"
              stroke="#c9aa7c"
              strokeWidth="0.4"
              strokeDasharray={mode === 'perspective' ? '1.5,1' : '0'}
              vectorEffect="non-scaling-stroke"
            />
          </svg>

          {/* 4 角拖曳點 */}
          {CORNERS.map(key => {
            const c = cornerOffsets[key]
            return (
              <button
                key={key}
                type="button"
                aria-label={`角點 ${key}`}
                onPointerDown={handleCornerPointerDown(key)}
                className="absolute cursor-grab active:cursor-grabbing"
                style={{
                  left: `${c.x}%`,
                  top: `${c.y}%`,
                  transform: 'translate(-50%, -50%)',
                  width: 20,
                  height: 20,
                  pointerEvents: 'auto',
                }}
              >
                <span
                  className={`block w-full h-full rounded-full border-2 border-white shadow-md transition-transform ${
                    draggingCorner === key
                      ? 'scale-125 bg-morandi-gold'
                      : 'bg-morandi-gold/90 hover:scale-110'
                  }`}
                />
              </button>
            )
          })}
        </>
      )}

      {/* 還沒框時、提示文字 */}
      {mode === 'crop' && isDefault(cornerOffsets) && !isDrawing && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <span className="text-white/70 text-sm bg-black/40 px-3 py-1.5 rounded-md">
            滑鼠拖曳框出裁切範圍
          </span>
        </div>
      )}
    </div>
  )
}
