/**
 * POST /api/tours/[code]/ai-assist
 *
 * 展示行程 AI 助理 — 呼叫 MiniMax 生成指定 block 的文案
 *
 * 設計原則（成本控制）：
 * - 一次 call 生成所有勾選項目，不做多次 round-trip
 * - 送給 AI 的是壓縮過的行程摘要，不是完整 canvas JSON
 * - 使用 abab6.5s-chat（最便宜），預期每次 0.05-0.1 台幣
 *
 * 需要環境變數：
 *   MINIMAX_API_KEY   — MiniMax API Key
 *   MINIMAX_GROUP_ID  — MiniMax Group ID（選填，部分 endpoint 需要）
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { requireCapability } from '@/lib/auth/require-capability'
import { CAPABILITIES } from '@/lib/permissions/capabilities'
import { logger } from '@/lib/utils/logger'

// ── Request schema ────────────────────────────────────────────

const requestItemSchema = z.object({
  id: z.string(),
  label: z.string(),
  instruction: z.string(),
  target: z.unknown(),
})

const bodySchema = z.object({
  canvas_summary: z.string().max(4000),
  requests: z.array(requestItemSchema).min(1).max(20),
})

// ── MiniMax 呼叫 ──────────────────────────────────────────────

interface MiniMaxMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

interface MiniMaxResponse {
  choices?: { message?: { content?: string } }[]
}

async function callMiniMax(messages: MiniMaxMessage[]): Promise<string> {
  const apiKey = process.env.MINIMAX_API_KEY
  if (!apiKey) {
    throw new Error('MINIMAX_API_KEY 尚未設定，請聯絡系統管理員')
  }

  const groupId = process.env.MINIMAX_GROUP_ID
  const url = groupId
    ? `https://api.minimax.chat/v1/text/chatcompletion_pro?GroupId=${groupId}`
    : 'https://api.minimax.chat/v1/chat/completions'

  const body = groupId
    ? {
        // chatcompletion_pro 格式（需要 GroupId）
        model: 'abab6.5s-chat',
        messages,
        tokens_to_generate: 1000,
        temperature: 0.7,
        reply_constraints: { sender_type: 'BOT', sender_name: 'AI' },
        bot_setting: [{ bot_name: 'AI', content: messages[0]?.content ?? '' }],
      }
    : {
        // OpenAI-compatible 格式
        model: 'abab6.5s-chat',
        messages,
        max_tokens: 1000,
        temperature: 0.7,
      }

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const errText = await res.text().catch(() => '')
    logger.error('MiniMax API error', { status: res.status, body: errText })
    throw new Error(`MiniMax 回應錯誤 ${res.status}`)
  }

  const data = (await res.json()) as MiniMaxResponse

  // chatcompletion_pro 和 chat/completions 的回傳結構一樣
  const content = data.choices?.[0]?.message?.content
  if (!content) {
    throw new Error('MiniMax 沒有回傳內容')
  }

  return content
}

// ── Prompt 組裝 ───────────────────────────────────────────────

function buildPrompt(
  canvasSummary: string,
  requests: { id: string; label: string; instruction: string }[]
): MiniMaxMessage[] {
  const itemsText = requests
    .map((r, i) => `${i + 1}. [id: ${r.id}] ${r.label}：${r.instruction}`)
    .join('\n')

  const system = `你是旅遊行程文案助理，專為精品包團設計有溫度、期待感強的繁體中文文案。
根據行程資料，為每個指定項目生成文案。
必須回傳 JSON 格式，不要加任何說明：{"patches":[{"id":"...","generated":"..."},...]}`

  const user = `行程資料：
${canvasSummary}

請為以下項目生成文案：
${itemsText}

回傳 JSON（patches 陣列，每個有 id 和 generated 兩個欄位）。`

  return [
    { role: 'system', content: system },
    { role: 'user', content: user },
  ]
}

// ── 解析 AI 回傳的 JSON ───────────────────────────────────────

interface RawPatch {
  id: string
  generated: string
}

function parsePatches(raw: string): RawPatch[] {
  // 嘗試直接 parse
  try {
    const parsed = JSON.parse(raw) as { patches?: RawPatch[] }
    if (Array.isArray(parsed.patches)) return parsed.patches
  } catch {
    // fall through
  }

  // 嘗試從 markdown code block 裡取出 JSON
  const match = raw.match(/```(?:json)?\s*([\s\S]*?)\s*```/)
  if (match?.[1]) {
    try {
      const parsed = JSON.parse(match[1]) as { patches?: RawPatch[] }
      if (Array.isArray(parsed.patches)) return parsed.patches
    } catch {
      // fall through
    }
  }

  logger.warn('AI response not parseable as JSON', { raw: raw.slice(0, 200) })
  return []
}

// ── Route handler ─────────────────────────────────────────────

export async function POST(req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const supabase = await createSupabaseServerClient()
  const capCheck = await requireCapability(supabase, CAPABILITIES.TOURS_DISPLAY_ITINERARY_WRITE)
  if (!capCheck.ok) {
    return NextResponse.json({ error: '無展示行程編輯權限' }, { status: 403 })
  }

  const { code } = await params
  if (!code) {
    return NextResponse.json({ error: '缺少團號' }, { status: 400 })
  }

  let body: z.infer<typeof bodySchema>
  try {
    body = bodySchema.parse(await req.json())
  } catch {
    return NextResponse.json({ error: '請求格式錯誤' }, { status: 400 })
  }

  try {
    const messages = buildPrompt(body.canvas_summary, body.requests)
    const raw = await callMiniMax(messages)
    const rawPatches = parsePatches(raw)

    // 把 AI 回傳的 patch 跟原始 request 的 target 合併
    const requestMap = new Map(body.requests.map((r) => [r.id, r]))
    const patches = rawPatches
      .filter((p) => requestMap.has(p.id) && p.generated)
      .map((p) => {
        const req = requestMap.get(p.id)!
        return {
          id: p.id,
          label: req.label,
          target: req.target,
          generated: p.generated.trim(),
        }
      })

    return NextResponse.json({ patches })
  } catch (err) {
    const message = err instanceof Error ? err.message : '生成失敗'
    logger.error('ai-assist route error', { code, error: message })
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
