/**
 * LLM 用量記帳（write to llm_usage_logs）
 *
 * 設計：
 *   - dispatcher 每次 call 完、fire-and-forget call `recordLLMUsage()`
 *   - 不 await（不阻塞 LLM 回應）、不 throw（失敗只 log warn）
 *   - cost_usd 走 model-prices.ts 推算、找不到 model 寫 0 + warn
 *
 * 規模：1 萬 calls/月、寫入零負擔。
 *
 * 為什麼自建（不用 Langfuse / Helicone）：
 *   - 規模小、外部工具是過度設計
 *   - 我們已有 llm-dispatcher SSOT、加一張表就完事
 *   - 資安：資料留在 Supabase、不送第三方（紅線 #1）
 */

import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { logger } from '@/lib/utils/logger'
import { calculateCost } from './pricing/model-prices'
import type { SupabaseClient } from '@supabase/supabase-js'

const HANDLER = 'usage-tracker'

export interface RecordUsageInput {
  workspaceId: string
  provider: string
  model: string
  promptTokens?: number
  completionTokens?: number
  /** 預先算好的 cost（如 OpenRouter response 自己給）、優先用此值、不重算 */
  costUsdOverride?: number
  latencyMs?: number
  /** caller 識別（給 dashboard 看「哪段 code 燒最多」） */
  caller?: string
  success: boolean
  errorCode?: string | null
  /** 觸發者員工 id（AI 自動時 null） */
  actorEmployeeId?: string | null
}

/**
 * Fire-and-forget 寫一筆 llm_usage_logs。
 *
 * Caller 應該：
 *   void recordLLMUsage({ ... })   // 不要 await、不要拿 Promise 做事
 *
 * 失敗在內部 logger.warn、不影響主流程。
 */
export async function recordLLMUsage(input: RecordUsageInput): Promise<void> {
  try {
    const promptTokens = input.promptTokens ?? 0
    const completionTokens = input.completionTokens ?? 0

    let costUsd: number
    if (input.costUsdOverride !== undefined) {
      costUsd = input.costUsdOverride
    } else {
      costUsd = calculateCost(input.provider, input.model, promptTokens, completionTokens)
      if (costUsd === 0 && promptTokens + completionTokens > 0) {
        logger.warn(`${HANDLER}: no price entry for model、cost 寫 0`, {
          provider: input.provider,
          model: input.model,
        })
      }
    }

    const supabase = getSupabaseAdminClient() as unknown as SupabaseClient
    const { error } = await supabase.from('llm_usage_logs').insert({
      workspace_id: input.workspaceId,
      provider: input.provider,
      model: input.model,
      prompt_tokens: promptTokens,
      completion_tokens: completionTokens,
      cost_usd: costUsd,
      latency_ms: input.latencyMs ?? null,
      caller: input.caller ?? 'unknown',
      success: input.success,
      error_code: input.errorCode ?? null,
      created_by: input.actorEmployeeId ?? null,
    })

    if (error) {
      logger.warn(`${HANDLER}: insert failed`, {
        workspaceId: input.workspaceId,
        provider: input.provider,
        err: error.message,
      })
    }
  } catch (err) {
    // 絕不擋主流程
    logger.warn(`${HANDLER}: unexpected error`, {
      err: err instanceof Error ? err.message : String(err),
    })
  }
}
