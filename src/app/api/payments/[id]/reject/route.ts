/**
 * POST /api/payments/[id]/reject
 * 會計退回收款:status 從 pending_verify → rejected、寫退回原因
 *
 * 設計:
 * - 守門:FINANCE_CONFIRM_PAYMENTS capability(同 verify、同一個會計權限)
 * - admin client per-request(紅線 C)
 * - 必須是 status='pending_verify' 才能 reject
 * - 必填 reason(客戶端會看到)
 * - 紅線 D:已 confirmed 的不能 reject、要走沖正
 *
 * 完整 spec: Logan-Workspace/2026-05-14-帳單系統-客戶自助付款-CRM-spec.md
 */

import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireCapability } from '@/lib/auth/require-capability'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { CAPABILITIES } from '@/lib/permissions'
import { recordApiAuditContext } from '@/lib/audit/audit-helper'
import { logger } from '@/lib/utils/logger'
import type { PostgrestError } from '@supabase/supabase-js'

/** receipts 欄位（已在 DB 但部分欄位尚未納入生成類型，如 verified_by/verified_at/rejected_reason）*/
interface ReceiptRow {
  id: string
  status: string
  workspace_id: string
}

interface ReceiptUpdated {
  id: string
  status: string
  rejected_reason: string
  verified_by: string
  verified_at: string
}

const rejectSchema = z.object({
  reason: z.string().min(1).max(500),
})

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params

    const ctx = await requireCapability(CAPABILITIES.FINANCE_CONFIRM_PAYMENTS)
    if (!ctx.ok) return ctx.response

    const json = await request.json()
    const parsed = rejectSchema.safeParse(json)
    if (!parsed.success) {
      return NextResponse.json(
        { error: '請填寫退回原因', detail: parsed.error.issues },
        { status: 400 }
      )
    }

    const { reason } = parsed.data
    const supabase = getSupabaseAdminClient()
    await recordApiAuditContext(supabase, {
      actorId: ctx.employeeId,
      reason: `退回收款（${reason.slice(0, 50)}）`,
      requestId: id,
    })

    const { data: receipt, error: queryErr } = (await supabase
      .from('receipts')
      .select('id, status, workspace_id')
      .eq('id', id)
      .maybeSingle()) as { data: ReceiptRow | null; error: PostgrestError | null }

    if (queryErr) {
      logger.error('[payments/reject] query error:', queryErr)
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
        { error: `只能退回「待確認」狀態的收款單(目前狀態: ${receipt.status})` },
        { status: 400 }
      )
    }

    const { data: updated, error: updateErr } = (await supabase
      .from('receipts')
      .update({
        status: 'rejected',
        rejected_reason: reason,
        verified_by: ctx.employeeId,
        verified_at: new Date().toISOString(),
        updated_by: ctx.employeeId,
      })
      .eq('id', id)
      .select('id, status, rejected_reason, verified_by, verified_at')
      .single()) as { data: ReceiptUpdated | null; error: PostgrestError | null }

    if (updateErr) {
      logger.error('[payments/reject] update error:', updateErr)
      return NextResponse.json(
        { error: updateErr.message || '退回失敗', code: updateErr.code },
        { status: 500 }
      )
    }

    return NextResponse.json({ receipt: updated })
  } catch (error) {
    logger.error('API Error', { path: new URL(request.url).pathname, error })
    return NextResponse.json({ success: false, error: '系統錯誤，請稍後再試' }, { status: 500 })
  }
}
