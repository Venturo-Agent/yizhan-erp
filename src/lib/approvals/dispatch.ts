/**
 * 審核通過 / 拒絕後的 side-effect dispatcher
 *
 * 2026-05-23 William 拍板：approval_requests 通過後、由 request_type 對應的 handler
 *   執行實際業務動作（譬如 email_change 通過 → 真的 sync auth.users.email）。
 *
 * 設計：
 *   - 每個 request_type 一個 handler、handler 自己 idempotent
 *   - 失敗時 log + 回 false、由 caller 決定要不要 reverse approval status
 *   - 用 admin client、bypass RLS
 */

import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { logger } from '@/lib/utils/logger'
import { sendChannelNotification, NOTIFICATION_SOURCE_TYPES } from '@/lib/channels/send'

const HANDLER = 'approvals-dispatch'

/**
 * 審核 request_type 統一常數
 */
export const APPROVAL_REQUEST_TYPES = {
  EMAIL_CHANGE: 'email_change',
  // 未來：
  // ROLE_UPGRADE: 'role_upgrade',
  // BANK_ACCOUNT_CHANGE: 'bank_account_change',
  // HIGH_AMOUNT_PAYMENT: 'high_amount_payment',
} as const

interface DispatchArgs {
  approvalId: string
  workspaceId: string
  requestType: string
  payload: Record<string, unknown>
  targetId: string | null
  action: 'approve' | 'reject'
}

interface DispatchResult {
  ok: boolean
  error?: string
}

export async function dispatchApprovalSideEffect(args: DispatchArgs): Promise<DispatchResult> {
  // reject 不做業務動作、單純標狀態
  if (args.action !== 'approve') return { ok: true }

  switch (args.requestType) {
    case APPROVAL_REQUEST_TYPES.EMAIL_CHANGE:
      return handleEmailChange(args)
    default:
      logger.warn(`${HANDLER}: 沒對應的 handler、跳過`, {
        requestType: args.requestType,
        approvalId: args.approvalId,
      })
      return { ok: true }
  }
}

/**
 * Email 變更 handler
 *
 * payload 預期欄位：
 *   - old_email
 *   - new_email
 *   - user_id（auth.users.id）
 */
async function handleEmailChange(args: DispatchArgs): Promise<DispatchResult> {
  const newEmail = args.payload.new_email as string | undefined
  const userId = args.payload.user_id as string | undefined
  const targetEmployeeId = args.targetId

  if (!newEmail || !userId || !targetEmployeeId) {
    logger.error(`${HANDLER}: email_change payload 缺欄位`, {
      approvalId: args.approvalId,
      payload: args.payload,
    })
    return { ok: false, error: 'payload 缺 new_email / user_id / target_id' }
  }

  const supabase = getSupabaseAdminClient()

  // 1. 同步 auth.users.email（email_confirm: false 讓 Supabase 寄驗證信給新 email）
  const { error: authErr } = await supabase.auth.admin.updateUserById(userId, {
    email: newEmail,
    email_confirm: false, // 故意設 false、讓 Supabase 寄驗證信、客戶點才完成
  })
  if (authErr) {
    logger.error(`${HANDLER}: auth.updateUserById failed`, {
      approvalId: args.approvalId,
      authErrMsg: authErr.message,
    })
    return { ok: false, error: authErr.message }
  }

  // 2. 同步 employees.email
  const { error: empErr } = await supabase
    .from('employees')
    .update({ email: newEmail })
    .eq('id', targetEmployeeId)

  if (empErr) {
    logger.error(`${HANDLER}: employees.update email failed`, {
      approvalId: args.approvalId,
      empErrMsg: empErr.message,
    })
    return { ok: false, error: empErr.message }
  }

  // 3. 通知 channel
  void sendChannelNotification({
    workspaceId: args.workspaceId,
    channelType: 'system_notice',
    text: `📧 員工 Email 變更已執行、Supabase 已寄驗證信到 ${newEmail}、請員工點信完成`,
    sourceType: NOTIFICATION_SOURCE_TYPES.APPROVAL_APPROVED,
    sourceRefId: args.approvalId,
    payload: {
      new_email: newEmail,
      target_employee_id: targetEmployeeId,
    },
  })

  return { ok: true }
}
