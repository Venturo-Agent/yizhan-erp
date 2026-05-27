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
 * 一個 batch（單一 from_bank_account）內、把品項算出 is_cross_bank + per-item fee_amount 的共用 helper。
 *
 * 2026-05-27：batch-create 跟 disbursement [id] PATCH 共用同一套手續費算法的 SSOT。
 * 此 helper **不查 DB**、caller 把需要的 lookup map 先撈好傳進來（避免 helper 綁死某條查詢路徑）。
 *
 * 對齊規則（William 拍板）：
 * - 收款對象真實銀行優先序：代墊員工 advanced_by > 受款員工 payee_employee_id > 供應商 supplier_id
 * - isCrossBankTransfer 判同行/跨行（cash/check 不收、同行 0、沒填銀行視同跨行照收）
 * - per-payer mode：同收款對象合併 1 筆 cross_bank_fee、組內 equal 整數平均餘加最後
 *   payer_key 順序對齊優先序：advanced_by > payee_employee_id > supplier_id > item.id（unique）
 * - 公司 feeMode='unified' 走 unified（每筆固定收）；'average' 在 fromBankUnifiedAmount=0 時退回（向後兼容）
 */
export interface ComputeBatchFeesItem {
  id: string
  amount: number
  supplier_id: string | null
  advanced_by: string | null
  payee_employee_id: string | null
  payment_method_id: string | null
}

export interface ComputeBatchFeesLookups {
  /** from_bank_account 的 bank_code（公司轉出帳戶銀行） */
  fromBankCode: string | null
  /** 此 from_bank_account 的每筆跨行手續費（bank_accounts.cross_bank_fee） */
  fromBankUnifiedAmount: number
  /** supplier_id → bank_code */
  supplierBankById: Map<string, string | null>
  /** employee_id → bank_code（代墊 / 受款員工） */
  employeeBankById: Map<string, string | null>
  /** payment_method_id → kind（cash / check 不收） */
  pmKindById: Map<string, string | null>
  /** 公司分攤模式（average / unified）；average + fromBankUnifiedAmount=0 → 不收（向後兼容） */
  feeMode: 'average' | 'unified'
  /** average mode 才用：銀行實扣總額（unified / per-payer 忽略） */
  bankActualFee?: number
  /** average mode 才用：分攤策略 */
  averageStrategy?: 'equal' | 'proportional'
}

export interface ComputeBatchFeesResult {
  /** itemId → { is_cross_bank, fee_amount, supplier_bank_code }（caller 拿去 INSERT/UPDATE DOI） */
  perItem: Map<
    string,
    { is_cross_bank: boolean; fee_amount: number; supplier_bank_code: string | null }
  >
  /** 此 batch 系統算的手續費總額（per-payer / unified mode 用；average mode = bankActualFee） */
  total_fee: number
}

export function computeBatchFees(
  items: ComputeBatchFeesItem[],
  lookups: ComputeBatchFeesLookups
): ComputeBatchFeesResult {
  const {
    fromBankCode,
    fromBankUnifiedAmount,
    supplierBankById,
    employeeBankById,
    pmKindById,
    feeMode,
    bankActualFee = 0,
    averageStrategy = 'equal',
  } = lookups

  // 1. 每筆算 is_cross_bank（收款對象真實銀行優先序：代墊員工 > 受款員工 > 供應商）
  const enriched = items.map(it => {
    const supplierBankCode = it.supplier_id ? (supplierBankById.get(it.supplier_id) ?? null) : null
    const payeeBankCode = it.advanced_by
      ? (employeeBankById.get(it.advanced_by) ?? null)
      : it.payee_employee_id
        ? (employeeBankById.get(it.payee_employee_id) ?? null)
        : supplierBankCode
    const itemKind = it.payment_method_id ? (pmKindById.get(it.payment_method_id) ?? null) : null
    const is_cross_bank = isCrossBankTransfer({ payeeBankCode, fromBankCode, itemKind })
    return { it, supplierBankCode, is_cross_bank }
  })

  // 2. 走 distributeFees 算 per-item fee
  const effectiveMode: FeeMode = fromBankUnifiedAmount > 0 ? 'per-payer' : feeMode
  const { per_item_fees, total_collected } = distributeFees({
    mode: effectiveMode,
    bank_actual_fee: bankActualFee,
    unified_amount_per_item: fromBankUnifiedAmount,
    items: enriched.map(e => ({
      id: e.it.id,
      amount: e.it.amount,
      is_cross_bank: e.is_cross_bank,
      payer_key: e.it.advanced_by
        ? `e:${e.it.advanced_by}`
        : e.it.payee_employee_id
          ? `e:${e.it.payee_employee_id}`
          : e.it.supplier_id
            ? `s:${e.it.supplier_id}`
            : e.it.id,
    })),
    average_strategy: averageStrategy,
  })

  const perItem = new Map<
    string,
    { is_cross_bank: boolean; fee_amount: number; supplier_bank_code: string | null }
  >()
  for (const e of enriched) {
    perItem.set(e.it.id, {
      is_cross_bank: e.is_cross_bank,
      fee_amount: per_item_fees.get(e.it.id) ?? 0,
      supplier_bank_code: e.supplierBankCode,
    })
  }

  return {
    perItem,
    total_fee: effectiveMode === 'per-payer' ? total_collected : bankActualFee,
  }
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
