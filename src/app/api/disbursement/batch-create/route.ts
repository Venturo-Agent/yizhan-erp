/**
 * /api/disbursement/batch-create
 *
 * Phase 7（2026-05-17）：單張多銀行整併。
 * 一次 submit（可含多個 bank groups）→ 1 張 disbursement_order + N 個 DOI（每筆帶 from_bank_account_id）
 *
 * 流程（in one logical transaction、靠 admin client）：
 *   1. 為這次提交產生共用 batch_uuid
 *   2. 每 batch 算出 partial-billing 的請款單 → call fork_payment_request_for_partial_billing
 *   3. 一次 generateDisbursementNo（單號不再 per-batch）
 *   4. INSERT disbursement_orders 1 筆（bank_account_id = NULL、由 DOI 層各帶 from_bank_account_id）
 *   5. INSERT disbursement_order_items N 筆（各帶 from_bank_account_id、amount snapshot、fee snapshot）
 *   6. UPDATE 對應 payment_requests.status='confirmed' + disbursement_order_id
 *
 * 設計：spec 卡 2026-05-14-出納單品項級重構-spec.md + Phase7 spec
 */

import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { getApiContext } from '@/lib/auth/get-api-context'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { generateDisbursementNo } from '@/lib/codes'
import { recordApiAuditContext } from '@/lib/audit/audit-helper'
import { translateDbError } from '@/lib/db-error-translate'
import { distributeFees, isCrossBankTransfer } from '@/lib/disbursement/fee-distribution'
import type { SupabaseClient } from '@supabase/supabase-js'

interface BatchInput {
  from_bank_account_id: string
  disbursement_date: string
  payment_method_id?: string | null
  payment_request_item_ids: string[]
  total_fee: number
  fee_distribution: 'equal' | 'proportional'
}

interface BatchRequestBody {
  batches: BatchInput[]
}

interface ItemRow {
  id: string
  request_id: string
  subtotal: number | null
  supplier_id: string | null
  workspace_id: string | null
  advanced_by: string | null
  payee_employee_id: string | null
  payment_method_id: string | null
}

interface SupplierRow {
  id: string
  bank_code: string | null
}

interface CreatedDisbursement {
  id: string
  order_number: string
  bank_group_count: number
  item_count: number
  total_amount: number
  total_fee: number
}

