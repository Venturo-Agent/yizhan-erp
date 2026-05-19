/**
 * /api/hr/salary-settlements/[id]/submit
 *
 * POST — 「確認」按鈕：把 draft batch 變 submitted、產出 payment_request + items。
 *
 * 防撞擊（兩道）：
 *   1. SELECT WHERE status='draft' — 已 submitted 拿不到 row、回 409
 *   2. UPDATE WHERE status='draft' returning — 條件式 update、race 失敗 0 row
 *
 * 流程（手動 transaction、用 multi-step、原子性靠 status 標記 + idempotent design）：
 *   1. 拿 settlement WHERE status='draft' + items
 *   2. 建 payment_request（code 用 SAL-{period}-{settlement短碼}）
 *   3. 建 payment_request_items（每員工一筆）
 *   4. update settlement status='submitted'、payment_request_id、submitted_at
 *      失敗 → 砍剛建的 payment_request（補償）
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

export async function POST(_request: NextRequest, { params }: RouteParams) {
  try {
    const guard = await requireCapability(CAPABILITIES.HR_SALARY_SETTLEMENT_WRITE)
    if (!guard.ok) return guard.response

    const { id } = await params
    // salary_settlements 尚未納入生成類型，用 unknown 中轉
    const supabase = getSupabaseAdminClient() as unknown as SupabaseClient
    await recordApiAuditContext(supabase, {
      actorId: guard.employeeId,
      reason: '確認薪資結算 batch + 產 payment_request',
      requestId: id,
    })

    // 1. 拿 settlement、必須是 draft + 同 workspace
    const { data: settlement } = await supabase
      .from('salary_settlements')
      .select('id, period, status, total_amount, employee_count, workspace_id')
      .eq('id', id)
      .eq('workspace_id', guard.workspaceId)
      .eq('status', 'draft')
      .maybeSingle()

    if (!settlement) {
      return NextResponse.json(
        { error: '找不到 draft 結算（可能已被確認 / 取消、或不存在）' },
        { status: 409 }
      )
    }

    // ── 紅線 D guard：檢查 period 是否已關帳 ─────────────────────────
    const { data: period } = await supabase
      .from('accounting_periods')
      .select('id, period_name, is_closed, closed_at')
      .eq('workspace_id', guard.workspaceId)
      .eq('period_name', settlement.period)
      .maybeSingle()

    if (period && period.is_closed) {
      return NextResponse.json(
        {
          error: `此薪資結算區間（${settlement.period}）已於 ${new Date(period.closed_at).toLocaleString('zh-TW')} 關帳、若要重新確認請先聯絡會計打開該月份`,
          code: 'PERIOD_CLOSED',
        },
        { status: 409 }
      )
    } else if (!period) {
      logger.warn('[salary-settlements/submit] accounting_period not found, skipping guard', {
        workspaceId: guard.workspaceId,
        period: settlement.period,
      })
    }
    // ── END 紅線 D guard ───────────────────────────────────────────
    if (settlement.employee_count === 0) {
      return NextResponse.json(
        { error: '此 batch 無員工項目、不能確認' },
        { status: 400 }
      )
    }

    // 2. 拿 items
    const { data: items, error: itemsError } = await supabase
      .from('salary_settlement_items')
      .select('id, employee_name, employee_number, total_amount, breakdown')
      .eq('settlement_id', id)

    if (itemsError || !items || items.length === 0) {
      return NextResponse.json({ error: '載入項目失敗' }, { status: 500 })
    }

    // 3. 建 payment_request
    // code 用 'SAL-{period}-{settlement_id 前 8 碼}'
    const code = `SAL-${settlement.period}-${id.slice(0, 8).toUpperCase()}`
    const { data: paymentRequest, error: prError } = await supabase
      .from('payment_requests')
      .insert({
        workspace_id: guard.workspaceId,
        code,
        request_type: '薪資結算',
        request_category: 'salary',
        amount: settlement.total_amount,
        total_amount: settlement.total_amount,
        supplier_name: '薪資',
        notes: `${settlement.period} 月度薪資結算（${items.length} 位員工）`,
        status: 'pending',
        created_by: guard.employeeId,
        created_by_name: '系統（薪資結算）',
        request_date: new Date().toISOString().slice(0, 10),
      })
      .select('id, code')
      .single()

    if (prError || !paymentRequest) {
      logger.error('Salary settlement submit: failed to create payment_request', prError)
      const t = translateDbError(prError)
      return NextResponse.json(
        { error: '建立請款單失敗：' + t.message },
        { status: t.httpStatus }
      )
    }

    // 4. 建 payment_request_items（每員工一筆）
    type ItemRow = {
      id: string
      employee_name: string
      employee_number: string | null
      total_amount: number
      breakdown: unknown
    }
    const prItems = (items as ItemRow[]).map((it: ItemRow, idx: number) => ({
      request_id: paymentRequest.id,
      workspace_id: guard.workspaceId,
      item_number: idx + 1,
      description: `${it.employee_name}（${settlement.period} 薪資）`,
      quantity: 1,
      unit_price: it.total_amount,
      amount: it.total_amount,
      subtotal: it.total_amount,
      sort_order: idx,
      category: 'salary',
      currency: 'TWD',
    }))

    const { error: prItemsError } = await supabase
      .from('payment_request_items')
      .insert(prItems)

    if (prItemsError) {
      logger.error('Salary settlement submit: failed to create payment_request_items', prItemsError)
      // 補償：砍剛建的 payment_request
      await supabase.from('payment_requests').delete().eq('id', paymentRequest.id)
      const t = translateDbError(prItemsError)
      return NextResponse.json(
        { error: '建立請款項目失敗：' + t.message },
        { status: t.httpStatus }
      )
    }

    // 5. 標記 settlement submitted
    const { data: updated, error: updateError } = await supabase
      .from('salary_settlements')
      .update({
        status: 'submitted',
        payment_request_id: paymentRequest.id,
        submitted_at: new Date().toISOString(),
        submitted_by: guard.employeeId,
        updated_by: guard.employeeId,
      })
      .eq('id', id)
      .eq('status', 'draft') // race 防護：別人已標 submitted 就 0 row
      .select('id')
      .single()

    if (updateError || !updated) {
      logger.error('Salary settlement submit: race condition on settlement update')
      // 補償：砍剛建的 payment_request + items
      await supabase.from('payment_request_items').delete().eq('request_id', paymentRequest.id)
      await supabase.from('payment_requests').delete().eq('id', paymentRequest.id)
      return NextResponse.json(
        { error: '結算已被其他操作改動、請重新整理' },
        { status: 409 }
      )
    }

    return NextResponse.json({
      data: {
        settlement_id: id,
        payment_request_id: paymentRequest.id,
        payment_request_code: paymentRequest.code,
        total_amount: settlement.total_amount,
        employee_count: items.length,
      },
    })
  } catch (error) {
    logger.error('API Error', { path: _request.nextUrl.pathname, error })
    return NextResponse.json({ success: false, error: '系統錯誤，請稍後再試' }, { status: 500 })
  }
}
