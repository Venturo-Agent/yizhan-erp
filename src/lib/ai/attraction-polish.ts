/**
 * 景點文字 AI 潤飾
 *
 * 提供者優先序：
 *   1. MINIMAX_API_KEY（Minimax、串接後自動走這條）
 *   2. VENTURO_AI_BRAIN_KEY / ANTHROPIC_API_KEY（已有、fallback）
 *
 * 欄位：
 *   description — 簡介（50-100字、一句話精準描述）
 *   notes       — 詳細介紹（200-400字、亮點 + 體驗 + 實用資訊）
 */

import Anthropic from '@anthropic-ai/sdk'
import { logger } from '@/lib/utils/logger'

export interface AttractionPolishInput {
  name: string
  category?: string
  field: 'description' | 'notes'
  currentContent: string
}

export interface AttractionPolishResult {
  polished: string
  provider: 'minimax' | 'anthropic'
}

function buildPrompt(input: AttractionPolishInput): string {
  const isDescription = input.field === 'description'
  const target = isDescription
    ? '簡介（50-100字，一句話精準描述景點特色，語氣簡潔）'
    : '詳細介紹（200-400字，涵蓋景點亮點、遊客體驗、實用資訊，語氣親切專業）'

  const hasContent = input.currentContent.trim().length > 0

  return `你是旅遊文案專家，專為台灣旅行社撰寫景點介紹。請使用繁體中文。

景點名稱：${input.name}
景點類別：${input.category || '未分類'}
需撰寫欄位：${target}

${hasContent ? `原始內容（請潤飾改寫）：\n${input.currentContent}` : '（欄位目前空白，請根據景點名稱和類別撰寫）'}

要求：
- 直接輸出文字本身，不要加任何前言、說明或標題
- 不要輸出「以下是」「潤飾後」等前言字樣
- 適合放在旅遊手冊和行程規劃使用`
}

export async function polishAttractionText(
  input: AttractionPolishInput
): Promise<AttractionPolishResult> {
  const minimaxKey = process.env.MINIMAX_API_KEY
  const anthropicKey = process.env.VENTURO_AI_BRAIN_KEY || process.env.ANTHROPIC_API_KEY

  if (minimaxKey) {
    try {
      return await polishWithMinimax(input, minimaxKey)
    } catch (err) {
      logger.warn('Minimax polish failed, falling back to Anthropic:', err)
      if (anthropicKey) return await polishWithAnthropic(input, anthropicKey)
      throw err
    }
  }

  if (anthropicKey) {
    return await polishWithAnthropic(input, anthropicKey)
  }

  throw new Error('AI_NOT_CONFIGURED')
}

async function polishWithMinimax(
  input: AttractionPolishInput,
  apiKey: string
): Promise<AttractionPolishResult> {
  const res = await fetch('https://api.minimax.chat/v1/text/chatcompletion_v2', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'abab6.5s-chat',
      messages: [{ role: 'user', content: buildPrompt(input) }],
    }),
  })

  if (!res.ok) {
    throw new Error(`Minimax API ${res.status}: ${await res.text()}`)
  }

  const data = (await res.json()) as { choices?: { message?: { content?: string } }[] }
  const polished = data.choices?.[0]?.message?.content?.trim() ?? ''
  if (!polished) throw new Error('Minimax returned empty content')
  return { polished, provider: 'minimax' }
}

async function polishWithAnthropic(
  input: AttractionPolishInput,
  apiKey: string
): Promise<AttractionPolishResult> {
  const client = new Anthropic({ apiKey })
  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1024,
    messages: [{ role: 'user', content: buildPrompt(input) }],
  })

  const polished =
    message.content
      .filter(b => b.type === 'text')
      .map(b => (b as { type: 'text'; text: string }).text)
      .join('')
      .trim() ?? ''

  if (!polished) throw new Error('Anthropic returned empty content')
  return { polished, provider: 'anthropic' }
}