export async function POST(request: NextRequest) {
  const ctx = await getApiContext({ capabilityCode: 'finance.disbursement.write' })
  if (!ctx.ok) {
    return NextResponse.json({ error: ctx.error }, { status: ctx.status })
  }

  let body: BatchRequestBody
  try {
    body = (await request.json()) as BatchRequestBody
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  if (!body.batches?.length) {
    return NextResponse.json({ error: '缺少 batches' }, { status: 400 })
  }

  // ─── 驗證：所有 item id 不能跨 batch 重複 ───
  const allItemIds = body.batches.flatMap(b => b.payment_request_item_ids)
  const itemIdSet = new Set(allItemIds)
  if (itemIdSet.size !== allItemIds.length) {
    return NextResponse.json({ error: '同一品項出現在多個 batch、請檢查勾選' }, { status: 400 })
  }

  for (const b of body.batches) {
    if (!b.from_bank_account_id || !b.payment_request_item_ids?.length) {
      return NextResponse.json(
        { error: 'batch 缺 from_bank_account_id 或 payment_request_item_ids' },
        { status: 400 }
      )
    }
    if (b.total_fee < 0) {
      return NextResponse.json({ error: '手續費不能為負數' }, { status: 400 })
    }
  }

  const admin = getSupabaseAdminClient()
  const workspaceId = ctx.workspace_id
  const employeeId = ctx.employee_id
  const batchUuid = randomUUID()

  await recordApiAuditContext(admin, {
    actorId: employeeId,
    reason: '批量建立出納單',
  })

  // ─── 一次性抓所有資料（避免 N+1）───
  type ItemFetchChain = {
    select: (c: string) => {
      in: (
        k: string,
        v: string[]
      ) => Promise<{ data: ItemRow[] | null; error: { message?: string } | null }>
    }
  }
  const { data: items, error: itemsErr } = await (
    admin.from as unknown as (t: string) => ItemFetchChain
  )('payment_request_items')
    .select(
      'id, request_id, subtotal, supplier_id, workspace_id, advanced_by, payee_employee_id, payment_method_id'
    )
    .in('id', allItemIds)

  if (itemsErr) {
    return NextResponse.json({ error: '讀取請款品項失敗' }, { status: 500 })
  }
  if (!items || items.length !== allItemIds.length) {
    return NextResponse.json({ error: '部分請款品項不存在' }, { status: 400 })
  }

  // ─── Workspace 隔離驗證 ───
  // admin client 跳 RLS、必須 application-level 防偽 workspace
  const crossWsItem = items.find(i => i.workspace_id !== workspaceId)
  if (crossWsItem) {
    return NextResponse.json({ error: '部分請款品項不屬於目前工作空間' }, { status: 403 })
  }

  // ─── 排除已被收進其他 disbursement_order_items 的品項（UNIQUE constraint 防呆 + UX 友善訊息）───
  type DoiCheckChain = {
    select: (c: string) => {
      in: (
        k: string,
        v: string[]
      ) => Promise<{ data: { payment_request_item_id: string }[] | null }>
    }
  }
  const { data: existingDoi } = await (admin.from as unknown as (t: string) => DoiCheckChain)(
    'disbursement_order_items'
  )
    .select('payment_request_item_id')
    .in('payment_request_item_id', allItemIds)

  if (existingDoi && existingDoi.length > 0) {
    return NextResponse.json(
      {
        error: `${existingDoi.length} 筆品項已在其他出納單、請重新整理頁面`,
        conflicting_item_ids: existingDoi.map(r => r.payment_request_item_id),
      },
      { status: 409 }
    )
  }

  const itemById = new Map(items.map(i => [i.id, i]))

  // 2026-05-22 William 拍板：撈 payment_methods.kind、cash / check 強制不收跨行手續費
  const paymentMethodIds = Array.from(
    new Set(items.map(i => i.payment_method_id).filter(Boolean) as string[])
  )
  const pmKindById = new Map<string, string>()
  if (paymentMethodIds.length > 0) {
    type PmFetchChain = {
      select: (c: string) => {
        in: (
          k: string,
          v: string[]
        ) => Promise<{ data: { id: string; kind: string | null }[] | null }>
      }
    }
    const { data: pms } = await (admin.from as unknown as (t: string) => PmFetchChain)(
      'payment_methods'
    )
      .select('id, kind')
      .in('id', paymentMethodIds)
    for (const pm of pms || []) {
      if (pm.kind) pmKindById.set(pm.id, pm.kind)
    }
  }

  // 所有相關 supplier bank_code（用於 snapshot has_cross_bank_fee）
  const supplierIds = Array.from(new Set(items.map(i => i.supplier_id).filter(Boolean) as string[]))
  let supplierMap = new Map<string, SupplierRow>()
  if (supplierIds.length > 0) {
    type SupFetchChain = {
      select: (c: string) => {
        in: (k: string, v: string[]) => Promise<{ data: SupplierRow[] | null }>
      }
    }
    const { data: suppliers } = await (admin.from as unknown as (t: string) => SupFetchChain)(
      'suppliers'
    )
      .select('id, bank_code')
      .in('id', supplierIds)
    supplierMap = new Map((suppliers ?? []).map(s => [s.id, s]))
  }

  // 收款對象若是員工（代墊 advanced_by / 公司請款受款 payee_employee_id）、要拿「員工的銀行」判同行、
  // 不是供應商的。2026-05-27 William 拍板：員工也可能不同行、按員工真實銀行判。
  const employeeIds = Array.from(
    new Set(items.flatMap(i => [i.advanced_by, i.payee_employee_id]).filter(Boolean) as string[])
  )
  const employeeBankById = new Map<string, string | null>()
  if (employeeIds.length > 0) {
    type EmpFetchChain = {
      select: (c: string) => {
        in: (
          k: string,
          v: string[]
        ) => Promise<{ data: { id: string; bank_code: string | null }[] | null }>
      }
    }
    const { data: emps } = await (admin.from as unknown as (t: string) => EmpFetchChain)(
      'employees'
    )
      .select('id, bank_code')
      .in('id', employeeIds)
    for (const e of emps ?? []) employeeBankById.set(e.id, e.bank_code)
  }

  // 所有相關 bank_account bank_code + workspace 驗證
  const bankAccountIds = Array.from(new Set(body.batches.map(b => b.from_bank_account_id)))
  type BankFetchChain = {
    select: (c: string) => {
      in: (
        k: string,
        v: string[]
      ) => Promise<{
        data:
          | {
              id: string
              bank_code: string | null
              workspace_id: string | null
              cross_bank_fee: number | null
            }[]
          | null
      }>
    }
  }
  const { data: banks } = await (admin.from as unknown as (t: string) => BankFetchChain)(
    'bank_accounts'
  )
    .select('id, bank_code, workspace_id, cross_bank_fee')
    .in('id', bankAccountIds)

  if (!banks || banks.length !== bankAccountIds.length) {
    return NextResponse.json({ error: '部分出帳帳戶不存在' }, { status: 400 })
  }
  const crossWsBank = banks.find(b => b.workspace_id !== workspaceId)
  if (crossWsBank) {
    return NextResponse.json({ error: '部分出帳帳戶不屬於目前工作空間' }, { status: 403 })
  }
  const bankCodeById = new Map(banks.map(b => [b.id, b.bank_code]))
  // 2026-05-21 William 拍板：unified 手續費 per 帳戶（取代 workspaces.transfer_fee_unified_amount 整 ws 值）
  const bankFeeById = new Map(banks.map(b => [b.id, Number(b.cross_bank_fee ?? 0)]))

  // 取每張 request 的所有 item id（用來判斷 partial vs full billing）
  const allRequestIds = Array.from(new Set(items.map(i => i.request_id)))
  type AllItemsChain = {
    select: (c: string) => {
      in: (k: string, v: string[]) => Promise<{ data: { id: string; request_id: string }[] | null }>
    }
  }
  const { data: allItemsInRequests } = await (
    admin.from as unknown as (t: string) => AllItemsChain
  )('payment_request_items')
    .select('id, request_id')
    .in('request_id', allRequestIds)

  const itemsByRequest = new Map<string, string[]>()
  for (const row of allItemsInRequests ?? []) {
    const arr = itemsByRequest.get(row.request_id) ?? []
    arr.push(row.id)
    itemsByRequest.set(row.request_id, arr)
  }

  // ─── Fork partial-billing requests ───
  // 對每張 request：算被勾的 item set vs 全 item set
  //  - 勾全部 → 不 fork、原 request 整張出帳
  //  - 勾部分 → fork 新 request、selected items 移到新 request
  // fork 後、被勾的 item 的 request_id 變新 id、要更新 itemById 內的 request_id
  const requestForkMap = new Map<string, string>() // origRequestId -> newRequestId
  for (const origReqId of allRequestIds) {
    const selectedIdsForReq = items
      .filter(i => i.request_id === origReqId && itemIdSet.has(i.id))
      .map(i => i.id)
    const allIdsForReq = itemsByRequest.get(origReqId) ?? []
    const isPartial = selectedIdsForReq.length > 0 && selectedIdsForReq.length < allIdsForReq.length

    if (!isPartial) continue

    type RpcChain = (
      fn: string,
      args: Record<string, unknown>
    ) => Promise<{ data: string | null; error: { message?: string } | null }>
    const { data: newReqId, error: forkErr } = await (admin.rpc as unknown as RpcChain)(
      'fork_payment_request_for_partial_billing',
      {
        p_request_id: origReqId,
        p_item_ids: selectedIdsForReq,
        p_actor_id: employeeId,
      }
    )

    if (forkErr || !newReqId) {
      const t = translateDbError(forkErr)
      return NextResponse.json({ error: t.message }, { status: t.httpStatus })
    }

    requestForkMap.set(origReqId, newReqId)
    // 更新 itemById 內被 fork 的 item 的 request_id
    for (const itemId of selectedIdsForReq) {
      const item = itemById.get(itemId)
      if (item) item.request_id = newReqId
    }
  }

  // 撈公司分攤模式（average / unified）
  // 2026-05-21 William 拍板：unified 改吃 per bank_account cross_bank_fee（不再用 workspace 統一值）
  // 保留撈 transfer_fee_mode（決定 average vs unified）、但 unifiedAmount 來自 bankFeeById（per batch）
  const { data: workspaceData } = await (admin as unknown as SupabaseClient)
    .from('workspaces')
    .select('transfer_fee_mode')
    .eq('id', workspaceId)
    .maybeSingle()
  const ws = workspaceData as { transfer_fee_mode?: string } | null
  const feeMode: 'average' | 'unified' = ws?.transfer_fee_mode === 'unified' ? 'unified' : 'average'

  // ─── Phase 7：單張 DO，所有 batches 合併進一筆 ───
  // 取一次性的 disbursement_date（使用第一個 batch 的日期）
  const disbursementDate = body.batches[0].disbursement_date

  // 計算所有 batch 的 itemRows（帶各自 from_bank_account_id）
  interface ItemRowEnriched {
    item: ItemRow
    from_bank_account_id: string
    amount: number
    supplier_bank_code: string | null
    is_cross_bank: boolean
    fee_amount: number
  }

  const allItemRowsEnriched: ItemRowEnriched[] = []
  let grandTotalAmount = 0
  let grandTotalFee = 0

  for (const batch of body.batches) {
    const fromBankCode = bankCodeById.get(batch.from_bank_account_id) ?? null

    const batchItemRows = batch.payment_request_item_ids.map(id => {
      const item = itemById.get(id)!
      const supplier = item.supplier_id ? supplierMap.get(item.supplier_id) : null
      const supplierBankCode = supplier?.bank_code ?? null
      // 2026-05-27 William 拍板：同行判定吃「收款對象真實銀行」、不是只看供應商。
      // 優先序（對齊下方 payer_key）：代墊員工 > 受款員工 > 供應商。員工也可能不同行、照查真實銀行。
      const payeeBankCode = item.advanced_by
        ? (employeeBankById.get(item.advanced_by) ?? null)
        : item.payee_employee_id
          ? (employeeBankById.get(item.payee_employee_id) ?? null)
          : supplierBankCode
      // 同行/跨行判定走 SSOT（concept A）：cash/check 不收、同行 0、沒填銀行視同跨行照收（選項 A）
      const itemKind = item.payment_method_id ? pmKindById.get(item.payment_method_id) : null
      const isCrossBank = isCrossBankTransfer({ payeeBankCode, fromBankCode, itemKind })
      return {
        item,
        from_bank_account_id: batch.from_bank_account_id,
        amount: Number(item.subtotal ?? 0),
        supplier_bank_code: supplierBankCode,
        is_cross_bank: isCrossBank,
      }
    })

    const batchTotalAmount = batchItemRows.reduce((s, r) => s + r.amount, 0)
    grandTotalAmount += batchTotalAmount

    // 分攤手續費（走 SSOT helper、每個 bank group 獨立分攤）
    // 2026-05-21 William 拍板：用 'per-payer' mode、每個 unique 收款對象 × cross_bank_fee
    // payer_key 推導順序：advanced_by（代墊優先）> payee_employee_id（公司請款發員工）> supplier_id > item.id（unique）
    // 同 key = 視為同一收款人、合併 1 筆手續費、組內 equal 整數平均餘加最後
    // 2026-05-21 補：feeMode 若是 'average' / 'unified' 還沿用舊邏輯（向後兼容）
    const batchUnifiedAmount = bankFeeById.get(batch.from_bank_account_id) ?? 0
    const effectiveMode = batchUnifiedAmount > 0 ? 'per-payer' : feeMode
    const { per_item_fees: feeShares, total_collected: batchSystemFee } = distributeFees({
      mode: effectiveMode,
      bank_actual_fee: batch.total_fee,
      unified_amount_per_item: batchUnifiedAmount,
      items: batchItemRows.map(r => ({
        id: r.item.id,
        amount: r.amount,
        is_cross_bank: r.is_cross_bank,
        payer_key: r.item.advanced_by
          ? `e:${r.item.advanced_by}`
          : r.item.payee_employee_id
            ? `e:${r.item.payee_employee_id}`
            : r.item.supplier_id
              ? `s:${r.item.supplier_id}`
              : r.item.id, // 都沒設 → 該 item 自己一組（unique）
      })),
      average_strategy: batch.fee_distribution,
    })

    // per-payer mode：用系統算的 total（不再 user 手填）；其他 mode：沿用 user 填的 batch.total_fee
    grandTotalFee += effectiveMode === 'per-payer' ? batchSystemFee : batch.total_fee

    for (const r of batchItemRows) {
      allItemRowsEnriched.push({
        ...r,
        fee_amount: feeShares.get(r.item.id) ?? 0,
      })
    }
  }

  // 生一次 disbursement 編號（Phase 7 核心：不再 per-batch 生號）
  const orderNumber = await generateDisbursementNo(workspaceId, disbursementDate)

  type DisbInsertChain = {
    insert: (v: Record<string, unknown>) => {
      select: (c: string) => {
        single: () => Promise<{
          data: { id: string; order_number: string } | null
          error: { message?: string; code?: string } | null
        }>
      }
    }
  }

  const orderId = randomUUID()
  const { data: orderRow, error: orderErr } = await (
    admin.from as unknown as (t: string) => DisbInsertChain
  )('disbursement_orders')
    .insert({
      id: orderId,
      code: orderNumber,
      order_number: orderNumber,
      disbursement_date: disbursementDate,
      amount: grandTotalAmount,
      total_fee: grandTotalFee,
      batch_uuid: batchUuid,
      status: 'pending',
      disbursement_type: 'payment_request',
      // payment_method_id：Phase 7 從 DO 層移除，留 null（spec: Option A，DOI 從 PR 繼承）
      payment_method_id: null,
      // bank_account_id：Phase 7 廢用（改由 DOI.from_bank_account_id 各自帶），設 null
      bank_account_id: null,
      workspace_id: workspaceId,
      created_by: employeeId,
    })
    .select('id, order_number')
    .single()

  if (orderErr || !orderRow) {
    const t = translateDbError(orderErr)
    return NextResponse.json({ error: t.message }, { status: t.httpStatus })
  }

  // INSERT disbursement_order_items（每筆帶各自的 from_bank_account_id）
  const doiRows = allItemRowsEnriched.map(r => ({
    id: randomUUID(),
    disbursement_order_id: orderRow.id,
    payment_request_item_id: r.item.id,
    from_bank_account_id: r.from_bank_account_id,
    amount: r.amount,
    supplier_bank_code: r.supplier_bank_code,
    fee_amount: r.fee_amount,
    has_cross_bank_fee: r.is_cross_bank,
    workspace_id: workspaceId,
    created_by: employeeId,
  }))

  type DoiInsertChain = {
    insert: (rows: Record<string, unknown>[]) => Promise<{ error: { message?: string } | null }>
  }
  const { error: doiErr } = await (admin.from as unknown as (t: string) => DoiInsertChain)(
    'disbursement_order_items'
  ).insert(doiRows)

  if (doiErr) {
    // rollback the single order we just created
    type DelChain = {
      delete: () => {
        eq: (k: string, v: string) => Promise<{ error: unknown }>
      }
    }
    await (admin.from as unknown as (t: string) => DelChain)('disbursement_orders')
      .delete()
      .eq('id', orderRow.id)

    const t = translateDbError(doiErr)
    return NextResponse.json({ error: t.message }, { status: t.httpStatus })
  }

  // UPDATE payment_requests.disbursement_order_id（舊 link，供舊報表向下相容）
  const allRequestIdsInOrder = Array.from(new Set(allItemRowsEnriched.map(r => r.item.request_id)))

  type UpdReqChain = {
    update: (v: Record<string, unknown>) => {
      in: (k: string, v: string[]) => Promise<{ error: { message?: string } | null }>
    }
  }
  const { error: updErr } = await (admin.from as unknown as (t: string) => UpdReqChain)(
    'payment_requests'
  )
    .update({
      disbursement_order_id: orderRow.id,
      status: 'confirmed',
    })
    .in('id', allRequestIdsInOrder)

  if (updErr) {
    const t = translateDbError(updErr)
    return NextResponse.json({ error: t.message }, { status: t.httpStatus })
  }

  const created: CreatedDisbursement[] = [
    {
      id: orderRow.id,
      order_number: orderRow.order_number,
      bank_group_count: body.batches.length,
      item_count: allItemRowsEnriched.length,
      total_amount: grandTotalAmount,
      total_fee: grandTotalFee,
    },
  ]

  return NextResponse.json({
    batch_uuid: batchUuid,
    created,
  })
}
