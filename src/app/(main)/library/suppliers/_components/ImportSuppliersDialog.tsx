'use client'

/**
 * 供應商批次匯入 Dialog
 *
 * 流程：選擇檔案 → 解析預覽 → 確認匯入
 */

import { Upload, Download, FileSpreadsheet, ArrowLeft } from 'lucide-react'
import { useTranslations } from 'next-intl'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { useSupplierImport } from './useSupplierImport'
import { ImportSuppliersPreviewStep } from './ImportSuppliersPreviewStep'

// ─── Props ───────────────────────────────────────────────

interface ImportSuppliersDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

// ─── Component ───────────────────────────────────────────

export function ImportSuppliersDialog({ open, onOpenChange }: ImportSuppliersDialogProps) {
  const t = useTranslations('library')

  const handleClose = () => {
    onOpenChange(false)
    setTimeout(resetState, 200)
  }

  const {
    step,
    parsed_rows,
    global_errors,
    selected_file,
    is_importing,
    file_input_ref,
    preview_data,
    error_count,
    valid_count,
    resetState,
    handleFileChange,
    handleDrop,
    handleDragOver,
    handleDownloadTemplate,
    handleImport,
  } = useSupplierImport(handleClose)

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent level={1} className="max-w-5xl max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-morandi-sky" />
            {t('supplierImportTitle')}
          </DialogTitle>
          <DialogDescription>{t('supplierImportDescription')}</DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4">
          {step === 'upload' && (
            <>
              {/* 上傳區域 */}
              <div
                className="border-2 border-dashed border-morandi-secondary/30 rounded-lg p-8 text-center cursor-pointer hover:border-morandi-sky/50 transition-colors"
                onClick={() => file_input_ref.current?.click()}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
              >
                <Upload className="mx-auto h-10 w-10 text-morandi-secondary/50 mb-3" />
                <p className="text-sm text-morandi-primary font-medium">
                  {t('supplierImportFileDrop')}
                </p>
                <p className="text-xs text-morandi-secondary mt-1">{t('supplierImportFileHint')}</p>
                <input
                  ref={file_input_ref}
                  type="file"
                  accept=".xlsx,.csv"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </div>

              {/* 下載模板 */}
              <div className="flex justify-center">
                <Button
                  variant="soft-gold"
                  size="sm"
                  onClick={handleDownloadTemplate}
                  className="gap-2"
                >
                  <Download size={16} />
                  下載模板
                </Button>
              </div>
            </>
          )}

          {step === 'preview' && (
            <ImportSuppliersPreviewStep
              preview_data={preview_data}
              global_errors={global_errors}
              parsed_rows_count={parsed_rows.length}
              error_count={error_count}
              selected_file={selected_file}
            />
          )}
        </div>

        {/* 底部按鈕 */}
        <div className="flex justify-between gap-2 pt-4 border-t">
          <div>
            {step === 'preview' && (
              <Button variant="soft-gold" size="sm" onClick={resetState} className="gap-2">
                <ArrowLeft size={16} />
                {t('supplierImportBtnBack')}
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="soft-gold" size="sm" onClick={handleClose}>
              {t('supplierImportBtnCancel')}
            </Button>
            {step === 'preview' && (
              <Button
                variant="soft-gold"
                size="sm"
                onClick={handleImport}
                disabled={is_importing || valid_count === 0}
                className="gap-2"
              >
                <Upload size={16} />
                {is_importing
                  ? t('supplierImportBtnImporting')
                  : `${t('supplierImportBtnImport')}（${valid_count} 筆）`}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
