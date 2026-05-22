/**
 * AI Hub 大型復盤 — 全 workspace 對話 unanswered_questions 聚合
 *
 * 流程：
 *   1. 拉 workspace 全部 customer_memories（非刪除）
 *   2. 收集所有 unanswered_questions、附 conversation_id
 *   3. 餵 LLM：「合併同類問題、產主題清單、附範例對話 link」
 *   4. 寫進 rag_topic_queue 表（同一次 run 共用 generated_run_id）
 *
 * 設計重點：
 *   - **不刪舊資料**：每次 run 新建 row、status=pending、舊 row 留著
 *     讓業務看「上週跑的、這週跑的」演進
 *   - LLM 失敗時：寫 0 個 topic、不丟錯、回 { ok: true, topicCount: 0 }
 *   - 結果若聚合不出有意義內容、不寫 row（避免污染表）
 */

import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { filterActive } from '@/lib/data/filter-active'
import { logger } from '@/lib/utils/logger'
import { dispatchLLM } from './llm-dispatcher'
import { getCompanyName } from './get-company-name'
import type { SupabaseClient } from '@supabase/supabase-js'

const HANDLER = 'retrospective-aggregator'

// 最多拉幾筆 memory 進 LLM（避免 token 爆）— workspace 不大、200 通常夠
const MAX_MEMORIES_PER_RUN = 200

// LLM 輸出主題上限（一次 run 最多寫進 rag_topic_queue 幾筆）
const MAX_TOPICS_PER_RUN = 50

interface MemoryLite {
  conversation_id: string
  customer_id: string | null
  memory_json: {
    unanswered_questions?: string[]
    summary_text?: string
  } | null
}

interface AggregatedTopic {
  topic_summary: string
  example_questions: string[]
  example_conversation_ids: string[]
  occurrence_count: number
}

export interface AggregateResult {
  ok: boolean
  reason?: 'no_memories' | 'no_unanswered' | 'llm_failed' | 'parse_failed' | 'db_error'
  topicCount?: number
  runId?: string
  error?: string
}

const SYSTEM_PROMPT = `你是「\${COMPANY_NAME}」的客服對話復盤分析師。

任務：給你一個 JSON array、每筆是某對話「AI / 業務沒答好的問題」。請：
1. 合併同類問題（譬如「機票多少錢」和「現在票價」是同類、聚合為「機票即時票價查詢」）
2. 計算每個主題出現在幾個對話、列出範例對話 ID
3. 過濾掉一次性 / 太具體的（譬如「我家有兩隻貓可以帶嗎」、只在一個對話、忽略）
4. 結果按 occurrence_count 降序

輸出格式：嚴格 JSON、不要 markdown 包裹、不要前言。

{
  "topics": [
    {
      "topic_summary": "主題的人話描述（10-30 字）",
      "example_questions": ["原始問題 1", "原始問題 2"],
      "example_conversation_ids": ["uuid1", "uuid2"],
      "occurrence_count": 3
    }
  ]
}

規則：
- 繁體中文、台灣用語
- topic_summary 用客服 / 知識庫經理看得懂的中性描述、不重複客戶原話
- example_questions 最多保留 5 個原話、example_conversation_ids 最多 10 個
- 一次性問題（occurrence_count = 1）可以保留少數重要的、其他濾掉
- 若全部問題都是一次性 / 不重要、回 { "topics": [] }
- 不要 markdown 包裹`

/**
 * 主入口：拉 workspace 全速記卡的 unanswered_questions、餵 LLM、寫進 rag_topic_queue
 *
 * @param workspaceId 復盤的 workspace
 * @param actorEmployeeId 觸發者員工 id（記在 created_by、未來 audit log 用）
 */
