/**
 * /api/disbursement/[id]
 *
 * 編輯既有出納單（品項級）：改 metadata + items diff add/remove。
 *
 * PATCH body:
 *   {
 *     disbursement_date?: string
 *     payment_method_id?: string | null
 *     from_bank_account_id?: string  // 改出帳帳戶
 *     total_fee?: number
 *     fee_distribution?: 'equal' | 'proportional'
 *     item_ids: string[]             // 新版完整勾選清單（add/remove 由 diff 算）
 *   }
 *
 * 行為：
 *   1. 驗 capability + workspace
 *   2. 取既有 disbursement_order_items
 *   3. diff 算 add / remove
 *   4. remove 的 disbursement_order_items DELETE、對應 payment_requests.disbursement_order_id 清掉 + status 改回 pending
 *   5. add 的 items 走 fork（若 partial）+ INSERT disbursement_order_items + 設 payment_requests link
 *   6. 重算 amount、更新 metadata、重算 fee 分攤
 *
 * 子模組：
 *   - disbursement-id-validation.ts  — body 驗證 / workspace cross-check / fee 計算
 *   - disbursement-id-queries.ts     — 所有 DB 查詢 helpers（每個 function 自建 admin client）
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireCapability } from '@/lib/auth/require-capability'
import { CAPABILITIES } from '@/lib/permissions/capabilities'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { recordApiAuditContext } from '@/lib/audit/audit-helper'
import { translateDbError, dbErrorResponse } from '@/lib/db-error-translate'
import {
  validatePatchBody,
  checkCrossWorkspaceItems,
  checkOccupiedByOthers,
  type ItemRow,
} from './disbursement-id-validation'
import {
  fetchDisbursementOrder,
  fetchExistingDoiItems,
  fetchAddedItems,
  fetchOccupiedDoi,
  fetchFinalItems,
  fetchSuppliers,
  fetchBankAccounts,
  fetchEmployeeBanks,
  fetchPaymentMethodKinds,
  fetchWorkspaceFeeMode,
  deleteRemovedDoiItems,
  fetchAllItemsInRequests,
  countRemainingDoiForRequest,
  clearPaymentRequestLink,
  forkPaymentRequest,
  insertDoiItems,
  updateDoiItemFee,
  linkPaymentRequestsToDisbursement,
  fetchDoiFinalAmount,
  updateDisbursementOrder,
} from './disbursement-id-queries'
import { computeBatchFees } from '@/lib/disbursement/fee-distribution'

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireCapability(CAPABILITIES.FINANCE_MANAGE_DISBURSEMENT)
  if (!ctx.ok) return ctx.response

  const { id: disbursementId } = await params

  let rawBody: unknown
  try {
    rawBody = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const bodyResult = validatePatchBody(rawBody)
  if (!bodyResult.ok) return bodyResult.response
  const body = bodyResult.body

  const workspaceId = ctx.workspaceId
  const employeeId = ctx.employeeId

  // audit context（recordApiAuditContext 需要 admin client、這裡用一次性的）
  const auditAdmin = getSupabaseAdminClient()
  await recordApiAuditContext(auditAdmin, {
    actorId: employeeId,
    reason: '編輯出納單',
    requestId: disbursementId,
  })

  // ─── 取既有 disbursement_order + 驗 workspace ───
  const order = await fetchDisbursementOrder(disbursementId)
  if (!order) {
    return NextResponse.json({ error: '出納單不存在' }, { status: 404 })
  }
  if (order.workspace_id !== workspaceId) {
    return NextResponse.json({ error: '出納單不屬於目前工作空間' }, { status: 403 })
  }
  if (order.status !== 'pending') {
    return NextResponse.json({ error: '已出帳的出納單不能編輯' }, { status: 400 })
  }

  // ─── 把 batches 攤平成 item → from_bank_account_id 對照 ───
  const itemBankMap = new Map<string, string>()
  for (const b of body.batches) {
    for (const itemId of b.payment_request_item_ids) itemBankMap.set(itemId, b.from_bank_account_id)
  }

  // ─── 取既有 disbursement_order_items + 算 diff ───
  const existingDoi = await fetchExistingDoiItems(disbursementId)
  const existingItemIds = new Set(existingDoi.map(d => d.payment_request_item_id))
  const newItemIds = new Set(itemBankMap.keys())

  const removedItemIds = [...existingItemIds].filter(id => !newItemIds.has(id))
  const addedItemIds = [...newItemIds].filter(id => !existingItemIds.has(id))
  const keptItemIds = [...newItemIds].filter(id => existingItemIds.has(id))

  // ─── 驗 added items workspace + 未被其他 disbursement 占用 ───
  if (addedItemIds.length > 0) {
    const addedItems = await fetchAddedItems(addedItemIds)
    if (!addedItems || addedItems.length !== addedItemIds.length) {
      return NextResponse.json({ error: '部分新增品項不存在' }, { status: 400 })
    }
    const wsError = checkCrossWorkspaceItems(addedItems, workspaceId)
    if (wsError) return wsError

    const occupiedDoi = await fetchOccupiedDoi(addedItemIds)
    const occupiedError = checkOccupiedByOthers(occupiedDoi, disbursementId)
    if (occupiedError) return occupiedError
  }

  // ─── 取所有最終會在這張單裡的 items 細節（kept + added）算 amount / fee ───
  const finalItemIds = [...keptItemIds, ...addedItemIds]
  const finalItems = await fetchFinalItems(finalItemIds)
  const finalItemsMap = new Map(finalItems.map((i: ItemRow) => [i.id, i]))

  // ─── 撈手續費算法（computeBatchFees / SSOT、與 batch-create 共用）需要的 lookup ───
  const supplierIds = Array.from(
    new Set(finalItems.map((i: ItemRow) => i.supplier_id).filter(Boolean) as string[])
  )
  const supplierRows = await fetchSuppliers(supplierIds)
  const supplierBankById = new Map(supplierRows.map(s => [s.id, s.bank_code]))

  const employeeIds = Array.from(
    new Set(
      finalItems
        .flatMap((i: ItemRow) => [i.advanced_by, i.payee_employee_id])
        .filter(Boolean) as string[]
    )
  )
  const employeeBankById = await fetchEmployeeBanks(employeeIds)

  const paymentMethodIds = Array.from(
    new Set(finalItems.map((i: ItemRow) => i.payment_method_id).filter(Boolean) as string[])
  )
  const pmKindById = await fetchPaymentMethodKinds(paymentMethodIds)

  // 各 batch 的出帳帳戶 bank_code + cross_bank_fee（多 batch）+ workspace 驗證
  const bankAccountIds = Array.from(new Set(body.batches.map(b => b.from_bank_account_id)))
  const banks = await fetchBankAccounts(bankAccountIds)
  if (banks.length !== bankAccountIds.length) {
    return NextResponse.json({ error: '部分出帳帳戶不存在' }, { status: 400 })
  }
  const crossWsBank = banks.find(b => b.workspace_id !== workspaceId)
  if (crossWsBank) {
    return NextResponse.json({ error: '出帳帳戶不屬於目前工作空間' }, { status: 403 })
  }
  const bankCodeById = new Map(banks.map(b => [b.id, b.bank_code]))
  const bankFeeById = new Map(banks.map(b => [b.id, Number(b.cross_bank_fee ?? 0)]))
  const feeMode = await fetchWorkspaceFeeMode(workspaceId)

  // ─── 移除：刪 disbursement_order_items + 清舊 link ───
  if (removedItemIds.length > 0) {
    const { error: delErr } = await deleteRemovedDoiItems(disbursementId, removedItemIds)
    if (delErr) {
      const t = translateDbError(delErr)
      return NextResponse.json({ error: `刪除品項失敗：${t.message}` }, { status: t.httpStatus })
    }

    // 找被移除 items 的 request_id
    const removedItemDetails = await fetchFinalItems(removedItemIds)
    const affectedReqIds = Array.from(new Set(removedItemDetails.map(r => r.request_id)))

    for (const reqId of affectedReqIds) {
      const itemsInReq = await fetchAllItemsInRequests([reqId])
      const itemIdsInReq = itemsInReq.map(r => r.id)
      if (itemIdsInReq.length === 0) continue

      const remaining = await countRemainingDoiForRequest(disbursementId, itemIdsInReq)
      if (remaining === 0) {
        await clearPaymentRequestLink(reqId)
      }
    }
  }

  // ─── 新增：fork partial（被選 item 的 request_id 改成 fork 後新 id）───
  if (addedItemIds.length > 0) {
    const addedReqIds = Array.from(
      new Set(addedItemIds.map(id => finalItemsMap.get(id)!.request_id))
    )

    const allItemsInReqs = await fetchAllItemsInRequests(addedReqIds)
    const itemsByReq = new Map<string, string[]>()
    for (const r of allItemsInReqs) {
      const arr = itemsByReq.get(r.request_id) ?? []
      arr.push(r.id)
      itemsByReq.set(r.request_id, arr)
    }

    for (const reqId of addedReqIds) {
      const selectedInReq = addedItemIds.filter(id => finalItemsMap.get(id)?.request_id === reqId)
      const allInReq = itemsByReq.get(reqId) ?? []
      const isPartial = selectedInReq.length > 0 && selectedInReq.length < allInReq.length

      if (!isPartial) continue

      const { newReqId, error: forkErr } = await forkPaymentRequest(
        reqId,
        selectedInReq,
        employeeId
      )
      if (forkErr || !newReqId) {
        return dbErrorResponse(forkErr)
      }
      for (const itemId of selectedInReq) {
        const it = finalItemsMap.get(itemId)
        if (it) it.request_id = newReqId
      }
    }
  }

  // ─── 手續費自動算（per batch、走 computeBatchFees SSOT）+ 寫 DOI ───
  // 每個 batch 獨立算（fromBankCode / cross_bank_fee per batch）、再依 add/kept 決定 INSERT or UPDATE。
  let grandTotalFee = 0
  const addedSet = new Set(addedItemIds)
  for (const batch of body.batches) {
    const fromBankCode = bankCodeById.get(batch.from_bank_account_id) ?? null
    const batchItems = batch.payment_request_item_ids
      .map(id => finalItemsMap.get(id))
      .filter((i): i is ItemRow => Boolean(i))

    const { perItem, total_fee: batchFee } = computeBatchFees(
      batchItems.map(item => ({
        id: item.id,
        amount: Number(item.subtotal ?? 0),
        supplier_id: item.supplier_id,
        advanced_by: item.advanced_by,
        payee_employee_id: item.payee_employee_id,
        payment_method_id: item.payment_method_id,
      })),
      {
        fromBankCode,
        fromBankUnifiedAmount: bankFeeById.get(batch.from_bank_account_id) ?? 0,
        supplierBankById,
        employeeBankById,
        pmKindById,
        feeMode,
      }
    )
    grandTotalFee += batchFee

    // INSERT added items（帶 from_bank_account_id + 自動算的 fee）
    const insertRows = batchItems
      .filter(item => addedSet.has(item.id))
      .map(item => {
        const fee = perItem.get(item.id)!
        return {
          disbursement_order_id: disbursementId,
          payment_request_item_id: item.id,
          from_bank_account_id: batch.from_bank_account_id,
          amount: Number(item.subtotal ?? 0),
          supplier_bank_code: fee.supplier_bank_code,
          fee_amount: fee.fee_amount,
          has_cross_bank_fee: fee.is_cross_bank,
          workspace_id: workspaceId,
          created_by: employeeId,
        }
      })
    if (insertRows.length > 0) {
      const { error: insErr } = await insertDoiItems(insertRows)
      if (insErr) {
        const t2 = translateDbError(insErr)
        return NextResponse.json(
          { error: `新增品項失敗：${t2.message}` },
          { status: t2.httpStatus }
        )
      }
    }

    // UPDATE kept items（重算 fee + has_cross_bank + from_bank_account_id 可能被改）
    for (const item of batchItems) {
      if (addedSet.has(item.id)) continue
      const fee = perItem.get(item.id)!
      await updateDoiItemFee(
        disbursementId,
        item.id,
        fee.fee_amount,
        fee.is_cross_bank,
        batch.from_bank_account_id
      )
    }
  }

  // 把 added items 的 payment_requests link 到本 disbursement（含 fork 後新 id）
  if (addedItemIds.length > 0) {
    const finalAddedReqIds = Array.from(
      new Set(addedItemIds.map(id => finalItemsMap.get(id)!.request_id))
    )
    await linkPaymentRequestsToDisbursement(finalAddedReqIds, disbursementId)
  }

  // ─── UPDATE disbursement_order metadata + 重算 amount + total_fee（自動算）───
  const finalAmount = await fetchDoiFinalAmount(disbursementId)

  const orderUpdate: Record<string, unknown> = { amount: finalAmount, total_fee: grandTotalFee }
  if (body.disbursement_date !== undefined) orderUpdate.disbursement_date = body.disbursement_date
  if (body.payment_method_id !== undefined) orderUpdate.payment_method_id = body.payment_method_id
  // Phase 7 對齊 batch-create：多 batch → order.bank_account_id 設 null（由 DOI 各帶 from_bank_account_id）；
  // 單一 batch → 設該帳戶（向下相容舊報表）
  orderUpdate.bank_account_id = bankAccountIds.length === 1 ? bankAccountIds[0] : null

  // ── 紅線 D guard：檢查 disbursement_date 所屬區間是否已關帳 ──
  if (body.disbursement_date !== undefined) {
    const periodName = body.disbursement_date.substring(0, 7) // "2026-05"
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: period } = await (auditAdmin as any)
      .from('accounting_periods')
      .select('id, period_name, is_closed, closed_at')
      .eq('workspace_id', workspaceId)
      .eq('period_name', periodName)
      .maybeSingle()

    if (period && period.is_closed) {
      return NextResponse.json(
        { error: `此區間（${periodName}）已關帳、不能修改出納單日期`, code: 'PERIOD_CLOSED' },
        { status: 409 }
      )
    }
  }
  // ── END 紅線 D guard ───────────────────────────────────────────

  const { error: ordErr } = await updateDisbursementOrder(disbursementId, orderUpdate)
  if (ordErr) {
    const t3 = translateDbError(ordErr)
    return NextResponse.json({ error: `更新出納單失敗：${t3.message}` }, { status: t3.httpStatus })
  }

  return NextResponse.json({
    ok: true,
    disbursement_id: disbursementId,
    final_amount: finalAmount,
    added: addedItemIds.length,
    removed: removedItemIds.length,
    kept: keptItemIds.length,
  })
}
