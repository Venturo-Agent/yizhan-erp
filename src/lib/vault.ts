/**
 * vault.ts — Supabase Vault secret 讀取 helper
 *
 * SEC-009：將 AI API key 遷移至 Supabase Vault（靜態加密儲存）。
 *
 * 設計策略：graceful degradation
 * - Vault 已設定 → 從 DB 讀加密的 key
 * - Vault 未設定或 key 不在 Vault → fallback 到 process.env
 * - 兩個來源都沒有 → 回傳 null（呼叫方自行處理）
 *
 * 這樣設計讓現有的 env var 用法在 Vault 正式啟用前繼續運作，
 * 不需要一次全部切換。
 *
 * ────────────────────────────────────────────────────────────────────
 * 遷移步驟（Vault 正式啟用後）
 * ────────────────────────────────────────────────────────────────────
 * 1. 確認 supabase/migrations/_pending_review/20260517210000_sec009_ai_api_keys_vault.sql
 *    已 apply 到 production（需 William 確認 Vault extension 已啟用）
 *
 * 2. 在 Supabase SQL Editor（service_role）執行：
 *    SELECT vault.create_secret('ANTHROPIC_API_KEY', 'sk-ant-...', 'description');
 *    SELECT vault.create_secret('GOOGLE_VISION_API_KEY', 'AIza...', 'description');
 *    SELECT vault.create_secret('VENTURO_AI_BRAIN_KEY', 'sk-ant-...', 'description');
 *
 * 3. 確認 getVaultSecret() 可正常回傳值（不再走 env fallback）
 *
 * 4. 從 Coolify 部署設定移除對應的 env var
 *
 * ────────────────────────────────────────────────────────────────────
 * 使用範例
 * ────────────────────────────────────────────────────────────────────
 * ```ts
 * // 原本：
 * const apiKey = process.env.ANTHROPIC_API_KEY
 *
 * // 遷移後：
 * const apiKey = await getVaultSecret('ANTHROPIC_API_KEY', 'ANTHROPIC_API_KEY')
 * ```
 */

import { getSupabaseAdminClient } from '@/lib/supabase/admin'

/**
 * 從 Supabase Vault 讀取 secret，找不到時 fallback 到 process.env
 *
 * @param vaultKeyName  Vault 裡存的 secret name（e.g. 'ANTHROPIC_API_KEY'）
 * @param envFallback   fallback 的 process.env key 名稱（e.g. 'ANTHROPIC_API_KEY'）
 * @returns secret 值，或 null（兩個來源都沒有）
 */
export async function getVaultSecret(
  vaultKeyName: string,
  envFallback: string
): Promise<string | null> {
  try {
    const supabase = getSupabaseAdminClient()
    // get_ai_api_key は migration _pending_review に定義されているため、
    // DB types に未反映。migration apply 後に types 再生成で外せる。
    const { data, error } = await supabase
      .schema('public')
      .rpc('get_ai_api_key' as never, { key_name: vaultKeyName } as never)

    if (!error && data) {
      return data as string
    }
  } catch {
    // Vault extension 未啟用、function 不存在、或 network 問題
    // 靜默 fallback，不 throw（避免 Vault 未設定時炸掉所有 AI 功能）
  }

  // fallback：從 process.env 讀（現有行為）
  return process.env[envFallback] ?? null
}
