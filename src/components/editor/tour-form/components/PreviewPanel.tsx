'use client'

import React, { useState, ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { TOUR_FORM_LABELS } from './constants/labels'

interface PreviewPanelProps {
  children: (viewMode: 'desktop' | 'mobile') => ReactNode
  /** 風格標籤（可選） */
  styleLabel?: string
  /** 風格顏色（可選） */
  styleColor?: string
  /** 預設顯示模式 */
  defaultMode?: 'desktop' | 'mobile'
  /** 額外 className */
  className?: string
}

export function PreviewPanel({
  children,
  styleLabel,
  styleColor,
  defaultMode = 'desktop',
  className,
}: PreviewPanelProps) {
  const [viewMode, setViewMode] = useState<'desktop' | 'mobile'>(defaultMode)

  // 固定縮放比例
  const scale = viewMode === 'mobile' ? 0.7 : 0.5

  return (
    <div className={cn('bg-card flex flex-col w-1/2 min-w-0', className)}>
      {/* 標題列（和主編輯器一致） */}
      <div className="h-14 bg-card border-b border-border px-6 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-semibold text-morandi-primary">
            {TOUR_FORM_LABELS.PREVIEW_2405}
          </h2>
          <div className="flex gap-2 bg-morandi-container/30 rounded-lg p-1">
            <button
              type="button"
              onClick={() => setViewMode('desktop')}
              className={cn(
                'px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
                viewMode === 'desktop'
                  ? 'bg-morandi-gold text-white'
                  : 'text-morandi-secondary hover:text-morandi-primary hover:bg-morandi-container/50'
              )}
            >
              💻 電腦
            </button>
            <button
              type="button"
              onClick={() => setViewMode('mobile')}
              className={cn(
                'px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
                viewMode === 'mobile'
                  ? 'bg-morandi-gold text-white'
                  : 'text-morandi-secondary hover:text-morandi-primary hover:bg-morandi-container/50'
              )}
            >
              📱 手機
            </button>
          </div>
        </div>

        {/* 風格標籤 */}
        {styleLabel && styleColor && (
          <span
            className="px-2 py-1 text-xs rounded-full text-white font-medium"
            style={{ backgroundColor: styleColor }}
          >
            {styleLabel}
          </span>
        )}
      </div>

      {/* 預覽容器 */}
      <div className="flex-1 overflow-auto p-4">
        <div className="w-full h-full flex items-center justify-center">
          {/* 縮放容器 - 固定比例 */}
          <div
            style={{
              transform: `scale(${scale})`,
              transformOrigin: 'center center',
            }}
          >
            {viewMode === 'mobile' ? (
              // 手機框架和內容
              <div className="relative">
                {/* iPhone 14 Pro 尺寸 */}
                {/* eslint-disable-next-line venturo/no-forbidden-classes -- iPhone device frame requires exact pixel border-radius */}
                <div className="bg-black rounded-[45px] p-[8px] shadow-lg">
                  {/* 頂部凹槽 (Dynamic Island) */}
                  <div className="absolute top-[20px] left-1/2 -translate-x-1/2 z-10">
                    <div className="bg-black w-[120px] h-[34px] rounded-full"></div>
                  </div>

                  {/* 螢幕 */}
                  {/* eslint-disable-next-line venturo/no-forbidden-classes -- iPhone screen requires exact pixel border-radius */}
                  <div className="bg-card rounded-[37px] overflow-hidden relative w-[390px] h-[844px]">
                    {/* 內容區域 */}
                    <div className="w-full h-full overflow-y-auto">{children(viewMode)}</div>

                    {/* 底部指示條 */}
                    <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-10">
                      <div className="w-32 h-1 bg-border rounded-full"></div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              // 電腦版
              <div className="bg-card shadow-lg rounded-lg overflow-hidden border border-border w-[1200px] h-[800px]">
                <div className="w-full h-full overflow-y-auto">{children(viewMode)}</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
