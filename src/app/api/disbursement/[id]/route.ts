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
import { getApiContext } from '@/lib/auth/get-api-context'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { recordApiAuditContext } from '@/lib/audit/audit-helper'
import { translateDbError } from '@/lib/db-error-translate'
import {
  validatePatchBody,
  checkCrossWorkspaceItems,
  checkOccupiedByOthers,
  computeFeeShares,
  type FeeAllocationItem,
  type ItemRow,
} from './disbursement-id-validation'
import {
  fetchDisbursementOrder,
  fetchExistingDoiItems,
  fetchAddedItems,
  fetchOccupiedDoi,
  fetchFinalItems,
  fetchSuppliers,
  fetchBankAccount,
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

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await getApiContext({ capabilityCode: 'finance.disbursement.write' })
  if (!ctx.ok) {
    return NextResponse.json({ error: ctx.error }, { status: ctx.status })
  }

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

  const workspaceId = ctx.workspace_id
  const employeeId = ctx.employee_id

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

  // ─── 取既有 disbursement_order_items + 算 diff ───
  const existingDoi = await fetchExistingDoiItems(disbursementId)
  const existingItemIds = new Set(existingDoi.map(d => d.payment_request_item_id))
  const newItemIds = new Set(body.item_ids)

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

  // 取 supplier bank_code（算 cross-bank）
  const supplierIds = Array.from(
    new Set(finalItems.map((i: ItemRow) => i.supplier_id).filter(Boolean) as string[]),
  )
  const supplierRows = await fetchSuppliers(supplierIds)
  const supplierMap = new Map(supplierRows.map(s => [s.id, s.bank_code]))

  // bank_code of from bank
  const targetBankId = body.from_bank_account_id ?? order.bank_account_id
  let fromBankCode: string | null = null
  if (targetBankId) {
    const bank = await fetchBankAccount(targetBankId)
    if (bank && bank.workspace_id !== workspaceId) {
      return NextResponse.json({ error: '出帳帳戶不屬於目前工作空間' }, { status: 403 })
    }
    fromBankCode = bank?.bank_code ?? null
  }

  // ─── 移除：刪 disbursement_order_items + 清舊 link ───
  if (removedItemIds.length > 0) {
    const { error: delErr } = await deleteRemovedDoiItems(disbursementId, removedItemIds)
    if (delErr) {
      const t = translateDbError(delErr)
      return NextResponse.json({ error: `刪除品項失敗：${t.message}` }, { status: t.httpStatus })
    }

    // 找被移除 items 的 request_id
    // fetchFinalItems 接受 item ids、回傳含 request_id 欄位
    const removedItemDetails = await fetchFinalItems(removedItemIds)
    const affectedReqIds = Array.from(new Set(removedItemDetails.map(r => r.request_id)))

    for (const reqId of affectedReqIds) {
      // 取該 request 下所有 item id
      const itemsInReq = await fetchAllItemsInRequests([reqId])
      const itemIdsInReq = itemsInReq.map(r => r.id)
      if (itemIdsInReq.length === 0) continue

      // 看還剩幾筆 link 本 disbursement
      const remaining = await countRemainingDoiForRequest(disbursementId, itemIdsInReq)
      if (remaining === 0) {
        await clearPaymentRequestLink(reqId)
      }
    }
  }

  // ─── 新增：fork partial + INSERT disbursement_order_items + 設舊 link ───
  if (addedItemIds.length > 0) {
    const addedReqIds = Array.from(
      new Set(addedItemIds.map(id => finalItemsMap.get(id)!.request_id)),
    )

    const allItemsInReqs = await fetchAllItemsInRequests(addedReqIds)
    const itemsByReq = new Map<string, string[]>()
    for (const r of allItemsInReqs) {
      const arr = itemsByReq.get(r.request_id) ?? []
      arr.push(r.id)
      itemsByReq.set(r.request_id, arr)
    }

    // fork partial
    for (const reqId of addedReqIds) {
      const selectedInReq = addedItemIds.filter(
        id => finalItemsMap.get(id)?.request_id === reqId,
      )
      const allInReq = itemsByReq.get(reqId) ?? []
      const isPartial = selectedInReq.length > 0 && selectedInReq.length < allInReq.length

      if (!isPartial) continue

      const { newReqId, error: forkErr } = await forkPaymentRequest(
        reqId, selectedInReq, employeeId
      )
      if (forkErr || !newReqId) {
        const t = translateDbError(forkErr)
        return NextResponse.json({ error: t.message }, { status: t.httpStatus })
      }
      // fork 後被選 item 的 request_id 變 new
      for (const itemId of selectedInReq) {
        const it = finalItemsMap.get(itemId)
        if (it) it.request_id = newReqId
      }
    }

    // 算分攤（整張單級、kept + added 一起算）
    const buildFeeItem = (id: string): FeeAllocationItem => {
      const item = finalItemsMap.get(id)!
      const supplierBankCode = item.supplier_id ? supplierMap.get(item.supplier_id) ?? null : null
      const isCross = !supplierBankCode || !fromBankCode || supplierBankCode !== fromBankCode
      return {
        id: item.id,
        subtotal: item.subtotal,
        supplier_id: item.supplier_id,
        supplier_bank_code: supplierBankCode,
        is_cross_bank: isCross,
      }
    }

    const allItemsForFee = [
      ...keptItemIds.map(buildFeeItem),
      ...addedItemIds.map(buildFeeItem),
    ]

    const totalFee = body.total_fee ?? order.total_fee ?? 0
    const feeDistribution = body.fee_distribution ?? 'proportional'
    const feeShares = computeFeeShares(allItemsForFee, totalFee, feeDistribution)

    // INSERT new disbursement_order_items
    const addedItemsForFee = addedItemIds.map(buildFeeItem)
    if (addedItemsForFee.length > 0) {
      const insertRows = addedItemsForFee.map(d => ({
        disbursement_order_id: disbursementId,
        payment_request_item_id: d.id,
        amount: Number(finalItemsMap.get(d.id)?.subtotal ?? 0),
        supplier_bank_code: d.supplier_bank_code,
        fee_amount: feeShares.get(d.id) ?? 0,
        has_cross_bank_fee: d.is_cross_bank,
        workspace_id: workspaceId,
        created_by: employeeId,
      }))
      const { error: insErr } = await insertDoiItems(insertRows)
      if (insErr) {
        const t2 = translateDbError(insErr)
      return NextResponse.json({ error: `新增品項失敗：${t2.message}` }, { status: t2.httpStatus })
      }
    }

    // UPDATE kept items 的 fee_amount + has_cross_bank_fee（user 可能改 total_fee）
    const keptItemsForFee = keptItemIds.map(buildFeeItem)
    for (const d of keptItemsForFee) {
      await updateDoiItemFee(
        disbursementId, d.id,
        feeShares.get(d.id) ?? 0,
        d.is_cross_bank
      )
    }

    // 把 added items 的 payment_requests link 到本 disbursement（含 fork 後新 id）
    const finalAddedReqIds = Array.from(
      new Set(addedItemIds.map(id => finalItemsMap.get(id)!.request_id)),
    )
    await linkPaymentRequestsToDisbursement(finalAddedReqIds, disbursementId)
  }

  // ─── UPDATE disbursement_order metadata + 重算 amount ───
  const finalAmount = await fetchDoiFinalAmount(disbursementId)

  const orderUpdate: Record<string, unknown> = { amount: finalAmount }
  if (body.disbursement_date !== undefined) orderUpdate.disbursement_date = body.disbursement_date
  if (body.payment_method_id !== undefined) orderUpdate.payment_method_id = body.payment_method_id
  if (body.from_bank_account_id !== undefined) orderUpdate.bank_account_id = body.from_bank_account_id
  if (body.total_fee !== undefined) orderUpdate.total_fee = body.total_fee

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
