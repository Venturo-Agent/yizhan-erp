/**
 * TourPrintDialog 常數定義
 */

import type { ExportColumnsConfig } from '@/app/(main)/orders/_types/order-member.types'

// 成員名單欄位標籤
export const COLUMN_LABELS: Record<keyof ExportColumnsConfig, string> = {
  identity: '身份',
  chinese_name: '中文姓名',
  passport_name: '護照姓名',
  birth_date: '生日',
  gender: '性別',
  id_number: '身分證號',
  passport_number: '護照號碼',
  passport_expiry: '護照效期',
  special_meal: '特殊餐食',
  remarks: '備註',
  // 金額相關欄位放最後
  total_payable: '應付金額',
  deposit_amount: '已付訂金',
  balance: '尾款',
}

// 預設欄位選擇
export const DEFAULT_COLUMNS: ExportColumnsConfig = {
  identity: false,
  chinese_name: true,
  passport_name: true,
  birth_date: true,
  gender: true,
  id_number: false,
  passport_number: true,
  passport_expiry: true,
  special_meal: true,
  remarks: false,
  // 金額相關欄位預設顯示
  total_payable: true,
  deposit_amount: true,
  balance: true,
}

// 艙等代碼對照表
export const CLASS_NAMES: Record<string, string> = {
  F: '頭等艙',
  C: '商務艙',
  J: '商務艙',
  W: '豪華經濟艙',
  Y: '經濟艙',
  B: '經濟艙',
  M: '經濟艙',
  H: '經濟艙',
  K: '經濟艙',
  L: '經濟艙',
  Q: '經濟艙',
  T: '經濟艙',
  V: '經濟艙',
  X: '經濟艙',
}

// 狀態代碼對照表
export const STATUS_NAMES: Record<string, string> = {
  HK: 'OK',
  TK: '已開票',
  UC: '未確認',
  XX: '取消',
  HX: '已刪除',
  HL: '候補',
  HN: '需確認',
  LL: '候補中',
  WL: '候補',
}
