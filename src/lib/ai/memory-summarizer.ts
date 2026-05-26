/**
 * AI 客戶速記卡（rolling summary memory）— LLM 摘要產生器
 *
 * 設計：
 *   - 每對話累積 20 則訊息、webhook 觸發 fire-and-forget 跑這個
 *   - 從 inbox_messages 拉全歷史（上限 100 則最近）、餵 LLM 重寫整張速記卡（不疊加、避免漂移）
 *   - 結果寫 customer_memories.memory_json
 *
 * 並發保護：
 *   - 同對話幾乎不會同時觸發（每 50 則才一次、5/19 William 拍板從 20 拉高）
 *   - 還是用 last_summarized_message_count 做 CAS（compare-and-swap）guard
 *
 * 失敗保護：
 *   - LLM call 失敗 / JSON parse 失敗 → failed_attempts += 1 + 記 last_error
 *   - failed_attempts >= 3 → 暫停（caller 在 webhook 那邊不再觸發）、人工點重生才清零
 *   - 失敗時不更新 memory_json、保留前一版有效資料
 *
 * 紀律：
 *   - 不 throw（webhook fire-and-forget、throw 也沒人接）
 *   - 全程 log、看得到走哪一步
 */

import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { filterActive } from '@/lib/data/filter-active'
import { logger } from '@/lib/utils/logger'
import { dispatchLLM } from './llm-dispatcher'
import { getCompanyName } from './get-company-name'
import type { SupabaseClient } from '@supabase/supabase-js'

const HANDLER = 'memory-summarizer'

// 餵 LLM 的歷史上限。100 則 ≈ 5000-10000 tokens、Haiku/Sonnet/MiniMax 都接得住、
// 一次成本約 NT$0.15-0.50、很便宜。
const MAX_HISTORY_FOR_SUMMARY = 100

// 達 3 次連續失敗暫停、避免無限燒 LLM
export const MAX_FAILED_ATTEMPTS = 3

interface MessageRow {
  direction: 'inbound' | 'outbound'
  sender_type: string
  message_type: string
  content: string | null
  created_at: string
}

interface ConversationRow {
  workspace_id: string
  display_name: string | null
  channel_type: string
  external_user_id: string
  customer_id: string | null
}

interface MemoryRow {
  id: string
  last_summarized_message_count: number
  failed_attempts: number
}

export interface SummarizeResult {
  ok: boolean
  reason?:
    | 'no_messages'
    | 'llm_failed'
    | 'parse_failed'
    | 'too_many_failures'
    | 'no_change'
    | 'db_error'
  error?: string
}

interface SummarizeInput {
  conversationId: string
  workspaceId: string
  /** 當前對話總則數（webhook 算給我們、避免重 query）。傳 -1 表示函數自己查。 */
  currentMessageCount?: number
}

/**
 * 速記卡結構（AI 產出 JSON 對齊這個 shape）
 */
export interface MemoryJson {
  persona?: {
    name?: string | null
    family?: string | null
    occupation?: string | null
    tone?: '主動' | '完整' | '應付' | string
  }
  preferences?: {
    destinations?: string[]
    budget_range?: string | null
    departure_window?: string | null
    avoid?: string[]
    special_needs?: string[]
  }
  history?: {
    discussed_tours?: string[]
    rejected?: Array<{ tour: string; reason: string }>
    interested?: string[]
  }
  unanswered_questions?: string[]
  summary_text?: string
}

const SUMMARY_SYSTEM_PROMPT = `你是「\${COMPANY_NAME}」的 AI 客服速記卡產生器。

任務：根據客服跟客戶的完整對話歷史、寫一張結構化「客戶速記卡」、給下次 AI 回覆時當長期記憶用。

輸出格式：嚴格 JSON、不要任何 markdown 包裹（不要 \`\`\`json）、不要前言廢話。
JSON 結構（缺欄位用 null 或空陣列、不要省略 key）：

{
  "persona": {
    "name": "客人自稱的名字（沒提就 null）",
    "family": "家庭結構描述（如『夫妻 + 2 小孩』、沒提就 null）",
    "occupation": "職業（沒提就 null）",
    "tone": "三選一：主動 / 完整 / 應付（看客戶提供資訊的詳盡程度判斷）"
  },
  "preferences": {
    "destinations": ["目的地陣列、客戶說想去的地方"],
    "budget_range": "預算範圍（如『30-50 萬』、沒提 null）",
    "departure_window": "出發時間窗（如『暑假』『8 月中旬』、沒提 null）",
    "avoid": ["客戶明確說不要 / 不吃 / 不去的東西陣列"],
    "special_needs": ["特殊需求陣列（如『親子適合』『無障礙』）"]
  },
  "history": {
    "discussed_tours": ["跟客戶介紹過的團名 / 行程陣列"],
    "rejected": [{"tour": "團名", "reason": "客戶拒絕的原因"}],
    "interested": ["客戶表達興趣的團名陣列"]
  },
  "unanswered_questions": ["AI / 業務沒答好的客戶問題陣列、用於後續建 RAG 知識庫"],
  "summary_text": "1-2 句話總結這個客戶、給 AI 看的人話版（如『4 人家庭、暑假想去日本關西、預算 30 萬、避吃螃蟹、對京都奈良行程感興趣』）"
}

規則：
- 繁體中文、台灣用語
- 只記「對話中客戶實際說過的」、不揣測 / 不杜撰
- 客戶話前後矛盾時、以最新一則為準
- 名字不確定就 null、不亂猜
- summary_text 不超過 80 字、重點密度高
- 對話中沒答好的問題（AI 說「我跟業務確認」、客戶又再問）放 unanswered_questions
- 不要加任何 markdown 包裹、直接吐 JSON object`

