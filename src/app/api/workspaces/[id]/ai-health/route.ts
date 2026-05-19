/**
 * GET /api/workspaces/[id]/ai-health
 *
 * 漫途專用「AI 健康度」儀表板資料：彙總指定 workspace 的 AI 整體表現。
 *
 * 守門：workspaces.write capability（漫途租戶管理 — 一般客戶 admin 沒有）。
 * scope：URL params 的 workspaceId、不接受 client 傳。
 *
 * 用途：漫途 staff 進客戶 workspace 詳情頁、看「AI 跑得怎樣」做 consulting decision、
 *      不是給 SaaS 客戶自己用的。
 *
 * 回的指標：
 *   - 對話量：總 / 7d / 30d（inbox / 群組 / 1-對-1 分）
 *   - 訊息量：總 / 7d（inbound / AI outbound / 人類 outbound）
 *   - AI 接管率：AI outbound / (AI outbound + 人類 outbound)
 *   - 速記卡：總數 / failed_attempts ≥ 3 / tone 分布
 *   - 復盤：各 status 數
 *   - 未解問題（rag_topic_queue）：pending / actioned / declined 數
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireCapability } from '@/lib/auth/require-capability'
import { CAPABILITIES } from '@/lib/permissions/capabilities'
import { ApiError } from '@/lib/api/response'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { filterActive } from '@/lib/data/filter-active'
import { logger } from '@/lib/utils/logger'
import type { SupabaseClient } from '@supabase/supabase-js'

interface ToneTallyRow {
  memory_json: {
    persona?: { tone?: string }
  } | null
  failed_attempts: number
}

interface MessageTallyRow {
  direction: 'inbound' | 'outbound'
  sender_type: string
}

interface ConvTallyRow {
  external_user_id: string
  last_message_at: string | null
  bot_paused: boolean
}

interface RetroTallyRow {
  status: 'pending' | 'reviewed' | 'actioned' | 'archived'
}

interface RagTopicTallyRow {
  status: 'pending' | 'added_to_rag' | 'declined'
  occurrence_count: number
}

export interface AiHealthResponse {
  conversations: {
    total: number
    customer: number
    group: number
    room: number
    last7d_active: number
    bot_paused: number
  }
  messages: {
    total: number
    inbound: number
    outbound_ai: number
    outbound_human: number
    last7d_total: number
    ai_takeover_rate: number  // 0-1
  }
  memories: {
    total: number
    paused_failures: number  // failed_attempts ≥ 3
    tone_active: number   // 主動 / 完整
    tone_passive: number  // 應付
    tone_unknown: number
  }
  retrospectives: {
    total: number
    pending: number
    reviewed: number
    actioned: number
    archived: number
  }
  rag_topics: {
    total: number
    pending: number
    added_to_rag: number
    declined: number
    top_unanswered: Array<{ topic: string; count: number }>
  }
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const guard = await requireCapability(CAPABILITIES.WORKSPACES_WRITE)
    if (!guard.ok) return guard.response

    const { id: workspaceId } = await params

    const supabase = getSupabaseAdminClient() as unknown as SupabaseClient

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

    // ══════ 對話統計 ══════
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

    // ══════ 訊息統計 ══════
    // 為效能、限制最近 30 天範圍（避免幾百萬筆全掃）
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
    const { data: msgs } = await supabase
      .from('inbox_messages')
      .select('direction, sender_type, created_at')
      .eq('workspace_id', workspaceId)
      .gte('created_at', thirtyDaysAgo)
      .returns<(MessageTallyRow & { created_at: string })[]>()

    const msgStats = (msgs ?? []).reduce(
      (acc, m) => {
        acc.total++
        if (m.direction === 'inbound') {
          acc.inbound++
        } else if (m.sender_type === 'ai_agent') {
          acc.outbound_ai++
        } else if (m.sender_type === 'agent') {
          acc.outbound_human++
        }
        if (m.created_at > sevenDaysAgo) acc.last7d_total++
        return acc
      },
      { total: 0, inbound: 0, outbound_ai: 0, outbound_human: 0, last7d_total: 0 }
    )

    const aiTakeoverRate =
      msgStats.outbound_ai + msgStats.outbound_human > 0
        ? msgStats.outbound_ai / (msgStats.outbound_ai + msgStats.outbound_human)
        : 0

    // ══════ 速記卡統計 ══════
    const memoriesQuery = supabase
      .from('customer_memories')
      .select('memory_json, failed_attempts')
      .eq('workspace_id', workspaceId)
    const { data: memories } = await filterActive(memoriesQuery).returns<ToneTallyRow[]>()

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

    // ══════ 復盤統計 ══════
    const retrosQuery = supabase
      .from('conversation_retrospectives')
      .select('status')
      .eq('workspace_id', workspaceId)
    const { data: retros } = await filterActive(retrosQuery).returns<RetroTallyRow[]>()

    const retroStats = (retros ?? []).reduce(
      (acc, r) => {
        acc.total++
        acc[r.status]++
        return acc
      },
      { total: 0, pending: 0, reviewed: 0, actioned: 0, archived: 0 }
    )

    // ══════ 未解問題（rag_topic_queue）統計 ══════
    const ragQuery = supabase
      .from('rag_topic_queue')
      .select('topic_summary, status, occurrence_count')
      .eq('workspace_id', workspaceId)
    const { data: ragTopics } = await filterActive(ragQuery)
      .order('occurrence_count', { ascending: false })
      .limit(50)
      .returns<(RagTopicTallyRow & { topic_summary: string })[]>()

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

    const response: AiHealthResponse = {
      conversations: convStats,
      messages: { ...msgStats, ai_takeover_rate: aiTakeoverRate },
      memories: memStats,
      retrospectives: retroStats,
      rag_topics: { ...ragStats, top_unanswered: topUnanswered },
    }

    return NextResponse.json({ data: response })
  } catch (error) {
    logger.error('GET ai-health exception', { error })
    return ApiError.internal('系統錯誤')
  }
}
