/**
 * Workspace integration config 解密 + 取出 helper（server-side only）
 *
 * 用途：API route / server action 需要拿 third-party API 的 credentials 時呼叫
 *
 * 流程：
 *   1. 撈 workspace_integrations row (by workspace_id + integration_code)
 *   2. enabled=false → return null（視為沒設定）
 *   3. 解密 sensitive 欄位
 *   4. 回傳 plain config 物件
 *
 * 找不到 / 未啟用 / 解密失敗 → return null（caller 自己決定要 fallback env 還是 fail）
 */

import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { decryptConfigFields } from '@/lib/crypto/integration-encryption'
import { getSensitiveFieldKeys } from '@/lib/integrations/registry'
import { logger } from '@/lib/utils/logger'

interface WorkspaceIntegrationRow {
  config: Record<string, string>
  enabled: boolean
}

/**
 * 取出某 workspace 某 integration 的解密 config
 *
 * @param workspaceId       目標 workspace
 * @param integrationCode   integration_code（'flight_search' / 'passport_ocr' / 'line_oa' / 'worldmove_esim' ...）
 * @returns plain config 物件、或 null（沒設定 / 未啟用 / 解密失敗）
 */
export async function getIntegrationConfig(
  workspaceId: string,
  integrationCode: string,
): Promise<Record<string, string> | null> {
  if (!workspaceId) return null
  const admin = getSupabaseAdminClient()
  // type cast：generated types regen 後可拿掉
  const { data, error } = await (admin.from as unknown as (t: string) => {
    select: (c: string) => {
      eq: (c1: string, v1: string) => {
        eq: (c2: string, v2: string) => {
          maybeSingle: () => Promise<{
            data: WorkspaceIntegrationRow | null
            error: { message: string } | null
          }>
        }
      }
    }
  })('workspace_integrations')
    .select('config, enabled')
    .eq('workspace_id', workspaceId)
    .eq('integration_code', integrationCode)
    .maybeSingle()

  if (error) {
    logger.warn(`workspace_integrations 讀取失敗 (${integrationCode}):`, error.message)
    return null
  }
  if (!data) return null
  if (!data.enabled) return null

  try {
    const sensitiveKeys = getSensitiveFieldKeys(integrationCode)
    return decryptConfigFields(data.config, sensitiveKeys)
  } catch (err) {
    // master key 沒設 / envelope 損壞 / key rotation 失敗等
    logger.error(`integration config 解密失敗 (${integrationCode})、視同未設定:`, err)
    return null
  }
}
