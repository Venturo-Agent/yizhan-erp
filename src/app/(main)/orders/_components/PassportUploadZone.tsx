'use client'
/**
 * PassportUploadZone - 護照上傳區域組件
 * 從 AddMemberDialog 拆分出來
 *
 * 功能：
 * - 檔案拖放上傳
 * - 檔案預覽
 * - 圖片編輯（使用統一 ImageEditor）
 * - 批次辨識按鈕
 */

import React, { useState, useCallback } from 'react'
import { Upload, X, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { ProcessedFile } from '../_types/order-member.types'
import { ImageEditor, type ImageEditorSettings } from '@/components/ui/image-editor'
import { useTranslations } from 'next-intl'

interface PassportUploadZoneProps {
  processedFiles: ProcessedFile[]
  isUploading: boolean
  isDragging: boolean
  isProcessing: boolean
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  onDragOver: (e: React.DragEvent<HTMLLabelElement>) => void
  onDragLeave: (e: React.DragEvent<HTMLLabelElement>) => void
  onDrop: (e: React.DragEvent<HTMLLabelElement>) => void
  onRemoveFile: (index: number) => void
  onBatchUpload: () => void
  /** 可選：更新檔案預覽（用於圖片增強後） */
  onUpdateFilePreview?: (index: number, newPreview: string) => void
}

export function PassportUploadZone({
  processedFiles,
  isUploading,
  isDragging,
  isProcessing,
  onFileChange,
  onDragOver,
  onDragLeave,
  onDrop,
  onRemoveFile,
  onBatchUpload,
  onUpdateFilePreview,
}: PassportUploadZoneProps) {
  const t = useTranslations('orders')
  // 圖片編輯狀態
  const [enhancingIndex, setEnhancingIndex] = useState<number | null>(null)
  const [showEditor, setShowEditor] = useState(false)

  // 開啟圖片編輯
  const handleOpenEditor = useCallback(
    (index: number) => {
      const file = processedFiles[index]
      if (file && !file.isPdf) {
        setEnhancingIndex(index)
        setShowEditor(true)
      }
    },
    [processedFiles]
  )

  // 關閉編輯器
  const handleCloseEditor = useCallback(() => {
    setShowEditor(false)
    setEnhancingIndex(null)
  }, [])

  // ImageEditor onSave（保留設定，此處不需要額外處理）
  const handleEditorSave = useCallback((_settings: ImageEditorSettings) => {
    // 設定保留由 ImageEditor 內部管理
  }, [])

  // ImageEditor onCropAndSave（裁切後更新預覽）
  const handleEditorCropAndSave = useCallback(
    (blob: Blob, _settings: ImageEditorSettings) => {
      if (enhancingIndex !== null && onUpdateFilePreview) {
        const reader = new FileReader()
        reader.onload = () => {
          if (typeof reader.result === 'string') {
            onUpdateFilePreview(enhancingIndex, reader.result)
          }
        }
        reader.readAsDataURL(blob)
      }
      handleCloseEditor()
    },
    [enhancingIndex, onUpdateFilePreview, handleCloseEditor]
  )

  return (
    <>
      {/* 圖片編輯器（統一使用 ImageEditor） */}
      {enhancingIndex !== null && processedFiles[enhancingIndex] && (
        <ImageEditor
          open={showEditor}
          onClose={handleCloseEditor}
          imageSrc={processedFiles[enhancingIndex].preview}
          onSave={handleEditorSave}
          onCropAndSave={handleEditorCropAndSave}
        />
      )}
      <div className="space-y-3">
        <h4 className="text-sm font-medium text-morandi-primary">
          {t('ocrBatch')}
        </h4>
        <p className="text-xs text-morandi-muted">{t('ocrUploadDesc')}</p>
        <p className="text-xs text-morandi-gold">{t('ocrBlurHint')}</p>

        {/* 拖放區域 */}
        <label
          className={`
          flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-lg cursor-pointer transition-colors
          ${isDragging ? 'border-morandi-blue bg-morandi-blue/5' : 'border-border hover:border-morandi-blue/50'}
          ${isProcessing ? 'opacity-50 pointer-events-none' : ''}
        `}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
        >
          <input
            type="file"
            accept="image/*,.pdf"
            multiple
            onChange={onFileChange}
            className="hidden"
            disabled={isProcessing}
          />
          <Upload size={24} className="text-morandi-muted mb-2" />
          <span className="text-sm text-morandi-muted">
            {isProcessing
              ? t('processing')
              : t('uploadDropOrClick')}
          </span>
          <span className="text-xs text-morandi-muted mt-1">{t('ocrFormatHint')}</span>
        </label>

        {/* 已選擇的檔案預覽 */}
        {processedFiles.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-morandi-secondary">
                {t('filesSelected', { count: processedFiles.length })}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => processedFiles.forEach((_, i) => onRemoveFile(i))}
                className="text-morandi-muted hover:text-status-danger"
              >
                {t('clearAll')}
              </Button>
            </div>

            {/* 辨識按鈕移到照片上方 */}
            <Button
              onClick={onBatchUpload}
              disabled={isUploading || processedFiles.length === 0}
              className="w-full"
            >
              {isUploading ? (
                <>
                  <span className="animate-spin mr-2">⏳</span>
                  {t('recognizing')}
                </>
              ) : (
                <>
                  <Upload size={16} className="mr-2" />
                  {t('startOcr', { count: processedFiles.length })}
                </>
              )}
            </Button>

            <div className="grid grid-cols-4 gap-2 max-h-40 overflow-y-auto">
              {processedFiles.map((pf, index) => (
                <div key={index} className="relative group">
                  <img
                    src={pf.preview}
                    alt={pf.originalName}
                    className="w-full h-16 object-cover rounded border border-border cursor-pointer hover:border-morandi-gold transition-colors"
                    onClick={() => !pf.isPdf && handleOpenEditor(index)}
                    title={
                      pf.isPdf
                        ? t('pdfNotSupportEnhance')
                        : t('imageEnhanceClick')
                    }
                  />
                  {/* 刪除按鈕 */}
                  <button
                    onClick={e => {
                      e.stopPropagation()
                      onRemoveFile(index)
                    }}
                    className="absolute -top-1 -right-1 w-4 h-4 bg-status-danger text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X size={10} />
                  </button>
                  {/* 編輯按鈕（非 PDF） */}
                  {!pf.isPdf && onUpdateFilePreview && (
                    <button
                      onClick={e => {
                        e.stopPropagation()
                        handleOpenEditor(index)
                      }}
                      className="absolute -top-1 -left-1 w-5 h-5 bg-morandi-gold text-white rounded-full flex items-center justify-center shadow-sm hover:bg-morandi-gold-hover transition-colors"
                      title={t('imageEnhanceSharpen')}
                    >
                      <Sparkles size={10} />
                    </button>
                  )}
                  {pf.isPdf && (
                    <span className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-[0.471rem] text-center py-0.5">
                      {t('pdfLabel')}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  )
}
