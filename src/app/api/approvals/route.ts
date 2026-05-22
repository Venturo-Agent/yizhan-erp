/**
 * 審核請求 API
 *
 * 2026-05-23 William 拍板：通用審核框架（approval_requests）
 *
 * GET  /api/approvals             — 列出 workspace 待批 + 自己提交的
 * POST /api/approvals             — 提交審核請求（員工自己）
 * PATCH /api/approvals/[id]       — 批准 / 拒絕（要 HR_MANAGE_EMPLOYEES capability）
 *
 * 守門：
 * - GET：登入即可（看自己的 / 看 workspace pending、看不到別人的）
 * - POST：登入即可（提交自己的請求）
 * - PATCH：要 HR_MANAGE_EMPLOYEES（暫時複用、未來可加專屬 hr.approvals.review）
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createApiClient, getCurrentWorkspaceId } from '@/lib/supabase/api-client'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { getServerAuth } from '@/lib/auth/server-auth'
import { hasCapabilityByCode } from '@/app/api/lib/check-capability'
import { CAPABILITIES } from '@/lib/permissions/capabilities'
import { validateBody } from '@/lib/api/validation'
import { apiHandler } from '@/lib/api/api-handler'
import { translateDbError } from '@/lib/db-error-translate'
import { recordApiAuditContext } from '@/lib/audit/audit-helper'
import {
  sendChannelNotification,
  NOTIFICATION_SOURCE_TYPES,
} from '@/lib/channels/send'
import { logger } from '@/lib/utils/logger'

const createSchema = z.object({
  request_type: z.string().min(1).max(50),
  target_id: z.string().uuid().optional().nullable(),
  payload: z.record(z.string(), z.unknown()).optional().default({}),
  request_reason: z.string().max(500).optional().nullable(),
  expires_at: z.string().datetime().optional().nullable(),
})

/**
 * GET — 列出待批 / 我提交的
 *
 * query:
 *   ?scope=mine      — 只列我提交的
 *   ?scope=review    — 列我可審核的（pending、要 HR_MANAGE_EMPLOYEES capability）
 *   ?status=pending  — 過濾狀態（可選）
 */
export const GET = apiHandler(async (request: NextRequest) => {
  const auth = await getServerAuth()
  if (!auth.success) return NextResponse.json({ error: '請先登入' }, { status: 401 })

  const supabase = await createApiClient()
  const workspaceId = await getCurrentWorkspaceId()
  if (!workspaceId) return NextResponse.json({ error: '無 workspace' }, { status: 401 })

  const scope = request.nextUrl.searchParams.get('scope') ?? 'mine'
  const statusFilter = request.nextUrl.searchParams.get('status')

  let query = supabase
    .from('approval_requests')
    .select(
      'id, workspace_id, request_type, target_id, payload, requester_id, request_reason, status, reviewer_id, reviewed_at, review_note, expires_at, created_at, updated_at'
    )
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false })
    .limit(100)

  if (scope === 'review') {
    const canReview = await hasCapabilityByCode(auth.data.employeeId, CAPABILITIES.HR_MANAGE_EMPLOYEES)
    if (!canReview) return NextResponse.json({ error: '無審核權限' }, { status: 403 })
    // 預設只看 pending
    query = query.eq('status', statusFilter ?? 'pending')
  } else {
    // mine
    query = query.eq('requester_id', auth.data.employeeId)
    if (statusFilter) query = query.eq('status', statusFilter)
  }

  const { data, error } = await query
  if (error) {
    const t = translateDbError(error)
    return NextResponse.json({ error: t.message }, { status: t.httpStatus })
  }
  return NextResponse.json({ data: data ?? [] })
})

/**
 * POST — 員工提交審核請求
 */
export const POST = apiHandler(async (request: NextRequest) => {
  const auth = await getServerAuth()
  if (!auth.success) return NextResponse.json({ error: '請先登入' }, { status: 401 })

  const workspaceId = auth.data.workspaceId
  const supabase = await createApiClient()
  await recordApiAuditContext(supabase, {
    actorId: auth.data.employeeId,
    reason: '提交審核請求',
  })

  const v = await validateBody(request, createSchema)
  if (!v.success) return v.error

  const { data, error } = await supabase
    .from('approval_requests')
    .insert({
      workspace_id: workspaceId,
      request_type: v.data.request_type,
      target_id: v.data.target_id ?? null,
      payload: v.data.payload ?? {},
      requester_id: auth.data.employeeId,
      request_reason: v.data.request_reason ?? null,
      expires_at: v.data.expires_at ?? null,
      status: 'pending',
    })
    .select('id, request_type, status, created_at')
    .single()

  if (error) {
    const t = translateDbError(error)
    return NextResponse.json({ error: t.message }, { status: t.httpStatus })
  }

  // 通知 system_notice 頻道（HR 看得到、可進審核頁批 / 拒）
  void sendChannelNotification({
    workspaceId,
    channelType: 'system_notice',
    text: `📝 新審核請求：${v.data.request_type}（待批）`,
    sourceType: NOTIFICATION_SOURCE_TYPES.APPROVAL_REQUESTED,
    sourceRefId: data.id,
    payload: {
      request_type: v.data.request_type,
      requester_id: auth.data.employeeId,
    },
  })

  return NextResponse.json({ success: true, data })
})

// ════════════════════════════════════════════════════════════════
// PATCH 走 /api/approvals/[id]、見另一檔
// ════════════════════════════════════════════════════════════════

/**
 * 內部 helper：給 Email 變更等業務直接 call、不走 HTTP
 * 純函式、用 admin client 寫
 */
export async function createApprovalRequest(args: {
  workspaceId: string
  requesterId: string
  requestType: string
  targetId?: string | null
  payload?: Record<string, unknown>
  reason?: string | null
  expiresAt?: string | null
}): Promise<{ ok: boolean; id?: string; error?: string }> {
  const supabase = getSupabaseAdminClient()
  const { data, error } = await supabase
    .from('approval_requests')
    .insert({
      workspace_id: args.workspaceId,
      request_type: args.requestType,
      target_id: args.targetId ?? null,
      payload: (args.payload ?? {}) as never,
      requester_id: args.requesterId,
      request_reason: args.reason ?? null,
      expires_at: args.expiresAt ?? null,
      status: 'pending',
    })
    .select('id')
    .single<{ id: string }>()

  if (error) {
    logger.error('createApprovalRequest failed', error)
    return { ok: false, error: error.message }
  }

  // 通知 channel
  void sendChannelNotification({
    workspaceId: args.workspaceId,
    channelType: 'system_notice',
    text: `📝 新審核請求：${args.requestType}（待批）`,
    sourceType: NOTIFICATION_SOURCE_TYPES.APPROVAL_REQUESTED,
    sourceRefId: data.id,
    payload: { request_type: args.requestType, requester_id: args.requesterId },
  })

  return { ok: true, id: data.id }
}
