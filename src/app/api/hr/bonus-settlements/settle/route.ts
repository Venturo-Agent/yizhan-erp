/**
 * POST /api/hr/bonus-settlements/settle
 *
 * 接受 tour_id 陣列、每團產一張 payment_request + items、bonus_pending.status='settled'。
 *
 * Body: { tour_ids: string[] }
 *
 * 流程（每團獨立、不互相阻擋）：
 *   1. 拿該 tour 所有 bonus_pending status='pending'
 *   2. 建 payment_request（code: BNS-{tour_code}-{date}）
 *   3. 建 payment_request_items（每員工一筆）
 *   4. UPDATE bonus_pending status='settled' WHERE status='pending' AND tour_id=...
 *      race 防護：拿不到 row → 補償砍剛建的 payment_request、回 409
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireCapability } from '@/lib/auth/require-capability'
import { CAPABILITIES } from '@/lib/permissions/capabilities'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { recordApiAuditContext } from '@/lib/audit/audit-helper'
import { logger } from '@/lib/utils/logger'
import { translateDbError } from '@/lib/db-error-translate'
import type { SupabaseClient } from '@supabase/supabase-js'

interface BonusRow {
  id: string
  employee_id: string
  employee_name: string
  amount: number
  bonus_kind: string | null
}

export async function POST(request: NextRequest) {
  const guard = await requireCapability(CAPABILITIES.HR_BONUS_SETTLEMENT_WRITE)
  if (!guard.ok) return guard.response

  const body = await request.json().catch(() => ({}))
  const { tour_ids, request_date } = body as { tour_ids?: string[]; request_date?: string }

  if (!Array.isArray(tour_ids) || tour_ids.length === 0) {
    return NextResponse.json({ error: '請選至少一團' }, { status: 400 })
  }

  // request_date 由 HR 在 UI 選、用來當請款單的 request_date / code 後綴
  // 沒帶就回 400、強制 HR 選日期
  if (!request_date || !/^\d{4}-\d{2}-\d{2}$/.test(request_date)) {
    return NextResponse.json({ error: '請款日期必填、格式 YYYY-MM-DD' }, { status: 400 })
  }

  // bonus_pending 尚未納入生成類型，用 unknown 中轉
  const supabase = getSupabaseAdminClient() as unknown as SupabaseClient
  await recordApiAuditContext(supabase, {
    actorId: guard.employeeId,
    reason: `獎金結算（${tour_ids.length} 團、日期 ${request_date}）`,
  })
  const today = request_date
  const results: Array<{ tour_id: string; ok: boolean; payment_request_id?: string; payment_request_code?: string; total_amount?: number; bonus_count?: number; error?: string }> = []

  for (const tourId of tour_ids) {
    try {
      // 1. 拿 tour 資料
      const { data: tour } = await supabase
        .from('tours')
        .select('id, code, name, workspace_id')
        .eq('id', tourId)
        .eq('workspace_id', guard.workspaceId)
        .maybeSingle()

      if (!tour) {
        results.push({ tour_id: tourId, ok: false, error: 'tour not found' })
        continue
      }

      // 2. 拿該 tour pending bonus
      const { data: bonuses } = await supabase
        .from('bonus_pending')
        .select('id, employee_id, employee_name, amount, bonus_kind')
        .eq('tour_id', tourId)
        .eq('workspace_id', guard.workspaceId)
        .eq('status', 'pending')

      const bonusRows = (bonuses ?? []) as BonusRow[]

      if (bonusRows.length === 0) {
        results.push({ tour_id: tourId, ok: false, error: 'no pending bonuses' })
        continue
      }

      const totalAmount = bonusRows.reduce((s: number, b: BonusRow) => s + Number(b.amount ?? 0), 0)
      // 2026-05-15 William 拍板：單號就是 BNS-{tour_code}、不加日期（日期欄位已存 request_date）
      const code = `BNS-${tour.code}`

      // 找「匯款」payment_method（fallback：第一個 active 付款 method）
      const { data: transferPm } = await supabase
        .from('payment_methods')
        .select('id')
        .eq('workspace_id', guard.workspaceId)
        .eq('type', 'payment')
        .eq('is_active', true)
        .ilike('name', '%匯款%')
        .limit(1)
        .maybeSingle()
      let paymentMethodId: string | null =
        (transferPm as { id?: string } | null)?.id ?? null
      if (!paymentMethodId) {
        const { data: anyPm } = await supabase
          .from('payment_methods')
          .select('id')
          .eq('workspace_id', guard.workspaceId)
          .eq('type', 'payment')
          .eq('is_active', true)
          .order('sort_order', { ascending: true })
          .limit(1)
          .maybeSingle()
        paymentMethodId = (anyPm as { id?: string } | null)?.id ?? null
      }

      // 3. 建 payment_request（公司請款 / 獎金類 / 匯款）
      // - 不綁 tour_id（綁了會被 isTourRequest 判定為「團體請款」、跟公司請款歸類矛盾）
      //   tour_code / tour_name 用字串保留來源溯源
      // - supplier_name 暫填「公司請款」、員工尚未進供應商表
      //   未來員工有對應 supplier_id 後、可改一團多 PR 或單張 PR 顯示員工名單
      const { data: pr, error: prError } = await supabase
        .from('payment_requests')
        .insert({
          workspace_id: guard.workspaceId,
          code,
          request_number: code,
          request_type: '獎金',
          request_category: 'company',
          expense_type: 'BNS',
          amount: totalAmount,
          total_amount: totalAmount,
          supplier_name: '公司請款',
          tour_code: tour.code,
          tour_name: tour.name,
          payment_method_id: paymentMethodId,
          notes: `${tour.code} ${tour.name} — 獎金結算（${bonusRows.length} 筆）`,
          status: 'pending',
          created_by: guard.employeeId,
          created_by_name: '系統（獎金結算）',
          request_date: today,
        })
        .select('id, code')
        .single()

      if (prError || !pr) {
        const t = translateDbError(prError)
        results.push({ tour_id: tourId, ok: false, error: t.message })
        continue
      }

      // 4. 建 items（描述「獎金類型 - 員工名」、bonus_kind 已存中文 label）
      const prItems = bonusRows.map((b: BonusRow, idx: number) => ({
        request_id: pr.id,
        workspace_id: guard.workspaceId,
        item_number: idx + 1,
        description: b.bonus_kind
          ? `${b.bonus_kind} - ${b.employee_name}`
          : b.employee_name,
        quantity: 1,
        unit_price: Number(b.amount ?? 0),
        amount: Number(b.amount ?? 0),
        subtotal: Number(b.amount ?? 0),
        sort_order: idx,
        category: 'BNS',
        currency: 'TWD',
        tour_id: tourId,
      }))

      const { error: itemsError } = await supabase
        .from('payment_request_items')
        .insert(prItems)

      if (itemsError) {
        await supabase.from('payment_requests').delete().eq('id', pr.id)
        results.push({
          tour_id: tourId,
          ok: false,
          error: 'create items failed: ' + itemsError.message,
        })
        continue
      }

      // 5. 標記 bonus settled
      const bonusIds = bonusRows.map((b: BonusRow) => b.id)
      const { data: updated } = await supabase
        .from('bonus_pending')
        .update({
          status: 'settled',
          settled_at: new Date().toISOString(),
          settled_in_payment_request_id: pr.id,
        })
        .in('id', bonusIds)
        .eq('status', 'pending')
        .select('id')

      if (!updated || updated.length !== bonusRows.length) {
        // race fail — 補償
        logger.error('Bonus settle: race condition on bonus_pending update')
        await supabase.from('payment_request_items').delete().eq('request_id', pr.id)
        await supabase.from('payment_requests').delete().eq('id', pr.id)
        results.push({
          tour_id: tourId,
          ok: false,
          error: '已被其他結算改動、請重新整理',
        })
        continue
      }

      results.push({
        tour_id: tourId,
        ok: true,
        payment_request_id: pr.id,
        payment_request_code: pr.code,
        total_amount: totalAmount,
        bonus_count: bonusRows.length,
      })
    } catch (err) {
      logger.error('Bonus settle: unexpected error for tour ' + tourId, err)
      results.push({ tour_id: tourId, ok: false, error: 'unexpected error' })
    }
  }

  const okCount = results.filter((r) => r.ok).length
  const failCount = results.filter((r) => !r.ok).length

  return NextResponse.json({
    data: {
      ok_count: okCount,
      fail_count: failCount,
      results,
    },
  })
}
