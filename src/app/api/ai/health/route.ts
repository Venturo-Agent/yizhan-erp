/**
 * GET /api/ai/health
 *
 * AI Hub 總覽（客戶自己看自己 workspace 的 AI 表現）。
 *
 * 守門：ai_hub.read（SaaS 客戶 admin 即可）。
 * scope：當前 user 的 workspace（不接受 workspaceId 參數、防越權）。
 *
 * 跟 /api/workspaces/[id]/ai-health 同 shape、但 scope 跟守門不同：
 *   - /workspaces/[id]/ai-health：漫途看任一 workspace（workspaces.write）
 *   - /ai/health（這個）：客戶看自己 workspace（ai_hub.read）
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireCapability } from '@/lib/auth/require-capability'
import { requireWorkspaceFeature } from '@/lib/auth/require-feature'
import { CAPABILITIES } from '@/lib/permissions/capabilities'
import { ApiError } from '@/lib/api/response'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { filterActive } from '@/lib/data/filter-active'
import { logger } from '@/lib/utils/logger'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { AiHealthResponse } from '../../workspaces/[id]/ai-health/route'

interface ToneTallyRow {
  memory_json: { persona?: { tone?: string } } | null
  failed_attempts: number
}

interface ConvTallyRow {
  external_user_id: string
  last_message_at: string | null
  bot_paused: boolean
}

interface MessageTallyRow {
  direction: 'inbound' | 'outbound'
  sender_type: string
  created_at: string
}

interface RetroTallyRow {
  status: 'pending' | 'reviewed' | 'actioned' | 'archived'
}

interface RagTopicTallyRow {
  status: 'pending' | 'added_to_rag' | 'declined'
  occurrence_count: number
  topic_summary: string
}

export async function GET(_request: NextRequest) {
  try {
    const guard = await requireCapability(CAPABILITIES.AI_HUB_READ)
    if (!guard.ok) return guard.response

    const feature = await requireWorkspaceFeature(guard.workspaceId, 'ai_hub', 'AI Hub')
    if (!feature.ok) return feature.response

    const workspaceId = guard.workspaceId
    const supabase = getSupabaseAdminClient() as unknown as SupabaseClient

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

    // 對話
    const { data: convs } = await supabase
      .from('inbox_conversations')
      .select('external_user_id, last_message_at, bot_paused')
      .eq('workspace_id', workspaceId)
      .eq('is_archived', false)
      .returns<ConvTallyRow[]>()

    const convStats = (convs ?? []).reduce(
      (acc, c) => {
        acc.total++
        if (c.external_user_id.startsWith('group:')) acc.group++
        else if (c.external_user_id.startsWith('room:')) acc.room++
        else acc.customer++
        if (c.last_message_at && c.last_message_at > sevenDaysAgo) acc.last7d_active++
        if (c.bot_paused) acc.bot_paused++
        return acc
      },
      { total: 0, customer: 0, group: 0, room: 0, last7d_active: 0, bot_paused: 0 }
    )

    // 訊息（30d 限制）
    const { data: msgs } = await supabase
      .from('inbox_messages')
      .select('direction, sender_type, created_at')
      .eq('workspace_id', workspaceId)
      .gte('created_at', thirtyDaysAgo)
      .returns<MessageTallyRow[]>()

    const msgStats = (msgs ?? []).reduce(
      (acc, m) => {
        acc.total++
        if (m.direction === 'inbound') acc.inbound++
        else if (m.sender_type === 'ai_agent') acc.outbound_ai++
        else if (m.sender_type === 'agent') acc.outbound_human++
        if (m.created_at > sevenDaysAgo) acc.last7d_total++
        return acc
      },
      { total: 0, inbound: 0, outbound_ai: 0, outbound_human: 0, last7d_total: 0 }
    )

    const aiTakeoverRate =
      msgStats.outbound_ai + msgStats.outbound_human > 0
        ? msgStats.outbound_ai / (msgStats.outbound_ai + msgStats.outbound_human)
        : 0

    // 速記卡
    const memQuery = supabase
      .from('customer_memories')
      .select('memory_json, failed_attempts')
      .eq('workspace_id', workspaceId)
    const { data: memories } = await filterActive(memQuery).returns<ToneTallyRow[]>()

    const memStats = (memories ?? []).reduce(
      (acc, m) => {
        acc.total++
        if (m.failed_attempts >= 3) acc.paused_failures++
        const tone = m.memory_json?.persona?.tone ?? ''
        if (tone.includes('主動') || tone.includes('完整')) acc.tone_active++
        else if (tone.includes('應付')) acc.tone_passive++
        else acc.tone_unknown++
        return acc
      },
      { total: 0, paused_failures: 0, tone_active: 0, tone_passive: 0, tone_unknown: 0 }
    )

    // 復盤
    const retroQuery = supabase
      .from('conversation_retrospectives')
      .select('status')
      .eq('workspace_id', workspaceId)
    const { data: retros } = await filterActive(retroQuery).returns<RetroTallyRow[]>()

    const retroStats = (retros ?? []).reduce(
      (acc, r) => {
        acc.total++
        acc[r.status]++
        return acc
      },
      { total: 0, pending: 0, reviewed: 0, actioned: 0, archived: 0 }
    )

    // RAG 待補主題
    const ragQuery = supabase
      .from('rag_topic_queue')
      .select('topic_summary, status, occurrence_count')
      .eq('workspace_id', workspaceId)
    const { data: ragTopics } = await filterActive(ragQuery)
      .order('occurrence_count', { ascending: false })
      .limit(50)
      .returns<RagTopicTallyRow[]>()

    const ragStats = (ragTopics ?? []).reduce(
      (acc, r) => {
        acc.total++
        acc[r.status]++
        return acc
      },
      { total: 0, pending: 0, added_to_rag: 0, declined: 0 }
    )
    const topUnanswered = (ragTopics ?? [])
      .filter(r => r.status === 'pending')
      .slice(0, 5)
      .map(r => ({ topic: r.topic_summary, count: r.occurrence_count }))

    // ══════ LLM 用量（last 30d）══════
    const { data: usageRows } = await supabase
      .from('llm_usage_logs')
      .select('provider, caller, prompt_tokens, completion_tokens, cost_usd, success')
      .eq('workspace_id', workspaceId)
      .gte('created_at', thirtyDaysAgo)
      .returns<
        Array<{
          provider: string
          caller: string | null
          prompt_tokens: number
          completion_tokens: number
          cost_usd: number
          success: boolean
        }>
      >()

    const usageInit = {
      last30d_calls: 0,
      last30d_fail_calls: 0,
      last30d_in_tokens: 0,
      last30d_out_tokens: 0,
      last30d_cost_usd: 0,
    }
    const byProviderMap = new Map<string, { calls: number; cost_usd: number }>()
    const byCallerMap = new Map<string, { calls: number; cost_usd: number }>()

    for (const u of usageRows ?? []) {
      usageInit.last30d_calls++
      if (!u.success) usageInit.last30d_fail_calls++
      usageInit.last30d_in_tokens += u.prompt_tokens
      usageInit.last30d_out_tokens += u.completion_tokens
      usageInit.last30d_cost_usd += Number(u.cost_usd)

      const provAgg = byProviderMap.get(u.provider) ?? { calls: 0, cost_usd: 0 }
      provAgg.calls++
      provAgg.cost_usd += Number(u.cost_usd)
      byProviderMap.set(u.provider, provAgg)

      const callerKey = u.caller ?? 'unknown'
      const callerAgg = byCallerMap.get(callerKey) ?? { calls: 0, cost_usd: 0 }
      callerAgg.calls++
      callerAgg.cost_usd += Number(u.cost_usd)
      byCallerMap.set(callerKey, callerAgg)
    }

    const byProvider = Array.from(byProviderMap.entries())
      .map(([provider, v]) => ({ provider, ...v }))
      .sort((a, b) => b.cost_usd - a.cost_usd)
    const byCaller = Array.from(byCallerMap.entries())
      .map(([caller, v]) => ({ caller, ...v }))
      .sort((a, b) => b.cost_usd - a.cost_usd)

    const response: AiHealthResponse = {
      conversations: convStats,
      messages: { ...msgStats, ai_takeover_rate: aiTakeoverRate },
      memories: memStats,
      retrospectives: retroStats,
      rag_topics: { ...ragStats, top_unanswered: topUnanswered },
      llm_usage: { ...usageInit, by_provider: byProvider, by_caller: byCaller },
    }

    return NextResponse.json({ data: response })
  } catch (error) {
    logger.error('GET ai/health exception', { error })
    return ApiError.internal('系統錯誤')
  }
}
