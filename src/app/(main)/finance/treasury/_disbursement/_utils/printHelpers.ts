/**
 * printHelpers.ts
 * PrintDisbursementPreview 的 helper functions 和型別定義
 * 從 PrintDisbursementPreview.tsx 抽出、供各子組件共用
 */

import type { PaymentRequest, PaymentRequestItem } from '@/stores/types'

// ─── 共用型別 ───────────────────────────────────────────────────────────────

export interface ProcessedItem {
  requestId: string // 用來過濾成本轉移 pair requests
  itemId: string // 2026-05-21 加：給 PrintItemsTable 反查 fee_amount 用
  requestCode: string
  createdBy: string
  tourName: string
  description: string
  payFor: string
  amount: number
  /** 2026-05-21 加：該 item 的銀行手續費（從 disbursement_order_items.fee_amount） */
  feeAmount: number
  isCompany: boolean // 是否為公司請款
}

export interface PayForGroup {
  payFor: string
  items: ProcessedItem[]
  total: number
  showTotal: boolean // 是否顯示小計（只在該供應商最後一個區塊顯示）
}

export interface TransferPairRow {
  pairId: string
  fromTourCode: string
  fromTourName: string
  toTourCode: string
  toTourName: string
  amount: number
  items: Array<{ description: string; supplier: string; subtotal: number }>
}

// ─── Helper functions ────────────────────────────────────────────────────────

export function processItems(
  paymentRequests: PaymentRequest[],
  paymentRequestItems: PaymentRequestItem[],
  feeByItemId?: Map<string, number>
): ProcessedItem[] {
  const requestMap = new Map(paymentRequests.map(r => [r.id, r]))

  return paymentRequestItems.map(item => {
    const request = requestMap.get(item.request_id)
    const isCompany = request?.request_category === 'company'
    // 公司請款顯示費用類型，團體請款顯示團名
    const tourName = isCompany ? request?.request_type || '公司' : request?.tour_name || '-'

    // 付款對象優先順序（2026-05-21 William 拍板）：
    // 1. 公司請款 + payee_employee（譬如獎金發給員工）→ 顯示員工名
    // 2. 代墊（advanced_by）→ 「員工（廠商）」
    // 3. 一般供應商 → 廠商名
    const itemExt = item as unknown as {
      advanced_by_name?: string | null
      advanced_by_employee?:
        | { chinese_name?: string | null; display_name?: string | null }
        | { chinese_name?: string | null; display_name?: string | null }[]
        | null
      suppliers?: { name?: string | null } | { name?: string | null }[] | null
      payee_employee_id?: string | null
      payee_employee?:
        | { chinese_name?: string | null; display_name?: string | null }
        | { chinese_name?: string | null; display_name?: string | null }[]
        | null
    }
    // 代墊人名：優先即時 join 員工表（display_name ?? chinese_name）、退回存死的 advanced_by_name。
    // 2026-05-27 William 抓出：員工改名（William→簡瑋廷）後 advanced_by_name 快照沒更新、列印顯示舊名。
    const abRaw = itemExt.advanced_by_employee
    const abObj = Array.isArray(abRaw) ? abRaw[0] : abRaw
    const advancedBy =
      abObj?.display_name || abObj?.chinese_name || itemExt.advanced_by_name || undefined
    // 供應商名：優先即時 join 供應商表、退回存死的 supplier_name。
    // 2026-05-27 William 抓出：新流程建單沒寫 supplier_name 快照（8 筆空白）、列印誤顯示「無供應商」、其實 supplier_id 都在。
    const supRaw = itemExt.suppliers
    const supObj = Array.isArray(supRaw) ? supRaw[0] : supRaw
    const liveSupplierName = supObj?.name || item.supplier_name || null
    // payee_employee 從 PostgREST join 可能是 object 或 array、取第一個
    const peRaw = itemExt.payee_employee
    const peObj = Array.isArray(peRaw) ? peRaw[0] : peRaw
    const payeeEmployeeName = peObj?.display_name || peObj?.chinese_name || undefined

    const supplierName = liveSupplierName || '未指定供應商'
    let payFor: string
    if (isCompany && payeeEmployeeName) {
      // 公司請款 + 員工受款人 → 直接顯示員工名
      payFor = payeeEmployeeName
    } else if (advancedBy) {
      payFor = `${advancedBy}（${liveSupplierName || '無供應商'}）`
    } else {
      payFor = supplierName
    }

    return {
      requestId: item.request_id,
      itemId: item.id,
      requestCode: request?.code || '-',
      createdBy: request?.created_by_name || '-',
      tourName,
      description: item.description || item.category || '-',
      payFor,
      amount: item.subtotal || 0,
      feeAmount: feeByItemId?.get(item.id) || 0,
      isCompany,
    }
  })
}

