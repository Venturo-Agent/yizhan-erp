/**
 * POST /api/finance/payment-links
 *
 * Phase 1 mock：產生付款連結 + 預存 payment_transactions row。
 *
 * Phase 2 才會真接永豐 EPOS / 豐收款 API。現在純 mock：
 *   - 產一個 token、組出 /pay/mock/[token] 假連結
 *   - 寫 payment_transactions row、status='pending'
 *   - 不動 receipts（receipt 由 caller 自己建、payment_transactions.receipt_id 預存 null
 *     或在 caller 同 transaction 寫好）
 *
 * Phase 2 升級時、provider !== 'manual' 才走真實 API、其他 provider 直接 noop。
 *
 * 守門：FINANCE_MANAGE_PAYMENTS（建單同等級）
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createApiClient, getCurrentWorkspaceId } from '@/lib/supabase/api-client'
import { requireCapability } from '@/lib/auth/require-capability'
import { CAPABILITIES } from '@/lib/permissions/capabilities'
import { validateBody } from '@/lib/api/validation'
import { recordApiAuditContext } from '@/lib/audit/audit-helper'
import { apiHandler } from '@/lib/api/api-handler'
import { PROVIDER_CODES, PAYMENT_LINK_EXPIRY_DAYS } from '@/constants/payment-provider'
import { createSinopacCardTransaction, SINOPAC_ERR } from '@/lib/payment-providers/sinopac/create-transaction'

// 後端可接受的效期上限 = 前端選單最大天數（SSOT：UI 改選單、這裡自動跟）
const MAX_EXPIRY_MINUTES = Math.max(...PAYMENT_LINK_EXPIRY_DAYS) * 24 * 60

const SUPPORTED_PROVIDERS = [
  PROVIDER_CODES.SINOPAC_CARD,
  PROVIDER_CODES.SINOPAC_COLLECT,
  PROVIDER_CODES.SINOPAC_APPLE_PAY,
  PROVIDER_CODES.SINOPAC_GOOGLE_PAY,
  PROVIDER_CODES.SINOPAC_SAMSUNG_PAY,
] as const

const generateLinkSchema = z.object({
  provider: z.enum(SUPPORTED_PROVIDERS),
  amount: z.number().positive('金額需大於 0'),
  customer_email: z.string().email().optional().nullable(),
  customer_name: z.string().max(100).optional().nullable(),
  receipt_id: z.string().uuid().optional().nullable(),
  invoice_ids: z.array(z.string().uuid()).optional().default([]),
  expires_minutes: z.number().int().min(5).max(MAX_EXPIRY_MINUTES).optional().default(60),
})

export const POST = apiHandler(async (request: NextRequest) => {
  const guard = await requireCapability(CAPABILITIES.FINANCE_MANAGE_PAYMENTS)
  if (!guard.ok) return guard.response

  const supabase = await createApiClient()
  const workspaceId = await getCurrentWorkspaceId()
  if (!workspaceId) {
    return NextResponse.json({ error: '未登入' }, { status: 401 })
  }

  const validation = await validateBody(request, generateLinkSchema)
  if (!validation.success) return validation.error
  const payload = validation.data

  await recordApiAuditContext(supabase, {
    actorId: guard.employeeId,
    reason: `產生付款連結 / provider=${payload.provider}`,
  })

  // 目前僅信用卡走真永豐、其他 provider（虛擬帳號 / 行動支付）尚未開放
  if (payload.provider !== PROVIDER_CODES.SINOPAC_CARD) {
    return NextResponse.json(
      { error: '目前僅支援信用卡刷卡、其他付款方式尚未開放' },
      { status: 400 }
    )
  }

  const expiresAt = new Date(Date.now() + payload.expires_minutes * 60_000).toISOString()

  try {
    const result = await createSinopacCardTransaction({
      workspaceId,
      provider: payload.provider,
      amount: payload.amount,
      invoiceIds: payload.invoice_ids,
      customerEmail: payload.customer_email ?? null,
      customerName: payload.customer_name ?? null,
      expiresAt,
      createdBy: guard.employeeId,
    })

    return NextResponse.json({
      success: true,
      data: {
        id: result.txId,
        payment_link: result.redirectTo, // 永豐刷卡頁絕對網址、caller 直接用
        payment_link_token: result.token,
        payment_link_expires_at: result.expiresAt,
        amount: result.amount,
        status: 'pending',
      },
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : ''
    if (msg.startsWith(SINOPAC_ERR.NOT_CONFIGURED)) {
      return NextResponse.json({ error: '此公司尚未設定永豐金流' }, { status: 503 })
    }
    if (msg.startsWith(SINOPAC_ERR.ORDER_FAILED) || msg.startsWith(SINOPAC_ERR.NO_PAY_URL)) {
      return NextResponse.json({ error: '金流服務暫時無法使用、請稍後再試' }, { status: 502 })
    }
    return NextResponse.json({ error: '產生付款連結失敗' }, { status: 500 })
  }
})
