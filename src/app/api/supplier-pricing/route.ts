/**
 * /api/supplier-pricing
 *
 * GET — 列出代辦商報價
 * POST — 新增報價（自動 supersede 舊報價）
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
  const guard = await requireCapability(CAPABILITIES.VISAS_PRICING_READ)
  if (!guard.ok) return guard.response

  const supabase = getSupabaseAdminClient()
  const { data, error } = await supabase
    .from('supplier_pricing')
    .select(
      'id, workspace_id, supplier_id, application_service_type_id, price, effective_from, superseded_at, notes, created_at, updated_at'
    )
    .eq('workspace_id', guard.workspaceId)
    .order('effective_from', { ascending: false })

  if (error) {
    return dbErrorResponse(error)
  }

  return NextResponse.json({ data: data ?? [] })
})

export const POST = apiHandler(async ({ req }) => {
  const guard = await requireCapability(CAPABILITIES.VISAS_PRICING_WRITE)
  if (!guard.ok) return guard.response

  const body = await req.json()
  const { supplier_id, application_service_type_id, price, effective_from, notes = null } = body

  if (!supplier_id || !application_service_type_id || price == null) {
    return NextResponse.json(
      { error: 'supplier_id、application_service_type_id、price 必填' },
      { status: 400 }
    )
  }

  const auditClient = await createApiClient()
  await recordApiAuditContext(auditClient, {
    actorId: guard.employeeId,
    reason: '新增供應商報價',
  })

  const supabase = getSupabaseAdminClient()

  // 自動 superseded 同 supplier + service_type 的舊報價
  const now = effective_from || new Date().toISOString().split('T')[0]
  await supabase
    .from('supplier_pricing')
    .update({ superseded_at: now })
    .eq('supplier_id', supplier_id)
    .eq('application_service_type_id', application_service_type_id)
    .is('superseded_at', null)

  const { data, error } = await supabase
    .from('supplier_pricing')
    .insert({
      supplier_id,
      application_service_type_id,
      price,
      effective_from: now,
      notes,
      workspace_id: guard.workspaceId,
    })
    .select()
    .single()

  if (error) {
    logger.error('建立 supplier_pricing 失敗:', error)
    return dbErrorResponse(error)
  }

  return NextResponse.json({ data }, { status: 201 })
})
