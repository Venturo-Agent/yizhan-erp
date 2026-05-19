'use client'

/**
 * ClosingReportDialog — 結案報告 in-app 預覽 Dialog（HTML 版、仿出納單）
 *
 * 設計：
 * - 直接 render `<PrintTourClosingPreview>` HTML、A4 比例容器
 * - 「列印並結案」用 iframe-print 模式（同 DisbursementPrintDialog）
 *   印出來跟畫面一致、不再走 jsPDF
 * - 對應 William 的概念：「按下『列印』 = 確認結案」
 */

import { useCallback, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Printer, X} from 'lucide-react'
import { toast } from 'sonner'
import { logger } from '@/lib/utils/logger'
import {
  PrintTourClosingPreview,
  type PrintTourClosingPreviewProps,
} from './PrintTourClosingPreview'

import { Spinner } from '@/components/ui/spinner'
const COMPONENT_LABELS = {
  PRINT_FAILED: '列印失敗、請再試一次',
  CLOSE_TOUR_FAILED: '結案失敗、請再試一次',
} as const

interface ClosingReportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  data: PrintTourClosingPreviewProps | null
  /**
   * 按下「列印並結案」時呼叫。獎金不在此處結算、改用 bonus_pending 模型 —
   * 結案只把獎金寫入 bonus_pending、HR 後續在「獎金結算」頁勾選結算。
   * 外部負責 write-pending + updateTour({status: CLOSED})。
   */
  onConfirmClose: () => Promise<void>
  /** 已經結案 → 按鈕變「列印」、不再觸發結案 */
  alreadyClosed?: boolean
}

export function ClosingReportDialog({
  open,
  onOpenChange,
  data,
  onConfirmClose,
  alreadyClosed = false,
}: ClosingReportDialogProps) {
  const t = useTranslations('tour')
  const printRef = useRef<HTMLDivElement>(null)
  const [confirming, setConfirming] = useState(false)

  // 用 iframe 列印（同 DisbursementPrintDialog 模式、最穩定）
  const triggerPrint = useCallback(() => {
    if (!printRef.current) return false

    const iframe = document.createElement('iframe')
    iframe.style.position = 'absolute'
    iframe.style.width = '0'
    iframe.style.height = '0'
    iframe.style.border = 'none'
    iframe.style.left = '-9999px'
    document.body.appendChild(iframe)

    const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document
    if (!iframeDoc) {
      document.body.removeChild(iframe)
      return false
    }

    iframeDoc.open()
    iframeDoc.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>結帳明細報表 - ${data?.tour.code || ''}</title>
        <style>
          @page { size: A4 portrait; margin: 10mm; }
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang TC", "Microsoft JhengHei", sans-serif;
            font-size: 12px;
            line-height: 1.4;
            color: #4B5563;
            background: white;
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }
          table { width: 100%; border-collapse: collapse; }
          th, td { vertical-align: middle; }
        </style>
      </head>
      <body>
        ${printRef.current.innerHTML}
      </body>
      </html>
    `)
    iframeDoc.close()

    setTimeout(() => {
      iframe.contentWindow?.focus()
      iframe.contentWindow?.print()
      setTimeout(() => {
        document.body.removeChild(iframe)
      }, 1000)
    }, 100)

    return true
  }, [data?.tour.code])

  const handlePrintAndClose = async () => {
    setConfirming(true)
    try {
      const ok = triggerPrint()
      if (!ok) {
        toast.error(COMPONENT_LABELS.PRINT_FAILED)
        return
      }
      if (!alreadyClosed) {
        await onConfirmClose()
      }
      onOpenChange(false)
    } catch (err) {
      logger.error('列印並結案失敗', err)
      // caller 已自己 toast（err.handled = true）時、不要再蓋一層通用失敗訊息
      const handled = typeof err === 'object' && err !== null && 'handled' in err && (err as { handled?: boolean }).handled
      if (!handled) {
        toast.error(COMPONENT_LABELS.CLOSE_TOUR_FAILED)
      }
    } finally {
      setConfirming(false)
    }
  }

  const handlePrintOnly = () => {
    triggerPrint()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        level={1}
        className="w-[95vw] max-w-[1100px] h-[90vh] overflow-hidden flex flex-col p-0"
      >
        <DialogHeader className="flex-shrink-0 px-6 py-4 border-b bg-morandi-bg">
          <DialogTitle className="text-lg">
            {t('closingReportTitle')}
            {data?.tour.code ? ` — ${data.tour.code}` : ''}
            {data?.tour.name ? ` ${data.tour.name}` : ''}
          </DialogTitle>
        </DialogHeader>

        {/* 預覽區 — A4 比例容器 */}
        <div className="flex-1 overflow-auto bg-morandi-container/40 p-4 flex items-start justify-center">
          {!data ? (
            <div className="h-full flex items-center justify-center text-morandi-secondary">
              <Spinner size="md" className="mr-2" />
              {t('closingReportLoading')}
            </div>
          ) : (
            <div
              className="shadow-lg bg-white"
              style={{
                width: '210mm',
                minHeight: '297mm',
                maxWidth: '100%',
              }}
            >
              <PrintTourClosingPreview ref={printRef} {...data} />
            </div>
          )}
        </div>

        <DialogFooter className="px-6 py-4 border-t flex sm:justify-between items-center gap-2">
          <p className="text-xs text-morandi-secondary mr-auto">
            {alreadyClosed
              ? '此團已結案、可重新列印報告'
              : '按下「列印並結案」= 開啟瀏覽器列印 + 把此團標記為結案、獎金寫入 bonus_pending、後續由 HR 在「獎金結算」頁勾選結算'}
          </p>
          <div className="flex gap-2">
            <Button variant="soft-gold" onClick={() => onOpenChange(false)} disabled={confirming}>
              <X className="h-4 w-4 mr-2" />
              {t('closingReportCancel')}
            </Button>
            {alreadyClosed ? (
              <Button onClick={handlePrintOnly} disabled={!data}>
                <Printer className="h-4 w-4 mr-2" />
                {t('closingReportPrint')}
              </Button>
            ) : (
              <Button onClick={handlePrintAndClose} disabled={!data || confirming}>
                {confirming ? (
                  <Spinner size="md" className="mr-2" />
                ) : (
                  <Printer className="h-4 w-4 mr-2" />
                )}
                {t('closingReportPrintAndClose')}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
