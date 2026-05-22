/**
 * 平台層金流商 provider SSOT（B 方案 / 紅線 0）
 *
 * 2026-05-23 William 拍板：避免散刻 sinopac_* prefix / provider label 在多處
 *
 * - `PROVIDER_CODES`：所有平台已對接的 provider 代碼（跟 DB platform_payment_providers.code 對齊）
 * - `PROVIDER_LABELS`：跨頁面共用的中文短名（給列表 badge / dropdown 用）
 * - `KIND_TO_PROVIDER_KIND`：收款方式 kind ↔ provider_kind 對應、決定下拉可選範圍
 * - `isGatewayProvider(provider)`：判斷是否為「需要產生付款連結」的 gateway 類 provider
 *
 * 新增 provider 流程：
 *   1. DB platform_payment_providers INSERT row（migration）
 *   2. 這檔 PROVIDER_CODES / LABELS 補上
 *   3. 若需要納入收款方式 kind 對應、KIND_TO_PROVIDER_KIND 補
 */

export const PROVIDER_CODES = {
  MANUAL: 'manual',
  SINOPAC_CARD: 'sinopac_card',
  SINOPAC_COLLECT: 'sinopac_collect',
  SINOPAC_APPLE_PAY: 'sinopac_apple_pay',
  SINOPAC_GOOGLE_PAY: 'sinopac_google_pay',
  SINOPAC_SAMSUNG_PAY: 'sinopac_samsung_pay',
} as const

export type ProviderCode = (typeof PROVIDER_CODES)[keyof typeof PROVIDER_CODES]

export const PROVIDER_LABELS: Record<string, string> = {
  manual: '手動',
  sinopac_card: '永豐刷卡',
  sinopac_collect: '永豐豐收款',
  sinopac_apple_pay: '永豐 Apple Pay',
  sinopac_google_pay: '永豐 Google Pay',
  sinopac_samsung_pay: '永豐 Samsung Pay',
}

/**
 * 收款方式 kind（5 種固定 enum）→ platform_payment_providers.provider_kind 對應
 * 決定 MethodDialog 的 provider 下拉哪些選項可選
 * - card 刷卡 → 顯示 manual + sinopac_card + 3 種 wallet
 * - wire_transfer 匯款 → 顯示 manual + sinopac_collect
 * - cash / check / other → 只有 manual（不接金流商）
 */
export const KIND_TO_PROVIDER_KIND: Record<string, string | null> = {
  card: 'card',
  wire_transfer: 'wire_transfer',
  cash: null,
  check: null,
  other: null,
}

/**
 * 判斷是否為「需要產生付款連結」的 gateway 類 provider
 * 統一散刻在多處的 `provider?.startsWith('sinopac_')` 邏輯
 */
export function isGatewayProvider(provider: string | null | undefined): boolean {
  if (!provider) return false
  return provider.startsWith('sinopac_')
}

/**
 * 連結效期可選天數（給 UI dropdown 用）
 */
export const PAYMENT_LINK_EXPIRY_DAYS = [1, 3, 7, 14, 30] as const
export const PAYMENT_LINK_DEFAULT_EXPIRY_DAYS = 7
