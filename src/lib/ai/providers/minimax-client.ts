/**
 * MiniMax LLM client
 *
 * MiniMax 沒官方 npm SDK、自己 wrap REST API。介面對齊 LLMRequest / LLMResponse
 * （跟 OpenRouter client 一致、讓 caller 不用管 provider 差異）。
 *
 * 文件：https://platform.minimaxi.com/document/ChatCompletion v2
 * Endpoint：POST https://api.minimax.chat/v1/text/chatcompletion_v2
 *
 * 紀律：
 *   - 不 throw、失敗回 ok=false（webhook 不能因 LLM 炸）
 *   - 30s timeout（LINE replyToken 30s 過期、跟 openrouter-client 一致）
 *   - token 從 caller 傳進、永遠不入 log
 */

import { logger } from '@/lib/utils/logger'
import type { LLMRequest, LLMResponse } from '@/types/line.types'

const MINIMAX_ENDPOINT = 'https://api.minimax.chat/v1/text/chatcompletion_v2'
const DEFAULT_MODEL = 'MiniMax-Text-01'
const REQUEST_TIMEOUT_MS = 30_000

interface MiniMaxChoice {
  message?: {
    role?: string
    content?: string | null
  }
  finish_reason?: string
}

interface MiniMaxResponse {
  id?: string
  model?: string
  choices?: MiniMaxChoice[]
  usage?: {
    prompt_tokens?: number
    completion_tokens?: number
    total_tokens?: number
  }
  base_resp?: {
    status_code?: number
    status_msg?: string
  }
}

/**
 * 呼叫 MiniMax chat completions。
 * token 由 caller 從 workspace_ai_settings 解密後傳入。
 */
export async function callMiniMax(req: LLMRequest, apiToken: string): Promise<LLMResponse> {
  const model = req.model ?? DEFAULT_MODEL

  if (!apiToken) {
    return {
      ok: false,
      content: '',
      toolCalls: [],
      model,
      error: 'MiniMax api token missing',
    }
  }

  const body: Record<string, unknown> = {
    model,
    messages: req.messages,
    temperature: req.temperature ?? 0.3,
    max_tokens: 2048,
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

  try {
    const res = await fetch(MINIMAX_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiToken}`,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    })

    if (!res.ok) {
      const text = await res.text().catch(() => '')
      logger.warn('MiniMax non-2xx', {
        status: res.status,
        body: text.slice(0, 500),
        model,
      })
      return {
        ok: false,
        content: '',
        toolCalls: [],
        model,
        error: text.slice(0, 200) || `HTTP ${res.status}`,
      }
    }

    const json = (await res.json()) as MiniMaxResponse

    // MiniMax 業務錯誤走 base_resp.status_code（不是 HTTP status）
    if (json.base_resp && json.base_resp.status_code !== 0) {
      return {
        ok: false,
        content: '',
        toolCalls: [],
        model: json.model ?? model,
        error: json.base_resp.status_msg || `status ${json.base_resp.status_code}`,
      }
    }

    const choice = json.choices?.[0]
    const content = choice?.message?.content ?? ''

    return {
      ok: true,
      content,
      toolCalls: [],
      model: json.model ?? model,
      error: null,
      usage: json.usage,
    }
  } catch (err) {
    const isAbort = err instanceof Error && err.name === 'AbortError'
    logger.error('MiniMax call failed', err, {
      workspaceId: req.workspaceId,
      model,
      reason: isAbort ? 'timeout' : 'fetch',
    })
    return {
      ok: false,
      content: '',
      toolCalls: [],
      model,
      error: isAbort ? `timeout after ${REQUEST_TIMEOUT_MS}ms` : 'fetch error',
    }
  } finally {
    clearTimeout(timer)
  }
}

/**
 * 驗證 token 是否有效（UI wizard step 3 用）
 * 最小 request、確認 200 + status_code=0。
 */
export async function validateMiniMaxToken(
  apiToken: string,
  model: string = DEFAULT_MODEL
): Promise<{ ok: boolean; error?: string; sample?: string }> {
  const res = await callMiniMax(
    {
      messages: [{ role: 'user', content: '你好' }],
      model,
      temperature: 0.1,
    },
    apiToken
  )
  if (res.ok) {
    return { ok: true, sample: res.content.slice(0, 100) }
  }
  return { ok: false, error: res.error || 'unknown' }
}
