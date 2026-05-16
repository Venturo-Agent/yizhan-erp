'use client'

import React, { useState, useCallback, useRef, useEffect, useLayoutEffect, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Check, Loader2, Crop } from 'lucide-react'
import { cn } from '@/lib/utils'
import { alert } from '@/lib/ui/alert-dialog'
import { logger } from '@/lib/utils/logger'
import { toast } from 'sonner'

// 拆分模組
import { AdjustmentSlider } from './AdjustmentSlider'
import { applyAdjustmentsToImage, applyTransformToImage, perspectiveCropImage } from './image-utils'
import { CropFrame } from './CropFrame'
import { cornerOffsetsToPreviewMatrix } from './perspective-math'
import {
  type ImageAdjustments,
  type ImageEditorSettings,
  type CornerOffsets,
  type EditorMode,
  DEFAULT_ADJUSTMENTS,
  DEFAULT_SETTINGS,
  DEFAULT_CORNER_OFFSETS,
  DEFAULT_PERSPECTIVE_CORNER_OFFSETS,
} from './types'
import {
  loadStoredAdjustments,
  saveStoredAdjustments,
  clearStoredAdjustments,
} from './adjustments-storage'
import { ImageEditorControlsPanel } from './ImageEditorControlsPanel'

// Re-export types
export type { ImageEditorSettings } from './types'

// ============ Props ============

interface ImageEditorProps {
  open: boolean
  onClose: () => void
  imageSrc: string
  /** 初始設定 */
  initialSettings?: Partial<ImageEditorSettings>
  /** 存檔（保留設定可再調整） */
  onSave: (settings: ImageEditorSettings) => void
  /** 裁切並存檔（輸出最終圖片）
   *  5/14：William 拍板按下不關 dialog、user 可繼續調 / 反覆套用 */
  onCropAndSave?: (blob: Blob, settings: ImageEditorSettings) => void
}

// ============ Component ============

