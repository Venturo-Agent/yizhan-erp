'use client'

import React from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { RotateCcw, RotateCw, FlipHorizontal, Move, Sun, Crop, Scan } from 'lucide-react'
import { cn } from '@/lib/utils'
import { AdjustmentSlider } from './AdjustmentSlider'
import {
  type ImageAdjustments,
  type ImageEditorSettings,
  type EditorMode,
  DEFAULT_ADJUSTMENTS,
} from './types'

interface ImageEditorControlsPanelProps {
  settings: ImageEditorSettings
  hasCornerOffsets: boolean
  hasAdjustments: boolean
  onModeChange: (mode: EditorMode) => void
  onResetCornerOffsets: () => void
  onRotateLeft: () => void
  onRotateRight: () => void
  onFlipH: () => void
  onFineRotationChange: (value: number) => void
  onResetTransform: () => void
  onAdjustmentChange: (key: keyof ImageAdjustments, value: number) => void
  onResetAdjustments: () => void
}

export function ImageEditorControlsPanel({
  settings,
  hasCornerOffsets,
  hasAdjustments,
  onModeChange,
  onResetCornerOffsets,
  onRotateLeft,
  onRotateRight,
  onFlipH,
  onFineRotationChange,
  onResetTransform,
  onAdjustmentChange,
  onResetAdjustments,
}: ImageEditorControlsPanelProps) {
  const t = useTranslations('imageEditor')

  return (
    <div className="w-72 border-l border-border flex flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* 模式切換 */}
        <div className="space-y-3">
          <h4 className="text-xs uppercase tracking-wider text-morandi-muted font-semibold">
            編輯模式
          </h4>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onModeChange('crop')}
              className={cn(
                'flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded transition-colors text-xs',
                settings.mode === 'crop'
                  ? 'bg-morandi-gold/20 text-morandi-gold'
                  : 'bg-morandi-container hover:bg-morandi-gold/10 hover:text-morandi-gold'
              )}
              title="裁切模式：4 角侷限矩形"
            >
              <Crop size="0.875em" />
              裁切
            </button>
            <button
              type="button"
              onClick={() => onModeChange('perspective')}
              className={cn(
                'flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded transition-colors text-xs',
                settings.mode === 'perspective'
                  ? 'bg-morandi-gold/20 text-morandi-gold'
                  : 'bg-morandi-container hover:bg-morandi-gold/10 hover:text-morandi-gold'
              )}
              title="視角校正：4 角自由拖、輸出時拉直"
            >
              <Scan size="0.875em" />
              視角校正
            </button>
          </div>
          {/* 5/14 William 拍板拔 aspect ratio toggle (free / 3:2 / 4:3)
              理由：「不要無端限制客戶」、大頭貼 / 護照場景未來真的需要再加 */}
          {hasCornerOffsets && (
            <Button
              type="button"
              variant="soft-gold"
              size="sm"
              onClick={onResetCornerOffsets}
              className="w-full gap-1.5 text-xs"
            >
              <RotateCcw size="0.75em" />
              重置 4 角
            </Button>
          )}
        </div>

        {/* 變換工具 */}
        <div className="space-y-3">
          <h4 className="text-xs uppercase tracking-wider text-morandi-muted font-semibold flex items-center gap-2">
            <Move size="0.75em" />
            {t('transform')}
          </h4>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onRotateLeft}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded bg-morandi-container hover:bg-morandi-gold/10 hover:text-morandi-gold transition-colors text-xs"
              title={t('rotateLeft')}
            >
              <RotateCcw size="0.875em" />
              {t('rotateLeft')}
            </button>
            <button
              type="button"
              onClick={onRotateRight}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded bg-morandi-container hover:bg-morandi-gold/10 hover:text-morandi-gold transition-colors text-xs"
              title={t('rotateRight')}
            >
              <RotateCw size="0.875em" />
              {t('rotateRight')}
            </button>
            <button
              type="button"
              onClick={onFlipH}
              className={cn(
                'flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded transition-colors text-xs',
                settings.flipH
                  ? 'bg-morandi-gold/20 text-morandi-gold'
                  : 'bg-morandi-container hover:bg-morandi-gold/10 hover:text-morandi-gold'
              )}
              title={t('flipHorizontal')}
            >
              <FlipHorizontal size="0.875em" />
              {t('flipHorizontal')}
            </button>
          </div>
          {/* 水平微調拉桿 (-45 ~ +45 度) — 5/14 William 加 */}
          <AdjustmentSlider
            label="水平調整"
            value={settings.fineRotation}
            onChange={onFineRotationChange}
            min={-45}
            max={45}
          />
          {(settings.rotation !== 0 || settings.flipH || settings.fineRotation !== 0) && (
            <Button
              type="button"
              variant="soft-gold"
              size="sm"
              onClick={onResetTransform}
              className="w-full gap-1.5 text-xs"
            >
              <RotateCcw size="0.75em" />
              {t('resetTransform')}
            </Button>
          )}
        </div>

        {/* 調整滑軌 */}
        <div className="space-y-4">
          <h4 className="text-xs uppercase tracking-wider text-morandi-muted font-semibold flex items-center gap-2">
            <Sun size="0.75em" />
            {t('light')}
          </h4>
          <AdjustmentSlider
            label={t('exposure')}
            value={settings.adjustments.exposure}
            onChange={v => onAdjustmentChange('exposure', v)}
          />
          <AdjustmentSlider
            label={t('contrast')}
            value={settings.adjustments.contrast}
            onChange={v => onAdjustmentChange('contrast', v)}
          />
          <AdjustmentSlider
            label={t('highlights')}
            value={settings.adjustments.highlights}
            onChange={v => onAdjustmentChange('highlights', v)}
          />
          <AdjustmentSlider
            label={t('shadows')}
            value={settings.adjustments.shadows}
            onChange={v => onAdjustmentChange('shadows', v)}
          />
        </div>

        <div className="space-y-4">
          <h4 className="text-xs uppercase tracking-wider text-morandi-muted font-semibold">
            {t('effects')}
          </h4>
          <AdjustmentSlider
            label={t('clarity')}
            value={settings.adjustments.clarity}
            onChange={v => onAdjustmentChange('clarity', v)}
          />
        </div>

        {hasAdjustments && (
          <Button
            type="button"
            variant="soft-gold"
            size="sm"
            onClick={onResetAdjustments}
            className="w-full gap-1.5 text-xs"
          >
            <RotateCcw size="0.75em" />
            {t('resetAdjustments')}
          </Button>
        )}
      </div>
    </div>
  )
}
