/**
 * /api/document-types
 *
 * GET — 列出所有證件種類（字典）
 * POST — 新增種類
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

export const GET = apiHandler(async () => {
  const guard = await requireCapability(CAPABILITIES.VISAS_DOCUMENT_TYPES_READ)
  if (!guard.ok) return guard.response

  const supabase = getSupabaseAdminClient()
  const { data, error } = await supabase
    .from('document_types')
    .select('id, code, label, group_label, sort_order, is_active, created_at, updated_at')
    .eq('workspace_id', guard.workspaceId)
    .order('sort_order', { ascending: true })

  if (error) {
    return dbErrorResponse(error)
  }

  return NextResponse.json({ data: data ?? [] })
})

export const POST = apiHandler(async ({ req }) => {
  const guard = await requireCapability(CAPABILITIES.VISAS_DOCUMENT_TYPES_WRITE)
  if (!guard.ok) return guard.response

  const body = await req.json()
  const { code, label, group_label = null, sort_order = 0 } = body

  if (!code || !label) {
    return NextResponse.json({ error: 'code 和 label 必填' }, { status: 400 })
  }

  const auditClient = await createApiClient()
  await recordApiAuditContext(auditClient, {
    actorId: guard.employeeId,
    reason: '新增證件種類',
  })

  const supabase = getSupabaseAdminClient()
  const { data, error } = await supabase
    .from('document_types')
    .insert({
      code,
      label,
      group_label,
      sort_order,
      is_active: true,
      workspace_id: guard.workspaceId,
    })
    .select()
    .single()

  if (error) {
    logger.error('建立 document_types 失敗:', error)
    return dbErrorResponse(error)
  }

  return NextResponse.json({ data }, { status: 201 })
})
