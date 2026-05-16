/**
 * 獎金設定型別定義
 */

/** 獎金設定類型 (0-4) */
export enum BonusSettingType {
  /** 營收稅額 */
  PROFIT_TAX = 0,
  /** OP 獎金 */
  OP_BONUS = 1,
  /** 業務獎金 */
  SALE_BONUS = 2,
  /** 團隊獎金 */
  TEAM_BONUS = 3,
  /** 行政費用 */
  ADMINISTRATIVE_EXPENSES = 4,
}

/** 獎金計算方式 (0-3) */
export enum BonusCalculationType {
  /** 百分比：淨利 × bonus% */
  PERCENT = 0,
  /** 固定金額：直接加 bonus 元 */
  FIXED_AMOUNT = 1,
  /** 負百分比：淨利 × -bonus% */
  MINUS_PERCENT = 2,
  /** 負固定金額：直接減 bonus 元 */
  MINUS_FIXED_AMOUNT = 3,
}

/** 團獎金設定 */
export interface TourBonusSetting {
  id: string
  workspace_id: string
  tour_id: string
  type: BonusSettingType
  bonus: number
  bonus_type: BonusCalculationType
  employee_id: string | null
  description: string | null
  /** 已生成的請款單 ID（OP / 業務 / 團隊獎金生成「公司請款」後寫回） */
  payment_request_id: string | null
  /** 此筆獎金的出帳日期（使用者選） */
  disbursement_date: string | null
  created_at: string
  updated_at: string
}

/** Workspace 獎金預設值 */
export interface WorkspaceBonusDefault {
  id: string
  workspace_id: string
  type: BonusSettingType
  bonus: number
  bonus_type: BonusCalculationType
  employee_id: string | null
  description: string | null
  created_at: string
  updated_at: string
}

/** 計算後的獎金結果 */
export interface BonusResult {
  setting: TourBonusSetting
  amount: number
  employee_name?: string
}

/** 利潤計算結果 */
export interface ProfitCalculationResult {
  receipt_total: number
  expense_total: number
  member_count: number
  admin_cost_per_person: number
  administrative_cost: number
  profit_before_tax: number
  tax_rate: number
  profit_tax: number
  net_profit: number
  team_bonuses: BonusResult[]
  employee_bonuses: BonusResult[]
  total_team_bonus: number
  total_employee_bonus: number
  company_profit: number
}

/** 利潤表格行 */
export interface ProfitTableRow {
  label: string
  amount: number
}
