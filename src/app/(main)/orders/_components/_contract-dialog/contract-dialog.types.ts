// ============================================
// CreateContractsDialog 共用型別
// ============================================
// 2026-05-26 建：合約改成「批次勾選」流程（仿帳單 _invoice-dialog/）。
//   一份合約、勾的人列在上面、由代表人一人簽。一訂單可分批建多份合約。

import type { Contract } from '@/data'

/** 簽約對象（沿用舊 OrderContractDialog 欄位語意）*/
export type SignerType = 'individual' | 'company'

/**
 * 歷史合約卡用的精簡型別。
 * 直接取自 contracts entity hook 的 slim row（已含 member_ids / include_* / status…）。
 */
export type HistoryContract = Pick<
  Contract,
  | 'id'
  | 'code'
  | 'template'
  | 'signer_type'
  | 'signer_name'
  | 'status'
  | 'signed_at'
  | 'sent_at'
  | 'created_at'
  | 'member_ids'
  | 'include_member_list'
  | 'include_itinerary'
>

/** DB CHECK 約束允許的合約狀態（draft / unsigned / signed / cancelled）*/
export type ContractStatus = 'draft' | 'unsigned' | 'signed' | 'cancelled'
