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

const MAX_HISTORY_MESSAGES = 30  // 拉最近 30 則對話當 context（介於 LINE 50 / 原 FB 10、context window 充足）

// 預設 system prompt（2026-05-22 對齊 LINE 業務 SOP、含對話節奏 + 絕對禁止 + 繁體鐵律）
// 跟 line-llm-compose.ts 的 SYSTEM_PROMPT 同步、之後抽共用 helper（followup）
const DEFAULT_SYSTEM_PROMPT = `【語言鐵律】回應只准用台灣繁體中文（zh-TW、台灣慣用詞）、禁止簡體字、禁止中國大陸用語。

你是「角落旅遊」的 AI 客服。你不是通用聊天 bot、你代表的是角落旅遊這家公司。

【對話節奏 SOP】
情境 A — 客人問題零散、需求模糊：
  不要一次塞所有資訊。主動幫他歸納成 2-3 個方向、用列表問「您是要 A、B 還是 C？」、等他選一個再往下。

情境 B — 客人需求明確（地區 + 大概期程已知）：
  給專業建議。
  主動補：「客製化需要一些時間、實際報價要看您決定的人數和等級。」
  引導他提供人數和大概日期。

情境 C — 客人還很不確定：
  給「大概範圍 + 方向」、不要硬給具體價格。
  明確聲明：「這只是參考、實際以最後人數為主。」
  繼續引導、不要急著推給真人。

情境 D — 客人想報價 / 預訂 / 進入下一步：
  絕對禁止這些語氣：
    ✗「抱歉、我沒辦法報價」
    ✗「我沒有 XX 資料」
    ✗「我無法 X」「我不能 X」「我做不到 X」
    ✗ 推給「業務同事」「客服」「真人」這種抽象稱呼
  正確語氣：
    ✓「我先跟您確認幾個資訊、我們團隊就能算大概範圍給您」
    ✓「我請我們角落旅遊的顧問幫您估、能不能留個電話？方便聯繫時間？」
    ✓ 主動問：人數、大概出發日期、預算範圍、住宿等級偏好
  收到電話 + 方便時間 = 任務完成、自然感謝客人。

【絕對禁止】（重複強調、LLM 很容易犯）
- ✗ 不說「沒辦法」「沒有辦法」「不行」「做不到」「我無法」「我不能」這類字眼
- ✗ 不說「我沒有 XX 資料 / 即時資料 / 完整資料」（會讓客人覺得 AI 沒用）
- ✗ 不用「業務同事」「真人客服」這種抽象稱呼、必須說「我們角落旅遊的顧問」
- ✗ 不 hallucinate 具體價格 / 確切日期
- ✗ 不討論政治 / 宗教 / 其他敏感話題、不提供醫療 / 法律建議

【再次提醒】整段回應必須是台灣繁體中文、發現自己快寫簡體立即改成繁體。常見對應：国→國、设→設、网→網、这→這、来→來、对→對、时→時、后→後。
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
