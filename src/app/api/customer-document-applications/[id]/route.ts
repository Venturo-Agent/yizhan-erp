/**
 * /api/customer-document-applications/[id]
 *
 * GET — 取得單筆申辦詳情
 * PATCH — 更新（注意：collected 後不可改重要欄位）
 * DELETE — 移除（soft-delete via status）
 *
 * Capability: visa_service.read / write
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireCapability } from '@/lib/auth/require-capability'
import { CAPABILITIES } from '@/lib/permissions/capabilities'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { createApiClient } from '@/lib/supabase/api-client'
import { recordApiAuditContext } from '@/lib/audit/audit-helper'
import { dbErrorResponse } from '@/lib/db-error-translate'
import { logger } from '@/lib/utils/logger'
import { apiHandler } from '@/lib/api/api-handler'

export const GET = apiHandler(async ({ params }) => {
  const guard = await requireCapability(CAPABILITIES.VISAS_APPLICATIONS_READ)
  if (!guard.ok) return guard.response

  const { id } = params as { id: string }
  const supabase = getSupabaseAdminClient()
  const { data, error } = await supabase
    .from('customer_document_applications')
    .select('*')
    .eq('id', id)
    .eq('workspace_id', guard.workspaceId)
    .single()

  if (error) {
    return dbErrorResponse(error)
  }
  return NextResponse.json({ data })
})

const LOCKED_AFTER_COLLECTED = ['application_service_type_id', 'supplier_id', 'status'] as const

export const PATCH = apiHandler(async ({ params, req }) => {
  const guard = await requireCapability(CAPABILITIES.VISAS_APPLICATIONS_WRITE)
  if (!guard.ok) return guard.response

  const { id } = params as { id: string }
  const body = await req.json()

  const auditClient = await createApiClient()
  await recordApiAuditContext(auditClient, {
    actorId: guard.employeeId,
    reason: '更新申辦記錄',
    requestId: id,
  })

  const supabase = getSupabaseAdminClient()

  // 檢查 collected 鎖
  const { data: existing } = await supabase
    .from('customer_document_applications')
    .select('id, status, collected_at')
    .eq('id', id)
    .eq('workspace_id', guard.workspaceId)
    .single()

  if (!existing) {
    return NextResponse.json({ error: '找不到申辦記錄' }, { status: 404 })
  }

  if (existing.status === 'collected' || existing.collected_at) {
    const lockedKeys = (LOCKED_AFTER_COLLECTED as unknown as string[]).filter(
      k => body[k] !== undefined
    )
    if (lockedKeys.length > 0) {
      return NextResponse.json(
        {
          error: `已領件，不可修改：${lockedKeys.join(', ')}`,
          hint: '如需變更，請建立新的申辦記錄並標記為作廢',
        },
        { status: 409 }
      )
    }
  }

  // 移除 id/workspace_id 防篡改
  const { id: _id, workspace_id: _ws, ...patch } = body

  const { data, error } = await supabase
    .from('customer_document_applications')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('workspace_id', guard.workspaceId)
    .select()
    .single()

  if (error) {
    logger.error('更新申辦失敗:', error)
    return dbErrorResponse(error)
  }

  return NextResponse.json({ data })
})

export const DELETE = apiHandler(async ({ params }) => {
  const guard = await requireCapability(CAPABILITIES.VISAS_APPLICATIONS_WRITE)
  if (!guard.ok) return guard.response

  const { id } = params as { id: string }

  const auditClient = await createApiClient()
  await recordApiAuditContext(auditClient, {
    actorId: guard.employeeId,
    reason: '取消申辦記錄',
    requestId: id,
  })

  const supabase = getSupabaseAdminClient()

  // 移除（設 status = cancelled）
  const { error } = await supabase
    .from('customer_document_applications')
    .update({ status: 'cancelled' })
    .eq('id', id)
    .eq('workspace_id', guard.workspaceId)

  if (error) {
    return dbErrorResponse(error)
  }

  return NextResponse.json({ data: { id } })
})
