/**
 * /api/setup-tokens
 *
 * 生成一次性 Magic Link token、發給客戶用、客戶開連結直接進 setup 頁。
 *
 * - POST：漫途 admin 生成 token（require workspaces.write capability）
 * - GET / PUT 在 [token]/route.ts（公開端點、token 是 auth）
 *
 * 設計：2026-05-14 Logan + William 拍板（telegram message 1050）
 */

import { NextRequest, NextResponse } from 'next/server'
import crypto from 'node:crypto'
import { requireCapability } from '@/lib/auth/require-capability'
import { CAPABILITIES } from '@/lib/permissions/capabilities'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { createApiClient } from '@/lib/supabase/api-client'
import { recordApiAuditContext } from '@/lib/audit/audit-helper'
import { getIntegrationByCode } from '@/lib/integrations/registry'
import { apiHandler } from '@/lib/api/api-handler'

/**
 * POST /api/setup-tokens
 * Body: { workspace_id, integration_code, expires_hours?: number (default 24) }
 *
 * 回 { token, url, expires_at }
 */
export const POST = apiHandler(async (request: NextRequest) => {
  const ctx = await requireCapability(CAPABILITIES.WORKSPACES_WRITE)
  if (!ctx.ok) return ctx.response

  const auditClient = await createApiClient()
  await recordApiAuditContext(auditClient, {
    actorId: ctx.employeeId,
    reason: '生成 integration setup token',
  })

  const body = await request.json()
  const { workspace_id, integration_code, expires_hours } = body as {
    workspace_id?: string
    integration_code?: string
    expires_hours?: number
  }

  if (!workspace_id || !integration_code) {
    return NextResponse.json({ error: '缺少 workspace_id 或 integration_code' }, { status: 400 })
  }

  const def = getIntegrationByCode(integration_code)
  if (!def) {
    return NextResponse.json(
      { error: `未知的 integration_code: ${integration_code}` },
      { status: 400 }
    )
  }

  // 預設 24h 過期、可指定 1-168h（1 週上限）
  const hours = Math.min(Math.max(expires_hours ?? 24, 1), 168)
  const expiresAt = new Date(Date.now() + hours * 60 * 60 * 1000)

  // 32 byte URL-safe random token
  const token = crypto.randomBytes(32).toString('base64url')

  const admin = getSupabaseAdminClient()
  const { data, error } = await (
    admin.from as unknown as (t: string) => {
      insert: (v: Record<string, unknown>) => {
        select: (c: string) => {
          single: () => Promise<{ data: { id: string } | null; error: unknown }>
        }
      }
    }
  )('setup_tokens')
    .insert({
      token,
      workspace_id,
      integration_code,
      expires_at: expiresAt.toISOString(),
      created_by: ctx.employeeId,
    })
    .select('id')
    .single()

  if (error) {
    return NextResponse.json({ error: '生成 token 失敗' }, { status: 500 })
  }

  // base URL：production 用 erp.venturo.tw、dev 用 localhost
  const baseUrl = request.headers.get('x-forwarded-host')
    ? `https://${request.headers.get('x-forwarded-host')}`
    : request.nextUrl.origin

  return NextResponse.json({
    token_id: data?.id,
    token,
    url: `${baseUrl}/setup/${token}`,
    expires_at: expiresAt.toISOString(),
    integration: {
      code: def.code,
      name: def.name,
    },
  })
})
