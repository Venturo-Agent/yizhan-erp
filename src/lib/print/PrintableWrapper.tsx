'use client'
/**
 * PrintableWrapper - 共用列印包裝元件
 *
 * 統一快速報價單和團體報價單的列印結構
 */

import React, { useState, useEffect, ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { PrintHeader } from './PrintHeader'
import { PrintFooter } from './PrintFooter'
import { PrintControls } from './PrintControls'
import { usePrintLogo } from './usePrintLogo'

// 列印專用樣式 - 用 #print-overlay 前綴提高優先級，避免被 globals.css 覆蓋
const PRINT_CSS = `
  @media print {
    /* 隱藏頁面其他元素 */
    body > *:not(#print-overlay) {
      display: none !important;
    }

    /* 重置 overlay */
    #print-overlay {
      position: static !important;
      inset: auto !important;
      width: 100% !important;
      height: auto !important;
      background: transparent !important;
      padding: 0 !important;
      margin: 0 !important;
      display: block !important;
      z-index: 1 !important;
    }

    /* 重置內部容器 — 用高優先級覆蓋 globals.css 的 div { padding: 0 } */
    #print-overlay > div {
      max-width: 100% !important;
      max-height: none !important;
      overflow: visible !important;
      border-radius: 0 !important;
      box-shadow: none !important;
      margin: 0 !important;
      padding: 0 !important;
    }

    /* 隱藏控制按鈕和螢幕版本 */
    #print-overlay .print-controls,
    #print-overlay .screen-only {
      display: none !important;
    }

    /* 顯示列印版本 — #print-overlay 前綴覆蓋 globals.css 的 .print-only { display: block } */
    #print-overlay .print-only {
      display: table !important;
      visibility: visible !important;
      width: 100% !important;
      height: 100vh !important;
    }

    #print-overlay .print-only * {
      visibility: visible !important;
    }

    #print-overlay .print-only thead {
      display: table-header-group !important;
    }

    /* tfoot 僅作佔位（預留頁尾空間），不顯示內容 */
    #print-overlay .print-only tfoot {
      display: table-footer-group !important;
    }
    #print-overlay .print-only tfoot td > * {
      visibility: hidden !important;
    }

    /* 固定頁尾 — position:fixed 讓每頁底部都出現 */
    #print-overlay .print-fixed-footer {
      display: block !important;
      visibility: visible !important;
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      padding: 0 10mm;
      background: white;
    }
    #print-overlay .print-fixed-footer * {
      visibility: visible !important;
    }

    #print-overlay .print-only tbody {
      display: table-row-group !important;
    }

    #print-overlay .print-only tbody > tr > td {
      vertical-align: top;
      height: 100% !important;
    }

    /* 內容區域 — 覆蓋 globals.css 的 #print-content { position: absolute } */
    #print-overlay #print-content {
      position: static !important;
      padding: 0 !important;
      margin: 0 !important;
      width: 100% !important;
      background: white !important;
      z-index: auto !important;
    }

    /* 頁面設定 */
    @page {
      size: A4;
      margin: 10mm 12mm 10mm 10mm;
    }

    /* 表格設定 */
    #print-overlay table {
      max-width: 100% !important;
      table-layout: fixed !important;
    }

    #print-overlay td,
    #print-overlay th {
      word-break: break-word;
      overflow-wrap: break-word;
    }
  }
`

interface PrintableWrapperProps {
  isOpen: boolean
  onClose: () => void
  onPrint: () => void
  title: string
  subtitle?: string
  children: ReactNode
}

export const PrintableWrapper: React.FC<PrintableWrapperProps> = ({
  isOpen,
  onClose,
  onPrint,
  title,
  subtitle = 'QUOTATION',
  children,
}) => {
  const [isMounted, setIsMounted] = useState(false)
  const logoUrl = usePrintLogo(isOpen)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  // ESC 鍵關閉
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen || !isMounted) return null

  return createPortal(
    /* eslint-disable venturo/no-custom-modal -- 列印預覽需要使用 createPortal */
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-8"
      onClick={onClose}
      id="print-overlay"
    >
      <style>{PRINT_CSS}</style>

      <div
        className="bg-card rounded-lg max-w-[1000px] w-full max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="print-controls">
          <PrintControls onClose={onClose} onPrint={onPrint} />
        </div>

        <div className="bg-card p-8" id="print-content">
          {/* 列印版本 */}
          <table className="print-only hidden w-full border-collapse">
            <thead>
              <tr>
                <td>
                  <PrintHeader logoUrl={logoUrl} title={title} subtitle={subtitle} />
                </td>
              </tr>
            </thead>

            <tfoot>
              <tr>
                <td>
                  {/* 佔位用，實際頁尾由 print-fixed-footer 顯示 */}
                  <PrintFooter />
                </td>
              </tr>
            </tfoot>

            <tbody>
              <tr>
                <td>{children}</td>
              </tr>
            </tbody>
          </table>

          {/* 固定頁尾 — 每頁底部都顯示 */}
          <div className="print-fixed-footer hidden">
            <PrintFooter />
          </div>

          {/* 螢幕版本 */}
          <div className="screen-only">
            <PrintHeader logoUrl={logoUrl} title={title} subtitle={subtitle} />
            {children}
            <div className="text-center mt-8 pt-4" style={{ borderTop: '1px solid var(--border)' }}>
              <PrintFooter />
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}
