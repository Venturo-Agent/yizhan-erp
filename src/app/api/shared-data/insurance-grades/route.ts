/**
 * /api/shared-data/insurance-grades
 *
 * GET — 列當前生效的所有級距（kind: labor / health / pension）
 * POST — 新增 / 編輯一筆（需 shared_data_management.write）
 *
 * 2026-05-15 William 拍板：共用資料、漫途+角落可改、其他唯讀。
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireCapability } from '@/lib/auth/require-capability'
import { CAPABILITIES } from '@/lib/permissions/capabilities'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { dbErrorResponse } from '@/lib/db-error-translate'
import { createApiClient } from '@/lib/supabase/api-client'
import { recordApiAuditContext } from '@/lib/audit/audit-helper'
import { apiHandler } from '@/lib/api/api-handler'
import type { SupabaseClient } from '@supabase/supabase-js'

export const GET = apiHandler(async () => {
  // 讀：登入即可（共用資料、全 workspace 可讀）
  // 用 SHARED_DATA_AIRPORTS_READ 對齊既有 shared data 的 pattern（任一 shared_data.*.read 即可、這條最廣為人有）
  const guard = await requireCapability(CAPABILITIES.HR_SALARY_SETTLEMENT_READ)
  if (!guard.ok) return guard.response

  // ref_insurance_salary_grades 尚未納入生成類型，用 unknown 中轉避免散落 as any
  const supabase = getSupabaseAdminClient() as unknown as SupabaseClient
  const { data, error } = await supabase
    .from('ref_insurance_salary_grades')
    .select('*')
    .is('effective_until', null)
    .order('kind')
    .order('grade_number')

  if (error) {
    return dbErrorResponse(error)
  }

  return NextResponse.json({ data: data ?? [] })
})

export const POST = apiHandler(async (request: NextRequest) => {
  const guard = await requireCapability(CAPABILITIES.SHARED_DATA_MANAGEMENT_WRITE)
  if (!guard.ok) return guard.response

  const auditClient = await createApiClient()
  await recordApiAuditContext(auditClient, {
    actorId: guard.employeeId,
    reason: '新增 / 更新勞健保投保薪資級距',
  })

  const body = await request.json().catch(() => ({}))
  const { kind, grade_number, monthly_amount, effective_from, source_url, notes } = body as {
    kind?: string
    grade_number?: number
    monthly_amount?: number
    effective_from?: string
    source_url?: string
    notes?: string
  }

  if (!kind || !['labor', 'health', 'pension'].includes(kind)) {
    return NextResponse.json({ error: 'kind 必須是 labor / health / pension' }, { status: 400 })
  }
  if (!grade_number || grade_number < 1) {
    return NextResponse.json({ error: 'grade_number 必須 >= 1' }, { status: 400 })
  }
  if (!monthly_amount || monthly_amount <= 0) {
    return NextResponse.json({ error: 'monthly_amount 必須 > 0' }, { status: 400 })
  }
  if (!effective_from) {
    return NextResponse.json({ error: 'effective_from 必填' }, { status: 400 })
  }

  // ref_insurance_salary_grades 尚未納入生成類型，用 unknown 中轉避免散落 as any
  const supabase = getSupabaseAdminClient() as unknown as SupabaseClient
  const { data, error } = await supabase
    .from('ref_insurance_salary_grades')
    .upsert(
      {
        kind,
        grade_number,
        monthly_amount,
        effective_from,
        source_url: source_url ?? null,
        notes: notes ?? null,
        updated_by: guard.employeeId,
      },
      { onConflict: 'kind,grade_number,effective_from' }
    )
    .select('id')
    .single()

  if (error) {
    return dbErrorResponse(error)
  }

  return NextResponse.json({ data })
})
