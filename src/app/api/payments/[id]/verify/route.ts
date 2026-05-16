/**
 * POST /api/payments/[id]/verify
 * 會計確認對帳:把 receipt status 從 pending_verify → confirmed
 *
 * 設計:
 * - 守門:FINANCE_CONFIRM_PAYMENTS capability(收款確認權限)
 * - admin client per-request(紅線 C)
 * - 必須是 status='pending_verify' 才能 verify(防重複)
 * - 紅線 D:已 confirmed 的不能再 verify、要走沖正
 * - status 改 confirmed 後 trigger 自動 recalc invoice.paid_amount
 *
 * 完整 spec: Logan-Workspace/2026-05-14-帳單系統-客戶自助付款-CRM-spec.md
 */

import { NextResponse } from 'next/server'
import { requireCapability } from '@/lib/auth/require-capability'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { CAPABILITIES } from '@/lib/permissions'
import { recordApiAuditContext } from '@/lib/audit/audit-helper'
import { translateDbError } from '@/lib/db-error-translate'
import { logger } from '@/lib/utils/logger'
import type { PostgrestError } from '@supabase/supabase-js'

/** receipts 欄位（已在 DB 但部分欄位尚未納入生成類型，如 verified_by/verified_at）*/
interface ReceiptRow {
  id: string
  status: string
  workspace_id: string
  invoice_id: string | null
  receipt_amount: number
}

interface ReceiptUpdated {
  id: string
  status: string
  verified_by: string
  verified_at: string
  invoice_id: string | null
}

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const ctx = await requireCapability(CAPABILITIES.FINANCE_CONFIRM_PAYMENTS)
    if (!ctx.ok) return ctx.response

    const supabase = getSupabaseAdminClient()
    await recordApiAuditContext(supabase, {
      actorId: ctx.employeeId,
      reason: '確認收款',
      requestId: id,
    })

    // 查 receipt 確認 status 跟 workspace
    const { data: receipt, error: queryErr } = await supabase
      .from('receipts')
      .select('id, status, workspace_id, invoice_id, receipt_amount')
      .eq('id', id)
      .maybeSingle() as { data: ReceiptRow | null; error: PostgrestError | null }

    if (queryErr) {
      logger.error('[payments/verify] query error:', queryErr)
      return NextResponse.json({ error: '查詢失敗' }, { status: 500 })
    }

    if (!receipt) {
      return NextResponse.json({ error: '找不到收款單' }, { status: 404 })
    }

    if (receipt.workspace_id !== ctx.workspaceId) {
      return NextResponse.json({ error: '無權限操作此收款單' }, { status: 403 })
    }

    if (receipt.status !== 'pending_verify') {
      return NextResponse.json(
        { error: `只能確認「待確認」狀態的收款單(目前狀態: ${receipt.status})` },
        { status: 400 }
      )
    }

    // UPDATE → trigger 自動 recalc invoice.paid_amount
    const { data: updated, error: updateErr } = await supabase
      .from('receipts')
      .update({
        status: 'confirmed',
        actual_amount: receipt.receipt_amount,
        verified_by: ctx.employeeId,
        verified_at: new Date().toISOString(),
        updated_by: ctx.employeeId,
      })
      .eq('id', id)
      .select('id, status, verified_by, verified_at, invoice_id')
      .single() as { data: ReceiptUpdated | null; error: PostgrestError | null }

    if (updateErr) {
      logger.error('[payments/verify] update error:', updateErr)
      const t = translateDbError(updateErr)
      return NextResponse.json({ error: t.message }, { status: t.httpStatus })
    }

    return NextResponse.json({ receipt: updated })
  } catch (error) {
    logger.error('API Error', { path: new URL(_request.url).pathname, error })
    return NextResponse.json({ success: false, error: '系統錯誤，請稍後再試' }, { status: 500 })
  }
}
