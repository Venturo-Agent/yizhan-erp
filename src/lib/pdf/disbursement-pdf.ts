/**
 * 出納單 PDF 生成
 *
 * 功能：
 * 1. 直式 A4 格式（portrait）
 * 2. 按付款對象（供應商）分組
 * 3. 跨請款單合併同一供應商
 * 4. 每組最多 5 筆，超過換頁
 * 5. 每頁小計、最後一頁總計
 * 6. 頁碼（第 X 頁 / 共 Y 頁）
 * 7. 支援中文字體
 *
 * Phase 7（2026-05-17）：
 * - 支援 bankGroups（多銀行出帳），每個 bank group 加粗分隔線標題
 * - paymentRequests / paymentRequestItems 路徑仍保留（舊資料 fallback）
 */

import type { DisbursementOrder, PaymentRequest, PaymentRequestItem } from '@/stores/types'
import { formatDate } from '@/lib/utils'
import { loadChineseFonts } from './pdf-fonts'
import { DISBURSEMENT_PDF_LABELS } from './constants/pdf-labels'

// Phase 7：bank group 外部注入型別
export interface DisbursementPdfBankGroupItem {
  request_code: string | null
  description: string | null
  supplier_name: string | null
  amount: number
}
export interface DisbursementPdfBankGroup {
  bank_label: string   // "玉山銀行（…1234）"
  items: DisbursementPdfBankGroupItem[]
  subtotal: number
}

interface DisbursementPDFData {
  order: DisbursementOrder
  paymentRequests: PaymentRequest[]
  paymentRequestItems: PaymentRequestItem[]
  preparedBy?: string
  /** Phase 7：若有 bankGroups 則優先用多銀行分區渲染，否則走舊 payFor 分組 */
  bankGroups?: DisbursementPdfBankGroup[]
}

interface ProcessedItem {
  requestCode: string
  createdBy: string
  tourName: string
  description: string
  payFor: string
  amount: number
}

interface PayForGroup {
  payFor: string
  items: ProcessedItem[]
  total: number
  hiddenTotal?: boolean
}

/**
 * 處理請款項目
 */
function processItems(
  paymentRequests: PaymentRequest[],
  paymentRequestItems: PaymentRequestItem[]
): ProcessedItem[] {
  const requestMap = new Map(paymentRequests.map(r => [r.id, r]))

  return paymentRequestItems.map(item => {
    const request = requestMap.get(item.request_id)
    const advancedBy = (item as unknown as Record<string, unknown>).advanced_by_name as
      | string
      | undefined
    const supplierName = item.supplier_name || DISBURSEMENT_PDF_LABELS.UNSPECIFIED_SUPPLIER
    const payFor = advancedBy ? `${advancedBy}（${supplierName}）` : supplierName

    return {
      requestCode: request?.code || '-',
      createdBy: request?.created_by_name || '-',
      tourName: request?.tour_name || '-',
      description: item.description || item.category || '-',
      payFor,
      amount: item.subtotal || 0,
    }
  })
}

/**
 * 按付款對象分組
 */
function groupByPayFor(items: ProcessedItem[]): PayForGroup[] {
  const grouped = new Map<string, ProcessedItem[]>()

  for (const item of items) {
    if (!grouped.has(item.payFor)) {
      grouped.set(item.payFor, [])
    }
    grouped.get(item.payFor)!.push(item)
  }

  const groups: PayForGroup[] = Array.from(grouped.entries()).map(([payFor, groupItems]) => ({
    payFor,
    items: groupItems,
    total: groupItems.reduce((sum, item) => sum + item.amount, 0),
  }))

  groups.sort((a, b) => a.payFor.localeCompare(b.payFor, 'zh-TW'))

  return groups
}

/**
 * 提取實際收款人（去掉括號部分）
 */
function extractPayee(payFor: string): string {
  const match = payFor.match(/^([^（]+)/)
  return match ? match[1].trim() : payFor
}

/**
 * 分割大型群組 + 同收款人合併小計
 */
function splitLargeGroups(groups: PayForGroup[], maxSize = 5): PayForGroup[] {
  const result: PayForGroup[] = []

  for (const group of groups) {
    if (group.items.length <= maxSize) {
      result.push(group)
    } else {
      for (let i = 0; i < group.items.length; i += maxSize) {
        const chunk = group.items.slice(i, i + maxSize)
        const isLastChunk = i + maxSize >= group.items.length
        result.push({
          payFor: group.payFor,
          items: chunk,
          total: isLastChunk ? group.total : 0,
          hiddenTotal: !isLastChunk,
        })
      }
    }
  }

  // 計算每個收款人的總金額，並標記誰是最後一組
  const payeeGroups = new Map<string, { total: number; indices: number[] }>()

  result.forEach((group, idx) => {
    const payee = extractPayee(group.payFor)
    if (!payeeGroups.has(payee)) {
      payeeGroups.set(payee, { total: 0, indices: [] })
    }
    const pg = payeeGroups.get(payee)!
    pg.total += group.total
    pg.indices.push(idx)
  })

  // 如果同一個收款人有多個分組，只在最後一組顯示總金額
  payeeGroups.forEach(pg => {
    if (pg.indices.length > 1) {
      // 前面的分組不顯示小計
      pg.indices.slice(0, -1).forEach(idx => {
        result[idx].hiddenTotal = true
      })
      // 最後一組顯示該收款人的總金額
      const lastIdx = pg.indices[pg.indices.length - 1]
      result[lastIdx].total = pg.total
      result[lastIdx].hiddenTotal = false
    }
  })

  return result
}

