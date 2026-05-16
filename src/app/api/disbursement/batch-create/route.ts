/**
 * /api/disbursement/batch-create
 *
 * Phase 3 wizard 最終儲存：一次寫入多批 disbursement_orders + disbursement_order_items。
 *
 * 流程（in one logical transaction、靠 admin client）：
 *   1. 為這次提交產生共用 batch_uuid
 *   2. 每 batch 算出 partial-billing 的請款單 → call fork_payment_request_for_partial_billing
 *   3. INSERT disbursement_orders (含 bank_account_id, total_fee, batch_uuid)
 *   4. INSERT disbursement_order_items (含 amount snapshot, supplier_bank_code, fee_amount, has_cross_bank_fee)
 *   5. UPDATE 對應 payment_requests.status='confirmed' + disbursement_order_id（保留舊 link 供舊報表）
 *
 * 設計：spec 卡 2026-05-14-出納單品項級重構-spec.md + Phase3 handoff 卡
 */

import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { getApiContext } from '@/lib/auth/get-api-context'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { generateDisbursementNo } from '@/lib/codes'
import { recordApiAuditContext } from '@/lib/audit/audit-helper'
import { translateDbError } from '@/lib/db-error-translate'
import { distributeFees } from '@/lib/disbursement/fee-distribution'
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
}

interface SupplierRow {
  id: string
  bank_code: string | null
}

