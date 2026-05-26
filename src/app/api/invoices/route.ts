import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { getServerAuth } from '@/lib/auth/server-auth'
import { createApiClient } from '@/lib/supabase/api-client'
import { recordApiAuditContext } from '@/lib/audit/audit-helper'
import { logger } from '@/lib/utils/logger'
import { dbErrorResponse, translateDbError } from '@/lib/db-error-translate'
import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * POST /api/invoices
 * 開帳單批次：一張訂單建 1 個 batch + N 個 invoice、共用 1 個 token
 * (2026-05-15 William 拍板、從一人一單改成一批一 link)
 *
 * Body:
 *   { order_id, splits: [{ member_id, customer_id, total_amount, due_date?, notes? }] }
 *
 * 守門：
 *   - admin client per-request(紅線 C)
 *   - 必須登入、order 屬於 caller workspace
 *   - employeeId 必須是 employees.id UUID(不接受 server-auth fallback user.id)
 *   - 14 天 token 過期(掛在 batch 上、N 個 invoice 共用)
 *
 * 流程：
 *   1. 建 1 個 invoice_batches row(含 token + 14 天過期)
 *   2. 建 N 個 invoices row(各 member 一筆、共用 batch_id)
 *   3. 回 batch.public_token(客戶端 link = /pay/{token})
 */

const splitSchema = z.object({
  member_id: z.string().uuid().optional().nullable(),
  customer_id: z.string().min(1),
  total_amount: z.number().positive(),
  due_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .nullable(),
  notes: z.string().max(500).optional().nullable(),
})

const bodySchema = z.object({
  order_id: z.string().min(1),
  splits: z.array(splitSchema).min(1).max(50),
  batch_notes: z.string().max(500).optional().nullable(),
})

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function POST(req: Request) {
  try {
    const auth = await getServerAuth()
    if (!auth.success) {
      return NextResponse.json({ error: '請先登入' }, { status: 401 })
    }

    const json = await req.json()
    const parsed = bodySchema.safeParse(json)
    if (!parsed.success) {
      return NextResponse.json(
        { error: '請求格式錯誤', detail: parsed.error.issues },
        { status: 400 }
      )
    }

    const { order_id, splits, batch_notes } = parsed.data
    // invoice_batches / invoices 尚未納入生成類型，用 unknown 中轉
    const supabase = getSupabaseAdminClient() as unknown as SupabaseClient
    const workspaceId = auth.data.workspaceId
    const employeeId = auth.data.employeeId

    if (!employeeId || !UUID_REGEX.test(employeeId)) {
      logger.error('[/api/invoices POST] invalid employeeId:', employeeId)
      return NextResponse.json({ error: '找不到員工身分、請重新登入', employeeId }, { status: 401 })
    }

    const auditClient = await createApiClient()
    await recordApiAuditContext(auditClient, {
      actorId: employeeId,
      reason: '開立帳單批次',
    })

    // 守門：order 必須屬於 caller workspace
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id, workspace_id')
      .eq('id', order_id)
      .maybeSingle()

    if (orderError) return dbErrorResponse(orderError)
    if (!order || order.workspace_id !== workspaceId) {
      return NextResponse.json({ error: '找不到訂單或無權限' }, { status: 404 })
    }

    // Step 1: 建 batch
    const { data: batch, error: batchError } = await supabase
      .from('invoice_batches')
      .insert({
        workspace_id: workspaceId,
        order_id,
        notes: batch_notes || null,
        created_by: employeeId,
        updated_by: employeeId,
      })
      .select('id, public_token, token_expires_at')
      .single()

    if (batchError || !batch) {
      logger.error('[/api/invoices POST] batch insert error:', batchError)
      const batchT = batchError ? translateDbError(batchError) : null
      return NextResponse.json(
        { error: batchT?.message ?? '建立批次失敗' },
        { status: batchT?.httpStatus ?? 500 }
      )
    }

    // Step 2: 建 N 個 invoices、掛同個 batch_id
    const rows = splits.map(s => ({
      workspace_id: workspaceId,
      order_id,
      batch_id: batch.id,
      customer_id: s.customer_id,
      member_id: s.member_id || null,
      total_amount: s.total_amount,
      due_date: s.due_date || null,
      notes: s.notes || null,
      created_by: employeeId,
      updated_by: employeeId,
    }))

    const { data: created, error: insertError } = await supabase
      .from('invoices')
      .insert(rows)
      .select('id, customer_id, member_id, total_amount')

    if (insertError) {
      logger.error('[/api/invoices POST] invoices insert error:', insertError)
      // 補救：rollback 已建的 batch、避免孤兒
      await supabase.from('invoice_batches').delete().eq('id', batch.id)
      const insertT = translateDbError(insertError)
      return NextResponse.json({ error: insertT.message }, { status: insertT.httpStatus })
    }

    return NextResponse.json(
      {
        batch: {
          id: batch.id,
          public_token: batch.public_token,
          token_expires_at: batch.token_expires_at,
          invoice_count: created?.length || 0,
        },
        invoices: created,
      },
      { status: 201 }
    )
  } catch (err) {
    logger.error('[/api/invoices POST] uncaught:', err)
    return NextResponse.json({ error: '建帳單失敗，請稍後再試' }, { status: 500 })
  }
}
