/**
 * LINE Bot LLM 組答邏輯
 *
 * 從原 handler.ts 抽出：composeReply / buildKbContext / composeReplyFallback
 */

import { isOpenRouterConfigured } from '@/lib/llm/openrouter-client'
import { dispatchLLM } from '@/lib/ai/llm-dispatcher'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { filterActive } from '@/lib/data/filter-active'
import { logger } from '@/lib/utils/logger'
import type { BotContext, LLMChatMessage, LineMessageRow, TourSummary } from '@/types/line.types'
import type { MemoryJson } from '@/lib/ai/memory-summarizer'
import type { SupabaseClient } from '@supabase/supabase-js'

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
  /** inbox conversation id（給速記卡 lookup 用、handler 傳進來、可省） */
  conversationId?: string | null
}

// ============================================================================
// system prompt
// ============================================================================

// freestyle 模式（William 2026-05-17 拍板）：先讓 chain 通、不接 RAG
// 任何訊息都回、不限 KB、不查資料、純聊天
//
// ⚠️ 簡體字大忌（William 紅線）：MiniMax 是中國家模型、預設可能吐簡體、
//    SYSTEM_PROMPT 開頭 + 末尾雙重強調「台灣繁體中文（zh-TW）」、絕不簡體。
const SYSTEM_PROMPT = `【語言鐵律】回應**只准**用台灣繁體中文（zh-TW、台灣慣用詞）、**禁止**使用任何簡體字、禁止中國大陸用語。

你是一個友善的旅行社 LINE 客服 AI、隨意回應任何訊息。

規則：
1. 任何問題都可以回、不限主題、語氣親切。
2. 簡短、不要 markdown / emoji 過多（最多 1-2 個）。
3. 真的不知道就承認、不要 hallucinate 具體價格 / 日期。
4. 之後會接 RAG 給你客戶 / 訂單資料、現在先當一般聊天 bot 用。

【再次提醒】整段回應必須是台灣繁體中文、發現自己快寫簡體字立即改成繁體。常見對應：国→國、设→設、网→網、这→這、来→來、对→對、时→時、后→後。`

// ============================================================================
// public API
// ============================================================================

export async function composeReply(args: ComposeArgs): Promise<string> {
  const { ctx, userText, history, tours, customerName, conversationId } = args

  // 速記卡（rolling summary memory、William 2026-05-18 拍板）：
  // 每對話累積 20 則訊息、AI 自己重寫一張速記卡（人物畫像 / 偏好 / 避忌 / 已聊過的事）。
  // 注入 system prompt 當長期記憶、補 50 則 history 也涵蓋不到的更早 context（如「不吃螃蟹」）。
  const memoryBlock = conversationId
    ? await fetchMemoryBlock(ctx.workspaceId, conversationId)
    : null

  // freestyle 模式（William 2026-05-17 拍板）：不注入 KB context、避免 Bot 被推回客服 SOP 風格
  // 之後接 RAG 時、把 buildKbContext 加回來、給真實檢索結果
  const messages: LLMChatMessage[] = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...(customerName ? [{ role: 'system' as const, content: `客戶顯示名：${customerName}` }] : []),
    ...(memoryBlock ? [{ role: 'system' as const, content: memoryBlock }] : []),
    // William 2026-05-17 拍板改 50 條、long context 給 LLM 記得久（MiniMax-M2 context window 夠）
    ...history.slice(-50).map(m => ({
      role: (m.direction === 'inbound' ? 'user' : 'assistant') as 'user' | 'assistant',
      content: m.content ?? '',
    })),
    { role: 'user', content: userText },
  ]

  // dispatchLLM 內部會查 workspace_ai_settings、依該 workspace 設的 provider call
  // （minimax / anthropic / openrouter）、沒設定才 fallback platform OPENROUTER_API_KEY
  const llmRes = await dispatchLLM({
    messages,
    workspaceId: ctx.workspaceId,
    temperature: 0.3,
    caller: 'line-llm-compose',
  })

  // 全部 provider 都不通（連 fallback 也沒）→ 純規則 fallback
  if (!llmRes.ok && !isOpenRouterConfigured()) {
    return composeReplyFallback(userText, tours)
  }

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

