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
import { translateDbError } from '@/lib/db-error-translate'
import { apiHandler } from '@/lib/api/api-handler'
import { randomBytes } from 'node:crypto'
import { PROVIDER_CODES, PAYMENT_LINK_EXPIRY_DAYS } from '@/constants/payment-provider'

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

function generateToken(): string {
  // 22 字元 URL-safe base64（128 bits 隨機）
  return randomBytes(16).toString('base64url')
}

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

  const token = generateToken()
  const expiresAt = new Date(Date.now() + payload.expires_minutes * 60_000).toISOString()

  // Phase 1 mock 連結：絕對網址由前端拼接、後端只回 path + token
  const paymentLink = `/pay/mock/${token}`

  const { data, error } = await supabase
    .from('payment_transactions')
    .insert({
      workspace_id: workspaceId,
      receipt_id: payload.receipt_id ?? null,
      provider: payload.provider,
      payment_link: paymentLink,
      payment_link_token: token,
      payment_link_expires_at: expiresAt,
      customer_email: payload.customer_email ?? null,
      customer_name: payload.customer_name ?? null,
      amount: payload.amount,
      currency: 'TWD',
      invoice_ids: payload.invoice_ids,
      status: 'pending',
      created_by: guard.employeeId,
    })
    .select('id, payment_link, payment_link_token, payment_link_expires_at, amount, status')
    .single()

  if (error) {
    const t = translateDbError(error)
    return NextResponse.json({ error: t.message, code: t.code, field: t.field }, { status: t.httpStatus })
  }

  return NextResponse.json({
    success: true,
    data: {
      ...data,
      // Phase 2 換成真實永豐連結；現在 caller 自己拼絕對 URL
      mock: true,
    },
  })
})
