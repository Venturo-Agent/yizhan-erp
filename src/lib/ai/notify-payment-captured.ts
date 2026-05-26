/**
 * 付款完成、通知對話 AI（讓 AI 下次接到客戶訊息時有 context）
 *
 * 2026-05-23 William 拍板：AI tool send_payment_link 產的連結客戶刷完
 *   → mock webhook（Phase 1）/ 真實 webhook（Phase 2）都走這條 helper
 *   → 把「付款成功」訊息以 system 身份寫進 inbox_messages
 *   → AI 下次回 user 訊息時、自然看到「客戶剛剛 NT$ X 付款成功」
 *
 * 設計：
 *   - 純 helper、不在 webhook 內 inline、Phase 2 真實 webhook 共用
 *   - 看 transaction.raw_webhook_payload.conversation_id（AI tool 寫入）有沒有
 *   - 沒 conversation_id 代表這筆不是 AI tool 產出的（譬如業務手動產）、不通知
 *   - 用 admin client、bypass RLS
 *   - 失敗只 log、不 throw（webhook 主流程不能擋）
 */

import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { logger } from '@/lib/utils/logger'
import { sendChannelNotification, NOTIFICATION_SOURCE_TYPES } from '@/lib/channels/send'

const HANDLER = 'ai-notify-payment-captured'

interface NotifyArgs {
  workspaceId: string
  amount: number
  rawWebhookPayload: Record<string, unknown> | null
  externalTransNo: string | null
}

export async function notifyPaymentCapturedToConversation(args: NotifyArgs): Promise<void> {
  const conversationId = (args.rawWebhookPayload?.conversation_id as string | undefined) ?? null
  const createdByAi = Boolean(args.rawWebhookPayload?.created_by_ai)

  // 1. 內部 channel 通知（不管是 AI 還是業務手動產的、都通知系統頻道）
  //    讓員工在 venturo erp 內部頻道看到「XX 收到 NT$ X」
  void sendChannelNotification({
    workspaceId: args.workspaceId,
    channelType: 'system_notice',
    text:
      `💳 收到客戶付款 ${args.amount.toLocaleString()}` +
      (args.externalTransNo ? `（交易序號 ${args.externalTransNo}）` : '') +
      (createdByAi ? `（AI 自動發連結）` : ''),
    sourceType: NOTIFICATION_SOURCE_TYPES.PAYMENT_CAPTURED,
    payload: {
      amount: args.amount,
      external_trans_no: args.externalTransNo,
      conversation_id: conversationId,
      created_by_ai: createdByAi,
    },
  })

  // 2. 若是 AI 從對話產的連結、推一則訊息進原對話（給 AI 下次有 context）
  if (!conversationId || !createdByAi) {
    return
  }

  const supabase = getSupabaseAdminClient()

  // 寫入 inbox_messages、direction=outbound、sender_type=system
  // 讓 AI 下次組 context 時能看到、但不會被當成 ai_agent 學習對話風格
  const text =
    `💳 客戶已完成付款 ${args.amount.toLocaleString()}` +
    (args.externalTransNo ? `（交易序號 ${args.externalTransNo}）` : '')

  const { error } = await supabase.from('inbox_messages').insert({
    conversation_id: conversationId,
    workspace_id: args.workspaceId,
    direction: 'outbound',
    sender_type: 'system',
    message_type: 'system_event',
    content: text,
    raw_event: {
      kind: 'payment_captured',
      amount: args.amount,
      external_trans_no: args.externalTransNo,
    },
  })

  if (error) {
    logger.warn(`${HANDLER}: insert message failed`, {
      conversationId,
      err: error.message,
    })
    return
  }

  // 同步把 inbox_conversations.last_message_* 更新（避免 sidebar 不顯示最新狀態）
  const { error: convErr } = await supabase
    .from('inbox_conversations')
    .update({
      last_message_at: new Date().toISOString(),
      last_message_preview: text,
      last_message_direction: 'outbound',
    })
    .eq('id', conversationId)

  if (convErr) {
    logger.warn(`${HANDLER}: update conversation last_message failed`, {
      conversationId,
      err: convErr.message,
    })
  }

  logger.info(`${HANDLER}: notified conversation`, {
    conversationId,
    workspaceId: args.workspaceId,
    amount: args.amount,
  })
}
