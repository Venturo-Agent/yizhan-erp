/**
 * /api/disbursement/[id] — 驗證邏輯
 *
 * 從 route.ts 抽出：body 驗證 + workspace 安全檢查
 */

import { NextResponse } from 'next/server'

// ============================================================================
// types
// ============================================================================

export interface PatchBody {
  disbursement_date?: string
  payment_method_id?: string | null
  from_bank_account_id?: string
  total_fee?: number
  fee_distribution?: 'equal' | 'proportional'
  item_ids: string[]
}

export interface ItemRow {
  id: string
  request_id: string
  subtotal: number | null
  supplier_id: string | null
  workspace_id: string | null
}

export interface DoiRow {
  id: string
  payment_request_item_id: string
}

// ============================================================================
// body validation
// ============================================================================

export function validatePatchBody(
  raw: unknown
): { ok: true; body: PatchBody } | { ok: false; response: NextResponse } {
  const body = raw as PatchBody
  if (!Array.isArray(body.item_ids)) {
    return {
      ok: false,
      response: NextResponse.json({ error: '缺少 item_ids' }, { status: 400 }),
    }
  }
  return { ok: true, body }
}

// ============================================================================
// workspace cross-check helpers（純邏輯、不做 DB 查詢）
// ============================================================================

export function checkCrossWorkspaceItems(
  items: ItemRow[],
  workspaceId: string
): NextResponse | null {
  const crossWs = items.find(i => i.workspace_id !== workspaceId)
  if (crossWs) {
    return NextResponse.json({ error: '部分新增品項不屬於目前工作空間' }, { status: 403 })
  }
  return null
}

export function checkOccupiedByOthers(
  occupiedDoi: { payment_request_item_id: string; disbursement_order_id: string }[],
  disbursementId: string
): NextResponse | null {
  const occupiedByOthers = occupiedDoi.filter(d => d.disbursement_order_id !== disbursementId)
  if (occupiedByOthers.length > 0) {
    return NextResponse.json(
      {
        error: `${occupiedByOthers.length} 筆品項已被其他出納單佔用、請重新整理`,
        conflicting_item_ids: occupiedByOthers.map(d => d.payment_request_item_id),
      },
      { status: 409 }
    )
  }
  return null
}

// ============================================================================
// fee allocation（純計算、無 side effect）
// ============================================================================

export interface FeeAllocationItem {
  id: string
  subtotal: number | null
  supplier_id: string | null
  supplier_bank_code: string | null
  is_cross_bank: boolean
}

export function computeFeeShares(
  items: FeeAllocationItem[],
  totalFee: number,
  feeDistribution: 'equal' | 'proportional'
): Map<string, number> {
  const feeShares = new Map<string, number>()
  const crossItems = items.filter(d => d.is_cross_bank)
  const crossTotal = crossItems.reduce((s, d) => s + Number(d.subtotal ?? 0), 0)

  if (totalFee > 0 && crossItems.length > 0) {
    if (feeDistribution === 'equal' || crossTotal === 0) {
      const each = totalFee / crossItems.length
      for (const d of crossItems) feeShares.set(d.id, each)
    } else {
      for (const d of crossItems) {
        feeShares.set(d.id, (Number(d.subtotal ?? 0) / crossTotal) * totalFee)
      }
    }
  }

  return feeShares
}
