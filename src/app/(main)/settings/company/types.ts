export interface CompanyFormData {
  name: string
  description: string
  logo_url: string
  legal_name: string
  subtitle: string
  address: string
  phone: string
  fax: string
  email: string
  website: string
  tax_id: string
  bank_code: string // onboarding fix pack 2026-05-10：三碼銀行代號（Combobox）
  bank_name: string
  bank_branch: string
  bank_account: string
  bank_account_name: string
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
}

export interface BankAccountOption {
  id: string
  name: string
  bank_name: string | null
}

export const INITIAL_FORM: CompanyFormData = {
  name: '',
  description: '',
  logo_url: '',
  legal_name: '',
  subtitle: '',
  address: '',
  phone: '',
  fax: '',
  email: '',
  website: '',
  tax_id: '',
  bank_code: '',
  bank_name: '',
  bank_branch: '',
  bank_account: '',
  bank_account_name: '',
  company_seal_url: '',
  personal_seal_url: '',
  invoice_seal_image_url: '',
  contract_seal_image_url: '',
  default_billing_day_of_week: null,
  transfer_fee_mode: 'average',
  transfer_fee_unified_amount: null,
  transfer_fee_overflow_account_id: null,
}
