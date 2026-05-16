/**
 * OrderMembersExpandable — 欄位顯示設定型別 + 常數
 *
 * 從主組件拆出，讓 toolbar / main 共用同一份 SSOT，不重複定義。
 */


// 可切換顯示的欄位定義
export interface ColumnVisibility {
  passport_name: boolean
  birth_date: boolean
  gender: boolean
  id_number: boolean
  passport_number: boolean
  passport_expiry: boolean
  special_meal: boolean
  total_payable: boolean
  deposit_amount: boolean
  balance: boolean
  remarks: boolean
  pnr: boolean
  ticket_number: boolean
  ticketing_deadline: boolean
  flight_cost: boolean // 機票金額（成本）
  room: boolean // 分房欄位
  vehicle: boolean // 分車欄位
  surcharges: boolean // 附加費用
}

// 預設欄位顯示設定（訂金/尾款/應付金額 預設關閉）
export const defaultColumnVisibility: ColumnVisibility = {
  passport_name: true,
  birth_date: true,
  gender: true,
  id_number: true,
  passport_number: true,
  passport_expiry: true,
  special_meal: true,
  total_payable: false,
  deposit_amount: false,
  balance: false,
  remarks: true,
  pnr: false,
  ticket_number: true, // 預設顯示機票號碼
  ticketing_deadline: false,
  flight_cost: false, // 機票金額預設關閉
  room: true, // 分房欄位預設顯示（有資料時）
  vehicle: true, // 分車欄位預設顯示（有資料時）
  surcharges: false, // 附加費用預設隱藏
}

// 欄位標籤對照（靜態常數、不在 hook 裡 → 直接使用中文字串）
export const columnLabels: Record<keyof ColumnVisibility, string> = {
  passport_name: '護照拼音',
  birth_date: '出生年月日',
  gender: '性別',
  id_number: '身分證號',
  passport_number: '護照號碼',
  passport_expiry: '護照效期',
  special_meal: '飲食禁忌',
  total_payable: '應付金額',
  deposit_amount: '訂金',
  balance: '尾款',
  remarks: '備註',
  pnr: 'PNR',
  ticket_number: '機票號碼',
  ticketing_deadline: '開票期限',
  flight_cost: '機票金額',
  room: '分房',
  vehicle: '分車',
  surcharges: '附加費用',
}
