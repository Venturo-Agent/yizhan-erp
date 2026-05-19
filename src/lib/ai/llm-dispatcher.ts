/**
 * LLM Dispatcher — per-workspace 動態 provider 入口
 *
 * 設計（William 2026-05-17 拍板）：
 *   - 從 workspace_ai_settings 查該 workspace 的 provider / model / 加密 token
 *   - 解密後 dispatch 到對應 client（minimax / anthropic / openrouter）
 *   - 沒設定 / is_active=false / decrypt 失敗 → fallback 到平台層 MINIMAX_API_KEY
 *   - 成功後 fire-and-forget 更新 last_used_at（為計費鋪路）
 *
 * 紀律：
 *   - 不 throw、所有失敗回 LLMResponse { ok: false }
 *   - decrypt 完的 token 用完即丟、絕不入 log
 *   - LLMRequest.workspaceId 是判斷 provider 的關鍵、caller 必須傳
 */

import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { decryptIntegrationSecret } from '@/lib/crypto/integration-encryption'
import { logger } from '@/lib/utils/logger'
import { callMiniMax } from './providers/minimax-client'
import { callAnthropic } from './providers/anthropic-client'
import { recordLLMUsage } from './usage-tracker'
import { toTraditional } from '@/lib/text/simplified-to-traditional'
import type { LLMRequest, LLMResponse } from '@/types/line.types'
import type { SupabaseClient } from '@supabase/supabase-js'

const HANDLER = 'llm-dispatcher'

interface WorkspaceLlmSettings {
  provider: string | null
  model: string | null
  api_token_encrypted: string | null
  is_active: boolean
}

/**
 * 主入口：依 workspace 設定 dispatch 到對應 LLM provider
 *
 * 加全程 log（2026-05-17 William 拍板）：dev 跑 tail log 就能看到 chain 走哪一步、
 * 不會再有「Bot 偷偷走 fallback、無人發現」的事。
 */