/**
 * 生成出納單 PDF
 */
export async function generateDisbursementPDF(data: DisbursementPDFData): Promise<Blob> {
  const { order, paymentRequests, paymentRequestItems, preparedBy, bankGroups } = data

  // 動態 import 大型 PDF library（避免 bundle 膨脹）
  const { default: jsPDF } = await import('jspdf')
  const { default: autoTable } = await import('jspdf-autotable')

  // 初始化 PDF - 直式 A4
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  })

  // 載入中文字體
  await loadChineseFonts(doc)

  const pageWidth = doc.internal.pageSize.getWidth()

  // ========== 標題區 ==========
  doc.setFontSize(16)
  doc.setFont('ChironHeiHK', 'bold')
  doc.text(`${DISBURSEMENT_PDF_LABELS.TITLE} ${order.order_number || '-'}`, pageWidth / 2, 18, {
    align: 'center',
  })

  doc.setFontSize(10)
  doc.setFont('ChironHeiHK', 'normal')

  // 出帳日期（左）
  doc.text(
    `${DISBURSEMENT_PDF_LABELS.DISBURSEMENT_DATE}${order.disbursement_date ? formatDate(order.disbursement_date) : '-'}`,
    15,
    27
  )

  // 製表人（右）
  if (preparedBy) {
    doc.text(`${DISBURSEMENT_PDF_LABELS.PREPARED_BY}${preparedBy}`, pageWidth - 15, 27, {
      align: 'right',
    })
  }

  // ========== Phase 7：多銀行分區 vs 舊路徑 ==========
  if (bankGroups && bankGroups.length > 0) {
    // Phase 7 路徑：每個 bank group 繪製一個 section，加粗分隔線
    let currentY = 33

    for (let gi = 0; gi < bankGroups.length; gi++) {
      const group = bankGroups[gi]

      // 分隔線標題（第一個 group 除外）
      if (gi > 0) {
        currentY += 4
        doc.setDrawColor(60, 60, 60)
        doc.setLineWidth(0.6)
        doc.line(15, currentY, pageWidth - 15, currentY)
        currentY += 2
      }

      // 銀行標題文字
      doc.setFontSize(10)
      doc.setFont('ChironHeiHK', 'bold')
      doc.setTextColor(40, 40, 40)
      doc.text(`▍ ${group.bank_label}`, 15, currentY + 5)
      currentY += 9

      // 該 bank group 的表格
      const tableBody: string[][] = group.items.map(item => [
        item.request_code ?? '-',
        item.supplier_name ?? '-',
        item.description ?? '-',
        item.amount.toLocaleString(),
      ])

      autoTable(doc, {
        startY: currentY,
        head: [
          [
            DISBURSEMENT_PDF_LABELS.COL_REQUEST_NO,
            DISBURSEMENT_PDF_LABELS.COL_PAYEE,
            DISBURSEMENT_PDF_LABELS.COL_DESCRIPTION,
            DISBURSEMENT_PDF_LABELS.COL_AMOUNT,
          ],
        ],
        body: tableBody,
        foot: [['小計', '', '', group.subtotal.toLocaleString()]],
        theme: 'grid',
        styles: {
          font: 'ChironHeiHK',
          fontSize: 9,
          cellPadding: { top: 3, right: 3, bottom: 3, left: 3 },
          lineWidth: 0.1,
          lineColor: [200, 200, 200],
          textColor: [60, 60, 60],
          valign: 'middle',
        },
        headStyles: {
          fillColor: [255, 255, 255],
          textColor: [80, 80, 80],
          fontStyle: 'bold',
          lineWidth: { top: 0.3, bottom: 0.3, left: 0, right: 0 },
          lineColor: [150, 150, 150],
        },
        footStyles: {
          fillColor: [248, 248, 248],
          textColor: [80, 80, 80],
          fontSize: 9,
          fontStyle: 'bold',
          lineWidth: { top: 0.3, bottom: 0, left: 0, right: 0 },
          lineColor: [150, 150, 150],
        },
        columnStyles: {
          0: { cellWidth: 35, halign: 'left' },
          1: { cellWidth: 40, halign: 'left', fontStyle: 'bold' },
          2: { cellWidth: 'auto', halign: 'left' },
          3: { cellWidth: 28, halign: 'right', fontStyle: 'bold' },
        },
        margin: { left: 15, right: 15 },
        showFoot: 'lastPage',
      })

      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- jspdf-autotable extends doc
      currentY = (doc as any).lastAutoTable.finalY ?? currentY + 20
    }

    // 合計列（最後一個 group 之後）
    const totalY = currentY + 6
    doc.setFontSize(10)
    doc.setFont('ChironHeiHK', 'bold')
    doc.setTextColor(60, 60, 60)
    doc.text(`${DISBURSEMENT_PDF_LABELS.TOTAL}：${(order.amount || 0).toLocaleString()}`, pageWidth - 15, totalY, { align: 'right' })

  } else {
    // 舊路徑（無 bankGroups：單銀行或舊出納單）
    const processedItems = processItems(paymentRequests, paymentRequestItems)
    const payForGroups = splitLargeGroups(groupByPayFor(processedItems))

    // ========== 準備表格資料 ==========
    const tableBody: (string | { content: string; rowSpan?: number })[][] = []

    for (const group of payForGroups) {
      group.items.forEach((item, idx) => {
        const row: (string | { content: string; rowSpan?: number })[] = []

        // 付款對象（第一行使用 rowSpan）- 分兩行顯示
        if (idx === 0) {
          const match = group.payFor.match(/^([^（]+)(（.+）)$/)
          let payForContent = group.payFor
          if (match) {
            payForContent = `${match[1]}\n${match[2]}`
          }
          row.push({ content: payForContent, rowSpan: group.items.length })
        }

        row.push(item.requestCode)
        row.push(item.description)
        row.push(item.amount.toLocaleString())

        // 小計（第一行使用 rowSpan）
        if (idx === 0) {
          row.push({
            content: group.hiddenTotal ? '' : group.total.toLocaleString(),
            rowSpan: group.items.length,
          })
        }

        tableBody.push(row)
      })
    }

    // ========== 繪製表格 ==========
    autoTable(doc, {
      startY: 33,
      head: [
        [
          DISBURSEMENT_PDF_LABELS.COL_PAYEE,
          DISBURSEMENT_PDF_LABELS.COL_REQUEST_NO,
          DISBURSEMENT_PDF_LABELS.COL_DESCRIPTION,
          DISBURSEMENT_PDF_LABELS.COL_AMOUNT,
          DISBURSEMENT_PDF_LABELS.COL_SUBTOTAL,
        ],
      ],
      body: tableBody,
      foot: [[DISBURSEMENT_PDF_LABELS.TOTAL, '', '', '', (order.amount || 0).toLocaleString()]],
      theme: 'grid',
      styles: {
        font: 'ChironHeiHK',
        fontSize: 9,
        cellPadding: { top: 4, right: 3, bottom: 4, left: 3 },
        lineWidth: 0.1,
        lineColor: [200, 200, 200],
        textColor: [60, 60, 60],
        valign: 'middle',
      },
      headStyles: {
        fillColor: [255, 255, 255],
        textColor: [80, 80, 80],
        fontStyle: 'bold',
        lineWidth: { top: 0.3, bottom: 0.3, left: 0, right: 0 },
        lineColor: [150, 150, 150],
      },
      footStyles: {
        fillColor: [255, 255, 255],
        textColor: [120, 120, 120],
        fontSize: 12,
        fontStyle: 'normal',
        lineWidth: { top: 0.5, bottom: 0, left: 0, right: 0 },
        lineColor: [100, 100, 100],
      },
      columnStyles: {
        0: { cellWidth: 40, halign: 'left', fontStyle: 'bold' },
        1: { cellWidth: 35, halign: 'left' },
        2: { cellWidth: 'auto', halign: 'left' },
        3: { cellWidth: 28, halign: 'center' },
        4: { cellWidth: 28, halign: 'center', fontStyle: 'bold' },
      },
      margin: { left: 15, right: 15 },
      showFoot: 'lastPage',
    })
  }

  // ========== 頁尾 ==========
  const pageCount = doc.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFontSize(8)
    doc.setFont('ChironHeiHK', 'normal')
    doc.setTextColor(150)

    const pageHeight = doc.internal.pageSize.getHeight()

    doc.text(DISBURSEMENT_PDF_LABELS.COMPANY_SLOGAN, pageWidth / 2, pageHeight - 12, {
      align: 'center',
    })
    doc.text(DISBURSEMENT_PDF_LABELS.PAGE_NUMBER(i, pageCount), pageWidth - 18, pageHeight - 12, {
      align: 'center',
    })
  }

  // ========== 儲存 PDF ==========
  const filename = `${order.order_number || 'Disbursement'}.pdf`
  doc.save(filename)

  // 回傳 Blob 供上傳用
  return doc.output('blob')
}
