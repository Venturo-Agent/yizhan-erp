export interface CompanyFormData {
  name: string
  logo_url: string
  legal_name: string
  subtitle: string
  address: string
  phone: string
  fax: string
  email: string
  website: string
  tax_id: string
  company_seal_url: string
  personal_seal_url: string
  invoice_seal_image_url: string
  contract_seal_image_url: string
  /** 預設出帳日期（0=週日 ... 4=週四 ... 6=週六、null=不指定不區分正常/特殊出帳） */
  default_billing_day_of_week: number | null
  /** 匯款手續費分攤模式：average=平均分配（公司不賺不虧）、unified=統一收付（公司收固定金額） */
  transfer_fee_mode: 'average' | 'unified'
  /** unified 模式下、每筆請款單固定收的手續費金額 */
  transfer_fee_unified_amount: number | null
  /** unified 模式下、差額入哪個 bank_account（公司收入） */
  transfer_fee_overflow_account_id: string | null
  /** 集團出帳：勾選後會計可看跨分公司 finance（請款 / 出納 / 收據 / 發票）、適合總公司集中處理 */
  finance_centralized: boolean
  /** 旅行屬性：開團時可選的團類型 id 清單 */
  enabled_tour_categories: string[]
  /** Logo 在 PrintHeader 內的縮放比例（0.25-4.0、120×40 為 1.0） */
  logo_scale: number
  /** Logo 在 PrintHeader 內的水平位移 px（相對左邊界） */
  logo_offset_x: number
  /** Logo 在 PrintHeader 內的垂直位移 px（相對 top 0） */
  logo_offset_y: number
}

export interface BankAccountOption {
  id: string
  name: string
  bank_name: string | null
}

export const INITIAL_FORM: CompanyFormData = {
  name: '',
  logo_url: '',
  legal_name: '',
  subtitle: '',
  address: '',
  phone: '',
  fax: '',
  email: '',
  website: '',
  tax_id: '',
  company_seal_url: '',
  personal_seal_url: '',
  invoice_seal_image_url: '',
  contract_seal_image_url: '',
  default_billing_day_of_week: null,
  transfer_fee_mode: 'average',
  transfer_fee_unified_amount: null,
  transfer_fee_overflow_account_id: null,
  finance_centralized: false,
  enabled_tour_categories: ['tour_group', 'flight', 'flight_hotel', 'hotel', 'car_service', 'esim'],
  logo_scale: 1.0,
  logo_offset_x: 0,
  logo_offset_y: 0,
}
