import { BonusSettingType, BonusCalculationType } from '@/types/bonus.types'

/** 獎金類型名稱 */
export const BONUS_TYPE_LABELS: Record<BonusSettingType, string> = {
  [BonusSettingType.PROFIT_TAX]: '營收稅額',
  [BonusSettingType.OP_BONUS]: 'OP 獎金',
  [BonusSettingType.SALE_BONUS]: '業務獎金',
  [BonusSettingType.TEAM_BONUS]: '團隊獎金',
  [BonusSettingType.ADMINISTRATIVE_EXPENSES]: '行政費用',
}

/** 獎金計算方式名稱 */
export const BONUS_CALCULATION_LABELS: Record<BonusCalculationType, string> = {
  [BonusCalculationType.PERCENT]: '百分比',
  [BonusCalculationType.FIXED_AMOUNT]: '固定金額',
  [BonusCalculationType.MINUS_PERCENT]: '負百分比',
  [BonusCalculationType.MINUS_FIXED_AMOUNT]: '負固定金額',
}

/** 獎金類型顏色 */
export const BONUS_TYPE_COLORS: Record<BonusSettingType, string> = {
  [BonusSettingType.PROFIT_TAX]: 'text-morandi-red',
  [BonusSettingType.OP_BONUS]: 'text-status-info',
  [BonusSettingType.SALE_BONUS]: 'text-morandi-green',
  [BonusSettingType.TEAM_BONUS]: 'text-cat-purple',
  [BonusSettingType.ADMINISTRATIVE_EXPENSES]: 'text-cat-orange',
}

/** 獎金類型 badge 顏色 */
export const BONUS_TYPE_BADGE_VARIANTS: Record<BonusSettingType, string> = {
  [BonusSettingType.PROFIT_TAX]: 'bg-morandi-red/15 text-morandi-red',
  [BonusSettingType.OP_BONUS]: 'bg-status-info-bg text-status-info',
  [BonusSettingType.SALE_BONUS]: 'bg-morandi-green/15 text-morandi-green',
  [BonusSettingType.TEAM_BONUS]: 'bg-cat-purple-bg text-cat-purple',
  [BonusSettingType.ADMINISTRATIVE_EXPENSES]: 'bg-cat-orange-bg text-cat-orange',
}

/** 利潤表標籤 */
export const PROFIT_TABLE_LABELS = {
  receipt_total: '收款總額（進項）',
  expense_total: '付款總額（銷項）',
  administrative_cost: '行政費用',
  profit_before_tax: '營收總額（未扣除營收稅額）',
  profit_tax: '營收稅額',
  net_profit: '利潤總額（已扣除營收稅額）',
  company_profit: '公司盈餘',
  no_bonus: '淨利為負，不發放獎金',
  per_person: '元/人',
} as const

/** 獎金設定 Tab 標籤 */
export const BONUS_TAB_LABELS = {
  title: '獎金設定',
  add: '新增獎金設定',
  edit: '編輯獎金設定',
  type: '類型',
  bonus_value: '數值',
  calculation_type: '計算方式',
  employee: '綁定員工',
  no_employee: '無',
  no_settings: '尚無獎金設定',
  copy_defaults: '從預設值複製',
  confirm_delete: '確定要刪除此獎金設定嗎？',

  CANCEL: '取消',
  SAVE: '儲存',
} as const

/** 利潤 Tab 標籤 */
export const PROFIT_TAB_LABELS = {
  title: '利潤計算',
  income_detail: '收入明細',
  expense_detail: '支出明細',
  profit_table: '利潤計算表',
  bonus_detail: '獎金明細',
  left_column: '收入 / 費用',
  right_column: '支出 / 利潤',
} as const
