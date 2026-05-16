/**
 * 利潤計算引擎
 *
 * 完整公式（參考老系統 cornerERP）：
 * 收款總額 - 付款總額 - 行政費(N元/人) = 營收
 * 營收 × 稅率% = 營收稅額
 * 營收 - 營收稅額 = 淨利
 * 若淨利 >= 0 → 分配獎金
 * 若淨利 < 0 → 無獎金
 * 公司盈餘 = 淨利 - 團隊獎金 - 員工個人獎金
 */

import {
  BonusSettingType,
  BonusCalculationType,
  type TourBonusSetting,
  type BonusResult,
  type ProfitCalculationResult,
  type ProfitTableRow,
} from '@/types/bonus.types'
/** 收款資料介面（相容多種資料來源） */
interface ReceiptData {
  /** 應收金額（receipts.receipt_amount） */
  receipt_amount?: number | string
  /** 實收金額（receipts.actual_amount） */
  actual_amount?: number | string
  /** 已過時：收款項目（受 receipt_items 表淘汰、保留兼容） */
  payment_items?: Array<{ amount?: number }>
}

const DEFAULT_ADMIN_COST_PER_PERSON = 10

/** 計算收款總額（優先實收、其次應收） */
function calculateReceiptTotal(receipts: ReceiptData[]): number {
  return receipts.reduce((sum, r) => {
    if (r.payment_items && r.payment_items.length > 0) {
      return sum + r.payment_items.reduce((s, item) => s + (item.amount || 0), 0)
    }
    return sum + (Number(r.actual_amount) || Number(r.receipt_amount) || 0)
  }, 0)
}

/** 計算付款總額（排除獎金類型的請款） */
function calculateExpenseTotal(
  expenses: Array<{
    items?: Array<{ unit_price: number; quantity: number; category?: string }>
    amount?: number
  }>
): number {
  return expenses.reduce((sum, exp) => {
    if (exp.items && exp.items.length > 0) {
      return sum + exp.items.reduce((s, item) => s + item.unit_price * item.quantity, 0)
    }
    return sum + (exp.amount ?? 0)
  }, 0)
}

/** 計算行政費用
 *
 * 規則：
 * - 沒設定 → 套老預設值 10 元/人 × 人數
 * - 有設定 → 全部視為「總額」直接加總（手填寫模式、不再乘人數）
 *
 * 回傳 perPerson：>0 代表走老的「每人 N 元」模式（顯示「N 元/人 × M 人」標籤）；
 *                 =0 代表走手填寫模式（顯示「行政費用」標籤、不附明細）
 */
function getAdministrativeCost(
  settings: TourBonusSetting[],
  memberCount: number
): { total: number; perPerson: number } {
  const adminSettings = settings.filter(s => s.type === BonusSettingType.ADMINISTRATIVE_EXPENSES)
  if (adminSettings.length === 0) {
    return {
      total: memberCount * DEFAULT_ADMIN_COST_PER_PERSON,
      perPerson: DEFAULT_ADMIN_COST_PER_PERSON,
    }
  }
  const total = adminSettings.reduce((sum, s) => sum + Number(s.bonus), 0)
  return { total, perPerson: 0 }
}

/** 計算營收（未扣稅） */
function calculateProfitBeforeTax(
  receiptTotal: number,
  expenseTotal: number,
  adminCost: number
): number {
  return receiptTotal - expenseTotal - adminCost
}

/** 計算營收稅額
 *
 * 規則：
 * - PERCENT：營收 × bonus%
 * - FIXED_AMOUNT：直接 = bonus（手填寫總額）
 *
 * 回傳 rate：>0 代表 PERCENT 模式（顯示「N%」標籤）；=0 代表 FIXED_AMOUNT 或無設定
 */
function getProfitTax(
  settings: TourBonusSetting[],
  profitBeforeTax: number
): { tax: number; rate: number } {
  const taxSetting = settings.find(s => s.type === BonusSettingType.PROFIT_TAX)
  if (!taxSetting) return { tax: 0, rate: 0 }
  const val = Number(taxSetting.bonus) || 0
  if (taxSetting.bonus_type === BonusCalculationType.FIXED_AMOUNT) {
    return { tax: val, rate: 0 }
  }
  if (taxSetting.bonus_type === BonusCalculationType.PERCENT) {
    if (profitBeforeTax <= 0) return { tax: 0, rate: val }
    return { tax: Math.round((profitBeforeTax * val) / 100), rate: val }
  }
  return { tax: 0, rate: 0 }
}

/** 計算淨利 */
function calculateNetProfit(profitBeforeTax: number, profitTax: number): number {
  return profitBeforeTax - profitTax
}

/** 計算單項獎金 */
function calculateBonus(netProfit: number, setting: TourBonusSetting): number {
  const bonus = Number(setting.bonus)
  switch (setting.bonus_type) {
    case BonusCalculationType.PERCENT:
      return Math.round((netProfit * bonus) / 100)
    case BonusCalculationType.FIXED_AMOUNT:
      return bonus
    case BonusCalculationType.MINUS_PERCENT:
      return Math.round((netProfit * -bonus) / 100)
    case BonusCalculationType.MINUS_FIXED_AMOUNT:
      return -bonus
    default:
      return 0
  }
}

