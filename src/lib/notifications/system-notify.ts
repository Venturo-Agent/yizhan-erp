/**
 * 系統通知抽象層 — 統一發系統訊息到該 workspace 的「系統通知」channel。
 *
 * spec: Logan-Workspace/2026-05-15-出納單完整重構-spec.md (Phase 1)
 *
 * 用法（任何 server-side context、API route / server action / cron）：
 *   await notifySystem({
 *     workspace_id,
 *     body: `出納單 #${order_number} 剔除 1 筆、已移至 ${next_date}`,
 *     topic: 'disbursement.item_removed',
 *     payload: { disbursement_order_id, excluded_request_id },
 *   })
 *
 * 設計：
 *   - 純 server module（用 admin client、不能在 client 用、避免 service_role leak）
 *   - admin client per-request 建（紅線 C：不 singleton）
 *   - 走既有 channel_messages 表 + system_notice channel、不另建 notifications 表
 *   - 不寫 audit log、caller 自己決定（譬如 disbursement 那邊用 recordApiAuditContext）
 *   - Realtime broadcasting 由 Supabase realtime 自動處理（channels 既有機制）
 */

import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { logger } from '@/lib/utils/logger'
import type { SupabaseClient } from '@supabase/supabase-js'

export interface SystemNotifyInput {
  /** Workspace 邊界（強制、確保跨租戶隔離） */
  workspace_id: string
  /** 通知文字內容（user-facing） */
  body: string
  /** 個人化收件人；null = 整個 workspace 都能看 */
  recipient_employee_id?: string | null
  /** 結構化 payload（譬如連結、業務 ID、metadata） */
  payload?: Record<string, unknown>
  /** 主題分類（譬如 'disbursement.item_removed'、'order.created'）、給未來 filter / route 用 */
  topic?: string
}

export type SystemNotifyResult =
  | { ok: true; message_id: string }
  | { ok: false; error: string }

/**
 * 發送系統通知到該 workspace 的 system_notice channel。
 *
 * 不會拋例外、所有錯誤包進 result.error。caller 用 if (!result.ok) 判斷。
 */
export async function notifySystem(input: SystemNotifyInput): Promise<SystemNotifyResult> {
  const { workspace_id, body, recipient_employee_id = null, payload, topic } = input

  if (!workspace_id || typeof workspace_id !== 'string') {
    return { ok: false, error: 'workspace_id is required' }
  }
  if (!body || typeof body !== 'string' || !body.trim()) {
    return { ok: false, error: 'body is required' }
  }

  const client = getSupabaseAdminClient() as unknown as SupabaseClient

  try {
    // 1. 撈該 workspace 的 system_notice channel（每 workspace 一個 official）
    const { data: channel, error: channelErr } = await client
      .from('channels')
      .select('id')
      .eq('workspace_id', workspace_id)
      .eq('type', 'system_notice')
      .eq('is_official', true)
      .maybeSingle()

    if (channelErr) {
      logger.error('notifySystem: 撈 system_notice channel 失敗', { workspace_id, error: channelErr })
      return { ok: false, error: `撈頻道失敗：${channelErr.message}` }
    }

    if (!channel) {
      logger.error('notifySystem: 該 workspace 沒有 system_notice channel', { workspace_id })
      return { ok: false, error: '該 workspace 沒有設定系統通知頻道' }
    }

    // 2. 寫進 channel_messages
    // 合併 topic 進 payload 方便未來 filter（不另外加 column）
    const mergedPayload: Record<string, unknown> | null =
      topic || payload
        ? { ...(payload ?? {}), ...(topic ? { topic } : {}) }
        : null

    const { data: message, error: insertErr } = await client
      .from('channel_messages')
      .insert({
        channel_id: channel.id,
        sender_employee_id: null, // 系統觸發、不掛任何員工
        body: body.trim(),
        message_type: 'system',
        payload: mergedPayload,
        recipient_employee_id,
      })
      .select('id')
      .single()

    if (insertErr) {
      logger.error('notifySystem: insert channel_message 失敗', { workspace_id, error: insertErr })
      return { ok: false, error: `寫入通知失敗：${insertErr.message}` }
    }

    return { ok: true, message_id: message.id }
  } catch (err) {
    const msg = err instanceof Error ? err.message : '未知錯誤'
    logger.error('notifySystem: 例外', { workspace_id, error: err })
    return { ok: false, error: msg }
  }
}
