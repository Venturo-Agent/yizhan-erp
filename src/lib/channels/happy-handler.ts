/**
 * HAPPY Bot handler — 同事在內部 bot channel 發訊息時、Bot 自動 LLM 回應
 *
 * 設計（William 2026-05-17 拍板）：
 *   - 觸發點：POST /api/channels/messages 寫入後 fire-and-forget
 *   - LLM：走 dispatchLLM（跟 LINE Bot 共用 workspace_ai_settings 內的 MiniMax-M2）
 *   - 寫入：channel_messages、sender_agent_id = channel.agent_id、sender_employee_id = null
 *   - 無限循環防護：最新一條訊息若 sender_agent_id 不為 null（bot 自己發的）、不再回
 *   - 簡體繁體：dispatchLLM 內已過 opencc-js 轉繁、HAPPY 也享同保障
 */

import { dispatchLLM } from '@/lib/ai/llm-dispatcher'
import { logger } from '@/lib/utils/logger'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { LLMChatMessage } from '@/types/line.types'

const HANDLER = 'happy-handler'

/**
 * HAPPY base prompt — 接 workspace.name 動態組裝
 *
 * HAPPY 是每個 SaaS 租戶共用的「官方客服 bot」、跑在每個 workspace 內、讀該公司資料。
 * 公司名不寫死、由 workspaces.name 注入；沒設 name fallback「公司」。
 */
function buildHappyBasePrompt(workspaceName: string): string {
  return `【語言鐵律】回應**只准**用台灣繁體中文（zh-TW、台灣慣用詞）、絕對禁止簡體字、禁止中國大陸用語。

你是 ${workspaceName} 內部 AI 助手「HAPPY」、同事在內部頻道問你問題。

規則：
1. 任何問題都可以回、不限主題、語氣親切自然像同事。
2. 簡短、不要 markdown / emoji 過多（最多 1-2 個）。
3. 之後會接 ERP RAG 給你訂單 / 客戶 / 行程資料、目前先當一般聊天 bot、**不要瞎掰具體業務資料**（例如「某客戶下了 X 訂單」）。
4. 真的不知道就承認、不要 hallucinate。

【再次提醒】整段回應必須是台灣繁體中文。`
}

/**
 * HAPPY 人格設定（每個 workspace 都有自己的 HAPPY、不寫死品牌）
 *
 * 從 workspace_ai_agents 表讀（channel_type='happy'）：
 *   - system_prompt_override：完全覆寫 base prompt（個別客戶定制）
 *   - brand_description：append 進 base prompt 後面（補品牌 context）
 *
 * 沒設定 → 用 buildHappyBasePrompt(workspaceName) 預設。
 */
async function buildHappySystemPrompt(
  supabase: SupabaseClient,
  workspaceId: string
): Promise<string> {
  // 撈 workspace name 注入 base prompt（HAPPY 不寫死任何公司名）
  const { data: ws } = await supabase
    .from('workspaces')
    .select('name')
    .eq('id', workspaceId)
    .maybeSingle<{ name: string | null }>()
  const workspaceName = ws?.name?.trim() || '公司'
  const basePrompt = buildHappyBasePrompt(workspaceName)

  try {
    const { data: persona } = await supabase
      .from('workspace_ai_agents')
      .select('system_prompt_override, brand_description, is_active')
      .eq('workspace_id', workspaceId)
      .eq('channel_type', 'happy')
      .maybeSingle<{
        system_prompt_override: string | null
        brand_description: string | null
        is_active: boolean
      }>()

    if (!persona || !persona.is_active) return basePrompt

    if (persona.system_prompt_override && persona.system_prompt_override.trim().length > 0) {
      return persona.system_prompt_override.trim()
    }

    if (persona.brand_description && persona.brand_description.trim().length > 0) {
      return `${basePrompt}\n\n【品牌 / 客戶 context】\n${persona.brand_description.trim()}`
    }

    return basePrompt
  } catch (err) {
    logger.debug(`${HANDLER}: persona lookup failed (use default)`, {
      workspaceId,
      err: err instanceof Error ? err.message : String(err),
    })
    return basePrompt
  }
}

