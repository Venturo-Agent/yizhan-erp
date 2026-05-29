'use client'
/**
 * PrintableQuickQuote - 快速報價單列印版（使用 iframe 列印）
 */

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { Button } from '@/components/ui/button'
import { X, Printer } from 'lucide-react'
import { Quote, QuickQuoteItem } from '@/types/quote.types'
import { useCompanyInfo } from '@/hooks/useCompanyInfo'
import { PrintFooter } from '@/lib/print'
import { useWorkspaceSettings } from '@/hooks/useWorkspaceSettings'
import { PRINTABLE_QUICK_QUOTE_PRINT_STYLES } from './PrintableQuickQuoteStyles'
import { PrintableQuickQuoteHeader } from './PrintableQuickQuoteHeader'
import { PrintableQuickQuoteInfoGrid } from './PrintableQuickQuoteInfoGrid'
import { PrintableQuickQuoteCostTable } from './PrintableQuickQuoteCostTable'
import { PrintableQuickQuotePayment } from './PrintableQuickQuotePayment'
import { useQuoteBankAccount } from '../_hooks/useQuoteBankAccount'
import { updateQuote } from '@/data/entities/quotes'

interface PrintableQuickQuoteProps {
  quote: Quote
  items: QuickQuoteItem[]
  isOpen: boolean
  onClose: () => void
  onPrint: () => void
}

export const PrintableQuickQuote: React.FC<PrintableQuickQuoteProps> = ({
  quote,
  items,
  isOpen,
  onClose,
  onPrint: _onPrint,
}) => {
  const [isMounted, setIsMounted] = useState(false)
  const printContentRef = useRef<HTMLDivElement>(null)
  const ws = useWorkspaceSettings()
  const { legalName: companyFullName } = useCompanyInfo()
  // 收款帳戶（SSOT 改為 bank_accounts、依報價單解析）2026-05-29
  const { candidates, defaultId, resolveById } = useQuoteBankAccount(quote)
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(
    quote.bank_account_id ?? null
  )
  // 候選載入後、若尚未選擇就帶入預設解析帳戶
  useEffect(() => {
    setSelectedAccountId(prev => prev ?? defaultId)
  }, [defaultId])
  const resolvedAccount = resolveById(selectedAccountId ?? defaultId)
  const handleSelectAccount = (id: string) => {
    setSelectedAccountId(id)
    // 記在報價單上、重印一致（best-effort、失敗不擋列印）
    if (id && id !== quote.bank_account_id && quote.id) {
      void updateQuote(quote.id, { bank_account_id: id }).catch(() => {})
    }
  }
  // Logo URL 直接用 workspace 設定:檔名本身已帶 timestamp(上傳時)、瀏覽器 cache 可放心生效
  // (2026-05-20 拔掉舊版 ?t=Date.now() 那個 cache busting hack、解「按列印太快 logo 還沒載入」race)
  const logoUrl = ws.logo_url || ''

  useEffect(() => {
    setIsMounted(true)
  }, [])

  const totalAmount = items.reduce((sum, item) => sum + item.amount, 0)
  const balanceAmount = totalAmount - (quote.received_amount || 0)

  // 使用 iframe 列印（最可靠的方式）
  const handlePrint = useCallback(() => {
    if (!printContentRef.current) return

    // macOS 列印對話框讀 document.title
    const originalTitle = document.title
    const printTitle = `${quote.customer_name || ''}${quote.tour_code ? '-' + quote.tour_code : ''}-報價單`
    document.title = printTitle

    // 建立隱藏的 iframe
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
      return
    }

    // 寫入列印內容
    iframeDoc.open()
    iframeDoc.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>${quote.customer_name || ''}${quote.tour_code ? '-' + quote.tour_code : ''}-報價單</title>
        <style>${PRINTABLE_QUICK_QUOTE_PRINT_STYLES}</style>
      </head>
      <body>
        ${printContentRef.current.innerHTML}
      </body>
      </html>
    `)
    iframeDoc.close()

    // 等待圖片載入後列印
    const images = iframeDoc.querySelectorAll('img')
    const imagePromises = Array.from(images).map(img => {
      if (img.complete) return Promise.resolve()
      return new Promise(resolve => {
        img.onload = resolve
        img.onerror = resolve
      })
    })

    Promise.all(imagePromises).then(() => {
      setTimeout(() => {
        iframe.contentWindow?.print()
        // 列印對話框關閉後移除 iframe 並恢復標題
        setTimeout(() => {
          document.body.removeChild(iframe)
          document.title = originalTitle
        }, 1000)
      }, 100)
    })
  }, [quote.customer_name, quote.tour_code])

  if (!isOpen || !isMounted) return null

  return createPortal(
    /* eslint-disable venturo/no-custom-modal -- 列印預覽需要使用 createPortal */
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-8"
      onClick={onClose}
    >
      <div
        className="bg-card rounded-lg max-w-[1000px] w-full max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* 控制按鈕 */}
        <div className="flex justify-end items-center gap-2 p-4 border-b">
          {/* 收款帳戶選擇（多個候選才出現；只有一個就不用選） */}
          {candidates.length > 1 && (
            <div className="flex items-center gap-2 mr-auto">
              <span className="text-sm text-morandi-secondary">{'收款帳戶'}</span>
              <select
                value={selectedAccountId ?? defaultId ?? ''}
                onChange={e => handleSelectAccount(e.target.value)}
                className="h-9 rounded-md border border-border bg-card px-2 text-sm"
              >
                {candidates.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.bank_name || '（未填銀行）'}
                    {c.account_number ? ` · ${c.account_number}` : ''}
                  </option>
                ))}
              </select>
            </div>
          )}
          <Button onClick={onClose} variant="soft-gold" className="gap-2">
            <X className="h-4 w-4" />
            {'關閉'}
          </Button>
          <Button variant="soft-gold" onClick={handlePrint} className="gap-2">
            <Printer className="h-4 w-4" />
            {'列印'}
          </Button>
        </div>

        {/* 預覽與列印內容（使用純 inline style，不依賴 Tailwind） */}
        <div style={{ backgroundColor: 'white', padding: '32px' }} ref={printContentRef}>
          {/* Logo 和標題 */}
          <PrintableQuickQuoteHeader
            logoUrl={logoUrl}
            wsName={ws?.name}
            logoScale={ws?.logo_scale}
            logoOffsetX={ws?.logo_offset_x}
            logoOffsetY={ws?.logo_offset_y}
          />

          {/* 客戶資訊 */}
          <PrintableQuickQuoteInfoGrid quote={quote} />

          {/* 收費明細表 + 金額統計 + 公司印章 */}
          <PrintableQuickQuoteCostTable
            quote={quote}
            items={items}
            totalAmount={totalAmount}
            balanceAmount={balanceAmount}
            invoiceSealUrl={ws.invoice_seal_image_url}
          />

          {/* 付款資訊 + 收據資訊 */}
          <PrintableQuickQuotePayment companyFullName={companyFullName} account={resolvedAccount} />

          {/* 頁腳 */}
          <PrintFooter />
        </div>
      </div>
    </div>,
    document.body
  )
}
