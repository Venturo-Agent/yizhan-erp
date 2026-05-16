/**
 * 出納單手續費分攤算法 — SSOT
 *
 * 2026-05-15 QDF Round 4：把 batch-create/route.ts 內 inline 算法抽出獨立檔、
 * 加 unit test 保護、未來 batch-create 跟 disbursement [id] PATCH 共用。
 *
 * 兩種 mode（公司 workspaces.transfer_fee_mode 拍板）：
 *   - 'average'：銀行實扣 N 元、平均分到所有「跨行」品項、最後一筆吃尾數
 *   - 'unified'：每筆 PR 固定收 unified_amount、不分同行 / 跨行、銀行實扣寫 disbursement_orders.total_fee
 *
 * 此 helper **不直接寫 DB**、純算回 Map<itemId, feeAmount>、caller 自己 INSERT。
 */

export type FeeMode = 'average' | 'unified'

export interface DistributionItem {
  id: string
  /** 該品項金額 */
  amount: number
  /** 是否跨行（影響 average mode）。unified mode 忽略此 flag */
  is_cross_bank: boolean
}

export interface DistributionInput {
  mode: FeeMode
  /** 銀行實扣手續費（user 在預覽時填、寫進 disbursement_orders.total_fee） */
  bank_actual_fee: number
  /** unified mode 才用：每筆 PR 固定收金額（公司 workspaces.transfer_fee_unified_amount） */
  unified_amount_per_item?: number
  /** 此 batch 內所有品項 */
  items: DistributionItem[]
  /** average mode 的分攤策略（'equal'=整數平均最後吃尾 / 'proportional'=按金額比例） */
  average_strategy?: 'equal' | 'proportional'
}

export interface DistributionOutput {
  /** itemId → 該品項分到的手續費 */
  per_item_fees: Map<string, number>
  /** unified mode 才有：公司向所有 items 收的總額（unified_amount × N） */
  total_collected: number
  /** unified mode 才有：公司賺差（total_collected − bank_actual_fee） */
  overflow: number
}

/**
 * 主分攤函式
 */
export function distributeFees(input: DistributionInput): DistributionOutput {
  const { mode, bank_actual_fee, unified_amount_per_item = 0, items } = input
  const strategy = input.average_strategy ?? 'equal'
  const per_item_fees = new Map<string, number>()

  if (mode === 'unified') {
    // unified mode：所有 item 都收 unified_amount（不分同行 / 跨行）
    for (const item of items) {
      per_item_fees.set(item.id, unified_amount_per_item)
    }
    const total_collected = unified_amount_per_item * items.length
    return {
      per_item_fees,
      total_collected,
      overflow: total_collected - bank_actual_fee,
    }
  }

  // average mode：只分給跨行品項
  const crossBankItems = items.filter(i => i.is_cross_bank)
  if (bank_actual_fee <= 0 || crossBankItems.length === 0) {
    // 沒手續費或沒跨行 → 全 0
    return {
      per_item_fees,
      total_collected: bank_actual_fee,
      overflow: 0,
    }
  }

  if (strategy === 'equal') {
    // 整數平均、最後一筆吃尾數（譬如 15 / 10 = 9×1 + 1×6 = 15）
    const perItem = Math.floor(bank_actual_fee / crossBankItems.length)
    const remainder = bank_actual_fee - perItem * crossBankItems.length
    crossBankItems.forEach((item, idx) => {
      const isLast = idx === crossBankItems.length - 1
      per_item_fees.set(item.id, isLast ? perItem + remainder : perItem)
    })
  } else {
    // proportional：按金額比例分攤
    const crossTotal = crossBankItems.reduce((s, i) => s + i.amount, 0)
    if (crossTotal > 0) {
      crossBankItems.forEach(item => {
        const share = (item.amount / crossTotal) * bank_actual_fee
        per_item_fees.set(item.id, share)
      })
    } else {
      // 跨行金額和為 0、退回 equal
      const perItem = bank_actual_fee / crossBankItems.length
      crossBankItems.forEach(item => per_item_fees.set(item.id, perItem))
    }
  }

  return {
    per_item_fees,
    total_collected: bank_actual_fee,
    overflow: 0,
  }
}
