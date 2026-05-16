/**
 * 團員附加費用類型定義
 */

export interface SurchargeItem {
  name: string
  amount: number
}

export interface MemberSurcharges {
  single_room_surcharge: number | null // 單人房差
  add_on_items: SurchargeItem[] // 加購項目（可多筆）
  other_charges: SurchargeItem[] // 其他費用（可多筆）
}

export const DEFAULT_SURCHARGES: MemberSurcharges = {
  single_room_surcharge: null,
  add_on_items: [],
  other_charges: [],
}

// 標籤定義
export const SURCHARGE_LABELS = {
  single_room_surcharge: '單人房差',
  add_on_items: '加購項目',
  other_charges: '其他費用',
  amount: '金額',
  add_item: '新增項目',
  remove_item: '移除',
  total_surcharge: '附加費用合計',
  total_cost: '總費用',
  base_cost: '基本團費',
} as const
