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
import type { LLMRequest, LLMResponse, LLMTool, LLMToolCall } from '@/types/line.types'

// Anthropic SDK 型別（單獨拉出來、避免 cast 散落）
type AnthropicTool = Anthropic.Messages.Tool

const DEFAULT_MODEL = 'claude-sonnet-4-5'
const REQUEST_TIMEOUT_MS = 30_000

/**
 * 呼叫 Anthropic Claude messages API。
 */
export async function callAnthropic(req: LLMRequest, apiToken: string): Promise<LLMResponse> {
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

  // tools 轉換：LLMTool（OpenAI-style）→ Anthropic Tool（input_schema）
  // 2026-05-23 William：加 tool use 支援、給 send_payment_link 等 AI tool 用
  const anthropicTools = (req.tools ?? []).map(toAnthropicTool)

  try {
    const resp = await client.messages.create({
      model,
      max_tokens: 2048,
      temperature: req.temperature ?? 0.3,
      system: systemPrompt || undefined,
      ...(anthropicTools.length > 0 && { tools: anthropicTools }),
      messages: otherMessages.map(m => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: m.content,
      })),
    })

    // 解析 response content blocks（可能含 text + tool_use）
    let content = ''
    const toolCalls: LLMToolCall[] = []
    for (const block of resp.content) {
      if (block.type === 'text') {
        content += block.text
      } else if (block.type === 'tool_use') {
        toolCalls.push({
          id: block.id,
          type: 'function',
          function: {
            name: block.name,
            arguments: JSON.stringify(block.input ?? {}),
          },
        })
      }
    }

    return {
      ok: true,
      content,
      toolCalls,
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
 * LLMTool（OpenAI-style）→ Anthropic Tool 規格轉換
 * - LLMTool: { type: 'function', function: { name, description, parameters } }
 * - Anthropic: { name, description, input_schema }
 */
function toAnthropicTool(tool: LLMTool): AnthropicTool {
  return {
    name: tool.function.name,
    description: tool.function.description,
    input_schema: tool.function.parameters as AnthropicTool['input_schema'],
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
