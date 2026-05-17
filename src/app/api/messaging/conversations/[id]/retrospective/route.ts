/**
 * POST /api/messaging/conversations/[id]/retrospective
 *
 * 對話復盤（AI 摘要）：取該對話所有訊息 → 送 LLM 生成結構化摘要。
 *
 * 守 AI_HUB_READ capability（read-only 操作）。
 * 走 dispatchLLM → 遵守 workspace 的 provider / model 設定。
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireCapability } from '@/lib/auth/require-capability'
import { requireWorkspaceFeature } from '@/lib/auth/require-feature'
import { ApiError } from '@/lib/api/response'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { dispatchLLM } from '@/lib/ai/llm-dispatcher'
import { CAPABILITIES } from '@/lib/permissions/capabilities'
import { logger } from '@/lib/utils/logger'
import type { SupabaseClient } from '@supabase/supabase-js'

interface MessageRow {
  direction: 'inbound' | 'outbound'
  sender_type: string
  message_type: string
  content: string | null
  created_at: string
}

interface ConversationRow {
  display_name: string | null
  channel_type: string
  external_user_id: string
}

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const guard = await requireCapability(CAPABILITIES.AI_HUB_READ)
    if (!guard.ok) return guard.response

    const feature = await requireWorkspaceFeature(guard.workspaceId, 'ai_hub', 'AI Hub')
    if (!feature.ok) return feature.response

    const { id: conversationId } = await params
    if (!conversationId) {
      return NextResponse.json({ error: 'missing conversation id' }, { status: 400 })
    }

    const supabase = getSupabaseAdminClient() as unknown as SupabaseClient

    // 取對話基本資訊
    const { data: conv } = await supabase
      .from('inbox_conversations')
      .select('display_name, channel_type, external_user_id')
      .eq('id', conversationId)
      .eq('workspace_id', guard.workspaceId)
      .maybeSingle<ConversationRow>()

    if (!conv) {
      return ApiError.notFound('對話')
    }

    // 取最近 50 則訊息（夠復盤用）
    const { data: messages, error: msgErr } = await supabase
      .from('inbox_messages')
      .select('direction, sender_type, message_type, content, created_at')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })
      .limit(50)

    if (msgErr) {
      logger.error('retrospective: fetch messages failed', msgErr)
      return ApiError.internal('讀取訊息失敗')
    }

    if (!messages || messages.length === 0) {
      return NextResponse.json({
        success: true,
        summary: '這個對話目前沒有訊息記錄。',
      })
    }

    // 組 conversation transcript
    const transcript = (messages as MessageRow[])
      .filter(m => m.content && m.message_type === 'text')
      .map(m => {
        const role =
          m.direction === 'inbound' ? '客戶' :
          m.sender_type === 'ai_agent' ? 'AI 助理' :
          m.sender_type === 'system' ? '系統' : '客服人員'
        return `[${role}] ${m.content}`
      })
      .join('\n')

    if (!transcript.trim()) {
      return NextResponse.json({
        success: true,
        summary: '對話中沒有文字訊息，無法生成摘要。',
      })
    }

    const customerName = conv.display_name || '客戶'
    const channelLabel =
      conv.channel_type === 'line' ? 'LINE' :
      conv.channel_type === 'facebook' ? 'Facebook Messenger' :
      conv.channel_type === 'instagram' ? 'Instagram DM' : conv.channel_type

    const systemPrompt = `你是專業的客服復盤助理。
請根據以下客服對話紀錄，生成一份簡潔的對話復盤報告（繁體中文）。

報告格式：
1. **對話摘要**（2-3 句話概述）
2. **客戶需求**（條列式，列出主要問題/需求）
3. **解決情況**（已解決 / 部分解決 / 未解決、簡述原因）
4. **後續待辦**（如有需要跟進的事項）
5. **客服表現**（簡短評語，中肯即可）

規則：
- 保持客觀中立，不過度美化
- 如資訊不足，直接說「資訊不足，無法判斷」
- 繁體中文，台灣用語
- 不要加不必要的廢話前言`

    const userPrompt = `客戶名稱：${customerName}
通路：${channelLabel}
訊息則數：${messages.length}

對話紀錄：
---
${transcript}
---

請根據以上對話生成復盤報告。`

    const llmResult = await dispatchLLM({
      workspaceId: guard.workspaceId,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
    })

    if (!llmResult.ok) {
      logger.error('retrospective: LLM failed', { error: llmResult.error, workspaceId: guard.workspaceId })
      return NextResponse.json(
        { success: false, error: llmResult.error || 'AI 摘要生成失敗，請稍後再試' },
        { status: 200 }
      )
    }

    return NextResponse.json({ success: true, summary: llmResult.content })
  } catch (err) {
    logger.error('POST retrospective error', { err })
    return ApiError.internal('系統錯誤')
  }
}