/**
 * 主入口：生成速記卡並寫進 customer_memories
 */
export async function generateMemorySummary(input: SummarizeInput): Promise<SummarizeResult> {
  const { conversationId, workspaceId } = input
  const startedAt = Date.now()

  logger.info(`${HANDLER}: → start`, { conversationId, workspaceId })

  try {
    const supabase = getSupabaseAdminClient() as unknown as SupabaseClient

    // 取現有 memory row（如果有）
    const existingQuery = supabase
      .from('customer_memories')
      .select('id, last_summarized_message_count, failed_attempts')
      .eq('conversation_id', conversationId)
    const { data: existing, error: memErr } =
      await filterActive(existingQuery).maybeSingle<MemoryRow>()

    if (memErr) {
      logger.warn(`${HANDLER}: existing memory query failed`, {
        conversationId,
        err: memErr.message,
      })
      return { ok: false, reason: 'db_error', error: memErr.message }
    }

    // 連續失敗達上限、停手
    if (existing && existing.failed_attempts >= MAX_FAILED_ATTEMPTS) {
      logger.info(`${HANDLER}: paused (too many failures)`, {
        conversationId,
        failed_attempts: existing.failed_attempts,
      })
      return { ok: false, reason: 'too_many_failures' }
    }

    // 拉對話基本資訊
    const { data: conv, error: convErr } = await supabase
      .from('inbox_conversations')
      .select('workspace_id, display_name, channel_type, external_user_id, customer_id')
      .eq('id', conversationId)
      .maybeSingle<ConversationRow>()

    if (convErr || !conv) {
      logger.warn(`${HANDLER}: conversation not found`, { conversationId, err: convErr?.message })
      return { ok: false, reason: 'db_error', error: convErr?.message ?? 'conversation not found' }
    }

    if (conv.workspace_id !== workspaceId) {
      logger.warn(`${HANDLER}: workspace mismatch (suspicious)`, {
        conversationId,
        expected: workspaceId,
        actual: conv.workspace_id,
      })
      return { ok: false, reason: 'db_error', error: 'workspace mismatch' }
    }

    // 拉最近 N 則訊息（時間正序、給 LLM 看歷史脈絡）
    const { data: messages, error: msgErr } = await supabase
      .from('inbox_messages')
      .select('direction, sender_type, message_type, content, created_at')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: false })
      .limit(MAX_HISTORY_FOR_SUMMARY)

    if (msgErr) {
      logger.warn(`${HANDLER}: messages query failed`, { conversationId, err: msgErr.message })
      return { ok: false, reason: 'db_error', error: msgErr.message }
    }

    const messagesAsc = (messages ?? []).slice().reverse() as MessageRow[]
    const textMessages = messagesAsc.filter(m => m.content && m.message_type === 'text')

    if (textMessages.length === 0) {
      logger.info(`${HANDLER}: no text messages, skip`, { conversationId })
      return { ok: false, reason: 'no_messages' }
    }

    // 取得當前對話總則數（用於 CAS 判斷）
    let currentTotalCount = input.currentMessageCount ?? -1
    if (currentTotalCount < 0) {
      const { count } = await supabase
        .from('inbox_messages')
        .select('id', { count: 'exact', head: true })
        .eq('conversation_id', conversationId)
      currentTotalCount = count ?? messagesAsc.length
    }

    // 組 transcript
    const transcript = textMessages
      .map(m => {
        const role =
          m.direction === 'inbound'
            ? '客戶'
            : m.sender_type === 'ai_agent'
              ? 'AI 助理'
              : m.sender_type === 'system'
                ? '系統'
                : '客服人員'
        return `[${role}] ${m.content}`
      })
      .join('\n')

    const customerName = conv.display_name || '客戶'
    const channelLabel =
      conv.channel_type === 'line'
        ? 'LINE'
        : conv.channel_type === 'facebook'
          ? 'Facebook Messenger'
          : conv.channel_type === 'instagram'
            ? 'Instagram DM'
            : conv.channel_type

    const userPrompt = `客戶名稱：${customerName}
通路：${channelLabel}
最近 ${textMessages.length} 則對話（共 ${currentTotalCount} 則訊息）：
---
${transcript}
---

請依規則產出速記卡 JSON。`

    // 2026-05-22 William 拍板：動態填 workspace 名稱、不再 hardcoded
    const companyName = await getCompanyName(workspaceId)
    const filledSystemPrompt = SUMMARY_SYSTEM_PROMPT.replace(/\$\{COMPANY_NAME\}/g, companyName)

    // Call LLM
    const llmResult = await dispatchLLM({
      workspaceId,
      messages: [
        { role: 'system', content: filledSystemPrompt },
        { role: 'user', content: userPrompt },
      ],
      caller: 'memory-summarizer',
    })

    if (!llmResult.ok || !llmResult.content) {
      logger.warn(`${HANDLER}: LLM failed`, { conversationId, error: llmResult.error ?? undefined })
      await bumpFailedAttempts(
        supabase,
        conversationId,
        workspaceId,
        conv.customer_id,
        llmResult.error ?? 'LLM no content'
      )
      return { ok: false, reason: 'llm_failed', error: llmResult.error ?? undefined }
    }

    // Parse JSON（LLM 可能回 ```json``` 包裹、剝掉）
    const memoryJson = parseMemoryJson(llmResult.content)
    if (!memoryJson) {
      logger.warn(`${HANDLER}: parse JSON failed`, {
        conversationId,
        sample: llmResult.content.slice(0, 200),
      })
      await bumpFailedAttempts(
        supabase,
        conversationId,
        workspaceId,
        conv.customer_id,
        'JSON parse failed'
      )
      return { ok: false, reason: 'parse_failed' }
    }

    // Upsert
    const now = new Date().toISOString()
    const { error: upsertErr } = await supabase.from('customer_memories').upsert(
      {
        workspace_id: workspaceId,
        conversation_id: conversationId,
        customer_id: conv.customer_id,
        memory_json: memoryJson,
        last_summarized_message_count: currentTotalCount,
        last_summarized_at: now,
        failed_attempts: 0,
        last_error: null,
        updated_at: now,
      },
      { onConflict: 'conversation_id' }
    )

    if (upsertErr) {
      logger.warn(`${HANDLER}: upsert failed`, { conversationId, err: upsertErr.message })
      return { ok: false, reason: 'db_error', error: upsertErr.message }
    }

    const latencyMs = Date.now() - startedAt
    logger.info(`${HANDLER}: ✅ ok`, {
      conversationId,
      messageCount: textMessages.length,
      totalMessages: currentTotalCount,
      latencyMs,
      summary_preview: memoryJson.summary_text?.slice(0, 60),
    })

    return { ok: true }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    logger.error(`${HANDLER}: unexpected error`, { conversationId, err: msg })
    return { ok: false, reason: 'db_error', error: msg }
  }
}

