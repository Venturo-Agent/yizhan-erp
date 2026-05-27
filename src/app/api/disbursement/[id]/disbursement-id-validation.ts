/**
 * /api/disbursement/[id] — 驗證邏輯
 *
 * 從 route.ts 抽出：body 驗證 + workspace 安全檢查
 */

import { NextResponse } from 'next/server'

// ============================================================================
// types
// ============================================================================

/**
 * 編輯 batch（對齊 batch-create 的 BatchInput）：一個 from_bank_account 對一組品項。
 * 2026-05-27：編輯改成跟新增一樣多 batch（依 from_bank_account_id 分組），手續費由後端自動算。
 */
export interface PatchBatch {
  from_bank_account_id: string
  payment_request_item_ids: string[]
}

export interface PatchBody {
  disbursement_date?: string
  payment_method_id?: string | null
  /** 新版：依出帳帳戶分組的 batches（編輯與新增共用） */
  batches: PatchBatch[]
}

export interface ItemRow {
  id: string
  request_id: string
  subtotal: number | null
  supplier_id: string | null
  workspace_id: string | null
  // 2026-05-27：手續費算法（computeBatchFees）需要收款對象真實銀行 + 付款方式 kind
  advanced_by: string | null
  payee_employee_id: string | null
  payment_method_id: string | null
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
  if (!Array.isArray(body.batches)) {
    return {
      ok: false,
      response: NextResponse.json({ error: '缺少 batches' }, { status: 400 }),
    }
  }
  for (const b of body.batches) {
    if (!b?.from_bank_account_id || !Array.isArray(b.payment_request_item_ids)) {
      return {
        ok: false,
        response: NextResponse.json(
          { error: 'batch 缺 from_bank_account_id 或 payment_request_item_ids' },
          { status: 400 }
        ),
      }
    }
  }
  // 同一品項不能跨 batch 重複
  const allIds = body.batches.flatMap(b => b.payment_request_item_ids)
  if (new Set(allIds).size !== allIds.length) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: '同一品項出現在多個 batch、請檢查勾選' },
        { status: 400 }
      ),
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

// 手續費算法已收進 @/lib/disbursement/fee-distribution.ts 的 computeBatchFees（SSOT、與 batch-create 共用）。
// 2026-05-27 移除此處舊的 computeFeeShares（手填 total_fee + 只看供應商銀行、有代墊 bug）。
