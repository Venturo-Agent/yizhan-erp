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
    description: '行程編輯時用航班號查班表。AeroDataBox 走 RapidAPI 平台、需 rapidapi.com 申請 API Key。',
    affects: ['旅遊團 → 行程編輯 → 查詢航班按鈕', 'PackageItineraryDialog → 航班輸入'],
    fields: [
      { key: 'api_key', label: 'RapidAPI Key', type: 'password', sensitive: true, required: true, placeholder: 'AeroDataBox 在 RapidAPI 後台的 x-rapidapi-key' },
    ],
  },
  {
    code: 'passport_ocr',
    name: '護照辨識（OCR.space）',
    description: 'OCR.space 辨識護照 MRZ（護照號碼 / 效期 / 生日）+ 嘗試辨識中文姓名。免費版 25,000 次/月、約 1.5 秒/張。',
    affects: ['訂單 → 新增成員 → 批次上傳護照', '顧客管理 → 新增顧客 → OCR 辨識'],
    fields: [
      { key: 'ocr_space_api_key', label: 'OCR.space API Key', type: 'password', sensitive: true, required: true, placeholder: '從 ocr.space 申請（免費版 25,000 次/月）', hint: '到 ocr.space 註冊免費帳號取得、5 分鐘搞定。' },
      { key: 'chinese_recognition', label: '啟用中文姓名辨識', type: 'checkbox', sensitive: false, required: false, hint: '開啟：嘗試辨識護照上的中文姓名（拍清楚時準）；關閉：只辨識 MRZ 純英文部分、不誤判。' },
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
