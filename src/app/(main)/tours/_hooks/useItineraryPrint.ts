'use client'

/**
 * useItineraryPrint — 行程表 iframe 列印邏輯 hook
 *
 * 從 TourItineraryTab 抽出，提供：
 * - printContentRef：掛在可列印區塊的 ref
 * - handlePrint：觸發 iframe 列印（含 A4 CSS + Tailwind fallback）
 */

import { useRef, useCallback } from 'react'

interface UseItineraryPrintParams {
  title: string
  tourName?: string
}

export function useItineraryPrint({ title, tourName }: UseItineraryPrintParams) {
  const printContentRef = useRef<HTMLDivElement>(null)

  const handlePrint = useCallback(() => {
    if (!printContentRef.current) return

    const originalTitle = document.title
    const printTitle = `${title || tourName || '行程表'}`
    document.title = printTitle

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
      document.title = originalTitle
      return
    }

    iframeDoc.open()
    iframeDoc.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>${printTitle}</title>
        <style>
          @page { size: A4; margin: 10mm; }
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang TC", "Microsoft JhengHei", sans-serif;
            font-size: 14px;
            line-height: 1.5;
            color: #333;
            background: white;
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }
          .print-container { padding: 16px; }
          h1 { font-size: 20px; font-weight: bold; color: #4a4a4a; }
          .header-bar { border-bottom: 2px solid #B8A99A; padding-bottom: 12px; margin-bottom: 20px; }
          .header-top { display: flex; justify-content: space-between; align-items: flex-start; }
          .workspace-code { font-size: 14px; font-weight: 600; color: #B8A99A; }
          .meta-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; margin-top: 12px; font-size: 13px; }
          .meta-label { color: #999; }
          .flight-section { margin-bottom: 20px; display: grid; grid-template-columns: 1fr 1fr; gap: 16px; font-size: 13px; }
          .flight-title { font-weight: 600; color: #B8A99A; margin-bottom: 6px; }
          .flight-info { color: #666; }
          .flight-info span.bold { font-weight: 500; color: #4a4a4a; }
          table { width: 100%; border-collapse: collapse; font-size: 13px; }
          thead tr { background-color: #B8A99A !important; color: white; }
          th { padding: 8px 10px; text-align: left; border: 1px solid rgba(184,169,154,0.5); font-weight: 600; }
          th.center { text-align: center; }
          td { padding: 8px 10px; border: 1px solid #e5e5e5; }
          td.center { text-align: center; }
          tr:nth-child(even) { background-color: #fafafa; }
          .day-label { font-weight: 600; color: #B8A99A; }
          .day-date { font-size: 11px; color: #999; }
          .footer { margin-top: 24px; text-align: center; font-size: 11px; color: #ccc; border-top: 1px solid #eee; padding-top: 12px; }
          svg { display: none; }
          /* Tailwind utility fallbacks — iframe 沒有 Tailwind，必須 inline 補上列印中用到的 class */
          .grid { display: grid; }
          .grid-cols-3 { grid-template-columns: repeat(3, minmax(0, 1fr)); }
          .flex { display: flex; }
          .items-center { align-items: center; }
          .gap-2 { gap: 0.5rem; }
          .px-0 { padding-left: 0; padding-right: 0; }
          .px-3 { padding-left: 0.75rem; padding-right: 0.75rem; }
          .py-1\\.5 { padding-top: 0.375rem; padding-bottom: 0.375rem; }
          .py-2 { padding-top: 0.5rem; padding-bottom: 0.5rem; }
          .border-l { border-left: 1px solid #e5e5e5; }
          .shrink-0 { flex-shrink: 0; }
          .font-medium { font-weight: 500; }
          .font-semibold { font-weight: 600; }
          .align-middle { vertical-align: middle; }
          .text-center { text-align: center; }
          .text-\\[12px\\] { font-size: 12px; }
          .text-\\[13px\\] { font-size: 13px; }
          .text-muted-foreground { color: #8b8680; }
          .text-morandi-gold { color: #B8A99A; }
          .mr-2 { margin-right: 0.5rem; }
        </style>
      </head>
      <body>
        ${printContentRef.current.innerHTML}
      </body>
      </html>
    `)
    iframeDoc.close()

    setTimeout(() => {
      iframe.contentWindow?.print()
      setTimeout(() => {
        document.body.removeChild(iframe)
        document.title = originalTitle
      }, 1000)
    }, 100)
  }, [title, tourName])

  return { printContentRef, handlePrint }
}