export async function dispatchLLM(req: LLMRequest): Promise<LLMResponse> {
  const startedAt = Date.now()
  const workspaceId = req.workspaceId

  logger.info(`${HANDLER}: → dispatchLLM start`, {
    workspaceId: workspaceId ?? '(none)',
    requestedModel: req.model ?? '(auto)',
    messageCount: req.messages.length,
  })

  if (!workspaceId) {
    logger.warn(`${HANDLER}: no workspaceId, fallback to platform MiniMax`)
    return callPlatformMiniMax(req)
  }

  // 查 workspace_ai_settings
  const supabase = getSupabaseAdminClient()
  // workspace_ai_settings 加密欄位尚未進 generated types、用 unknown 中轉避免 as never
  const supabaseAny = supabase as unknown as SupabaseClient
  const { data: settings, error } = await supabaseAny
    .from('workspace_ai_settings')
    .select('provider, model, api_token_encrypted, is_active')
    .eq('workspace_id', workspaceId)
    .maybeSingle<WorkspaceLlmSettings>()

  if (error) {
    logger.warn(`${HANDLER}: settings query failed, fallback platform MiniMax`, {
      workspaceId,
      err: error.message,
    })
    return callPlatformMiniMax(req)
  }

  // 沒設定 / 沒啟用 / 三件套不全 → fallback platform MiniMax
  if (
    !settings ||
    !settings.is_active ||
    !settings.provider ||
    !settings.api_token_encrypted ||
    !settings.model
  ) {
    logger.info(`${HANDLER}: no active workspace settings, fallback platform MiniMax`, {
      workspaceId,
      hasSettings: Boolean(settings),
      isActive: settings?.is_active ?? false,
      provider: settings?.provider ?? null,
      hasToken: Boolean(settings?.api_token_encrypted),
      hasModel: Boolean(settings?.model),
    })
    return callPlatformMiniMax(req)
  }

  logger.info(`${HANDLER}: settings ok, will use`, {
    workspaceId,
    provider: settings.provider,
    model: settings.model,
  })

  // 解密 token
  let apiToken: string
  try {
    apiToken = decryptIntegrationSecret(settings.api_token_encrypted)
  } catch (err) {
    logger.warn(`${HANDLER}: decrypt failed, fallback platform MiniMax`, { workspaceId, err })
    return callPlatformMiniMax(req)
  }

  // 用設定的 model 覆寫 req 內的（除非 caller 明確指定）
  const reqWithModel: LLMRequest = {
    ...req,
    model: req.model ?? settings.model,
  }

  // Dispatch
  let response: LLMResponse
  switch (settings.provider) {
    case 'minimax':
      response = await callMiniMax(reqWithModel, apiToken)
      break
    case 'anthropic':
      response = await callAnthropic(reqWithModel, apiToken)
      break
    default:
      logger.warn(`${HANDLER}: unknown provider, fallback platform MiniMax`, { provider: settings.provider, workspaceId })
      response = await callPlatformMiniMax(reqWithModel)
  }

  // 🔒 簡體 → 繁體 後處理（William 紅線：簡體大忌、即使 SYSTEM_PROMPT 守不住、這層強制轉繁）
  if (response.ok && response.content) {
    const originalContent = response.content
    response = { ...response, content: toTraditional(response.content) }
    if (originalContent !== response.content) {
      logger.info(`${HANDLER}: simplified→traditional transformed`, {
        workspaceId,
        diffCharCount: [...originalContent].filter((c, i) => c !== response.content[i]).length,
      })
    }
  }

  const latencyMs = Date.now() - startedAt
  if (response.ok) {
    logger.info(`${HANDLER}: ✅ ok`, {
      workspaceId,
      provider: settings.provider,
      model: response.model,
      latencyMs,
      contentLength: response.content.length,
    })
  } else {
    logger.warn(`${HANDLER}: ❌ fail`, {
      workspaceId,
      provider: settings.provider,
      model: settings.model,
      latencyMs,
      error: response.error,
    })
  }

  // 成功後 fire-and-forget 更新 last_used_at（不擋主流程）
  if (response.ok) {
    void supabaseAny
      .from('workspace_ai_settings')
      .update({ last_used_at: new Date().toISOString() })
      .eq('workspace_id', workspaceId)
      .then(({ error: updErr }) => {
        if (updErr) {
          logger.warn(`${HANDLER}: update last_used_at failed (ignored)`, {
            workspaceId,
            err: updErr.message,
          })
        }
      })
  }

  // 用量記帳（fire-and-forget、不論成敗都記、給 SaaS 計費鋪路）
  // William 2026-05-19 拍板：自建 llm_usage_logs、不接外部 Langfuse / Helicone
  void recordLLMUsage({
    workspaceId,
    provider: settings.provider,
    model: response.model ?? settings.model,
    promptTokens: response.usage?.prompt_tokens,
    completionTokens: response.usage?.completion_tokens,
    latencyMs,
    caller: req.caller,
    success: response.ok,
    errorCode: response.error ?? null,
  })

  return response
}

/**
 * 平台層 MiniMax fallback：讀 MINIMAX_API_KEY env var。
 * 用於 workspace 沒設定 / decrypt 失敗 / 沒 workspaceId 的情況。
 */
function callPlatformMiniMax(req: LLMRequest): Promise<LLMResponse> {
  const platformToken = process.env.MINIMAX_API_KEY ?? ''
  if (!platformToken) {
    logger.error(`${HANDLER}: MINIMAX_API_KEY not configured`)
    return Promise.resolve({
      ok: false,
      content: '',
      toolCalls: [],
      model: req.model ?? 'MiniMax-M2',
      error: 'AI 服務尚未設定，請聯絡管理員',
    })
  }
  return callMiniMax({ ...req, model: req.model ?? 'MiniMax-M2' }, platformToken)
}
