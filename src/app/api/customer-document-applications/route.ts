/**
 * /api/customer-document-applications
 *
 * GET — 列出 workspace 內所有申辦
 * POST — 新增申辦（pending）
 *
 * Capability: visa_service.read / write
 */

import { NextResponse } from 'next/server'
import { requireCapability } from '@/lib/auth/require-capability'
import { CAPABILITIES } from '@/lib/permissions/capabilities'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { recordApiAuditContext } from '@/lib/audit/audit-helper'
import { translateDbError } from '@/lib/db-error-translate'
import { logger } from '@/lib/utils/logger'
import { apiHandler } from '@/lib/api/api-handler'

export const GET = apiHandler(async () => {
  const guard = await requireCapability(CAPABILITIES.VISAS_APPLICATIONS_READ)
  if (!guard.ok) return guard.response

  const supabase = getSupabaseAdminClient()
  const { data, error } = await supabase
    .from('customer_document_applications')
    .select(
      'id, customer_document_id, application_service_type_id, status, standard_price, actual_price, fee_charged, submitted_at, collected_at, rejected_at, returned_to_customer_at, supplier_id, tour_id, order_id, order_member_id, notes, created_at, updated_at'
    )
    .eq('workspace_id', guard.workspaceId)
    .order('created_at', { ascending: false })
    .limit(200)

  if (error) {
    const t = translateDbError(error)
    return NextResponse.json({ error: t.message }, { status: t.httpStatus })
  }

  return NextResponse.json({ data: data ?? [] })
})

export const POST = apiHandler(async ({ req }) => {
  const guard = await requireCapability(CAPABILITIES.VISAS_APPLICATIONS_WRITE)
  if (!guard.ok) return guard.response

  const body = await req.json()
  const {
    customer_document_id,
    application_service_type_id,
    status = 'pending',
    supplier_id = null,
    notes = null,
  } = body

  if (!customer_document_id || !application_service_type_id) {
    return NextResponse.json(
      { error: 'customer_document_id 和 application_service_type_id 必填' },
      { status: 400 }
    )
  }

  const supabase = getSupabaseAdminClient()
  const { data, error } = await supabase
    .from('customer_document_applications')
    .insert({
      customer_document_id,
      application_service_type_id,
      status,
      supplier_id,
      notes,
      workspace_id: guard.workspaceId,
    })
    .select()
    .single()

  if (error) {
    logger.error('建立申辦失敗:', error)
    const t = translateDbError(error)
    return NextResponse.json({ error: t.message }, { status: t.httpStatus })
  }

  return NextResponse.json({ data }, { status: 201 })
})