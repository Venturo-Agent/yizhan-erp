/**
 * Anthropic Claude LLM client（薄 wrapper）
 *
 * 把 @anthropic-ai/sdk 包成 LLMRequest / LLMResponse 統一介面、
 * 跟 OpenRouter / MiniMax client 同 signature、dispatcher 可換 provider 不改 caller。
 *
 * 紀律：
 *   - 不 throw、失敗回 ok=false
 *   - 30s timeout
 *   - token 由 caller 傳入（從 workspace_ai_settings 解密）、不入 log
 */

import Anthropic from '@anthropic-ai/sdk'
import { logger } from '@/lib/utils/logger'
import type { LLMRequest, LLMResponse } from '@/types/line.types'

const DEFAULT_MODEL = 'claude-sonnet-4-5'
const REQUEST_TIMEOUT_MS = 30_000

/**
 * 呼叫 Anthropic Claude messages API。
 */
export async function callAnthropic(
  req: LLMRequest,
  apiToken: string
): Promise<LLMResponse> {
  const model = req.model ?? DEFAULT_MODEL

  if (!apiToken) {
    return {
      ok: false,
      content: '',
      toolCalls: [],
      model,
      error: 'Anthropic api token missing',
    }
  }

  // Anthropic 把 system message 分開、不放 messages array
  const systemMessages = req.messages.filter(m => m.role === 'system')
  const otherMessages = req.messages.filter(m => m.role !== 'system')
  const systemPrompt = systemMessages.map(m => m.content).join('\n\n')

  const client = new Anthropic({
    apiKey: apiToken,
    timeout: REQUEST_TIMEOUT_MS,
  })

  try {
    const resp = await client.messages.create({
      model,
      max_tokens: 2048,
      temperature: req.temperature ?? 0.3,
      system: systemPrompt || undefined,
      messages: otherMessages.map(m => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: m.content,
      })),
    })

    const textBlock = resp.content.find(b => b.type === 'text')
    const content = textBlock && textBlock.type === 'text' ? textBlock.text : ''

    return {
      ok: true,
      content,
      toolCalls: [],
      model: resp.model,
      error: null,
      usage: {
        prompt_tokens: resp.usage.input_tokens,
        completion_tokens: resp.usage.output_tokens,
        total_tokens: resp.usage.input_tokens + resp.usage.output_tokens,
      },
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    logger.error('Anthropic call failed', err, {
      workspaceId: req.workspaceId,
      model,
    })
    return {
      ok: false,
      content: '',
      toolCalls: [],
      model,
      error: msg.slice(0, 200),
    }
  }
}

/**
 * 驗證 Anthropic token（UI wizard step 3 用）
 */
export async function validateAnthropicToken(
  apiToken: string,
  model: string = DEFAULT_MODEL
): Promise<{ ok: boolean; error?: string; sample?: string }> {
  const res = await callAnthropic(
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
