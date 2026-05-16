import { logger } from '@/lib/utils/logger'
/**
 * 通用列印服務
 *
 * 使用 iframe 列印，確保：
 * 1. 只列印內容，不列印頁面 UI
 * 2. 正確的 A4 尺寸
 * 3. 統一的字體和樣式
 */

interface PrintOptions {
  /** 文件標題 */
  title?: string
  /** 紙張方向 */
  orientation?: 'portrait' | 'landscape'
  /** 邊距（mm） */
  margin?: number
  /** 額外的 CSS */
  extraStyles?: string
  /** 字體大小（pt） */
  fontSize?: number
}

const DEFAULT_OPTIONS: PrintOptions = {
  title: '列印文件',
  orientation: 'portrait',
  margin: 10,
  fontSize: 12,
}

/**
 * 使用 iframe 列印 HTML 內容
 *
 * @example
 * ```tsx
 * import { printHtml } from '@/lib/print/print-service'
 *
 * const handlePrint = () => {
 *   printHtml(contentRef.current.innerHTML, {
 *     title: '合約',
 *     orientation: 'portrait',
 *   })
 * }
 * ```
 */
export function printHtml(html: string, options: PrintOptions = {}): void {
  const opts = { ...DEFAULT_OPTIONS, ...options }

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

  // 寫入完整的 HTML 文件
  iframeDoc.open()
  iframeDoc.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>${opts.title}</title>
      <style>
        @page {
          size: A4 ${opts.orientation};
          margin: ${opts.margin}mm;
        }

        * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }

        body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang TC", "Microsoft JhengHei", "Noto Sans TC", sans-serif;
          font-size: ${opts.fontSize}px;
          line-height: 1.5;
          color: #000;
          background: white;
          print-color-adjust: exact;
          -webkit-print-color-adjust: exact;
        }

        table {
          width: 100%;
          border-collapse: collapse;
        }

        th, td {
          vertical-align: top;
          padding: 4px 8px;
        }

        /* 確保圖片不會太大 */
        img {
          max-width: 100%;
          height: auto;
        }

        /* 分頁控制 */
        .page-break {
          page-break-after: always;
        }

        .no-break {
          page-break-inside: avoid;
        }

        ${opts.extraStyles || ''}
      </style>
    </head>
    <body>
      ${html}
    </body>
    </html>
  `)
  iframeDoc.close()

  // 等待載入後列印
  setTimeout(() => {
    iframe.contentWindow?.print()
    // 列印完成後移除 iframe
    setTimeout(() => {
      document.body.removeChild(iframe)
    }, 1000)
  }, 100)
}

/**
 * 從 ref 元素列印
 */
function _printElement(element: HTMLElement | null, options: PrintOptions = {}): void {
  if (!element) {
    logger.warn('[printElement] Element is null')
    return
  }
  printHtml(element.innerHTML, options)
}
