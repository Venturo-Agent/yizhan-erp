/**
 * AI tool：record_knowledge_gap — 記錄「AI 沒料而轉接顧問」的客戶問題
 *
 * 2026-05-28 William 拍板「白痴起點 + 訓練飛輪」：
 *   每家新租戶開通 AI 都是白痴、漫途賣的是「把白痴變聰明的工具流」。
 *   AI 在「資料庫沒這項料 → 轉接顧問」場景必 call 這個 tool 把客戶問題記下來、
 *   業務 review 後補進 KB → 下次 AI 就會了。沒這個機制 = 訓練機會隨對話蒸發。
 *
 * 設計（跟 send_payment_link 同模式）：
 *   - 不打 HTTP /api/ai/training-queue（那條走 user session、AI 沒 session）
 *   - 直接用 admin client 寫 ai_knowledge_gaps（service_role bypass RLS）
 *   - workspace_id 由 caller 傳（從對話 context 拿）、AI 不能自己決定
 *   - conversation_id / external_user_id / customer_name 也由 caller 傳、AI 看不見
 *   - failure 不擋對話（記不到也要繼續、不可影響客服體驗）
 *
 * AI tool spec：
 *   - name: record_knowledge_gap
 *   - 2 個 input：question_text（客戶原話）、topic_hint（AI 自標主題）
 */

import { logger } from '@/lib/utils/logger'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import type { LLMTool } from '@/types/line.types'
import type { SupabaseClient } from '@supabase/supabase-js'

const HANDLER = 'ai-tool:record-knowledge-gap'

/**
 * Tool 定義（給 LLM 看的 spec）
 *
 * description 要寫清楚 AI 才會在對的時機 call。
 * 強調：只在「真的沒料而轉接顧問」時 call、不要每訊息都 call（會洪水）。
 */
export const recordKnowledgeGapTool: LLMTool = {
  type: 'function',
  function: {
    name: 'record_knowledge_gap',
    description:
      '當你因為「資料庫沒這項料」而要轉接顧問時、必須 call 這個記下客戶問了什麼。' +
      '使用情境：客戶問具體事實（景點介紹、簽證流程、餐廳推薦、飯店資訊、票價、開放時間、行程細節等）、' +
      '但你發現上下文裡的「商品介紹 / 推薦旅遊團 / 客戶速記卡」都沒命中、而你正要回「我們的 AI 還沒被訓練過、幫您轉接顧問」時、' +
      'call 這個 tool 把客戶問題記下來。這是業務之後補料的依據、不能漏記。' +
      '不要在客戶只是寒暄（hi / 你好 / 謝謝）或業務型釐清回應（我是新北人 / 5 個人）時 call。',
    parameters: {
      type: 'object',
      properties: {
        question_text: {
          type: 'string',
          description: '客戶的原話、原問題（一字不漏、不要改寫、不要摘要）',
        },
        topic_hint: {
          type: 'string',
          description:
            '你自己標的主題分類（譬如：「日本北海道景點」「沙烏地簽證」「札幌餐廳推薦」「歐洲行程天數」）。' +
            '主題越精準、業務越好 dedup + 補料。',
        },
      },
      required: ['question_text', 'topic_hint'],
    },
  },
}

export interface RecordKnowledgeGapArgs {
  question_text: string
  topic_hint: string
}

export interface RecordKnowledgeGapContext {
  workspaceId: string
  /** 對話 ID（從 inbox_conversations、給 review 看上下文）*/
  conversationId?: string | null
  /** LINE userId / FB PSID 等（可能帶 group:/room: 前綴、跟 inbox_conversations 對齊）*/
  externalUserId?: string | null
  /** 客戶顯示名（已知就傳、未知就 null） */
  customerName?: string | null
  /** AI 這次的回應（給 review 看 AI 怎麼處理的）*/
  aiResponse?: string | null
}

export interface RecordKnowledgeGapResult {
  ok: boolean
  /** 寫入的 row id、給 caller log 用 */
  gapId?: string
  error: string | null
}

const FAILURE: Pick<RecordKnowledgeGapResult, 'ok' | 'error'> = {
  ok: false,
  error: null,
}

/**
 * Handler — 給 AI dispatcher 收到 tool_use 後 execute 用。
 *
 * 一律 fire-and-forget 風格：任何錯誤（write fail / network / token）都不 throw、
 * 不擋對話流程。記不到就算了、log warn、AI 還是要回客戶「轉接顧問」那句話。
 */
export async function executeRecordKnowledgeGap(
  args: RecordKnowledgeGapArgs,
  ctx: RecordKnowledgeGapContext
): Promise<RecordKnowledgeGapResult> {
  logger.info(`${HANDLER}: → execute`, {
    workspaceId: ctx.workspaceId,
    conversationId: ctx.conversationId ?? null,
    topic_hint: args.topic_hint,
    question_len: args.question_text?.length ?? 0,
  })

  if (!ctx.workspaceId) {
    return { ...FAILURE, error: 'workspaceId 必填、AI tool 拿不到 workspace context' }
  }
  if (!args.question_text?.trim()) {
    return { ...FAILURE, error: 'question_text 必填' }
  }
  if (!args.topic_hint?.trim()) {
    return { ...FAILURE, error: 'topic_hint 必填' }
  }

  try {
    const supabase = getSupabaseAdminClient() as unknown as SupabaseClient
    const { data, error } = await supabase
      .from('ai_knowledge_gaps')
      .insert({
        workspace_id: ctx.workspaceId,
        conversation_id: ctx.conversationId ?? null,
        external_user_id: ctx.externalUserId ?? null,
        customer_name: ctx.customerName ?? null,
        question_text: args.question_text.trim().slice(0, 4000),
        topic_hint: args.topic_hint.trim().slice(0, 200),
        ai_response: ctx.aiResponse?.slice(0, 4000) ?? null,
        // status / created_by / created_at 走 DB 預設（pending / NULL / now()）
      })
      .select('id')
      .single<{ id: string }>()

    if (error) {
      logger.warn(`${HANDLER}: insert failed`, {
        workspaceId: ctx.workspaceId,
        error: error.message,
      })
      return { ...FAILURE, error: error.message }
    }

    logger.info(`${HANDLER}: ← ok`, {
      workspaceId: ctx.workspaceId,
      gapId: data?.id,
      topic_hint: args.topic_hint,
    })

    return { ok: true, gapId: data?.id, error: null }
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'unknown error'
    logger.error(`${HANDLER}: threw`, { err: msg })
    return { ...FAILURE, error: msg }
  }
}
