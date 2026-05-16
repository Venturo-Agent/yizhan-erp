/**
 * OpenRouter LLM client (Venturo SaaS shared)
 *
 * - 走 OpenAI 相容 chat completions endpoint
 * - 預設 model = 'deepseek/deepseek-v3'（便宜、繁中支援好、適合 KB-grounded 任務）
 * - 沒 OPENROUTER_API_KEY = ok=false、上層 fallback hardcode 流程（demo 至少能跑）
 *
 * 文件：https://openrouter.ai/docs/api-reference/chat-completion
 */

import { logger } from '@/lib/utils/logger'
import type { LLMRequest, LLMResponse, LLMToolCall } from '@/types/line.types'

const OPENROUTER_ENDPOINT = 'https://openrouter.ai/api/v1/chat/completions'
const DEFAULT_MODEL = 'deepseek/deepseek-v3'
const REQUEST_TIMEOUT_MS = 30_000

interface OpenRouterChoice {
  message?: {
    role?: string
    content?: string | null
    tool_calls?: Array<{
      id: string
      type: 'function'
      function: { name: string; arguments: string }
    }>
  }
  finish_reason?: string
}

interface OpenRouterResponse {
  id?: string
  model?: string
  choices?: OpenRouterChoice[]
  usage?: {
    prompt_tokens?: number
    completion_tokens?: number
    total_tokens?: number
  }
  error?: { message?: string; code?: string | number }
}

/**
 * 是否設了 OpenRouter key（讓上層判斷要不要走 LLM）
 */
export function isOpenRouterConfigured(): boolean {
  return Boolean(process.env.OPENROUTER_API_KEY?.trim())
}

/**
 * 呼叫 OpenRouter chat completions。
 *
 * - 不 throw、失敗回 ok=false（webhook 不能因 LLM 炸）
 * - timeout 30s（避免 LINE reply token 30s 過期）
 * - 寫進 prompt / 回應的 PII 由 logger 自動 redact
 */
export async function callLLM(req: LLMRequest): Promise<LLMResponse> {
  const apiKey = process.env.OPENROUTER_API_KEY?.trim()
  const model = req.model ?? DEFAULT_MODEL

  if (!apiKey) {
    return {
      ok: false,
      content: '',
      toolCalls: [],
      model,
      error: 'OPENROUTER_API_KEY not configured',
    }
  }

  // OpenRouter 建議帶 HTTP-Referer + X-Title（給 dashboard 統計）
  const referer =
    process.env.NEXT_PUBLIC_APP_URL?.trim() || 'https://erp.venturo.tw'
  const title = `Venturo LINE Bot${req.workspaceId ? ` (ws=${req.workspaceId.slice(0, 8)})` : ''}`

  const body: Record<string, unknown> = {
    model,
    messages: req.messages,
    temperature: req.temperature ?? 0.3,
  }
  if (req.tools && req.tools.length > 0) {
    body.tools = req.tools
    body.tool_choice = 'auto'
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

  try {
    const res = await fetch(OPENROUTER_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
        'HTTP-Referer': referer,
        'X-Title': title,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    })

    if (!res.ok) {
      const text = await res.text().catch(() => '')
      logger.warn('OpenRouter non-2xx', {
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

    const json = (await res.json()) as OpenRouterResponse

    if (json.error) {
      return {
        ok: false,
        content: '',
        toolCalls: [],
        model: json.model ?? model,
        error: json.error.message || String(json.error.code) || 'unknown error',
      }
    }

    const choice = json.choices?.[0]
    const message = choice?.message
    const toolCalls: LLMToolCall[] = (message?.tool_calls ?? []).map(tc => ({
      id: tc.id,
      type: 'function',
      function: { name: tc.function.name, arguments: tc.function.arguments },
    }))

    return {
      ok: true,
      content: message?.content ?? '',
      toolCalls,
      model: json.model ?? model,
      error: null,
      usage: json.usage,
    }
  } catch (err) {
    const isAbort = err instanceof Error && err.name === 'AbortError'
    logger.error('OpenRouter call failed', err, {
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
