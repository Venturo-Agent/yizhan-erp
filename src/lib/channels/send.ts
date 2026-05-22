/**
 * 中央 channel 訊息發布 helper（SSOT）
 *
 * 2026-05-23 William 拍板：之前各業務（出納 / 收款 / 帳單 / 永豐 webhook）自己 INSERT
 *   channel_messages、現在統一走這條。新增通知種類只動這檔。
 *
 * 設計：
 *   - 不認 caller、純函式、用 admin client（service_role bypass RLS）
 *   - target 兩種方式：
 *     1. by channelId（caller 已知）
 *     2. by channelType（system_notice / announcement、自動找該 workspace 的系統頻道）
 *   - sourceType / sourceRefId：給未來「點通知跳業務單據」用、譬如 'disbursement_alert' / 'receipt_overdue'
 *   - payload：jsonb、放結構化資料（金額 / 連結 / mentions）
 *
 * 用法：
 *   await sendChannelNotification({
 *     workspaceId,
 *     channelType: 'system_notice',
 *     text: '出納單 D2026052301 已建立、金額 NT$ 150,000',
 *     sourceType: 'disbursement_created',
 *     sourceRefId: disbursement.id,
 *   })
 */

import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { logger } from '@/lib/utils/logger'

const HANDLER = 'lib-channels-send'

/**
 * 「系統通知」分類 enum、跨業務共用
 * 新增類型時加在這裡、不准散刻字串
 */
export const NOTIFICATION_SOURCE_TYPES = {
  // 出納（disbursement）
  DISBURSEMENT_CREATED: 'disbursement_created',
  DISBURSEMENT_APPROVED: 'disbursement_approved',
  DISBURSEMENT_PAID: 'disbursement_paid',

  // 收款（receipts）
  RECEIPT_CREATED: 'receipt_created',
  RECEIPT_CONFIRMED: 'receipt_confirmed',
  RECEIPT_OVERDUE: 'receipt_overdue',

  // 帳單（invoices）
  INVOICE_SENT: 'invoice_sent',
  INVOICE_PAID: 'invoice_paid',

  // 永豐金流
  PAYMENT_LINK_GENERATED: 'payment_link_generated',
  PAYMENT_CAPTURED: 'payment_captured',
  PAYMENT_FAILED: 'payment_failed',

  // 審核（approval_requests）
  APPROVAL_REQUESTED: 'approval_requested',
  APPROVAL_APPROVED: 'approval_approved',
  APPROVAL_REJECTED: 'approval_rejected',

  // 其他
  GENERIC: 'generic',
} as const

export type NotificationSourceType =
  (typeof NOTIFICATION_SOURCE_TYPES)[keyof typeof NOTIFICATION_SOURCE_TYPES]

export interface SendChannelNotificationArgs {
  workspaceId: string
  /** 要發到哪個 channel — 二擇一 */
  channelId?: string
  /** 走 channel.type 找該 workspace 的系統頻道（譬如 'system_notice' / 'announcement'）*/
  channelType?: string

  /** 訊息純文字（給 channel 顯示 + AI 對話 context 用）*/
  text: string

  /** 業務分類、給未來「點通知跳業務頁面」用 */
  sourceType: NotificationSourceType | string
  /** 對應業務單據 id（譬如 disbursement.id）*/
  sourceRefId?: string

  /** 結構化資料、放 payload jsonb */
  payload?: Record<string, unknown>

  /** 是否 pinned */
  isPinned?: boolean
}

export interface SendChannelNotificationResult {
  ok: boolean
  channelId: string | null
  messageId: string | null
  error: string | null
}

export async function sendChannelNotification(
  args: SendChannelNotificationArgs
): Promise<SendChannelNotificationResult> {
  if (!args.workspaceId) {
    return { ok: false, channelId: null, messageId: null, error: 'workspaceId 必填' }
  }
  if (!args.channelId && !args.channelType) {
    return {
      ok: false,
      channelId: null,
      messageId: null,
      error: 'channelId 或 channelType 至少要一個',
    }
  }

  const supabase = getSupabaseAdminClient()

  // 解析 target channel
  let channelId = args.channelId ?? null
  if (!channelId && args.channelType) {
    const { data: ch, error } = await supabase
      .from('channels')
      .select('id')
      .eq('workspace_id', args.workspaceId)
      .eq('type', args.channelType)
      .eq('is_system', true)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle<{ id: string }>()
    if (error || !ch) {
      logger.warn(`${HANDLER}: channelType=${args.channelType} 找不到對應系統頻道`, {
        workspaceId: args.workspaceId,
        err: error?.message ?? null,
      })
      return {
        ok: false,
        channelId: null,
        messageId: null,
        error: `workspace 無 type=${args.channelType} 的系統頻道`,
      }
    }
    channelId = ch.id
  }

  if (!channelId) {
    return { ok: false, channelId: null, messageId: null, error: 'channel 解析失敗' }
  }

  // INSERT channel_messages、走 system bot（sender_employee_id / sender_agent_id 都 null）
  const { data: inserted, error: insertError } = await supabase
    .from('channel_messages')
    .insert({
      channel_id: channelId,
      sender_employee_id: null,
      sender_agent_id: null,
      body: args.text,
      message_type: 'system',
      payload: {
        source_type: args.sourceType,
        source_ref_id: args.sourceRefId ?? null,
        ...(args.payload ?? {}),
      },
      is_pinned: args.isPinned ?? false,
      reactions: {},
      attachments: [],
      is_active: true,
    })
    .select('id')
    .single<{ id: string }>()

  if (insertError) {
    logger.error(`${HANDLER}: insert message failed`, {
      channelId,
      workspaceId: args.workspaceId,
      sourceType: args.sourceType,
      err: insertError.message,
    })
    return { ok: false, channelId, messageId: null, error: insertError.message }
  }

  logger.info(`${HANDLER}: ok`, {
    channelId,
    messageId: inserted.id,
    workspaceId: args.workspaceId,
    sourceType: args.sourceType,
  })

  return { ok: true, channelId, messageId: inserted.id, error: null }
}
