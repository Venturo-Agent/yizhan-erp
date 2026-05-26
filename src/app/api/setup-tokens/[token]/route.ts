/**
 * /api/setup-tokens/[token]
 *
 * 公開端點、token 本身是 auth、不需要登入。
 *
 * - GET：verify token、回 integration_code + workspace name + 過期狀態
 * - PUT：客戶 redeem、把 config 加密後寫進 workspace_integrations、token 標 used
 *
 * 設計：2026-05-14 Logan + William 拍板
 */

import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/utils/logger'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { getIntegrationByCode, getSensitiveFieldKeys } from '@/lib/integrations/registry'
import { encryptConfigFields } from '@/lib/crypto/integration-encryption'

interface SetupTokenRow {
  id: string
  token: string
  workspace_id: string
  integration_code: string
  expires_at: string
  used_at: string | null
}

interface WorkspaceRow {
  id: string
  name: string
}

interface VerifyResult {
  valid: boolean
  reason?: 'not_found' | 'expired' | 'used'
  integration_code?: string
  integration_name?: string
  workspace_name?: string
  expires_at?: string
}

async function loadToken(token: string): Promise<{
  token: SetupTokenRow | null
  workspace: WorkspaceRow | null
}> {
  const admin = getSupabaseAdminClient()
  const { data: tokenRow } = await (
    admin.from as unknown as (t: string) => {
      select: (c: string) => {
        eq: (
          k: string,
          v: string
        ) => {
          maybeSingle: () => Promise<{ data: SetupTokenRow | null }>
        }
      }
    }
  )('setup_tokens')
    .select('id, token, workspace_id, integration_code, expires_at, used_at')
    .eq('token', token)
    .maybeSingle()

  if (!tokenRow) return { token: null, workspace: null }

  const { data: wsRow } = await (
    admin.from as unknown as (t: string) => {
      select: (c: string) => {
        eq: (
          k: string,
          v: string
        ) => {
          maybeSingle: () => Promise<{ data: WorkspaceRow | null }>
        }
      }
    }
  )('workspaces')
    .select('id, name')
    .eq('id', tokenRow.workspace_id)
    .maybeSingle()

  return { token: tokenRow, workspace: wsRow ?? null }
}

/**
 * GET /api/setup-tokens/[token]
 * 公開：客戶開連結時呼叫、回 integration info + 狀態
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params

  const { token: row, workspace } = await loadToken(token)
  if (!row) {
    return NextResponse.json<VerifyResult>({ valid: false, reason: 'not_found' }, { status: 404 })
  }

  if (row.used_at) {
    return NextResponse.json<VerifyResult>({ valid: false, reason: 'used' }, { status: 410 })
  }

  if (new Date(row.expires_at) < new Date()) {
    return NextResponse.json<VerifyResult>({ valid: false, reason: 'expired' }, { status: 410 })
  }

  const def = getIntegrationByCode(row.integration_code)
  return NextResponse.json<VerifyResult>({
    valid: true,
    integration_code: row.integration_code,
    integration_name: def?.name ?? row.integration_code,
    workspace_name: workspace?.name ?? '未知 workspace',
    expires_at: row.expires_at,
  })
}

/**
 * PUT /api/setup-tokens/[token]
 * Body: { config: { [field_key]: value } }
 * 公開：客戶 submit 表單時呼叫、寫進 workspace_integrations + token 標 used
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    return await handlePut(request, await params)
  } catch (err) {
    // 加密 throw / DB throw / 任何上面沒接到的 → 統一回 JSON、不噴空 body 讓前端 res.json() 炸「網路錯誤」
    logger.error('[setup-tokens] PUT error:', err)
    return NextResponse.json({ error: '儲存失敗，請稍後再試' }, { status: 500 })
  }
}

async function handlePut(request: NextRequest, { token }: { token: string }) {
  const body = await request.json()
  const { config } = body as { config?: Record<string, string> }

  if (!config) {
    return NextResponse.json({ error: '缺少 config' }, { status: 400 })
  }

  const { token: row } = await loadToken(token)
  if (!row) {
    return NextResponse.json({ error: 'Token 無效' }, { status: 404 })
  }
  if (row.used_at) {
    return NextResponse.json({ error: 'Token 已使用' }, { status: 410 })
  }
  if (new Date(row.expires_at) < new Date()) {
    return NextResponse.json({ error: 'Token 已過期' }, { status: 410 })
  }

  const def = getIntegrationByCode(row.integration_code)
  if (!def) {
    return NextResponse.json(
      { error: `未知 integration_code: ${row.integration_code}` },
      { status: 400 }
    )
  }

  // 驗證必填
  for (const field of def.fields) {
    if (field.required && !config[field.key]) {
      return NextResponse.json({ error: `${field.label} 為必填` }, { status: 400 })
    }
  }

  // 加密 sensitive 欄位（這條 path 全是新填值、不存在「保留舊值」）
  const sensitiveKeys = getSensitiveFieldKeys(row.integration_code)
  const fieldsToEncrypt = sensitiveKeys.filter(k => config[k] && config[k].length > 0)
  const encryptedConfig = encryptConfigFields(config, fieldsToEncrypt)

  const admin = getSupabaseAdminClient()

  // upsert workspace_integrations
  type UpsertChain = {
    upsert: (
      v: Record<string, unknown>,
      opts: { onConflict: string }
    ) => Promise<{ error: unknown }>
  }
  const { error: upsertError } = await (admin.from as unknown as (t: string) => UpsertChain)(
    'workspace_integrations'
  ).upsert(
    {
      workspace_id: row.workspace_id,
      integration_code: row.integration_code,
      config: encryptedConfig,
      enabled: true,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'workspace_id,integration_code' }
  )

  if (upsertError) {
    return NextResponse.json({ error: '儲存失敗' }, { status: 500 })
  }

  // mark token used
  type UpdateChain = {
    update: (v: Record<string, unknown>) => {
      eq: (c: string, v: string) => Promise<{ error: unknown }>
    }
  }
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null
  const ua = request.headers.get('user-agent') ?? null
  await (admin.from as unknown as (t: string) => UpdateChain)('setup_tokens')
    .update({
      used_at: new Date().toISOString(),
      used_by_ip: ip,
      used_by_user_agent: ua?.slice(0, 500),
    })
    .eq('token', token)

  return NextResponse.json({ success: true })
}