export function groupByPayFor(items: ProcessedItem[]): PayForGroup[] {
  const grouped = new Map<string, ProcessedItem[]>()

  for (const item of items) {
    if (!grouped.has(item.payFor)) {
      grouped.set(item.payFor, [])
    }
    grouped.get(item.payFor)!.push(item)
  }

  // 2026-05-27 William 拍板：小計 = sum(amount + feeAmount)、手續費分攤在上面各列、含進小計。
  // 金額欄顯示純額、下方小字分攤手續費、小計欄為兩者合計。
  const groups: PayForGroup[] = Array.from(grouped.entries()).map(([payFor, groupItems]) => ({
    payFor,
    items: groupItems,
    total: groupItems.reduce((sum, item) => sum + item.amount + item.feeAmount, 0),
    showTotal: true,
  }))

  groups.sort((a, b) => a.payFor.localeCompare(b.payFor, 'zh-TW'))

  return groups
}

/**
 * 提取實際收款人（去掉括號部分）
 * 例如："William（XX）" → "William"
 */
export function extractPayee(payFor: string): string {
  const match = payFor.match(/^([^（]+)/)
  return match ? match[1].trim() : payFor
}

/**
 * 拆分付款對象為兩行顯示
 * 例如："William（XX）" → { payee: "William", supplier: "（XX）" }
 */
export function splitPayFor(payFor: string): { payee: string; supplier: string | null } {
  const match = payFor.match(/^([^（]+)(（.+）)$/)
  if (match) {
    return {
      payee: match[1].trim(),
      supplier: match[2],
    }
  }
  return {
    payee: payFor,
    supplier: null,
  }
}

/**
 * 分割大型群組 + 同收款人合併小計
 * - 每個區塊都顯示供應商名稱
 * - 同一個收款人的多個分組，只在最後一組顯示總金額
 */
export function splitLargeGroups(groups: PayForGroup[], maxSize = 5): PayForGroup[] {
  const result: PayForGroup[] = []

  for (const group of groups) {
    if (group.items.length <= maxSize) {
      result.push(group)
    } else {
      // 拆成多個區塊
      const totalChunks = Math.ceil(group.items.length / maxSize)
      for (let i = 0; i < group.items.length; i += maxSize) {
        const chunk = group.items.slice(i, i + maxSize)
        const chunkIndex = Math.floor(i / maxSize)
        const isLastChunk = chunkIndex === totalChunks - 1

        result.push({
          payFor: group.payFor,
          items: chunk,
          total: group.total,
          showTotal: isLastChunk, // 只在最後一個區塊顯示小計
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
        result[idx].showTotal = false
      })
      // 最後一組顯示該收款人的總金額
      const lastIdx = pg.indices[pg.indices.length - 1]
      result[lastIdx].total = pg.total
      result[lastIdx].showTotal = true
    }
  })

  // 計算每個收款人的總行數（用於 rowSpan）
  result.forEach((group, idx) => {
    const payee = extractPayee(group.payFor)
    const pg = payeeGroups.get(payee)!
    const isFirstGroupOfPayee = pg.indices[0] === idx

    if (isFirstGroupOfPayee) {
      // 計算該收款人的所有行數
      const totalRows = pg.indices.reduce((sum, gIdx) => sum + result[gIdx].items.length, 0)
      ;((group as unknown as Record<string, unknown>).subtotalRowSpan as number) = totalRows
      // 強制設定 showTotal=true（確保顯示小計）
      group.showTotal = true
      group.total = pg.total
    } else {
      ;((group as unknown as Record<string, unknown>).subtotalRowSpan as number) = 0 // 不顯示小計欄位
    }
  })

  return result
}