interface ChannelRow {
  workspace_id: string
  type: string
  agent_id: string | null
  is_archived: boolean | null
}

interface MessageRow {
  sender_employee_id: string | null
  sender_agent_id: string | null
  body: string | null
  message_type: string | null
  created_at: string
}

/**
 * 同事在 HAPPY (bot) channel 發訊息時、Bot 自動 LLM 回應。
 *
 * 觸發：POST /api/channels/messages INSERT 後 fire-and-forget。
 * 失敗：不 throw、靜默 log（不擋主 response、Bot 沒回不影響 user 看到自己的訊息）。
 */
export async function tryHappyReply(channelId: string): Promise<void> {
  try {
    const supabase = getSupabaseAdminClient() as unknown as SupabaseClient

    // 1. 撈 channel 看是不是 bot channel
    const { data: channel } = await supabase
      .from('channels')
      .select('workspace_id, type, agent_id, is_archived')
      .eq('id', channelId)
      .maybeSingle<ChannelRow>()

    if (!channel) return
    if (channel.type !== 'bot' || !channel.agent_id) return
    if (channel.is_archived) return

    // 2. 撈最近 50 條 history（is_active 過濾 revoked / deleted）
    const { data: historyRaw } = await supabase
      .from('channel_messages')
      .select('sender_employee_id, sender_agent_id, body, message_type, created_at')
      .eq('channel_id', channelId)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(50)
      .returns<MessageRow[]>()

    const history = (historyRaw ?? []).slice().reverse() // 改回時間順序
    if (history.length === 0) return

    // 3. 防無限循環：最新一條若是 bot 自己發的、不回
    const newest = history[history.length - 1]
    if (newest.sender_agent_id) {
      logger.info(`${HANDLER}: newest is bot reply, skip`, { channelId })
      return
    }

    // 4. 組 LLMRequest messages
    // HAPPY 人格走 workspace_ai_agents（漫途配、客戶不能改）
    const happyPrompt = await buildHappySystemPrompt(supabase, channel.workspace_id)
    const messages: LLMChatMessage[] = [
      { role: 'system', content: happyPrompt },
      ...history
        .filter(m => m.message_type === 'text' && m.body)
        .map(m => ({
          role: (m.sender_agent_id ? 'assistant' : 'user') as 'user' | 'assistant',
          content: m.body ?? '',
        })),
    ]

    logger.info(`${HANDLER}: triggering LLM`, {
      workspaceId: channel.workspace_id,
      channelId,
      historyCount: history.length,
    })

    // 5. call LLM（dispatchLLM 內部已含 opencc-js 簡→繁、log、last_used_at 更新、usage tracker）
    const llmRes = await dispatchLLM({
      messages,
      workspaceId: channel.workspace_id,
      temperature: 0.5,
      caller: 'happy-handler',
    })

    if (!llmRes.ok || !llmRes.content) {
      logger.warn(`${HANDLER}: LLM failed, no reply`, {
        workspaceId: channel.workspace_id,
        channelId,
        error: llmRes.error,
      })
      return
    }

    // 6. INSERT bot reply（sender_agent_id 標明是 HAPPY agent 發的、不是任何 employee）
    const { error: insertErr } = await supabase
      .from('channel_messages')
      .insert({
        channel_id: channelId,
        sender_employee_id: null,
        sender_agent_id: channel.agent_id,
        body: llmRes.content.trim(),
        message_type: 'text',
      })

    if (insertErr) {
      logger.error(`${HANDLER}: insert bot reply failed`, insertErr, { channelId })
      return
    }

    logger.info(`${HANDLER}: ✅ replied`, {
      workspaceId: channel.workspace_id,
      channelId,
      contentLength: llmRes.content.length,
    })
  } catch (err) {
    // fire-and-forget caller、絕不擋主 response
    logger.error(`${HANDLER}: unexpected error`, err, { channelId })
  }
}
