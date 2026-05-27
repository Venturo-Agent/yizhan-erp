/**
 * /api/disbursement/[id] — DB 查詢 helpers
 *
 * 從 route.ts 抽出所有 Supabase query helper functions。
 * 每個 function 只做單一 DB 查詢、讓 route.ts 專注協調流程。
 */

import { randomUUID } from 'crypto'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import type { ItemRow, DoiRow } from './disbursement-id-validation'

// ============================================================================
// 本地型別（DB 回傳精簡欄位）
// ============================================================================

interface DisbursementOrder {
  id: string
  workspace_id: string | null
  status: string | null
  bank_account_id: string | null
  total_fee: number | null
}

interface SupplierRow {
  id: string
  bank_code: string | null
}

// ============================================================================
// 查詢函數（使用 typed Supabase client、不用 as any）
// ============================================================================

export async function fetchDisbursementOrder(
  disbursementId: string
): Promise<DisbursementOrder | null> {
  const admin = getSupabaseAdminClient()
  type OrderFetchChain = {
    select: (c: string) => {
      eq: (
        k: string,
        v: string
      ) => {
        maybeSingle: () => Promise<{ data: DisbursementOrder | null }>
      }
    }
  }
  const { data } = await (admin.from as unknown as (t: string) => OrderFetchChain)(
    'disbursement_orders'
  )
    .select('id, workspace_id, status, bank_account_id, total_fee')
    .eq('id', disbursementId)
    .maybeSingle()
  return data ?? null
}

export async function fetchExistingDoiItems(disbursementId: string): Promise<DoiRow[]> {
  const admin = getSupabaseAdminClient()
  type DoiListChain = {
    select: (c: string) => {
      eq: (k: string, v: string) => Promise<{ data: DoiRow[] | null }>
    }
  }
  const { data } = await (admin.from as unknown as (t: string) => DoiListChain)(
    'disbursement_order_items'
  )
    .select('id, payment_request_item_id')
    .eq('disbursement_order_id', disbursementId)
  return data ?? []
}

export async function fetchAddedItems(addedItemIds: string[]): Promise<ItemRow[] | null> {
  const admin = getSupabaseAdminClient()
  type ItemFetchChain = {
    select: (c: string) => {
      in: (k: string, v: string[]) => Promise<{ data: ItemRow[] | null }>
    }
  }
  const { data } = await (admin.from as unknown as (t: string) => ItemFetchChain)(
    'payment_request_items'
  )
    .select(
      'id, request_id, subtotal, supplier_id, workspace_id, advanced_by, payee_employee_id, payment_method_id'
    )
    .in('id', addedItemIds)
  return data ?? null
}

export async function fetchOccupiedDoi(
  addedItemIds: string[]
): Promise<{ payment_request_item_id: string; disbursement_order_id: string }[]> {
  const admin = getSupabaseAdminClient()
  type DoiCheckChain = {
    select: (c: string) => {
      in: (
        k: string,
        v: string[]
      ) => Promise<{
        data: { payment_request_item_id: string; disbursement_order_id: string }[] | null
      }>
    }
  }
  const { data } = await (admin.from as unknown as (t: string) => DoiCheckChain)(
    'disbursement_order_items'
  )
    .select('payment_request_item_id, disbursement_order_id')
    .in('payment_request_item_id', addedItemIds)
  return data ?? []
}

export async function fetchFinalItems(finalItemIds: string[]): Promise<ItemRow[]> {
  const admin = getSupabaseAdminClient()
  const safeIds = finalItemIds.length > 0 ? finalItemIds : ['00000000-0000-0000-0000-000000000000']
  type FinalItemChain = {
    select: (c: string) => {
      in: (k: string, v: string[]) => Promise<{ data: ItemRow[] | null }>
    }
  }
  const { data } = await (admin.from as unknown as (t: string) => FinalItemChain)(
    'payment_request_items'
  )
    .select(
      'id, request_id, subtotal, supplier_id, workspace_id, advanced_by, payee_employee_id, payment_method_id'
    )
    .in('id', safeIds)
  return data ?? []
}

export async function fetchSuppliers(supplierIds: string[]): Promise<SupplierRow[]> {
  if (supplierIds.length === 0) return []
  const admin = getSupabaseAdminClient()
  type SupChain = {
    select: (c: string) => {
      in: (k: string, v: string[]) => Promise<{ data: SupplierRow[] | null }>
    }
  }
  const { data } = await (admin.from as unknown as (t: string) => SupChain)('suppliers')
    .select('id, bank_code')
    .in('id', supplierIds)
  return data ?? []
}

