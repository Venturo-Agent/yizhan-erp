/**
 * 租戶（Tenant）相關常數和工具
 * 用於多租戶系統的公司資訊管理
 */

/**
 * 公司名稱（中文）
 * 從環境變數讀取，預設為「角落旅行社」
 */
export const COMPANY_NAME = process.env.NEXT_PUBLIC_COMPANY_NAME || '角落旅行社'

/**
 * 公司名稱（英文）
 * 從環境變數讀取，預設為「Corner Travel」
 */
export const COMPANY_NAME_EN = process.env.NEXT_PUBLIC_COMPANY_NAME_EN || 'Corner Travel'

/**
 * 取得當前年份
 */
export function getCurrentYear(): number {
  return new Date().getFullYear()
}

/**
 * 取得版權聲明（自動更新年份 + 公司名稱）
 * @param companyName - 可選的公司名稱（預設使用 COMPANY_NAME）
 */
function _getCopyright(companyName?: string): string {
  const name = companyName || COMPANY_NAME
  const year = getCurrentYear()
  return `© ${year} ${name}`
}

/**
 * 取得品牌標語（帶年份）
 * @param season - 季節（如「秋季精選」）
 */
export function getBrandTagline(season?: string): string {
  const year = getCurrentYear()
  return season ? `${COMPANY_NAME} ${year} ${season}` : `${COMPANY_NAME} ${year}`
}
