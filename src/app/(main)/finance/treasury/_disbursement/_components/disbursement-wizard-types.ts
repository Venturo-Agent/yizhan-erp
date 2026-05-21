/**
 * disbursement-wizard-types.ts
 * 出納單 Wizard 共用型別定義（Phase 3 品項級）
 * 拆分自 CreateDisbursementWizardDialog.tsx 2026-05-16
 */

export type WizardStep = 'main' | 'fill-fee' | 'preview-all'

export interface BankAccountOption {
  id: string
  name: string
  bank_code: string | null
  bank_name: string | null
  /** 2026-05-21 加：跨行匯款每筆手續費（wizard 算預估 total_fee 用、按 unique payer 算） */
  cross_bank_fee?: number | null
}

export interface UnbilledItem {
  id: string
  request_id: string
  request_code: string | null
  request_date: string | null
  requester_name: string | null
  description: string | null
  subtotal: number
  supplier_id: string | null
  supplier_name: string | null
  supplier_bank_code: string | null
  supplier_bank_name: string | null
  tour_id: string | null
  tour_name: string | null
  // 代墊人資訊（若有）— 顯示「{name}（代墊）」、銀行用員工的
  advanced_by: string | null
  advanced_by_name: string | null
  advanced_by_bank_code: string | null
  advanced_by_bank_name: string | null
  // 2026-05-21 加：公司請款發員工的對象 ID（給 wizard 算 unique payer 用）
  payee_employee_id?: string | null
  // 統一的「付款對象」+「對方銀行」(代墊優先、否則供應商)
  payer_label: string  // e.g. "玉山旅行社" or "張小明（代墊）"
  payer_bank_code: string | null
  payer_bank_name: string | null
}

export interface StagedBatch {
  batch_id: string
  from_bank_account_id: string
  from_bank_label: string
  from_bank_code: string | null
  item_ids: string[]
  items: UnbilledItem[]
  total_fee: number
  fee_distribution: 'equal' | 'proportional'
}
