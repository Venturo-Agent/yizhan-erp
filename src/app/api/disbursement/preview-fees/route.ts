/**
 * /api/disbursement/preview-fees
 *
 * 出納單新增時、勾選 payment_request_items + 選公司出帳帳戶後、
 * 計算「同行 / 跨行」筆數與金額、給 UI 顯示提示框 + 讓 user 填手續費。
 *
 * 業務邏輯（William 2026-05-14 拍板）：
 * - 公司帳戶 bank_code === 供應商 bank_code → 同行（0 手續費）
 * - 不同 → 跨行（user 自己填手續費、不算同集團例外）
 * - 嚴格按 bank_code、不做集團對應
 *
 * 設計：spec 卡 2026-05-14-出納單品項級重構-spec.md
 */

import { NextRequest, NextResponse } from 'next/server'
import { getApiContext } from '@/lib/auth/get-api-context'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { apiHandler } from '@/lib/api/api-handler'

interface BankAccountRow {
  id: string
  bank_code: string | null
  bank_name: string | null
  name: string | null
  workspace_id: string | null
}

interface ItemRow {
  id: string
  request_id: string
  description: string | null
  subtotal: number | null
  supplier_id: string | null
  supplier_name: string | null
  amount: number | null
  workspace_id: string | null
}

interface SupplierRow {
  id: string
  bank_code: string | null
  bank_name: string | null
}

interface PreviewItem {
  item_id: string
  request_id: string
  description: string
  amount: number
  supplier_id: string | null
  supplier_name: string | null
  supplier_bank_code: string | null
  supplier_bank_name: string | null
  is_cross_bank: boolean
}

interface PreviewResponse {
  from_bank: {
    id: string
    name: string
    bank_code: string | null
    bank_name: string | null
  }
  summary: {
    total_count: number
    same_bank_count: number
    cross_bank_count: number
    total_amount: number
    same_bank_amount: number
    cross_bank_amount: number
  }
  items: PreviewItem[]
}

export const POST = apiHandler(async (request: NextRequest) => {
  const ctx = await getApiContext({ capabilityCode: 'finance.disbursement.write' })
  if (!ctx.ok) {
    return NextResponse.json(
      { error: ctx.status === 401 ? '請先登入' : '無權限' },
      { status: ctx.status }
    )
  }

  const body = await request.json()
  const { from_bank_account_id, payment_request_item_ids } = body as {
    from_bank_account_id?: string
    payment_request_item_ids?: string[]
  }

  if (!from_bank_account_id || !payment_request_item_ids?.length) {
    return NextResponse.json(
      { error: '缺少 from_bank_account_id 或 payment_request_item_ids' },
      { status: 400 }
    )
  }

  const admin = getSupabaseAdminClient()

  // 1. 拿公司出帳帳戶
  type AdminChain = {
    select: (c: string) => {
      eq: (
        k: string,
        v: string
      ) => {
        maybeSingle?: () => Promise<{ data: BankAccountRow | null }>
        in?: (k: string, v: string[]) => Promise<{ data: ItemRow[] | SupplierRow[] | null }>
      }
      in?: (k: string, v: string[]) => Promise<{ data: ItemRow[] | SupplierRow[] | null }>
    }
  }
  const { data: fromBank } = await (
    admin.from as unknown as (t: string) => {
      select: (c: string) => {
        eq: (
          k: string,
          v: string
        ) => {
          maybeSingle: () => Promise<{ data: BankAccountRow | null }>
        }
      }
    }
  )('bank_accounts')
    .select('id, bank_code, bank_name, name, workspace_id')
    .eq('id', from_bank_account_id)
    .maybeSingle()

  if (!fromBank) {
    return NextResponse.json({ error: '找不到出帳帳戶' }, { status: 404 })
  }
  if (fromBank.workspace_id !== ctx.workspace_id) {
    return NextResponse.json({ error: '出帳帳戶不屬於目前工作空間' }, { status: 403 })
  }

  // 2. 拿 payment_request_items
  const { data: items } = await (
    admin.from as unknown as (t: string) => {
      select: (c: string) => {
        in: (k: string, v: string[]) => Promise<{ data: ItemRow[] | null }>
      }
    }
  )('payment_request_items')
    .select(
      'id, request_id, description, subtotal, supplier_id, supplier_name, amount, workspace_id'
    )
    .in('id', payment_request_item_ids)

  if (!items?.length) {
    return NextResponse.json({ error: '找不到請款品項' }, { status: 404 })
  }
  const crossWsItem = items.find(i => i.workspace_id !== ctx.workspace_id)
  if (crossWsItem) {
    return NextResponse.json({ error: '部分請款品項不屬於目前工作空間' }, { status: 403 })
  }

  // 3. 拿關聯的 supplier bank_code
  const supplierIds = Array.from(new Set(items.map(i => i.supplier_id).filter(Boolean) as string[]))
  let supplierMap: Record<string, SupplierRow> = {}
  if (supplierIds.length > 0) {
    const { data: suppliers } = await (
      admin.from as unknown as (t: string) => {
        select: (c: string) => {
          in: (k: string, v: string[]) => Promise<{ data: SupplierRow[] | null }>
        }
      }
    )('suppliers')
      .select('id, bank_code, bank_name')
      .in('id', supplierIds)

    supplierMap = Object.fromEntries((suppliers ?? []).map(s => [s.id, s]))
  }

  // 4. 計算同行 / 跨行
  const fromBankCode = fromBank.bank_code
  const previewItems: PreviewItem[] = items.map(item => {
    const supplier = item.supplier_id ? supplierMap[item.supplier_id] : null
    const supplierBankCode = supplier?.bank_code ?? null
    // 沒 supplier 或沒 bank_code → 視為跨行（讓 user 填手續費、保守處理）
    const isCrossBank = !supplierBankCode || !fromBankCode || supplierBankCode !== fromBankCode

    return {
      item_id: item.id,
      request_id: item.request_id,
      description: item.description ?? '',
      amount: Number(item.subtotal ?? item.amount ?? 0),
      supplier_id: item.supplier_id,
      supplier_name: item.supplier_name,
      supplier_bank_code: supplierBankCode,
      supplier_bank_name: supplier?.bank_name ?? null,
      is_cross_bank: isCrossBank,
    }
  })

  const totalCount = previewItems.length
  const crossBankItems = previewItems.filter(i => i.is_cross_bank)
  const sameBankItems = previewItems.filter(i => !i.is_cross_bank)
  const totalAmount = previewItems.reduce((s, i) => s + i.amount, 0)
  const crossBankAmount = crossBankItems.reduce((s, i) => s + i.amount, 0)
  const sameBankAmount = sameBankItems.reduce((s, i) => s + i.amount, 0)

  const result: PreviewResponse = {
    from_bank: {
      id: fromBank.id,
      name: fromBank.name ?? '',
      bank_code: fromBank.bank_code,
      bank_name: fromBank.bank_name,
    },
    summary: {
      total_count: totalCount,
      same_bank_count: sameBankItems.length,
      cross_bank_count: crossBankItems.length,
      total_amount: totalAmount,
      same_bank_amount: sameBankAmount,
      cross_bank_amount: crossBankAmount,
    },
    items: previewItems,
  }

  return NextResponse.json(result)
})
