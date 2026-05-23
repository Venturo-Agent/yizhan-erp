/**
 * 永豐豐收款（QPay）連線設定讀取
 *
 * 從 workspace_integrations 撈出該 workspace 的永豐憑證（加密欄位自動解密）、
 * 組成 client.ts / credit-card.ts 要用的 SinopacConfig。
 *
 * 憑證來源：整合設定 UI（IntegrationSettingsDialog）填入、走 integration-encryption 加密儲存。
 *   → 不寫死 secrets.env、不經 transcript（憲法紅線 #2）。
 *
 * sandbox_mode 開 → 連永豐測試環境（玩具鈔票、不扣真錢）；關 → 正式環境收真錢。
 */

import { getIntegrationConfig } from '@/lib/integrations/get-integration-config'
import { logger } from '@/lib/utils/logger'
import type { ShopHash } from './crypto'

/** integration_code（見 src/lib/integrations/registry.ts 定義） */
export const SINOPAC_QPAY_CODE = 'sinopac_qpay'

/**
 * QPay WebAPI base url（結尾帶 /、client 會接 'Nonce' / 'Order'）
 * 來源：永豐官方 SampleCode QPayToolkit.php $targetUrl
 */
const SANDBOX_BASE = 'https://apisbx.sinopac.com/funBIZ-Sbx/QPay.WebAPI/api/'
const PROD_BASE = 'https://api.sinopac.com/funBIZ/QPay.WebAPI/api/'

export interface SinopacConfig {
  /** 商店代號（永豐核發） */
  shopNo: string
  /** 統一編號 */
  merchantUbn: string
  /** 雜湊金鑰 A1/A2/B1/B2（generateHashID 用） */
  hash: ShopHash
  /** API 授權碼、放 X-KeyID header（有有效期限、過期要換） */
  xKey: string
  /** true=測試環境（不扣真錢） */
  sandboxMode: boolean
  /** 已依 sandboxMode 選好的 QPay WebAPI base url */
  baseUrl: string
}

/** checkbox 值可能存成 boolean(jsonb) 或 'true' 字串、統一判真 */
function isTrue(v: unknown): boolean {
  return v === true || v === 'true'
}

/**
 * 取某 workspace 的永豐 QPay 設定。
 * 沒設定 / 未啟用 / 缺必填欄位 → return null（caller 自己決定 fail 還是 fallback）。
 */
export async function getSinopacConfig(workspaceId: string): Promise<SinopacConfig | null> {
  const cfg = await getIntegrationConfig(workspaceId, SINOPAC_QPAY_CODE)
  if (!cfg) return null

  const required = ['shop_no', 'hash_a1', 'hash_a2', 'hash_b1', 'hash_b2', 'x_key'] as const
  for (const key of required) {
    if (!cfg[key]) {
      logger.warn(`永豐設定缺少必填欄位 ${key}、視同未設定`)
      return null
    }
  }

  const sandboxMode = isTrue(cfg.sandbox_mode)
  return {
    shopNo: cfg.shop_no,
    merchantUbn: cfg.merchant_ubn ?? '',
    hash: { A1: cfg.hash_a1, A2: cfg.hash_a2, B1: cfg.hash_b1, B2: cfg.hash_b2 },
    xKey: cfg.x_key,
    sandboxMode,
    baseUrl: sandboxMode ? SANDBOX_BASE : PROD_BASE,
  }
}
