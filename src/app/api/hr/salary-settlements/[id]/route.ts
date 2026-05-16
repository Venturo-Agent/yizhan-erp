/**
 * /api/hr/salary-settlements/[id]
 *
 * GET — 看 batch detail（含所有 items）
 * DELETE — 砍 draft batch（已 submitted 不可砍、要 cancel）
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireCapability } from '@/lib/auth/require-capability'
import { CAPABILITIES } from '@/lib/permissions/capabilities'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { recordApiAuditContext } from '@/lib/audit/audit-helper'
import { translateDbError } from '@/lib/db-error-translate'
import { logger } from '@/lib/utils/logger'
import type { SupabaseClient } from '@supabase/supabase-js'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const guard = await requireCapability(CAPABILITIES.HR_SALARY_SETTLEMENT_READ)
    if (!guard.ok) return guard.response

    const { id } = await params
    // salary_settlements / salary_settlement_items 尚未納入生成類型，用 unknown 中轉
    const supabase = getSupabaseAdminClient() as unknown as SupabaseClient

    const { data: settlement, error: settlementError } = await supabase
      .from('salary_settlements')
      .select('*')
      .eq('id', id)
      .eq('workspace_id', guard.workspaceId)
      .maybeSingle()

    if (settlementError) {
      const t = translateDbError(settlementError)
      return NextResponse.json({ error: t.message }, { status: t.httpStatus })
    }
    if (!settlement) {
      return NextResponse.json({ error: '找不到結算 batch' }, { status: 404 })
    }

    const { data: items, error: itemsError } = await supabase
      .from('salary_settlement_items')
      .select('*')
      .eq('settlement_id', id)
      .order('employee_name')

    if (itemsError) {
      const t = translateDbError(itemsError)
      return NextResponse.json({ error: t.message }, { status: t.httpStatus })
    }

    return NextResponse.json({
      data: {
        ...settlement,
        items: items ?? [],
      },
    })
  } catch (error) {
    logger.error('API Error', { path: _request.nextUrl.pathname, error })
    return NextResponse.json({ success: false, error: '系統錯誤，請稍後再試' }, { status: 500 })
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const guard = await requireCapability(CAPABILITIES.HR_SALARY_SETTLEMENT_WRITE)
    if (!guard.ok) return guard.response

    const { id } = await params
    // salary_settlements / salary_settlement_items 尚未納入生成類型，用 unknown 中轉
    const supabase = getSupabaseAdminClient() as unknown as SupabaseClient
    await recordApiAuditContext(supabase, {
      actorId: guard.employeeId,
      reason: '刪除 draft 薪資結算 batch',
      requestId: id,
    })

    const { data: settlement } = await supabase
      .from('salary_settlements')
      .select('id, status, workspace_id')
      .eq('id', id)
      .eq('workspace_id', guard.workspaceId)
      .maybeSingle()

    if (!settlement) {
      return NextResponse.json({ error: '找不到結算 batch' }, { status: 404 })
    }
    if (settlement.status !== 'draft') {
      return NextResponse.json(
        { error: '已確認的結算不可刪除、只可標記取消' },
        { status: 409 }
      )
    }

    // CASCADE 會帶走 items
    const { error } = await supabase
      .from('salary_settlements')
      .delete()
      .eq('id', id)
      .eq('workspace_id', guard.workspaceId)
      .eq('status', 'draft')

    if (error) {
      const t = translateDbError(error)
      return NextResponse.json({ error: t.message }, { status: t.httpStatus })
    }

    return NextResponse.json({ data: { id, deleted: true } })
  } catch (error) {
    logger.error('API Error', { path: _request.nextUrl.pathname, error })
    return NextResponse.json({ success: false, error: '系統錯誤，請稍後再試' }, { status: 500 })
  }
}
