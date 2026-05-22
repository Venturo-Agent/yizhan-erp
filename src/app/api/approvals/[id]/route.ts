/**
 * PATCH /api/approvals/[id]
 *
 * 審核請求批准 / 拒絕。
 * 守門：要 HR_MANAGE_EMPLOYEES capability（暫時複用、未來可加 hr.approvals.review）
 *
 * Body: { action: 'approve' | 'reject', review_note?: string }
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createApiClient } from '@/lib/supabase/api-client'
import { requireCapability } from '@/lib/auth/require-capability'
import { CAPABILITIES } from '@/lib/permissions/capabilities'
import { validateBody } from '@/lib/api/validation'
import { apiHandler } from '@/lib/api/api-handler'
import { translateDbError } from '@/lib/db-error-translate'
import { recordApiAuditContext } from '@/lib/audit/audit-helper'
import {
  sendChannelNotification,
  NOTIFICATION_SOURCE_TYPES,
} from '@/lib/channels/send'
import { dispatchApprovalSideEffect } from '@/lib/approvals/dispatch'

const reviewSchema = z.object({
  action: z.enum(['approve', 'reject']),
  review_note: z.string().max(500).optional().nullable(),
})

export const PATCH = apiHandler(
  async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const guard = await requireCapability(CAPABILITIES.HR_MANAGE_EMPLOYEES)
    if (!guard.ok) return guard.response

    const { id } = await params
    const supabase = await createApiClient()

    await recordApiAuditContext(supabase, {
      actorId: guard.employeeId,
      reason: '審核請求',
      requestId: id,
    })

    const v = await validateBody(request, reviewSchema)
    if (!v.success) return v.error

    const newStatus = v.data.action === 'approve' ? 'approved' : 'rejected'

    const { data, error } = await supabase
      .from('approval_requests')
      .update({
        status: newStatus,
        reviewer_id: guard.employeeId,
        reviewed_at: new Date().toISOString(),
        review_note: v.data.review_note ?? null,
      })
      .eq('id', id)
      .eq('status', 'pending') // 防重複審核
      .select('id, workspace_id, request_type, requester_id, payload, target_id')
      .single<{
        id: string
        workspace_id: string
        request_type: string
        requester_id: string
        payload: Record<string, unknown>
        target_id: string | null
      }>()

    if (error) {
      const t = translateDbError(error)
      return NextResponse.json({ error: t.message }, { status: t.httpStatus })
    }
    if (!data) {
      return NextResponse.json({ error: '審核請求不存在或已處理' }, { status: 404 })
    }

    // 通知 channel
    void sendChannelNotification({
      workspaceId: data.workspace_id,
      channelType: 'system_notice',
      text:
        v.data.action === 'approve'
          ? `✅ 審核通過：${data.request_type}`
          : `❌ 審核拒絕：${data.request_type}` +
            (v.data.review_note ? `（${v.data.review_note}）` : ''),
      sourceType:
        v.data.action === 'approve'
          ? NOTIFICATION_SOURCE_TYPES.APPROVAL_APPROVED
          : NOTIFICATION_SOURCE_TYPES.APPROVAL_REJECTED,
      sourceRefId: data.id,
      payload: {
        request_type: data.request_type,
        action: v.data.action,
        review_note: v.data.review_note,
      },
    })

    // 業務 side-effect（譬如 Email 變更核准後實際同步 auth.users.email）
    const sideEffectResult = await dispatchApprovalSideEffect({
      approvalId: data.id,
      workspaceId: data.workspace_id,
      requestType: data.request_type,
      payload: data.payload,
      targetId: data.target_id,
      action: v.data.action,
    })

    if (!sideEffectResult.ok) {
      // side-effect 失敗、但 approval 已標 approved；回 200 + warning 給 caller 處理
      return NextResponse.json({
        success: true,
        data,
        warning: '審核狀態已更新、但 side-effect 失敗：' + (sideEffectResult.error ?? 'unknown'),
      })
    }

    return NextResponse.json({ success: true, data })
  }
)
