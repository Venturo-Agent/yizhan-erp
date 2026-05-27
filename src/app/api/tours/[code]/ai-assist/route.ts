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
import { requireCapability } from '@/lib/auth/require-capability'
import { CAPABILITIES } from '@/lib/permissions/capabilities'
import { logger } from '@/lib/utils/logger'

// ── Request schema ────────────────────────────────────────────

const requestItemSchema = z.object({
  id: z.string(),
  label: z.string(),
  instruction: z.string(),
  target: z.unknown(),
  // 料源語料（潤色類專用）：AI 這次「只准用到」的既有文字。
  // 後端零幻覺護欄拿它跟 AI 產出比對、抓有沒有冒出料源裡沒有的專有名詞 / 數字。
  source_material: z.string().max(2000).optional(),
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
        // 潤色比創作更要穩、降到 0.5 收斂亂編空間（D5 護欄精神）
        temperature: 0.5,
        reply_constraints: { sender_type: 'BOT', sender_name: 'AI' },
        bot_setting: [{ bot_name: 'AI', content: messages[0]?.content ?? '' }],
      }
    : {
        // OpenAI-compatible 格式
        model: 'abab6.5s-chat',
        messages,
        max_tokens: 1000,
        // 潤色比創作更要穩、降到 0.5 收斂亂編空間（D5 護欄精神）
        temperature: 0.5,
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
  requests: { id: string; label: string; instruction: string; source_material?: string }[]
): MiniMaxMessage[] {
  const itemsText = requests
    .map((r, i) => {
      const lines = [`${i + 1}. [id: ${r.id}] ${r.label}：${r.instruction}`]
      // 潤色類附上「料源」、讓 AI 清楚「只能用到這些料」
      if (r.source_material) {
        lines.push(`   （料源、只能改寫這些、不准新增料源外的專有名詞：${r.source_material}）`)
      }
      return lines.join('\n')
    })
    .join('\n')

  // 零幻覺鐵律 + 排印規範（句末不收句號、分隔用「・」）
  const system = `你是旅遊行程文案助理，專為精品包團設計有溫度、期待感強的繁體中文文案。
根據行程資料，為每個指定項目生成文案。

【零幻覺鐵律・最高優先】
- 只能改寫我提供的料（行程資料 + 各項目的料源）。
- 絕對不准新增任何地名、店名、餐廳名、飯店名、景點名、人名。
- 絕對不准新增任何數字或數字＋單位（公里／分鐘／樓／星級／價格等）。
- 我沒給的事實一律不准無中生有、寧可寫得抽象有溫度、也不要編造具體事物。
- 若料很少，就把既有的料寫得有畫面感即可，不要硬塞細節。

【排印規範】
- 句末不收句號「。」（句子結尾不要加句號；句中該用的標點照常）。
- 並列分隔用「・」（中間點），不要用頓號「、」當主要分隔、不要前後加空格。

【輸出格式】
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

// ── 零幻覺事後護欄 ────────────────────────────────────────────
//
// 賣點命脈：「有料才生、沒料不生」＝零幻覺。prompt 已下鐵律（生成前防線），
// 但小模型偶爾仍會偷塞料源沒有的具體事物。這層是「生成後」的第二道防線：
// 比對 AI 產出有沒有冒出料源裡沒出現過的「疑似專有名詞 / 數字＋單位」。
//
// 採「warn 不丟棄」（William 已在 ReviewStep 逐項複核）：
//   - 為什麼不丟棄：丟棄 = 把可能很好的潤色靜默扔掉、且小模型可能整段都好只一處疑似；
//     人已經在 loop 裡逐項看、給他「⚠ 這項疑似冒出料源外的詞」的提示比替他決定更好。
//   - warn=true 不阻擋套用、只回給前端標記、讓人眼最後守一關。
//
// 啟發式（只抓「determinable」的幻覺、不抓潤色一定會出現的描述性新詞）：
//   1. 數字＋單位：產出有「3.5 公里 / 五星 / 30 分鐘」等、而料源（含行程摘要）沒有 → 疑似。
//   2. 括號專有名詞：產出用《》「」『』〈〉包起來的詞、料源沒有 → 疑似（多為引述的店名 / 作品名）。
// 不抓「裸漢字詞組」：潤色必然產生大量料源沒有的形容詞 / 連接詞（漫步・靜謐・愜意），
// 全抓會每段都誤報、反而讓 warn 失去意義。專有名詞風險最高的形態是「帶括號」或「帶數字單位」。

/** 把一段文字正規化成「比對用語料」：去空白、統一全形數字、抽出可比對的 token 集合 */
function normalizeForCompare(text: string): string {
  return (
    text
      // 全形數字 → 半形（料源寫「３」產出寫「3」不該誤判）
      .replace(/[０-９]/g, d => String.fromCharCode(d.charCodeAt(0) - 0xfee0))
      // 中文數字常見字保留原樣（下面 set 比對處理）
      .replace(/\s+/g, '')
  )
}

const CN_DIGITS = '〇零一二三四五六七八九十百千萬万兩两'
// 單位：公里/公尺/分鐘/小時/天/晚/樓/層/星/級/人/間/元/円/日圓/分/秒/週/年/月/%
const UNIT_PATTERN =
  '(?:公里|公尺|公分|公頃|平方|分鐘|小時|天|晚|夜|樓|層|星|級|人|位|間|元|円|日圓|塊|分|秒|週|年|月|歲|%|％)'

/**
 * 偵測「產出冒出料源沒有的數字＋單位」與「料源沒有的括號專有名詞」。
 * 回 true = 疑似幻覺、該 patch 標 warn。
 *
 * @param generated AI 產出文字
 * @param sourceCorpus 允許的料源（該項 source_material + 整份行程摘要、合併後正規化）
 */
function detectHallucination(generated: string, sourceCorpus: string): boolean {
  const gen = normalizeForCompare(generated)
  const src = normalizeForCompare(sourceCorpus)

  // 1) 數字（阿拉伯或中文）＋單位
  const numUnitRe = new RegExp(`(?:[0-9]+(?:\\.[0-9]+)?|[${CN_DIGITS}]+)${UNIT_PATTERN}`, 'g')
  for (const m of gen.matchAll(numUnitRe)) {
    const token = m[0]
    if (!src.includes(token)) {
      // 料源沒這個「數字＋單位」組合 → 疑似編造
      return true
    }
  }

  // 2) 括號包起來的專有名詞（《》「」『』〈〉）
  const bracketRe = /[《「『〈]([^》」』〉]{1,30})[》」』〉]/g
  for (const m of gen.matchAll(bracketRe)) {
    const inner = normalizeForCompare(m[1])
    if (inner && !src.includes(inner)) {
      return true
    }
  }

  return false
}

// ── Route handler ─────────────────────────────────────────────

export async function POST(req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const capCheck = await requireCapability(CAPABILITIES.TOURS_DISPLAY_ITINERARY_WRITE)
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

    // 把 AI 回傳的 patch 跟原始 request 的 target 合併，並跑零幻覺事後護欄
    const requestMap = new Map(body.requests.map(r => [r.id, r]))
    const patches = rawPatches
      .filter(p => requestMap.has(p.id) && p.generated)
      .map(p => {
        const reqItem = requestMap.get(p.id)!
        const generated = p.generated.trim()

        // 護欄語料 = 該項料源 + 整份行程摘要（行程摘要本身就是「全部既有料」）
        const corpus = `${reqItem.source_material ?? ''}\n${body.canvas_summary}`
        const warn = detectHallucination(generated, corpus)
        if (warn) {
          logger.warn('ai-assist hallucination guardrail flagged patch', {
            code,
            id: p.id,
            label: reqItem.label,
          })
        }

        return {
          id: p.id,
          label: reqItem.label,
          target: reqItem.target,
          generated,
          warn,
        }
      })

    return NextResponse.json({ patches })
  } catch (err) {
    const message = err instanceof Error ? err.message : '生成失敗'
    logger.error('ai-assist route error', { code, error: message })
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
