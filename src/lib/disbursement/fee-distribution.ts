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

export type FeeMode = 'average' | 'unified' | 'per-payer'

/**
 * 同行 / 跨行判定 — 單一真相（concept A SSOT、2026-05-27 William 拍板）
 *
 * 過去這條規則散在三個地方各寫一份（wizard 預估 / batch-create 存檔 / preview-fees），
 * 且彼此不一致（員工同行還被收費）。收進這裡、所有人共用。
 *
 * 規則：
 * - cash / check 不走銀行轉帳 → 不收（William 2026-05-22 拍板）
 * - 收款對象銀行 === 公司轉出帳戶銀行 → 同行、0 費
 * - 沒填銀行 → 視同跨行、照收（保守、選項 A、William 2026-05-27 拍板）
 *
 * ⚠️「收款對象銀行」要帶**實際收款人**的銀行（代墊員工 / 受款員工 → 員工銀行；
 *    一般供應商 → 供應商銀行）、由 caller 自己解析後傳入、不是一律供應商。
 */
export function isCrossBankTransfer(params: {
  payeeBankCode: string | null
  fromBankCode: string | null
  itemKind?: string | null
}): boolean {
  if (params.itemKind === 'cash' || params.itemKind === 'check') return false
  const { payeeBankCode, fromBankCode } = params
  return !payeeBankCode || !fromBankCode || payeeBankCode !== fromBankCode
}

export interface DistributionItem {
  id: string
  /** 該品項金額 */
  amount: number
  /** 是否跨行（影響 average mode）。unified mode 忽略此 flag */
  is_cross_bank: boolean
  /**
   * 收款對象 key（per-payer mode 用）
   * 同 key 視為同一收款人、合併成 1 筆手續費（cross_bank_fee）、組內按金額 equal 平均
   * 推導：bank_code + account_number 有設 → 用該組合；沒設 → 用 item.id（每筆獨立）
   * 2026-05-21 William 拍板：沒設銀行 = 系統不知道是不是同一人 = 視為不同人
   */
  payer_key?: string
}

export interface DistributionInput {
  mode: FeeMode
  /** 銀行實扣手續費（average mode：user 在預覽時填、寫進 disbursement_orders.total_fee） */
  bank_actual_fee: number
  /** unified / per-payer mode 才用：每筆 PR 固定收金額（從 bank_accounts.cross_bank_fee 取得） */
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

  if (mode === 'per-payer') {
    // 2026-05-21 William 拍板：「同收款對象合併一筆手續費、組內整數平均餘加最後」
    // 1. 按 payer_key 分組（沒設 = unique = 自己一組）
    // 2. 每 group 跨行 → 收 1 筆 cross_bank_fee；同行 → 0
    // 3. group 內按 equal 策略平均（floor、餘加最後 item）
    const groups = new Map<string, DistributionItem[]>()
    for (const item of items) {
      const key = item.payer_key || item.id // 沒設 = 自己一組（unique）
      if (!groups.has(key)) groups.set(key, [])
      groups.get(key)!.push(item)
    }
    let total_collected = 0
    for (const groupItems of groups.values()) {
      // 該組是否跨行：任一 item is_cross_bank=true 就算（保守、收手續費）
      const isCrossBank = groupItems.some(i => i.is_cross_bank)
      if (!isCrossBank) {
        for (const item of groupItems) per_item_fees.set(item.id, 0)
        continue
      }
      // 跨行 group：1 筆 cross_bank_fee、組內 equal 平均
      const groupFee = unified_amount_per_item
      total_collected += groupFee
      const n = groupItems.length
      const perItem = Math.floor(groupFee / n)
      const remainder = groupFee - perItem * n
      groupItems.forEach((item, idx) => {
        const isLast = idx === n - 1
        per_item_fees.set(item.id, isLast ? perItem + remainder : perItem)
      })
    }
    return {
      per_item_fees,
      total_collected,
      overflow: total_collected - bank_actual_fee,
    }
  }

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
