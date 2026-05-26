/**
 * Workspace API integration registry
 *
 * 系統支援的 third-party API 整合清單 + 每個 integration 的欄位定義
 *
 * 規則：
 * - sensitive=true 的欄位會被加密儲存（用 src/lib/crypto/integration-encryption.ts）
 * - 前端 GET 拿到的 sensitive 欄位是 '••••••••'（maskConfigFields）、不是明文
 * - PUT 時前端傳明文、API route 自動加密後再 upsert
 *
 * 未來新增 integration：在 INTEGRATIONS array 加一筆即可、自動長出設定 UI
 */

export type IntegrationFieldType = 'text' | 'password' | 'url' | 'checkbox'

export interface IntegrationFieldDef {
  key: string
  label: string
  type: IntegrationFieldType
  /** 是否加密儲存（api_key / secret / token 一律 true） */
  sensitive: boolean
  required: boolean
  placeholder?: string
  /** 額外提示文字 */
  hint?: string
}

export interface IntegrationDef {
  /** integration_code（DB 用、唯一） */
  code: string
  /** 中文顯示名稱 */
  name: string
  /** 設定 UI 上的說明 */
  description: string
  /** 啟用後影響什麼 feature（給 UI 提示用） */
  affects: string[]
  fields: IntegrationFieldDef[]
}

export const INTEGRATIONS: readonly IntegrationDef[] = [
  {
    code: 'flight_search',
    name: '航班搜尋（AeroDataBox）',
    description:
      '行程編輯時用航班號查班表。AeroDataBox 走 RapidAPI 平台、需 rapidapi.com 申請 API Key。',
    affects: ['旅遊團 → 行程編輯 → 查詢航班按鈕', 'PackageItineraryDialog → 航班輸入'],
    fields: [
      {
        key: 'api_key',
        label: 'RapidAPI Key',
        type: 'password',
        sensitive: true,
        required: true,
        placeholder: 'AeroDataBox 在 RapidAPI 後台的 x-rapidapi-key',
      },
    ],
  },
  {
    code: 'passport_ocr',
    name: '護照辨識（OCR.space）',
    description:
      'OCR.space 辨識護照 MRZ（護照號碼 / 效期 / 生日）+ 嘗試辨識中文姓名。免費版 25,000 次/月、約 1.5 秒/張。',
    affects: ['訂單 → 新增成員 → 批次上傳護照', '顧客管理 → 新增顧客 → OCR 辨識'],
    fields: [
      {
        key: 'ocr_space_api_key',
        label: 'OCR.space API Key',
        type: 'password',
        sensitive: true,
        required: true,
        placeholder: '從 ocr.space 申請（免費版 25,000 次/月）',
        hint: '到 ocr.space 註冊免費帳號取得、5 分鐘搞定。',
      },
      {
        key: 'chinese_recognition',
        label: '啟用中文姓名辨識',
        type: 'checkbox',
        sensitive: false,
        required: false,
        hint: '開啟：嘗試辨識護照上的中文姓名（拍清楚時準）；關閉：只辨識 MRZ 純英文部分、不誤判。',
      },
    ],
  },
  {
    code: 'sinopac_qpay',
    name: '永豐豐收款（QPay）',
    description:
      '永豐銀行豐收款金流：開立虛擬帳號收款（客戶取得 854 開頭帳號、ATM 轉帳或臨櫃繳款）。每間公司用自己跟永豐申請的商店代號 + 金鑰、各自串接。測試環境免報 IP、正式環境需提前兩週報主機 IP 給永豐業務窗口。',
    affects: ['收款管理 → 永豐虛擬帳號收款', '客戶自助付款連結'],
    fields: [
      {
        key: 'shop_no',
        label: '商店代號 (ShopNo)',
        type: 'text',
        sensitive: false,
        required: true,
        placeholder: '如 NA0638_001',
        hint: '永豐核發的商店編號',
      },
      {
        key: 'merchant_ubn',
        label: '統一編號',
        type: 'text',
        sensitive: false,
        required: true,
        placeholder: '8 碼統編',
      },
      {
        key: 'hash_a1',
        label: '雜湊金鑰 A1',
        type: 'password',
        sensitive: true,
        required: true,
        hint: '永豐核發的商店雜湊值 A1',
      },
      { key: 'hash_a2', label: '雜湊金鑰 A2', type: 'password', sensitive: true, required: true },
      { key: 'hash_b1', label: '雜湊金鑰 B1', type: 'password', sensitive: true, required: true },
      { key: 'hash_b2', label: '雜湊金鑰 B2', type: 'password', sensitive: true, required: true },
      {
        key: 'x_key',
        label: 'API 授權碼 (X-Key)',
        type: 'password',
        sensitive: true,
        required: true,
        hint: '永豐核發、有有效期限（過期要換）',
      },
      {
        key: 'sandbox_mode',
        label: '測試模式（sandbox）',
        type: 'checkbox',
        sensitive: false,
        required: false,
        hint: '開啟＝連永豐測試環境；正式上線收真錢再關閉',
      },
    ],
  },
  // 註：line_oa 於 2026-05-19 從 registry 移除（孤兒 UI、從未被任何 caller 讀取）
  // 真正的 LINE OA 設定在 AI Hub → Setup wizard、寫入 workspace_line_settings 表
]

export function getIntegrationByCode(code: string): IntegrationDef | undefined {
  return INTEGRATIONS.find(i => i.code === code)
}

export function getSensitiveFieldKeys(code: string): string[] {
  const def = getIntegrationByCode(code)
  if (!def) return []
  return def.fields.filter(f => f.sensitive).map(f => f.key)
}