interface CreatedDisbursement {
  id: string
  order_number: string
  bank_account_id: string
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
    return NextResponse.json(
      { error: '同一品項出現在多個 batch、請檢查勾選' },
      { status: 400 },
    )
  }

  for (const b of body.batches) {
    if (!b.from_bank_account_id || !b.payment_request_item_ids?.length) {
      return NextResponse.json(
        { error: 'batch 缺 from_bank_account_id 或 payment_request_item_ids' },
        { status: 400 },
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
      in: (k: string, v: string[]) => Promise<{ data: ItemRow[] | null; error: { message?: string } | null }>
    }
  }
  const { data: items, error: itemsErr } = await (
    admin.from as unknown as (t: string) => ItemFetchChain
  )('payment_request_items')
    .select('id, request_id, subtotal, supplier_id, workspace_id')
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
    return NextResponse.json(
      { error: '部分請款品項不屬於目前工作空間' },
      { status: 403 },
    )
  }

  // ─── 排除已被收進其他 disbursement_order_items 的品項（UNIQUE constraint 防呆 + UX 友善訊息）───
  type DoiCheckChain = {
    select: (c: string) => {
      in: (k: string, v: string[]) => Promise<{ data: { payment_request_item_id: string }[] | null }>
    }
  }
  const { data: existingDoi } = await (
    admin.from as unknown as (t: string) => DoiCheckChain
  )('disbursement_order_items')
    .select('payment_request_item_id')
    .in('payment_request_item_id', allItemIds)

  if (existingDoi && existingDoi.length > 0) {
    return NextResponse.json(
      {
        error: `${existingDoi.length} 筆品項已在其他出納單、請重新整理頁面`,
        conflicting_item_ids: existingDoi.map(r => r.payment_request_item_id),
      },
      { status: 409 },
    )
  }

  const itemById = new Map(items.map(i => [i.id, i]))

  // 所有相關 supplier bank_code（用於 snapshot has_cross_bank_fee）
  const supplierIds = Array.from(
    new Set(items.map(i => i.supplier_id).filter(Boolean) as string[]),
  )
  let supplierMap = new Map<string, SupplierRow>()
  if (supplierIds.length > 0) {
    type SupFetchChain = {
      select: (c: string) => {
        in: (k: string, v: string[]) => Promise<{ data: SupplierRow[] | null }>
      }
    }
    const { data: suppliers } = await (
      admin.from as unknown as (t: string) => SupFetchChain
    )('suppliers')
      .select('id, bank_code')
      .in('id', supplierIds)
    supplierMap = new Map((suppliers ?? []).map(s => [s.id, s]))
  }

  // 所有相關 bank_account bank_code + workspace 驗證
  const bankAccountIds = Array.from(
    new Set(body.batches.map(b => b.from_bank_account_id)),
  )
  type BankFetchChain = {
    select: (c: string) => {
      in: (k: string, v: string[]) => Promise<{
        data: { id: string; bank_code: string | null; workspace_id: string | null }[] | null
      }>
    }
  }
  const { data: banks } = await (
    admin.from as unknown as (t: string) => BankFetchChain
  )('bank_accounts')
    .select('id, bank_code, workspace_id')
    .in('id', bankAccountIds)

  if (!banks || banks.length !== bankAccountIds.length) {
    return NextResponse.json({ error: '部分出帳帳戶不存在' }, { status: 400 })
  }
  const crossWsBank = banks.find(b => b.workspace_id !== workspaceId)
  if (crossWsBank) {
    return NextResponse.json(
      { error: '部分出帳帳戶不屬於目前工作空間' },
      { status: 403 },
    )
  }
  const bankCodeById = new Map(banks.map(b => [b.id, b.bank_code]))

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
    const isPartial =
      selectedIdsForReq.length > 0 && selectedIdsForReq.length < allIdsForReq.length

    if (!isPartial) continue

    type RpcChain = (
      fn: string,
      args: Record<string, unknown>,
    ) => Promise<{ data: string | null; error: { message?: string } | null }>
    const { data: newReqId, error: forkErr } = await (admin.rpc as unknown as RpcChain)(
      'fork_payment_request_for_partial_billing',
      {
        p_request_id: origReqId,
        p_item_ids: selectedIdsForReq,
        p_actor_id: employeeId,
      },
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
  // workspaces.transfer_fee_mode / transfer_fee_unified_amount 尚未納入生成類型，用 unknown 中轉
  const { data: workspaceData } = await (admin as unknown as SupabaseClient)
    .from('workspaces')
    .select('transfer_fee_mode, transfer_fee_unified_amount')
    .eq('id', workspaceId)
    .maybeSingle()
  const ws = workspaceData as
    | { transfer_fee_mode?: string; transfer_fee_unified_amount?: number }
    | null
  const feeMode: 'average' | 'unified' =
    ws?.transfer_fee_mode === 'unified' ? 'unified' : 'average'
  const unifiedAmount = Number(ws?.transfer_fee_unified_amount ?? 0)

  // ─── 為每 batch 建 disbursement_order + disbursement_order_items ───
  const created: CreatedDisbursement[] = []

  for (const batch of body.batches) {
    const fromBankCode = bankCodeById.get(batch.from_bank_account_id) ?? null

    // 計算每 item 金額
    const itemRows = batch.payment_request_item_ids.map(id => {
      const item = itemById.get(id)!
      const supplier = item.supplier_id ? supplierMap.get(item.supplier_id) : null
      const supplierBankCode = supplier?.bank_code ?? null
      const isCrossBank =
        !supplierBankCode || !fromBankCode || supplierBankCode !== fromBankCode
      return {
        item,
        amount: Number(item.subtotal ?? 0),
        supplier_bank_code: supplierBankCode,
        is_cross_bank: isCrossBank,
      }
    })

    const totalAmount = itemRows.reduce((s, r) => s + r.amount, 0)

    // 分攤手續費（走 SSOT helper、保護有 unit test）
    const { per_item_fees: feeShares } = distributeFees({
      mode: feeMode,
      bank_actual_fee: batch.total_fee,
      unified_amount_per_item: unifiedAmount,
      items: itemRows.map(r => ({
        id: r.item.id,
        amount: r.amount,
        is_cross_bank: r.is_cross_bank,
      })),
      average_strategy: batch.fee_distribution,
    })

    // 生 disbursement 編號
    const orderNumber = await generateDisbursementNo(workspaceId, batch.disbursement_date)

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

    const { data: orderRow, error: orderErr } = await (
      admin.from as unknown as (t: string) => DisbInsertChain
    )('disbursement_orders')
      .insert({
        id: randomUUID(),
        code: orderNumber,
        order_number: orderNumber,
        disbursement_date: batch.disbursement_date,
        amount: totalAmount,
        total_fee: batch.total_fee,
        batch_uuid: batchUuid,
        status: 'pending',
        disbursement_type: 'payment_request',
        payment_method_id: batch.payment_method_id ?? null,
        bank_account_id: batch.from_bank_account_id,
        workspace_id: workspaceId,
        created_by: employeeId,
      })
      .select('id, order_number')
      .single()

    if (orderErr || !orderRow) {
      const t = translateDbError(orderErr)
      return NextResponse.json({ error: t.message }, { status: t.httpStatus })
    }

    // INSERT disbursement_order_items
    const doiRows = itemRows.map(r => ({
      id: randomUUID(),
      disbursement_order_id: orderRow.id,
      payment_request_item_id: r.item.id,
      amount: r.amount,
      supplier_bank_code: r.supplier_bank_code,
      fee_amount: feeShares.get(r.item.id) ?? 0,
      has_cross_bank_fee: r.is_cross_bank,
      workspace_id: workspaceId,
      created_by: employeeId,
    }))

    type DoiInsertChain = {
      insert: (rows: Record<string, unknown>[]) => Promise<{ error: { message?: string } | null }>
    }
    const { error: doiErr } = await (
      admin.from as unknown as (t: string) => DoiInsertChain
    )('disbursement_order_items').insert(doiRows)

    if (doiErr) {
      // rollback orders
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

    // 為了讓現有列表 / 編輯 dialog / 對賬報表能跟舊邏輯一起運作、
    // 也設 payment_requests.disbursement_order_id = orderRow.id（請款單級舊 link）
    // 找出該 batch 所有涉及的 request_id（fork 後的新 id）
    const requestIdsInBatch = Array.from(
      new Set(batch.payment_request_item_ids.map(iid => itemById.get(iid)!.request_id)),
    )

    type UpdReqChain = {
      update: (v: Record<string, unknown>) => {
        in: (k: string, v: string[]) => Promise<{ error: { message?: string } | null }>
      }
    }
    const { error: updErr } = await (
      admin.from as unknown as (t: string) => UpdReqChain
    )('payment_requests')
      .update({
        disbursement_order_id: orderRow.id,
        status: 'confirmed',
      })
      .in('id', requestIdsInBatch)

    if (updErr) {
      const t = translateDbError(updErr)
      return NextResponse.json({ error: t.message }, { status: t.httpStatus })
    }

    created.push({
      id: orderRow.id,
      order_number: orderRow.order_number,
      bank_account_id: batch.from_bank_account_id,
      item_count: itemRows.length,
      total_amount: totalAmount,
      total_fee: batch.total_fee,
    })
  }

  return NextResponse.json({
    batch_uuid: batchUuid,
    created,
  })
}
