/**
 * GET /api/messaging/conversations
 *
 * 列出當前 workspace 所有對話 thread（polymorphic across LINE / FB / IG）。
 * 全 channel 走 inbox_conversations 表（5/14 backfill migration 把 LINE 也搬進來）。
 *
 * 5/14 簡化：原本 LINE 走 line_user_profiles + line_conversation_messages synthetic 合成、
 * 現在 backend 統一、不再需要 fallback。
 *
 * 支援 ?channel=line|facebook|instagram filter、預設 all。
 * 按 last_message_at desc 排序、limit 200。
 */

import { NextRequest, NextResponse } from 'next/server'
import { createApiClient, getCurrentWorkspaceId } from '@/lib/supabase/api-client'
import { requireCapability } from '@/lib/auth/require-capability'
import { requireWorkspaceFeature } from '@/lib/auth/require-feature'
import { CAPABILITIES } from '@/lib/permissions/capabilities'
import { ApiError } from '@/lib/api/response'
import { filterActive } from '@/lib/data/filter-active'
import { logger } from '@/lib/utils/logger'
import type { SupabaseTableName } from '@/lib/supabase/typed-client'

interface ConversationRow {
  id: string
  workspace_id: string
  channel_type: 'line' | 'facebook' | 'instagram'
  external_user_id: string
  display_name: string | null
  picture_url: string | null
  customer_id: string | null
  last_message_at: string | null
  last_message_preview: string | null
  last_message_direction: 'inbound' | 'outbound' | null
  unread_count: number
  is_archived: boolean
  bot_paused: boolean
  updated_at: string
  /** AI 速記卡 tone（從 customer_memories.memory_json.persona.tone derive）— 給列表顯示 🟢🟡⚪ */
  memory_tone?: string | null
  /** 速記卡是否處於連續失敗狀態（>= 3）— 給列表顯示 🔴 */
  memory_failed?: boolean
}

interface MemoryLite {
  conversation_id: string
  memory_json: { persona?: { tone?: string } } | null
  failed_attempts: number
}

export async function GET(request: NextRequest) {
  try {
    const guard = await requireCapability(CAPABILITIES.AI_HUB_READ)
    if (!guard.ok) return guard.response

    const feature = await requireWorkspaceFeature(guard.workspaceId, 'ai_hub', 'AI Hub')
    if (!feature.ok) return feature.response

    const workspaceId = await getCurrentWorkspaceId()
    if (!workspaceId) return ApiError.unauthorized('未登入')

    const supabase = await createApiClient()
    const channel = request.nextUrl.searchParams.get('channel')

    // 走 inbox_conversations、polymorphic 跨 LINE/FB/IG
    const baseSelect =
      'id, workspace_id, channel_type, external_user_id, display_name, picture_url, customer_id, last_message_at, last_message_preview, last_message_direction, unread_count, is_archived, bot_paused, updated_at'

    // inbox_conversations 尚未納入生成類型，用 unknown 中轉
    const inboxTable = supabase.from('inbox_conversations' as unknown as SupabaseTableName)

    let query = inboxTable.select(baseSelect).eq('workspace_id', workspaceId)

    if (channel === 'line' || channel === 'facebook' || channel === 'instagram') {
      query = query.eq('channel_type', channel)
    }

    const { data, error } = await query
      .order('last_message_at', { ascending: false, nullsFirst: false })
      .limit(200)

    if (error) {
      logger.error('inbox_conversations query error', { error })
      return ApiError.internal('查詢失敗')
    }

    const conversations = (data ?? []) as ConversationRow[]

    // 速記卡 tone 合併（列表顯示 🟢🟡🔴 信心 emoji 用）
    // 用 IN 查避免 N+1；失敗就靜默回不帶 tone（不阻塞主清單）
    if (conversations.length > 0) {
      try {
        const memoryBaseQuery = supabase
          .from('customer_memories' as unknown as SupabaseTableName)
          .select('conversation_id, memory_json, failed_attempts')
          .eq('workspace_id', workspaceId)
          .in(
            'conversation_id',
            conversations.map(c => c.id)
          )
        const { data: memories } = await filterActive(memoryBaseQuery).returns<MemoryLite[]>()

        if (memories && memories.length > 0) {
          const memMap = new Map(memories.map(m => [m.conversation_id, m]))
          for (const conv of conversations) {
            const mem = memMap.get(conv.id)
            if (mem) {
              conv.memory_tone = mem.memory_json?.persona?.tone ?? null
              conv.memory_failed = mem.failed_attempts >= 3
            }
          }
        }
      } catch (err) {
        logger.debug('memory tone merge failed (ignored)', { err })
      }
    }

    return NextResponse.json({ data: conversations })
  } catch (error) {
    logger.error('GET /api/messaging/conversations exception', { error })
    return ApiError.internal('系統錯誤')
  }
}
