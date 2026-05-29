/**
 * GET /api/public/invoices/[token]
 * 客戶用 batch token 拉帳單批次明細 + 各員付款狀態 + 收款方式清單
 * (2026-05-15 William 拍板、從 invoice token 改成 batch token)
 *
 * 設計：
 * - admin client per-request(紅線 C)、service_role bypass RLS
 * - token 對到 invoice_batches.public_token
 * - 自驗 token_expires_at + status != cancelled
 * - rate limit 30 / min / IP(瀏覽紀錄常重整)
 * - 回傳 batch + 該 batch 下所有 invoices + customer/member info
 *   + order + tour + workspace 收款帳號 + payment_methods 清單 + receipts 歷史
 *
 * 完整 spec: Logan-Workspace/2026-05-14-帳單系統-客戶自助付款-CRM-spec.md
 */

import { NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { checkRateLimit } from '@/lib/rate-limit'
import { logger } from '@/lib/utils/logger'
import type { SupabaseClient } from '@supabase/supabase-js'

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function GET(request: Request, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params

    const rateLimited = await checkRateLimit(request, 'public-invoice-get', 30, 60_000)
    if (rateLimited) return rateLimited

    if (!UUID_REGEX.test(token)) {
      return NextResponse.json({ error: '無效的連結' }, { status: 400 })
    }

    // invoice_batches / invoices 尚未納入生成類型，用 unknown 中轉
    const s = getSupabaseAdminClient() as unknown as SupabaseClient

    // 查 batch
    const { data: batch, error: batchErr } = await s
      .from('invoice_batches')
      .select(
        'id, workspace_id, order_id, public_token, token_expires_at, status, notes, created_at'
      )
      .eq('public_token', token)
      .maybeSingle()

    if (batchErr) {
      logger.error('[public/invoices GET] batch query error:', batchErr)
      return NextResponse.json({ error: '查詢失敗' }, { status: 500 })
    }

    if (!batch) {
      return NextResponse.json({ error: '帳單不存在或連結錯誤' }, { status: 404 })
    }

    if (batch.status === 'cancelled') {
      return NextResponse.json({ error: '此帳單已取消' }, { status: 410 })
    }

    if (new Date(batch.token_expires_at) < new Date()) {
      return NextResponse.json({ error: '此連結已過期、請聯絡業務員重發' }, { status: 410 })
    }

    // 平行撈：invoices / order / workspace / receipts / payment_methods / 收款帳戶
    const [
      invoicesResult,
      orderResult,
      workspaceResult,
      receiptsResult,
      paymentMethodsResult,
      bankAccountsResult,
    ] = await Promise.all([
      s
        .from('invoices')
        .select(`id, customer_id, member_id, total_amount, paid_amount, status, notes, created_at`)
        .eq('batch_id', batch.id)
        .order('created_at', { ascending: true }),
      s
        .from('orders')
        .select('id, order_number, tour_id, branch_id')
        .eq('id', batch.order_id)
        .maybeSingle(),
      s
        .from('workspaces')
        .select('id, name, logo_url, logo_scale, logo_offset_x, logo_offset_y')
        .eq('id', batch.workspace_id)
        .maybeSingle(),
      s
        .from('receipts')
        .select(
          `id, receipt_amount, actual_amount, status, payment_method, payment_method_id,
           bank_account_last5, payment_date, notes, rejected_reason, created_at, verified_at`
        )
        .eq('batch_id', batch.id)
        .order('created_at', { ascending: false }),
      s
        .from('payment_methods')
        .select('id, name, code, kind, description, placeholder, sort_order, provider')
        .eq('workspace_id', batch.workspace_id)
        .eq('type', 'receipt')
        .eq('is_active', true)
        // 只列「對客戶開放」的方式、內部用的（甲存/現金/支票）不漏給客人（2026-05-26）
        .eq('is_customer_visible', true)
        .order('sort_order', { ascending: true }),
      // 收款帳戶 SSOT：bank_accounts（綁報價單顯示），見 2026-05-29 遷移 spec §2.2
      s
        .from('bank_accounts')
        .select(
          'id, bank_name, bank_code, bank_branch, account_number, account_holder_name, is_default, branch_id, created_at'
        )
        .eq('workspace_id', batch.workspace_id)
        .eq('is_active', true)
        .eq('is_quote_display', true),
    ])

    const invoices = invoicesResult.data || []

    // 撈各 invoice 對應的 customer + member name（平行）
    const customerIds = [...new Set(invoices.map((i: { customer_id: string }) => i.customer_id))]
    const memberIds = invoices
      .map((i: { member_id: string | null }) => i.member_id)
      .filter((x: string | null): x is string => !!x)

    const [customersResult, membersResult] = await Promise.all([
      customerIds.length
        ? s.from('customers').select('id, chinese_name, passport_name').in('id', customerIds)
        : Promise.resolve({ data: [] }),
      memberIds.length
        ? s.from('order_members').select('id, chinese_name, passport_name').in('id', memberIds)
        : Promise.resolve({ data: [] }),
    ])

    const customerMap = new Map(
      (customersResult.data || []).map(
        (c: { id: string; chinese_name: string | null; passport_name: string | null }) => [
          c.id,
          c.chinese_name || c.passport_name || '客戶',
        ]
      )
    )
    const memberMap = new Map(
      (membersResult.data || []).map(
        (m: { id: string; chinese_name: string | null; passport_name: string | null }) => [
          m.id,
          m.chinese_name || m.passport_name || null,
        ]
      )
    )

    // 撈 tour（從 order）
    let tour: { code: string; name: string; departure_date: string | null } | null = null
    if (orderResult.data?.tour_id) {
      const { data: t } = await s
        .from('tours')
        .select('code, name, departure_date')
        .eq('id', orderResult.data.tour_id)
        .maybeSingle()
      tour = t
    }

    const workspace = workspaceResult.data

    // 解析報價單收款帳戶（遷移 spec §2.2）：候選 = is_quote_display + (branch_id 為 NULL 共用或 = 訂單分公司)，
    // is_default 優先、再最早建立。SSOT 改為 bank_accounts（取代舊 workspaces.bank_*）。
    const orderBranchId =
      (orderResult.data as { branch_id?: string | null } | null)?.branch_id ?? null
    type QuoteBankRow = {
      bank_name: string | null
      bank_code: string | null
      bank_branch: string | null
      account_number: string | null
      account_holder_name: string | null
      is_default: boolean | null
      branch_id: string | null
      created_at: string | null
    }
    const quoteBank = ((bankAccountsResult.data as QuoteBankRow[] | null) || [])
      .filter(a => a.branch_id == null || a.branch_id === orderBranchId)
      .sort((a, b) => {
        if (!!a.is_default !== !!b.is_default) return a.is_default ? -1 : 1
        return (a.created_at ?? '').localeCompare(b.created_at ?? '')
      })[0]

    // 加總
    const totalAmount = invoices.reduce(
      (sum: number, i: { total_amount: number }) => sum + Number(i.total_amount),
      0
    )
    const paidAmount = invoices.reduce(
      (sum: number, i: { paid_amount: number }) => sum + Number(i.paid_amount),
      0
    )

    // 撈 receipts 對應的 allocations、組「這筆 receipt 代付了誰」
    // 5/15 William 抓：歷次付款只顯示金額不知道付給誰、要列出代付成員名單
    const receiptsRaw = (receiptsResult.data || []) as Array<{
      id: string
      receipt_amount: number
      actual_amount: number
      status: string
      payment_method: string | null
      payment_method_id: string | null
      bank_account_last5: string | null
      payment_date: string | null
      notes: string | null
      rejected_reason: string | null
      created_at: string
      verified_at: string | null
    }>
    const receiptIds = receiptsRaw.map(r => r.id)
    const invoiceIdToName = new Map(
      invoices.map((i: { id: string; member_id: string | null; customer_id: string }) => [
        i.id,
        (i.member_id && memberMap.get(i.member_id)) || customerMap.get(i.customer_id) || '(未命名)',
      ])
    )
    const paidForByReceipt = new Map<string, string[]>()
    if (receiptIds.length > 0) {
      const { data: allocs } = await s
        .from('receipt_invoice_allocations')
        .select('receipt_id, invoice_id')
        .in('receipt_id', receiptIds)
      for (const a of (allocs || []) as Array<{ receipt_id: string; invoice_id: string }>) {
        const name = invoiceIdToName.get(a.invoice_id)
        if (!name) continue
        if (!paidForByReceipt.has(a.receipt_id)) paidForByReceipt.set(a.receipt_id, [])
        paidForByReceipt.get(a.receipt_id)!.push(name as string)
      }
    }

    return NextResponse.json({
      batch: {
        id: batch.id,
        status: batch.status,
        token_expires_at: batch.token_expires_at,
        notes: batch.notes,
        total_amount: totalAmount,
        paid_amount: paidAmount,
        remaining: totalAmount - paidAmount,
      },
      invoices: invoices.map(
        (i: {
          id: string
          customer_id: string
          member_id: string | null
          total_amount: number
          paid_amount: number
          status: string
          notes: string | null
        }) => ({
          id: i.id,
          member_name:
            (i.member_id && memberMap.get(i.member_id)) ||
            customerMap.get(i.customer_id) ||
            '(未命名)',
          customer_name: customerMap.get(i.customer_id) || '客戶',
          total_amount: Number(i.total_amount),
          paid_amount: Number(i.paid_amount),
          remaining: Number(i.total_amount) - Number(i.paid_amount),
          status: i.status,
          notes: i.notes,
        })
      ),
      tour: tour
        ? {
            name: tour.name,
            code: tour.code,
            departure_date: tour.departure_date,
          }
        : null,
      workspace: workspace
        ? {
            name: workspace.name,
            logo_url: workspace.logo_url,
            logo_scale: workspace.logo_scale,
            logo_offset_x: workspace.logo_offset_x,
            logo_offset_y: workspace.logo_offset_y,
            bank: quoteBank?.account_number
              ? {
                  bank_name: quoteBank.bank_name,
                  bank_code: quoteBank.bank_code,
                  branch: quoteBank.bank_branch,
                  account: quoteBank.account_number,
                  account_name: quoteBank.account_holder_name,
                }
              : null,
          }
        : null,
      payment_methods: (paymentMethodsResult.data || []).map(
        (pm: {
          id: string
          name: string
          code: string
          kind: string | null
          description: string | null
          placeholder: string | null
          provider?: string
        }) => ({
          id: pm.id,
          name: pm.name,
          code: pm.code,
          kind: pm.kind,
          description: pm.description,
          placeholder: pm.placeholder,
          provider: pm.provider ?? 'manual',
        })
      ),
      receipts: receiptsRaw.map(r => ({
        ...r,
        paid_for: paidForByReceipt.get(r.id) || [],
      })),
    })
  } catch (error) {
    logger.error('API Error', { path: new URL(request.url).pathname, error })
    return NextResponse.json({ success: false, error: '系統錯誤，請稍後再試' }, { status: 500 })
  }
}