/** 計算所有獎金 */
function calculateAllBonuses(
  netProfit: number,
  settings: TourBonusSetting[],
  employeeDict?: Record<string, string>
): { team_bonuses: BonusResult[]; employee_bonuses: BonusResult[] } {
  if (netProfit < 0) {
    return { team_bonuses: [], employee_bonuses: [] }
  }

  const team_bonuses: BonusResult[] = []
  const employee_bonuses: BonusResult[] = []

  for (const setting of settings) {
    // 跳過稅額和行政費用（不是發放的獎金）
    if (
      setting.type === BonusSettingType.PROFIT_TAX ||
      setting.type === BonusSettingType.ADMINISTRATIVE_EXPENSES
    ) {
      continue
    }

    const amount = calculateBonus(netProfit, setting)
    const result: BonusResult = {
      setting,
      amount,
      employee_name:
        setting.employee_id && employeeDict ? employeeDict[setting.employee_id] : undefined,
    }

    if (setting.type === BonusSettingType.TEAM_BONUS) {
      team_bonuses.push(result)
    } else {
      employee_bonuses.push(result)
    }
  }

  return { team_bonuses, employee_bonuses }
}

/** 計算公司盈餘 */
function calculateCompanyProfit(netProfit: number, totalBonuses: number): number {
  return netProfit - totalBonuses
}

/** 完整利潤計算 */
export function calculateFullProfit(params: {
  receipts: ReceiptData[]
  expenses: Array<{ items?: Array<{ unit_price: number; quantity: number }>; amount?: number }>
  settings: TourBonusSetting[]
  memberCount: number
  employeeDict?: Record<string, string>
}): ProfitCalculationResult {
  const { receipts, expenses, settings, memberCount, employeeDict } = params

  const receipt_total = calculateReceiptTotal(receipts)
  const expense_total = calculateExpenseTotal(expenses)
  const adminResult = getAdministrativeCost(settings, memberCount)
  const admin_cost_per_person = adminResult.perPerson
  const administrative_cost = adminResult.total
  const profit_before_tax = calculateProfitBeforeTax(
    receipt_total,
    expense_total,
    administrative_cost
  )
  const taxResult = getProfitTax(settings, profit_before_tax)
  const tax_rate = taxResult.rate
  const profit_tax = taxResult.tax
  const net_profit = calculateNetProfit(profit_before_tax, profit_tax)

  const { team_bonuses, employee_bonuses } = calculateAllBonuses(net_profit, settings, employeeDict)
  const total_team_bonus = team_bonuses.reduce((s, b) => s + b.amount, 0)
  const total_employee_bonus = employee_bonuses.reduce((s, b) => s + b.amount, 0)
  const company_profit =
    net_profit < 0
      ? net_profit
      : calculateCompanyProfit(net_profit, total_team_bonus + total_employee_bonus)

  return {
    receipt_total,
    expense_total,
    member_count: memberCount,
    admin_cost_per_person,
    administrative_cost,
    profit_before_tax,
    tax_rate,
    profit_tax,
    net_profit,
    team_bonuses,
    employee_bonuses,
    total_team_bonus,
    total_employee_bonus,
    company_profit,
  }
}

/** 產生兩欄並排的利潤表格資料 */
export function generateProfitTableData(result: ProfitCalculationResult): {
  left: ProfitTableRow[]
  right: ProfitTableRow[]
} {
  const adminLabel =
    result.admin_cost_per_person > 0
      ? `行政費用（${result.admin_cost_per_person}元/人×${result.member_count}人）`
      : '行政費用'
  const taxLabel =
    result.tax_rate > 0 ? `營收稅額（${result.tax_rate}%）` : '營收稅額'

  const left: ProfitTableRow[] = [
    { label: '收款總額（進項）', amount: result.receipt_total },
    { label: adminLabel, amount: result.administrative_cost },
    { label: taxLabel, amount: result.profit_tax },
  ]

  const right: ProfitTableRow[] = [
    { label: '付款總額（銷項）', amount: result.expense_total },
    { label: '營收總額（未扣除營收稅額）', amount: result.profit_before_tax },
    { label: '利潤總額（已扣除營收稅額）', amount: result.net_profit },
  ]

  // OP 獎金在左邊，業務獎金在右邊
  for (const b of result.employee_bonuses) {
    const typeName = b.setting.type === BonusSettingType.OP_BONUS ? 'OP獎金' : '業務獎金'
    const suffix = b.employee_name ? ` - ${b.employee_name}` : ''
    const bonusVal = Number(b.setting.bonus)
    const pctLabel =
      b.setting.bonus_type === BonusCalculationType.PERCENT
        ? `(${bonusVal}%)`
        : b.setting.bonus_type === BonusCalculationType.FIXED_AMOUNT
          ? `($${bonusVal})`
          : ''
    const row: ProfitTableRow = { label: `${typeName}${pctLabel}${suffix}`, amount: b.amount }

    if (b.setting.type === BonusSettingType.OP_BONUS) {
      left.push(row)
    } else {
      right.push(row)
    }
  }

  // 團隊獎金在左邊
  for (const b of result.team_bonuses) {
    const bonusVal = Number(b.setting.bonus)
    const pctLabel =
      b.setting.bonus_type === BonusCalculationType.PERCENT ? `(${bonusVal}%)` : `($${bonusVal})`
    left.push({ label: `團隊獎金${pctLabel}`, amount: b.amount })
  }

  // 公司盈餘在右邊
  right.push({ label: '公司盈餘', amount: result.company_profit })

  return { left, right }
}
