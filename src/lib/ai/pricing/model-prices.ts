/**
 * LLM 定價表（per-token USD、用來算 llm_usage_logs.cost_usd）
 *
 * 來源：LiteLLM 開源 JSON
 *   https://github.com/BerriAI/litellm/blob/main/model_prices_and_context_window.json
 *
 * 維運紀律：
 *   - 季更新一次（每季初檢查 LiteLLM 有沒有改 model 名 / 價）
 *   - 加新 model：到 LiteLLM JSON 抓對應 entry、複製進來
 *   - 找不到 model（譬如 MiniMax 國產家）：手動查 provider 官方定價填
 *   - 找不到時、`getModelPrice()` 回 null、`recordLLMUsage()` cost_usd 寫 0、log warn
 *
 * 注意：
 *   - 數字單位是 **USD per single token**（不是 per 1k token、不是 per 1M token）
 *   - 譬如 OpenAI text-embedding-3-small $0.02 / 1M token = 0.00000002 USD/token
 */

export interface ModelPrice {
  /** USD per single input token */
  input_cost_per_token: number
  /** USD per single output token */
  output_cost_per_token: number
  /** 顯示用 */
  display_name?: string
}

/**
 * Key 是「{provider}/{model}」、便於唯一識別
 * （同名 model 不同 provider 可能價格不同）
 */
const PRICES: Record<string, ModelPrice> = {
  // ════ Anthropic ════
  'anthropic/claude-sonnet-4-6': {
    input_cost_per_token: 0.000003,
    output_cost_per_token: 0.000015,
    display_name: 'Claude Sonnet 4.6',
  },
  'anthropic/claude-sonnet-4-5': {
    input_cost_per_token: 0.000003,
    output_cost_per_token: 0.000015,
    display_name: 'Claude Sonnet 4.5',
  },
  'anthropic/claude-opus-4-7': {
    input_cost_per_token: 0.000015,
    output_cost_per_token: 0.000075,
    display_name: 'Claude Opus 4.7',
  },
  'anthropic/claude-opus-4-1': {
    input_cost_per_token: 0.000015,
    output_cost_per_token: 0.000075,
    display_name: 'Claude Opus 4.1',
  },
  'anthropic/claude-haiku-4-5': {
    input_cost_per_token: 0.000001,
    output_cost_per_token: 0.000005,
    display_name: 'Claude Haiku 4.5',
  },
  'anthropic/claude-haiku-4': {
    input_cost_per_token: 0.0000008,
    output_cost_per_token: 0.000004,
    display_name: 'Claude Haiku 4',
  },

  // ════ MiniMax（中國家、自查官方）════
  // https://platform.minimaxi.com/document/Price
  'minimax/MiniMax-M2': {
    input_cost_per_token: 0.0000003,   // 暫估、待 William 給確切價
    output_cost_per_token: 0.0000012,
    display_name: 'MiniMax M2',
  },
  'minimax/MiniMax-Text-01': {
    input_cost_per_token: 0.0000002,
    output_cost_per_token: 0.0000011,
    display_name: 'MiniMax Text 01',
  },
  'minimax/abab6.5s-chat': {
    input_cost_per_token: 0.0000002,
    output_cost_per_token: 0.0000011,
    display_name: 'MiniMax abab6.5s',
  },

  // ════ OpenAI Embeddings（給 RAG 用、5/19 William 拍板開動）════
  'openai/text-embedding-3-small': {
    input_cost_per_token: 0.00000002,  // $0.02 / 1M tokens
    output_cost_per_token: 0,           // embedding 無 output
    display_name: 'OpenAI Embedding 3 Small',
  },
  'openai/text-embedding-3-large': {
    input_cost_per_token: 0.00000013,  // $0.13 / 1M tokens
    output_cost_per_token: 0,
    display_name: 'OpenAI Embedding 3 Large',
  },

  // ════ OpenRouter（per-model 浮動、本表存 fallback、實際應從 OpenRouter response 抓）════
  // OpenRouter response 內含 usage.cost 欄位（OpenRouter 自己算好）、recordLLMUsage 優先用 response 內值
}

export function getModelPrice(provider: string, model: string): ModelPrice | null {
  const key = `${provider}/${model}`
  return PRICES[key] ?? null
}

/**
 * 算單次呼叫成本（USD）
 * @returns USD（可能很小、保留 8 位小數）
 */
export function calculateCost(
  provider: string,
  model: string,
  promptTokens: number,
  completionTokens: number
): number {
  const price = getModelPrice(provider, model)
  if (!price) return 0
  return promptTokens * price.input_cost_per_token + completionTokens * price.output_cost_per_token
}