export async function aggregateRetrospective(
  workspaceId: string,
  actorEmployeeId: string | null
): Promise<AggregateResult> {
  const startedAt = Date.now()
  const runId = crypto.randomUUID()

  logger.info(`${HANDLER}: → start`, { workspaceId, runId })

  try {
    const supabase = getSupabaseAdminClient() as unknown as SupabaseClient

    // 1. 拉 workspace 全 memory
    const memQuery = supabase
      .from('customer_memories')
      .select('conversation_id, customer_id, memory_json')
      .eq('workspace_id', workspaceId)
      .order('updated_at', { ascending: false })
      .limit(MAX_MEMORIES_PER_RUN)
    const { data: memories, error: memErr } = await filterActive(memQuery).returns<MemoryLite[]>()

    if (memErr) {
      logger.warn(`${HANDLER}: memory query failed`, { workspaceId, err: memErr.message })
      return { ok: false, reason: 'db_error', error: memErr.message }
    }

    if (!memories || memories.length === 0) {
      logger.info(`${HANDLER}: no memories yet`, { workspaceId })
      return { ok: false, reason: 'no_memories' }
    }

    // 2. 收集所有 unanswered_questions
    const allQuestions: { question: string; conversation_id: string }[] = []
    for (const m of memories) {
      const qs = m.memory_json?.unanswered_questions
      if (Array.isArray(qs)) {
        for (const q of qs) {
          if (typeof q === 'string' && q.trim()) {
            allQuestions.push({ question: q.trim(), conversation_id: m.conversation_id })
          }
        }
      }
    }

    if (allQuestions.length === 0) {
      logger.info(`${HANDLER}: no unanswered questions across memories`, {
        workspaceId,
        memoryCount: memories.length,
      })
      return { ok: false, reason: 'no_unanswered' }
    }

    // 3. 餵 LLM 聚合
    const userPrompt = `Workspace 內有 ${memories.length} 張客戶速記卡、共 ${allQuestions.length} 個「AI 答不出來」的問題。

原始資料：
${JSON.stringify(allQuestions, null, 2)}

請依規則聚合成主題清單 JSON。`

    // 2026-05-22 動態填 workspace 名稱
    const companyName = await getCompanyName(workspaceId)
    const filledSystemPrompt = SYSTEM_PROMPT.replace(/\$\{COMPANY_NAME\}/g, companyName)

    const llmRes = await dispatchLLM({
      workspaceId,
      messages: [
        { role: 'system', content: filledSystemPrompt },
        { role: 'user', content: userPrompt },
      ],
      caller: 'retrospective-aggregator',
    })

    if (!llmRes.ok || !llmRes.content) {
      logger.warn(`${HANDLER}: LLM failed`, { workspaceId, error: llmRes.error })
      return { ok: false, reason: 'llm_failed', error: llmRes.error ?? undefined }
    }

    // 4. Parse
    const topics = parseTopics(llmRes.content)
    if (!topics) {
      logger.warn(`${HANDLER}: parse failed`, {
        workspaceId,
        sample: llmRes.content.slice(0, 200),
      })
      return { ok: false, reason: 'parse_failed' }
    }

    if (topics.length === 0) {
      logger.info(`${HANDLER}: no notable topics`, { workspaceId })
      return { ok: true, topicCount: 0, runId }
    }

    // 5. 寫進 rag_topic_queue（同一個 run_id）
    const now = new Date().toISOString()
    const rows = topics.slice(0, MAX_TOPICS_PER_RUN).map(t => ({
      workspace_id: workspaceId,
      topic_summary: t.topic_summary.slice(0, 500),
      occurrence_count: Math.max(1, Math.min(9999, t.occurrence_count)),
      example_questions: (t.example_questions ?? []).slice(0, 10),
      example_conversation_ids: (t.example_conversation_ids ?? []).slice(0, 10),
      status: 'pending',
      generated_run_id: runId,
      generated_at: now,
      created_by: actorEmployeeId,
      updated_by: actorEmployeeId,
    }))

    const { error: insErr } = await supabase
      .from('rag_topic_queue')
      .insert(rows)

    if (insErr) {
      logger.warn(`${HANDLER}: insert failed`, { workspaceId, runId, err: insErr.message })
      return { ok: false, reason: 'db_error', error: insErr.message }
    }

    const latencyMs = Date.now() - startedAt
    logger.info(`${HANDLER}: ✅ ok`, {
      workspaceId,
      runId,
      memoryCount: memories.length,
      questionCount: allQuestions.length,
      topicCount: rows.length,
      latencyMs,
    })

    return { ok: true, topicCount: rows.length, runId }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    logger.error(`${HANDLER}: unexpected error`, { workspaceId, err: msg })
    return { ok: false, reason: 'db_error', error: msg }
  }
}

function parseTopics(raw: string): AggregatedTopic[] | null {
  let cleaned = raw.trim()
  cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim()
  try {
    const parsed = JSON.parse(cleaned) as { topics?: unknown }
    if (!parsed.topics || !Array.isArray(parsed.topics)) return null
    const result: AggregatedTopic[] = []
    for (const t of parsed.topics) {
      if (typeof t !== 'object' || t === null) continue
      const obj = t as Record<string, unknown>
      if (typeof obj.topic_summary !== 'string') continue
      result.push({
        topic_summary: obj.topic_summary,
        example_questions: Array.isArray(obj.example_questions)
          ? (obj.example_questions as unknown[]).filter((x): x is string => typeof x === 'string')
          : [],
        example_conversation_ids: Array.isArray(obj.example_conversation_ids)
          ? (obj.example_conversation_ids as unknown[]).filter((x): x is string => typeof x === 'string')
          : [],
        occurrence_count: typeof obj.occurrence_count === 'number' ? obj.occurrence_count : 1,
      })
    }
    return result
  } catch {
    return null
  }
}
