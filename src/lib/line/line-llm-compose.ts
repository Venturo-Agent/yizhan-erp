/**
 * LINE Bot LLM 組答邏輯
 *
 * 從原 handler.ts 抽出：composeReply / buildKbContext / composeReplyFallback
 */

import { callLLM, isOpenRouterConfigured } from '@/lib/llm/openrouter-client'
import { logger } from '@/lib/utils/logger'
import type { BotContext, LLMChatMessage, LineMessageRow, TourSummary } from '@/types/line.types'

const HANDLER = 'line-llm-compose'

// ============================================================================
// types
// ============================================================================

export interface ComposeArgs {
  ctx: BotContext
  userText: string
  history: LineMessageRow[]
  tours: TourSummary[]
  customerName: string | null
}

// ============================================================================
// system prompt
// ============================================================================

const SYSTEM_PROMPT = `你是旅行社 LINE Bot 客服助手、僅依據「KB 結果」回答客戶問題。

規則：
1. 只用 KB 結果裡列出的團 / 日期 / 價格、不要瞎編、不要 hallucinate。
2. 客戶問日期 → 推薦 KB 裡 ±14 天的 3-5 個團、含團名、出發日、價格。
3. 客戶問價格 → 從 KB 裡 selling_price_per_person 報、強調「每人」。
4. KB 沒有的明確說「我們目前沒有 X、為您推薦相近選項」、附上 KB 有的最近選項。
5. 客戶想下單 → 引導補齊「人數（成人/兒童/嬰兒）/ 聯絡人姓名 / 電話」、湊齊後請對方回「確認下單」。
6. 不報自己沒查到的金流資訊、不答付款 / 退費 / 簽證等不在 KB 的問題、引導對方等真人客服。
7. 回覆精簡、繁體中文、語氣禮貌但不囉嗦、不要 emoji 過多（最多 1-2 個）。
8. 不要回 markdown 表格 / 大量 ** 粗體（LINE 不支援）。
`

// ============================================================================
// public API
// ============================================================================

export async function composeReply(args: ComposeArgs): Promise<string> {
  const { ctx, userText, history, tours, customerName } = args

  // ─── Fallback：沒 OPENROUTER_API_KEY ───
  if (!isOpenRouterConfigured()) {
    return composeReplyFallback(userText, tours)
  }

  const messages: LLMChatMessage[] = [
    { role: 'system', content: SYSTEM_PROMPT },
    {
      role: 'system',
      content: buildKbContext(tours, customerName),
    },
    ...history.slice(-20).map(m => ({
      role: (m.direction === 'inbound' ? 'user' : 'assistant') as 'user' | 'assistant',
      content: m.content ?? '',
    })),
    { role: 'user', content: userText },
  ]

  const llmRes = await callLLM({
    messages,
    workspaceId: ctx.workspaceId,
    temperature: 0.3,
  })

  if (!llmRes.ok || !llmRes.content) {
    logger.warn(`${HANDLER}: LLM call failed, fallback`, {
      workspaceId: ctx.workspaceId,
      error: llmRes.error,
    })
    return composeReplyFallback(userText, tours)
  }

  return llmRes.content.trim()
}

// ============================================================================
// private helpers
// ============================================================================

function buildKbContext(tours: TourSummary[], customerName: string | null): string {
  const parts: string[] = []
  if (customerName) {
    parts.push(`客戶顯示名：${customerName}`)
  }
  if (tours.length === 0) {
    parts.push('KB 結果：（沒查到符合日期的團、請引導客戶換日期或聯繫真人）')
  } else {
    parts.push('KB 結果（符合條件的團、請從這裡推薦）：')
    for (const t of tours) {
      const price =
        t.selling_price_per_person != null
          ? `NT$ ${Number(t.selling_price_per_person).toLocaleString('en-US')} / 人`
          : '價格洽詢'
      const seats =
        t.max_participants != null
          ? `${t.current_participants ?? 0}/${t.max_participants}`
          : `${t.current_participants ?? 0}`
      parts.push(
        `- [${t.code}] ${t.name}｜出發 ${t.departure_date ?? '-'}｜${t.days_count ?? '-'} 天｜${price}｜人數 ${seats}`
      )
    }
  }
  return parts.join('\n')
}

/**
 * 沒 OPENROUTER_API_KEY 時的 fallback：純規則回覆、demo 至少能 show webhook 通了
 */
export function composeReplyFallback(userText: string, tours: TourSummary[]): string {
  const greetings = ['哈囉', '你好', '您好', 'hi', 'hello']
  if (greetings.some(g => userText.toLowerCase().includes(g))) {
    return '您好！我是 Venturo 旅行社 AI 助理。請告訴我想出發的日期（例如「7/8」）、我幫您查附近的團 🙂'
  }

  if (tours.length > 0) {
    const lines = tours.slice(0, 5).map(t => {
      const price =
        t.selling_price_per_person != null
          ? `NT$ ${Number(t.selling_price_per_person).toLocaleString('en-US')} / 人`
          : '價格洽詢'
      return `・${t.name}｜${t.departure_date ?? '-'}｜${price}`
    })
    return `為您推薦幾個相近的團：\n${lines.join('\n')}\n\n想訂哪一團？或是要查其他日期？`
  }

  return '您好、我目前找不到符合的團、請告訴我想出發的日期（例如「2026-07-08」），或稍後等真人客服回覆 🙏'
}