export function ImageEditor({
  open,
  onClose,
  imageSrc,
  initialSettings,
  onSave,
  onCropAndSave,
}: ImageEditorProps) {
  const t = useTranslations('imageEditor')
  const tCommon = useTranslations('common')
  const tMessages = useTranslations('messages')

  // 設定狀態
  // adjustments 來源優先順序：initialSettings.adjustments（譬如 DB 已存）> localStorage（user 上次的）> DEFAULT
  const [settings, setSettings] = useState<ImageEditorSettings>(() => ({
    ...DEFAULT_SETTINGS,
    ...initialSettings,
    rotation: initialSettings?.rotation ?? 0,
    flipH: initialSettings?.flipH ?? false,
    fineRotation: initialSettings?.fineRotation ?? 0,
    adjustments: {
      ...DEFAULT_ADJUSTMENTS,
      ...(loadStoredAdjustments() ?? {}),
      ...initialSettings?.adjustments,
    },
    mode: initialSettings?.mode ?? 'crop',
    cornerOffsets: initialSettings?.cornerOffsets ?? { ...DEFAULT_CORNER_OFFSETS },
  }))

  // UI 狀態
  const [isProcessing, setIsProcessing] = useState(false)
  // 5/14：internalSrc 是「當前編輯起點」、套用裁切後會被 cropped 結果替換
  // 後續 rotation / fineRotation / 色彩調整 都基於 internalSrc 算
  const [internalSrc, setInternalSrc] = useState(imageSrc)
  const [transformedSrc, setTransformedSrc] = useState(imageSrc)
  const [previewSrc, setPreviewSrc] = useState(imageSrc)
  const [viewportSize, setViewportSize] = useState({ width: 1, height: 1 })

  // Refs
  const previewRef = useRef<HTMLDivElement>(null)

  // 開啟時重置（rotation / 4 角歸零；adjustments 沿用 user 上次的或 DB initial）
  useEffect(() => {
    if (open) {
      setSettings({
        ...DEFAULT_SETTINGS,
        ...initialSettings,
        rotation: initialSettings?.rotation ?? 0,
        flipH: initialSettings?.flipH ?? false,
        fineRotation: initialSettings?.fineRotation ?? 0,
        adjustments: {
          ...DEFAULT_ADJUSTMENTS,
          ...(loadStoredAdjustments() ?? {}),
          ...initialSettings?.adjustments,
        },
        mode: initialSettings?.mode ?? 'crop',
        cornerOffsets: initialSettings?.cornerOffsets ?? { ...DEFAULT_CORNER_OFFSETS },
      })
      setInternalSrc(imageSrc)
      setTransformedSrc(imageSrc)
      setPreviewSrc(imageSrc)
    }
  }, [open, imageSrc, initialSettings])

  // 旋轉/翻轉/微調變換預覽 — 基於 internalSrc（套用裁切後會被替換）
  useEffect(() => {
    let cancelled = false
    async function applyTransform() {
      const transformed = await applyTransformToImage(
        internalSrc,
        settings.rotation,
        settings.flipH,
        settings.fineRotation
      )
      if (!cancelled) {
        setTransformedSrc(transformed)
      }
    }
    applyTransform().catch(err => logger.error('[applyTransform]', err))
    return () => {
      cancelled = true
    }
  }, [internalSrc, settings.rotation, settings.flipH, settings.fineRotation])

  // 色彩調整預覽（debounce）- 使用已變換的圖片作為來源
  useEffect(() => {
    const timeout = setTimeout(async () => {
      try {
        const processed = await applyAdjustmentsToImage(transformedSrc, settings.adjustments)
        setPreviewSrc(processed)
      } catch (err) {
        logger.error('[ImageEditor] applyAdjustments', err)
      }
    }, 150)
    return () => clearTimeout(timeout)
  }, [transformedSrc, settings.adjustments])

  // ResizeObserver 追蹤預覽 viewport size — useLayoutEffect 確保 mount 同步量、
  // 避免「dialog 開的瞬間 viewportSize 還是 (1,1) → previewTransform 退化 → 圖看起來沒變」
  useLayoutEffect(() => {
    if (!open) return
    const el = previewRef.current
    if (!el) return
    const update = () => {
      const rect = el.getBoundingClientRect()
      if (rect.width > 0 && rect.height > 0) {
        setViewportSize({ width: rect.width, height: rect.height })
      }
    }
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [open])

  // ============ 調整滑軌 ============
  const handleAdjustmentChange = useCallback((key: keyof ImageAdjustments, value: number) => {
    setSettings(prev => {
      const nextAdjustments = { ...prev.adjustments, [key]: value }
      saveStoredAdjustments(nextAdjustments)
      return { ...prev, adjustments: nextAdjustments }
    })
  }, [])

  const handleResetAdjustments = useCallback(() => {
    clearStoredAdjustments()
    setSettings(prev => ({
      ...prev,
      adjustments: { ...DEFAULT_ADJUSTMENTS },
    }))
  }, [])

  // ============ 旋轉/翻轉 ============
  const handleRotateLeft = useCallback(() => {
    setSettings(prev => ({
      ...prev,
      rotation: (prev.rotation - 90 + 360) % 360,
      // 旋轉時、4 角重置（避免錯位）
      cornerOffsets: { ...DEFAULT_CORNER_OFFSETS },
    }))
  }, [])

  const handleRotateRight = useCallback(() => {
    setSettings(prev => ({
      ...prev,
      rotation: (prev.rotation + 90) % 360,
      cornerOffsets: { ...DEFAULT_CORNER_OFFSETS },
    }))
  }, [])

  const handleFlipH = useCallback(() => {
    setSettings(prev => ({
      ...prev,
      flipH: !prev.flipH,
      cornerOffsets: { ...DEFAULT_CORNER_OFFSETS },
    }))
  }, [])

  const handleFineRotationChange = useCallback((value: number) => {
    setSettings(prev => ({ ...prev, fineRotation: value }))
  }, [])

  const handleResetTransform = useCallback(() => {
    setSettings(prev => ({
      ...prev,
      rotation: 0,
      flipH: false,
      fineRotation: 0,
      scale: 1,
      x: 50,
      y: 50,
      cornerOffsets: { ...DEFAULT_CORNER_OFFSETS },
    }))
  }, [])

  // ============ 模式 / 4 角 / 比例 ============
  const handleCornerOffsetsChange = useCallback((next: CornerOffsets) => {
    setSettings(prev => ({ ...prev, cornerOffsets: next }))
  }, [])

  const handleModeChange = useCallback((nextMode: EditorMode) => {
    setSettings(prev => ({
      ...prev,
      mode: nextMode,
      // - crop: 貼齊圖邊（=「整張圖、還沒框」、user drag 才開新框）
      // - perspective: inner 15-85（圖立即縮到 inner、user 拖 4 角到外面變形）
      cornerOffsets:
        nextMode === 'perspective'
          ? { ...DEFAULT_PERSPECTIVE_CORNER_OFFSETS }
          : { ...DEFAULT_CORNER_OFFSETS },
    }))
  }, [])

  const handleResetCornerOffsets = useCallback(() => {
    setSettings(prev => ({
      ...prev,
      cornerOffsets:
        prev.mode === 'perspective'
          ? { ...DEFAULT_PERSPECTIVE_CORNER_OFFSETS }
          : { ...DEFAULT_CORNER_OFFSETS },
    }))
  }, [])

  // ============ 存檔 ============
  const handleSave = useCallback(() => {
    onSave(settings)
    onClose()
  }, [settings, onSave, onClose])

  // ============ 套用裁切（內部、不上傳）============
  // 5/14 William：按下「套用裁切」= 把 cropped 結果替換成新編輯起點、user 可繼續調
  // 不 call onCropAndSave、不關 dialog、原 imageSrc 由 internalSrc 取代
  const handleApplyCrop = useCallback(async () => {
    setIsProcessing(true)
    try {
      const blob = await perspectiveCropImage(previewSrc, settings.cornerOffsets)
      const dataUrl: string = await new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result as string)
        reader.onerror = reject
        reader.readAsDataURL(blob)
      })
      setInternalSrc(dataUrl)
      // 重置 4 角 / rotation / flip / fineRotation（這些已經 baked into dataUrl）
      setSettings(prev => ({
        ...prev,
        cornerOffsets:
          prev.mode === 'perspective'
            ? { ...DEFAULT_PERSPECTIVE_CORNER_OFFSETS }
            : { ...DEFAULT_CORNER_OFFSETS },
        rotation: 0,
        flipH: false,
        fineRotation: 0,
      }))
      toast.success('裁切已套用、可繼續編輯')
    } catch (error) {
      logger.error('Apply crop failed:', error)
      void alert(tMessages('saveFailed'), 'error')
    } finally {
      setIsProcessing(false)
    }
  }, [previewSrc, settings.cornerOffsets, settings.mode, tMessages])

  // ============ 儲存並關閉（最終 commit、call onCropAndSave、close）============
  const handleSaveAndClose = useCallback(async () => {
    if (!onCropAndSave) {
      onSave(settings)
      onClose()
      return
    }
    setIsProcessing(true)
    try {
      // 把 previewSrc（含當前未套用的 cornerOffsets / rotation / adjustments）做最終 crop
      const blob = await perspectiveCropImage(previewSrc, settings.cornerOffsets)
      onCropAndSave(blob, settings)
      onClose()
    } catch (error) {
      logger.error('Final save failed:', error)
      void alert(tMessages('saveFailed'), 'error')
    } finally {
      setIsProcessing(false)
    }
  }, [previewSrc, settings, onCropAndSave, onSave, onClose, tMessages])

  // 檢查調整是否有變更
  const hasAdjustments = Object.entries(settings.adjustments).some(
    ([key, value]) => value !== DEFAULT_ADJUSTMENTS[key as keyof ImageAdjustments]
  )

  const hasCornerOffsets = useMemo(() => {
    const c = settings.cornerOffsets
    const d = DEFAULT_CORNER_OFFSETS
    return (
      c.tl.x !== d.tl.x || c.tl.y !== d.tl.y ||
      c.tr.x !== d.tr.x || c.tr.y !== d.tr.y ||
      c.br.x !== d.br.x || c.br.y !== d.br.y ||
      c.bl.x !== d.bl.x || c.bl.y !== d.bl.y
    )
  }, [settings.cornerOffsets])

  // perspective 預覽：forward distort（src=原圖4角 → dst=cornerOffsets 拖到的位置）
  // 預設 perspective default = inner 15-85、進視角校正立即套 transform、圖縮到中央 70%
  // user 拖 4 角 / 邊到 viewport 邊緣 = 整張圖跟著變形（Photoshop Distort 風格）
  const previewTransform = useMemo(() => {
    if (settings.mode !== 'perspective' || !hasCornerOffsets) return undefined
    // viewport 還沒 ResizeObserver 量好（< 10px）→ 不算 transform、避免縮成 1px 黑底
    if (viewportSize.width < 10 || viewportSize.height < 10) return undefined
    return cornerOffsetsToPreviewMatrix(settings.cornerOffsets, viewportSize.width, viewportSize.height)
  }, [settings.mode, settings.cornerOffsets, viewportSize.width, viewportSize.height, hasCornerOffsets])

  return (
    <Dialog open={open} onOpenChange={isOpen => !isOpen && onClose()}>
      <DialogContent level={3} className="max-w-4xl max-h-[90vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-6 py-4 border-b border-border">
          <DialogTitle>{t('title')}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-1 min-h-0 overflow-hidden">
          {/* 左邊：預覽區 */}
          <div className="flex-1 p-6 bg-black/5 flex items-center justify-center">
            <div
              ref={previewRef}
              className="relative bg-black rounded-lg overflow-hidden select-none"
              style={{
                width: '100%',
                aspectRatio: '4 / 3',
                maxHeight: '100%',
              }}
            >
              <img
                src={previewSrc}
                alt={tCommon('preview')}
                className="w-full h-full object-contain pointer-events-none"
                style={
                  previewTransform
                    ? {
                        transform: previewTransform,
                        transformOrigin: '0 0',
                      }
                    : undefined
                }
                draggable={false}
              />

              {/* CropFrame 內部依 mode 切 UI：
                  crop = 滑鼠在圖上 drag 框出矩形 / perspective = 4 角自由拖曳 */}
              <CropFrame
                cornerOffsets={settings.cornerOffsets}
                onChange={handleCornerOffsetsChange}
                mode={settings.mode}
                viewportWidth={viewportSize.width}
                viewportHeight={viewportSize.height}
              />
            </div>
          </div>

          {/* 右邊：調整面板（拆至 ImageEditorControlsPanel） */}
          <ImageEditorControlsPanel
            settings={settings}
            hasCornerOffsets={hasCornerOffsets}
            hasAdjustments={hasAdjustments}
            onModeChange={handleModeChange}
            onResetCornerOffsets={handleResetCornerOffsets}
            onRotateLeft={handleRotateLeft}
            onRotateRight={handleRotateRight}
            onFlipH={handleFlipH}
            onFineRotationChange={handleFineRotationChange}
            onResetTransform={handleResetTransform}
            onAdjustmentChange={handleAdjustmentChange}
            onResetAdjustments={handleResetAdjustments}
          />
        </div>

        {/* 底部按鈕 — 5/14 重新設計：
            「套用裁切」= 內部 commit 替換編輯起點、不關 dialog（user 可繼續調曝光 / 視角）
            「儲存並關閉」= 最終 onCropAndSave + close */}
        <div className="px-6 py-4 border-t border-border flex items-center justify-end gap-3">
          <Button type="button" variant="soft-gold" onClick={onClose} disabled={isProcessing}>
            {tCommon('cancel')}
          </Button>
          {onCropAndSave && hasCornerOffsets && (
            <Button
              variant="soft-gold"
              type="button"
              onClick={handleApplyCrop}
              disabled={isProcessing}
              className="gap-1.5"
              title="套用裁切後可繼續編輯曝光 / 視角矯正"
            >
              {isProcessing ? <Loader2 size="0.875em" className="animate-spin" /> : <Crop size="0.875em" />}
              套用裁切
            </Button>
          )}
          <Button
            variant="default"
            type="button"
            onClick={handleSaveAndClose}
            disabled={isProcessing}
            className="gap-1.5"
          >
            {isProcessing ? <Loader2 size="0.875em" className="animate-spin" /> : <Check size="0.875em" />}
            儲存並關閉
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