interface MemoryRow {
  memory_json: MemoryJson | null
  last_summarized_at: string | null
}

/**
 * 查速記卡、組成 system prompt 用的 memory block。
 * 沒卡 / 卡空 / 查失敗 → null（不阻塞、不報 warning）。
 */
async function fetchMemoryBlock(
  workspaceId: string,
  conversationId: string
): Promise<string | null> {
  try {
    const supabase = getSupabaseAdminClient() as unknown as SupabaseClient
    const memoryQuery = supabase
      .from('customer_memories')
      .select('memory_json, last_summarized_at')
      .eq('conversation_id', conversationId)
      .eq('workspace_id', workspaceId)
    const { data: memory } = await filterActive(memoryQuery).maybeSingle<MemoryRow>()

    if (!memory?.memory_json) return null
    const m = memory.memory_json
    const lines: string[] = []

    if (m.summary_text) lines.push(`📋 ${m.summary_text}`)

    if (m.preferences?.avoid && m.preferences.avoid.length > 0) {
      lines.push(`⚠️ 客戶明確不要 / 避忌：${m.preferences.avoid.join('、')}`)
    }
    if (m.preferences?.budget_range) lines.push(`💰 預算：${m.preferences.budget_range}`)
    if (m.preferences?.destinations && m.preferences.destinations.length > 0) {
      lines.push(`✈️ 想去：${m.preferences.destinations.join('、')}`)
    }
    if (m.preferences?.special_needs && m.preferences.special_needs.length > 0) {
      lines.push(`🔍 特殊需求：${m.preferences.special_needs.join('、')}`)
    }
    if (m.history?.rejected && m.history.rejected.length > 0) {
      const rej = m.history.rejected.map(r => `${r.tour}（${r.reason}）`).join('、')
      lines.push(`🚫 已拒絕過的團：${rej}`)
    }
    if (m.history?.interested && m.history.interested.length > 0) {
      lines.push(`👍 感興趣的團：${m.history.interested.join('、')}`)
    }

    if (lines.length === 0) return null
    return `【客戶速記卡】（上次更新：${memory.last_summarized_at ?? '剛建立'}）\n${lines.join('\n')}\n\n（請依速記卡認識客戶、回覆時尊重 avoid 清單、不要重複問已知資訊）`
  } catch (error) {
    logger.debug('fetchMemoryBlock failed (ignored)', { error })
    return null
  }
}

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
 * Fallback 訊息：LLM call 整條鏈都失敗時的 safety net。
 *
 * 設計（2026-05-17 William 拍板「徹底修復」）：
 *   - 訊息必須**明顯標示是異常 fallback**、不要假裝是正常 AI 回答（避免客戶以為這就是「AI 服務」）
 *   - 不再強行引導「給日期」（會把客戶推回死板客服 SOP 印象）
 *   - 中性、誠實、引導客戶等真人接手
 */
export function composeReplyFallback(userText: string, tours: TourSummary[]): string {
  // tours 推薦保留（這條至少是「真實資料」、不假）
  if (tours.length > 0) {
    const lines = tours.slice(0, 5).map(t => {
      const price =
        t.selling_price_per_person != null
          ? `NT$ ${Number(t.selling_price_per_person).toLocaleString('en-US')} / 人`
          : '價格洽詢'
      return `・${t.name}｜${t.departure_date ?? '-'}｜${price}`
    })
    return `（⚠️ AI 服務暫時無回應、以下是相近行程：）\n${lines.join('\n')}\n\n稍候真人客服會接手 🙏`
  }

  // 純 fallback：誠實標明、不假裝
  return '⚠️ AI 服務暫時無回應、客服已收到訊息、稍後會由真人接手回覆您 🙏'
}
