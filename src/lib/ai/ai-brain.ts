/**
 * AI Brain — 多通路 AI 客服 + 行程推薦的對話 brain
 *
 * 用途：FB / IG webhook 收到訊息後 call、回一段文字、讓 webhook 用 channel-native
 *      API 送出去。LINE 走另一條 line-llm-compose（同樣吃 dispatcher、有 RAG / 速記卡）。
 *
 * 設計（2026-05-21 William 拍板改吃 dispatcher）：
 *   - 走 dispatchLLM、由 workspace_ai_settings 決定 provider（MiniMax / Anthropic / etc）
 *   - 無 workspace_ai_settings → dispatcher 自己 fallback 到平台層 MINIMAX_API_KEY
 *   - LLM 用量自動進 llm_usage_logs（caller='ai-brain'）
 *   - 對話 context：撈 inbox_messages 最近 N 筆（時間倒序、role-tag 對齊）
 *
 * 不負責的：
 *   - 訊息送回客戶（channel-specific、各 webhook 自己 call Graph API / LINE Reply API）
 *   - 客戶 profile / 訂單 context 注入（caller 傳 extraSystemContext）
 */

import { dispatchLLM } from './llm-dispatcher'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { logger } from '@/lib/utils/logger'
import type { ChannelType } from '@/lib/inbox/inbox-service'

const MAX_HISTORY_MESSAGES = 10  // 拉最近 10 則對話當 context

// 預設 system prompt（M9 會擴展為「客戶資料 + 行程資料庫 + 業務規則」注入版）
const DEFAULT_SYSTEM_PROMPT = `你是「角落旅遊」的 AI 客服助理、專門幫客戶處理旅遊相關詢問。

服務風格：
- 用繁體中文回覆、語氣親切自然、像台灣旅行社業務
- 客戶問行程相關問題：先確認需求（人數、日期、預算、目的地偏好）再推薦
- 客戶問訂單 / 付款 / 出團細節：說明會請真人業務跟進、不要亂猜
- 不知道的事情誠實說「這部分我跟業務確認後回覆」、絕不編造資訊
- 回覆控制在 100 字內、自然口語、不堆專業術語

不該做的事：
- 不亂報價（價格要業務確認）
- 不承諾出團日 / 機位 / 飯店（要實際訂位）
- 不討論政治 / 宗教 / 其他敏感話題
- 不提供醫療 / 法律建議
`

interface ConversationMessageRow {
  direction: 'inbound' | 'outbound'
  sender_type: string
  content: string | null
  created_at: string
}

interface GenerateReplyInput {
  conversationId: string
  workspaceId: string
  channelType: ChannelType
  latestUserMessage: string
  /** 額外 system prompt 加在預設後面（M9 從 customer / order context 拼） */
  extraSystemContext?: string
}

export interface GenerateReplyResult {
  ok: boolean
  reply?: string
  error?: string
  /** 如果是「跳過 AI、走 agent」、reason 標出來 */
  skippedReason?: 'bot_paused' | 'no_content' | 'llm_failed'
}

/**
 * Call Claude、回一段給客戶看的文字。
 *
 * 流程：
 *   1. 檢查 API key
 *   2. 撈該對話的 bot_paused 狀態（agent 接管 / 暫停 bot 時不要回）
 *   3. 撈最近 N 則歷史對話、轉成 Anthropic message format
 *   4. call Anthropic、回 text
 *
 * 失敗 / 跳過時 ok=false + skippedReason 標清楚、webhook 看 skippedReason 決定是否通知 agent。
 */
export async function generateBotReply(input: GenerateReplyInput): Promise<GenerateReplyResult> {
  if (!input.latestUserMessage || input.latestUserMessage.trim().length === 0) {
    return { ok: false, skippedReason: 'no_content' }
  }

  const supabase = getSupabaseAdminClient()

  // 檢查 bot_paused（.bind 保 this、避免 cast 後丟 supabase context 炸 TypeError）
  const convTable = supabase.from.bind(supabase) as unknown as (
    table: string
  ) => {
    select: (cols: string) => {
      eq: (col: string, value: string) => {
        maybeSingle: () => Promise<{
          data: { bot_paused: boolean; bot_paused_until: string | null } | null
          error: { message: string } | null
        }>
      }
    }
  }
  const { data: conv } = await convTable('inbox_conversations')
    .select('bot_paused, bot_paused_until')
    .eq('id', input.conversationId)
    .maybeSingle()

  if (conv?.bot_paused) {
    const stillPaused = !conv.bot_paused_until || new Date(conv.bot_paused_until) > new Date()
    if (stillPaused) return { ok: false, skippedReason: 'bot_paused' }
  }

  // 撈歷史對話（.bind 保 this）
  const msgTable = supabase.from.bind(supabase) as unknown as (
    table: string
  ) => {
    select: (cols: string) => {
      eq: (col: string, value: string) => {
        order: (col: string, opts: { ascending: boolean }) => {
          limit: (n: number) => Promise<{
            data: ConversationMessageRow[] | null
            error: { message: string } | null
          }>
        }
      }
    }
  }
  const { data: history } = await msgTable('inbox_messages')
    .select('direction, sender_type, content, created_at')
    .eq('conversation_id', input.conversationId)
    .order('created_at', { ascending: false })
    .limit(MAX_HISTORY_MESSAGES)

  // 時間正序、轉 Anthropic message[]
  const historyAsc = (history || []).reverse()
  const messages: Array<{ role: 'user' | 'assistant'; content: string }> = []
  for (const m of historyAsc) {
    if (!m.content) continue
    if (m.direction === 'inbound') {
      messages.push({ role: 'user', content: m.content })
    } else if (m.sender_type === 'ai_agent') {
      messages.push({ role: 'assistant', content: m.content })
    }
    // agent 真人回覆 / system 不放進 AI context（避免 AI 學業務私訊風格）
  }

  // 確保最後一則是 user（不然 Anthropic API 會拒）
  if (messages.length === 0 || messages[messages.length - 1].role !== 'user') {
    messages.push({ role: 'user', content: input.latestUserMessage })
  }

  // 組 system prompt
  const systemPrompt = input.extraSystemContext
    ? `${DEFAULT_SYSTEM_PROMPT}\n\n---\n額外情境：\n${input.extraSystemContext}`
    : DEFAULT_SYSTEM_PROMPT

  // dispatcher 吃含 system 的 messages 陣列（不像 Anthropic 把 system 拆獨立 param）
  const dispatcherMessages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
    { role: 'system', content: systemPrompt },
    ...messages,
  ]

  const llmRes = await dispatchLLM({
    messages: dispatcherMessages,
    workspaceId: input.workspaceId,
    temperature: 0.3,
    caller: 'ai-brain',
  })

  if (!llmRes.ok || !llmRes.content) {
    logger.warn('AI brain dispatcher failed', {
      workspaceId: input.workspaceId,
      conversationId: input.conversationId,
      error: llmRes.error,
    })
    return {
      ok: false,
      skippedReason: 'llm_failed',
      error: llmRes.error || 'LLM dispatcher failed',
    }
  }

  return { ok: true, reply: llmRes.content.trim() }
}