// 多帳戶一次撈 bank_code + cross_bank_fee + workspace（編輯多 batch 用）
export async function fetchBankAccounts(bankAccountIds: string[]): Promise<
  {
    id: string
    bank_code: string | null
    workspace_id: string | null
    cross_bank_fee: number | null
  }[]
> {
  if (bankAccountIds.length === 0) return []
  const admin = getSupabaseAdminClient()
  type BankChain = {
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
  const { data } = await (admin.from as unknown as (t: string) => BankChain)('bank_accounts')
    .select('id, bank_code, workspace_id, cross_bank_fee')
    .in('id', bankAccountIds)
  return data ?? []
}

// 收款對象若是員工（代墊 advanced_by / 公司請款 payee_employee_id）、拿員工真實銀行判同行。
export async function fetchEmployeeBanks(
  employeeIds: string[]
): Promise<Map<string, string | null>> {
  const result = new Map<string, string | null>()
  if (employeeIds.length === 0) return result
  const admin = getSupabaseAdminClient()
  type EmpChain = {
    select: (c: string) => {
      in: (
        k: string,
        v: string[]
      ) => Promise<{ data: { id: string; bank_code: string | null }[] | null }>
    }
  }
  const { data } = await (admin.from as unknown as (t: string) => EmpChain)('employees')
    .select('id, bank_code')
    .in('id', employeeIds)
  for (const e of data ?? []) result.set(e.id, e.bank_code)
  return result
}

// 撈 payment_methods.kind（cash / check 不收跨行手續費）
export async function fetchPaymentMethodKinds(
  paymentMethodIds: string[]
): Promise<Map<string, string | null>> {
  const result = new Map<string, string | null>()
  if (paymentMethodIds.length === 0) return result
  const admin = getSupabaseAdminClient()
  type PmChain = {
    select: (c: string) => {
      in: (
        k: string,
        v: string[]
      ) => Promise<{ data: { id: string; kind: string | null }[] | null }>
    }
  }
  const { data } = await (admin.from as unknown as (t: string) => PmChain)('payment_methods')
    .select('id, kind')
    .in('id', paymentMethodIds)
  for (const pm of data ?? []) result.set(pm.id, pm.kind)
  return result
}

// 公司分攤模式（average / unified）— 對齊 batch-create
export async function fetchWorkspaceFeeMode(workspaceId: string): Promise<'average' | 'unified'> {
  const admin = getSupabaseAdminClient()
  type WsChain = {
    select: (c: string) => {
      eq: (
        k: string,
        v: string
      ) => {
        maybeSingle: () => Promise<{ data: { transfer_fee_mode: string | null } | null }>
      }
    }
  }
  const { data } = await (admin.from as unknown as (t: string) => WsChain)('workspaces')
    .select('transfer_fee_mode')
    .eq('id', workspaceId)
    .maybeSingle()
  return data?.transfer_fee_mode === 'unified' ? 'unified' : 'average'
}

export async function deleteRemovedDoiItems(
  disbursementId: string,
  removedItemIds: string[]
): Promise<{ error: { message?: string } | null }> {
  const admin = getSupabaseAdminClient()
  type DoiDelChain = {
    delete: () => {
      eq: (
        k: string,
        v: string
      ) => {
        in: (k2: string, v2: string[]) => Promise<{ error: { message?: string } | null }>
      }
    }
  }
  return (admin.from as unknown as (t: string) => DoiDelChain)('disbursement_order_items')
    .delete()
    .eq('disbursement_order_id', disbursementId)
    .in('payment_request_item_id', removedItemIds)
}

export async function fetchAllItemsInRequests(
  reqIds: string[]
): Promise<{ id: string; request_id: string }[]> {
  if (reqIds.length === 0) return []
  const admin = getSupabaseAdminClient()
  type AllItemsChain = {
    select: (c: string) => {
      in: (
        k: string,
        v: string[]
      ) => Promise<{
        data: { id: string; request_id: string }[] | null
      }>
    }
  }
  const { data } = await (admin.from as unknown as (t: string) => AllItemsChain)(
    'payment_request_items'
  )
    .select('id, request_id')
    .in('request_id', reqIds)
  return data ?? []
}

export async function countRemainingDoiForRequest(
  disbursementId: string,
  itemIdsInReq: string[]
): Promise<number> {
  if (itemIdsInReq.length === 0) return 0
  const admin = getSupabaseAdminClient()
  type RemainChain = {
    select: (
      c: string,
      opts: { count: 'exact'; head: true }
    ) => {
      eq: (
        k: string,
        v: string
      ) => {
        in: (k2: string, v2: string[]) => Promise<{ count: number | null }>
      }
    }
  }
  const { count } = await (admin.from as unknown as (t: string) => RemainChain)(
    'disbursement_order_items'
  )
    .select('id', { count: 'exact', head: true })
    .eq('disbursement_order_id', disbursementId)
    .in('payment_request_item_id', itemIdsInReq)
  return count ?? 0
}

export async function clearPaymentRequestLink(reqId: string): Promise<void> {
  const admin = getSupabaseAdminClient()
  type ReqUpdChain = {
    update: (v: Record<string, unknown>) => {
      eq: (k: string, v: string) => Promise<{ error: { message?: string } | null }>
    }
  }
  await (admin.from as unknown as (t: string) => ReqUpdChain)('payment_requests')
    .update({ disbursement_order_id: null, status: 'pending' })
    .eq('id', reqId)
}

export async function forkPaymentRequest(
  reqId: string,
  selectedItemIds: string[],
  employeeId: string
): Promise<{ newReqId: string | null; error: { message?: string } | null }> {
  const admin = getSupabaseAdminClient()
  type RpcChain = (
    fn: string,
    args: Record<string, unknown>
  ) => Promise<{ data: string | null; error: { message?: string } | null }>
  const { data: newReqId, error: forkErr } = await (admin.rpc as unknown as RpcChain)(
    'fork_payment_request_for_partial_billing',
    { p_request_id: reqId, p_item_ids: selectedItemIds, p_actor_id: employeeId }
  )
  return { newReqId: newReqId ?? null, error: forkErr ?? null }
}

export async function insertDoiItems(
  rows: {
    disbursement_order_id: string
    payment_request_item_id: string
    from_bank_account_id: string
    amount: number
    supplier_bank_code: string | null
    fee_amount: number
    has_cross_bank_fee: boolean
    workspace_id: string
    created_by: string
  }[]
): Promise<{ error: { message?: string } | null }> {
  const admin = getSupabaseAdminClient()
  const insertRows = rows.map(r => ({ ...r, id: randomUUID() }))
  type DoiInsChain = {
    insert: (rows: Record<string, unknown>[]) => Promise<{ error: { message?: string } | null }>
  }
  return (admin.from as unknown as (t: string) => DoiInsChain)('disbursement_order_items').insert(
    insertRows
  )
}

export async function updateDoiItemFee(
  disbursementId: string,
  itemId: string,
  feeAmount: number,
  hasCrossBank: boolean,
  fromBankAccountId: string
): Promise<void> {
  const admin = getSupabaseAdminClient()
  type DoiUpdChain = {
    update: (v: Record<string, unknown>) => {
      eq: (
        k: string,
        v: string
      ) => {
        eq: (k2: string, v2: string) => Promise<{ error: { message?: string } | null }>
      }
    }
  }
  await (admin.from as unknown as (t: string) => DoiUpdChain)('disbursement_order_items')
    .update({
      fee_amount: feeAmount,
      has_cross_bank_fee: hasCrossBank,
      from_bank_account_id: fromBankAccountId,
    })
    .eq('disbursement_order_id', disbursementId)
    .eq('payment_request_item_id', itemId)
}

export async function linkPaymentRequestsToDisbursement(
  reqIds: string[],
  disbursementId: string
): Promise<void> {
  if (reqIds.length === 0) return
  const admin = getSupabaseAdminClient()
  type ReqLinkChain = {
    update: (v: Record<string, unknown>) => {
      in: (k: string, v: string[]) => Promise<{ error: { message?: string } | null }>
    }
  }
  await (admin.from as unknown as (t: string) => ReqLinkChain)('payment_requests')
    .update({ disbursement_order_id: disbursementId, status: 'confirmed' })
    .in('id', reqIds)
}

export async function fetchDoiFinalAmount(disbursementId: string): Promise<number> {
  const admin = getSupabaseAdminClient()
  type SumChain = {
    select: (c: string) => {
      eq: (k: string, v: string) => Promise<{ data: { amount: number | null }[] | null }>
    }
  }
  const { data } = await (admin.from as unknown as (t: string) => SumChain)(
    'disbursement_order_items'
  )
    .select('amount')
    .eq('disbursement_order_id', disbursementId)
  return ((data ?? []) as { amount: number | null }[]).reduce(
    (s, r) => s + Number(r.amount ?? 0),
    0
  )
}

export async function updateDisbursementOrder(
  disbursementId: string,
  patch: Record<string, unknown>
): Promise<{ error: { message?: string } | null }> {
  const admin = getSupabaseAdminClient()
  type OrderUpdChain = {
    update: (v: Record<string, unknown>) => {
      eq: (k: string, v: string) => Promise<{ error: { message?: string } | null }>
    }
  }
  return (admin.from as unknown as (t: string) => OrderUpdChain)('disbursement_orders')
    .update(patch)
    .eq('id', disbursementId)
}
