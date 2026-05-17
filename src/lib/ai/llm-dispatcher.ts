/**
 * LLM Dispatcher — per-workspace 動態 provider 入口
 *
 * 設計（William 2026-05-17 拍板）：
 *   - 從 workspace_ai_settings 查該 workspace 的 provider / model / 加密 token
 *   - 解密後 dispatch 到對應 client（minimax / anthropic / openrouter）
 *   - 沒設定或 is_active=false → fallback 到平台層 OPENROUTER_API_KEY（過渡期）
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
import { callLLM as callOpenRouter } from '@/lib/llm/openrouter-client'
import { callMiniMax } from './providers/minimax-client'
import { callAnthropic } from './providers/anthropic-client'
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
    // 沒 workspaceId 就 fallback platform OPENROUTER_API_KEY（demo / 漫途自家過渡期）
    logger.warn(`${HANDLER}: no workspaceId, fallback to platform OpenRouter`)
    return callOpenRouter(req)
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
    logger.warn(`${HANDLER}: settings query failed, fallback platform`, {
      workspaceId,
      err: error.message,
    })
    return callOpenRouter(req)
  }

  // 沒設定 / 沒啟用 / 三件套不全 → fallback platform
  if (
    !settings ||
    !settings.is_active ||
    !settings.provider ||
    !settings.api_token_encrypted ||
    !settings.model
  ) {
    logger.info(`${HANDLER}: no active workspace settings, fallback platform OpenRouter`, {
      workspaceId,
      hasSettings: Boolean(settings),
      isActive: settings?.is_active ?? false,
      provider: settings?.provider ?? null,
      hasToken: Boolean(settings?.api_token_encrypted),
      hasModel: Boolean(settings?.model),
    })
    return callOpenRouter(req)
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
    logger.error(`${HANDLER}: decrypt failed`, err, { workspaceId })
    return {
      ok: false,
      content: '',
      toolCalls: [],
      model: settings.model,
      error: 'decrypt failed',
    }
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
    case 'openrouter':
      // OpenRouter client 目前讀 env 不接 token、暫時 caller 自己塞 env（之後 v2 改）
      // 簡化：caller 用 openrouter 等於不走 dispatcher、直接 callOpenRouter
      response = await callOpenRouter(reqWithModel)
      break
    default:
      logger.warn(`${HANDLER}: unknown provider`, { provider: settings.provider, workspaceId })
      response = await callOpenRouter(reqWithModel)
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

  return response
}