/**
 * 剝掉 markdown fence、parse JSON、檢查最低 shape。
 * 失敗回 null（caller 視為 parse_failed）。
 */
function parseMemoryJson(raw: string): MemoryJson | null {
  let cleaned = raw.trim()
  // 剝掉 ```json ... ``` 或 ``` ... ```
  cleaned = cleaned
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim()

  try {
    const parsed = JSON.parse(cleaned) as unknown
    if (typeof parsed !== 'object' || parsed === null) return null
    // 最低要求：要嘛有 summary_text、要嘛 persona/preferences 至少一個有結構
    const obj = parsed as MemoryJson
    if (!obj.summary_text && !obj.persona && !obj.preferences) return null
    return obj
  } catch {
    return null
  }
}

/**
 * 失敗計數 +1、記 last_error、如果還沒 row 就建空 row 計數
 */
async function bumpFailedAttempts(
  supabase: SupabaseClient,
  conversationId: string,
  workspaceId: string,
  customerId: string | null,
  errorMessage: string
): Promise<void> {
  const existingQuery = supabase
    .from('customer_memories')
    .select('id, failed_attempts')
    .eq('conversation_id', conversationId)
  const { data: existing } = await filterActive(existingQuery).maybeSingle<{
    id: string
    failed_attempts: number
  }>()

  if (existing) {
    await supabase
      .from('customer_memories')
      .update({
        failed_attempts: existing.failed_attempts + 1,
        last_error: errorMessage.slice(0, 500),
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id)
  } else {
    await supabase.from('customer_memories').insert({
      workspace_id: workspaceId,
      conversation_id: conversationId,
      customer_id: customerId ?? undefined,
      memory_json: {},
      last_summarized_message_count: 0,
      failed_attempts: 1,
      last_error: errorMessage.slice(0, 500),
    })
  }
}
