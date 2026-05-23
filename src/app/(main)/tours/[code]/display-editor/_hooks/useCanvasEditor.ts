'use client'

/**
 * Canvas 編輯狀態 hook
 *
 * 職責：
 * - 維護 canvas state（業務改完馬上反映畫面）
 * - 改動觸發 1500ms debounce、自動 PUT 草稿
 * - 對外暴露 saveStatus：'saved' | 'pending' | 'saving' | 'error'
 * - 失敗 toast、不靜默
 *
 * 為什麼分這層出來：
 * - page.tsx 只關心畫面、不該管 debounce / timer
 * - 同樣 pattern 之後可以給「行程編輯 tab」共用
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { logger } from '@/lib/utils/logger'
import type { Canvas } from '@/components/canvas-renderer/types'
import { putDisplayCanvas } from './useDisplayCanvasApi'

export type SaveStatus = 'saved' | 'pending' | 'saving' | 'error'

// debounce window：1500ms 業務拍板「打字停下來才寫」
const DEBOUNCE_MS = 1500

export interface UseCanvasEditorOptions {
  code: string
  initialCanvas: Canvas | null
  // 第一次載入時的 updated_at（沒 row 就是 null）
  initialUpdatedAt: string | null
}

export interface UseCanvasEditorReturn {
  canvas: Canvas | null
  setCanvas: (next: Canvas) => void
  saveStatus: SaveStatus
  lastSavedAt: string | null
  // 立即儲存（不等 debounce、給「發布」按鈕用、確保草稿是最新）
  flushNow: () => Promise<void>
}

export function useCanvasEditor({
  code,
  initialCanvas,
  initialUpdatedAt,
}: UseCanvasEditorOptions): UseCanvasEditorReturn {
  const [canvas, setCanvasState] = useState<Canvas | null>(initialCanvas)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('saved')
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(initialUpdatedAt)

  // 用 ref 持有最新 canvas、避免 debounce closure 抓到舊值
  const canvasRef = useRef<Canvas | null>(initialCanvas)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  // 第一次載入不該觸發儲存（state 跟 server 一致）
  const skipNextSaveRef = useRef<boolean>(true)

  // 載入新 initialCanvas 時重設（譬如換 tour）
  useEffect(() => {
    canvasRef.current = initialCanvas
    setCanvasState(initialCanvas)
    setLastSavedAt(initialUpdatedAt)
    setSaveStatus('saved')
    skipNextSaveRef.current = true
  }, [initialCanvas, initialUpdatedAt])

  // 卸載時清掉 timer
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
        timerRef.current = null
      }
    }
  }, [])

  const doSave = useCallback(
    async (target: Canvas): Promise<void> => {
      setSaveStatus('saving')
      try {
        const res = await putDisplayCanvas(code, target)
        setSaveStatus('saved')
        setLastSavedAt(res.updated_at)
      } catch (err) {
        setSaveStatus('error')
        const message = err instanceof Error ? err.message : '儲存失敗'
        logger.error('display-canvas PUT failed', err)
        toast.error(`儲存失敗：${message}`)
      }
    },
    [code]
  )

  const scheduleSave = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
    setSaveStatus('pending')
    timerRef.current = setTimeout(() => {
      timerRef.current = null
      const target = canvasRef.current
      if (!target) return
      void doSave(target)
    }, DEBOUNCE_MS)
  }, [doSave])

  const setCanvas = useCallback(
    (next: Canvas) => {
      canvasRef.current = next
      setCanvasState(next)
      if (skipNextSaveRef.current) {
        // 第一次 setCanvas 是 hydrate、不算 dirty
        skipNextSaveRef.current = false
        return
      }
      scheduleSave()
    },
    [scheduleSave]
  )

  const flushNow = useCallback(async () => {
    // 把還沒到 1500ms 的 pending change 立刻寫掉、給「發布」按鈕用
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
    const target = canvasRef.current
    if (!target) return
    if (saveStatus === 'saved') return
    await doSave(target)
  }, [doSave, saveStatus])

  return {
    canvas,
    setCanvas,
    saveStatus,
    lastSavedAt,
    flushNow,
  }
}
