/**
 * /api/workspace-integrations
 *
 * Per-workspace API integration 設定 CRUD
 *
 * 設計（William 拍板 2026-05-11）：
 * - GET   ?workspace_id= → 列出某 workspace 所有 integrations、sensitive 欄位回傳遮罩 '••••••••'
 * - PUT   → upsert 一筆 integration、sensitive 欄位加密後存
 * - 守門：`workspaces.write` capability（只有平台管理員 / Carson 等能設）
 * - workspace_id 可指定（跨租戶）、未指定用當前 user 自己的
 */

import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/utils/logger'
import { getApiContext } from '@/lib/auth/get-api-context'
import { getServerAuth } from '@/lib/auth/server-auth'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { recordApiAuditContext } from '@/lib/audit/audit-helper'
import { createApiClient } from '@/lib/supabase/api-client'
import { translateDbError, dbErrorResponse } from '@/lib/db-error-translate'
import { INTEGRATIONS, getIntegrationByCode, getSensitiveFieldKeys } from '@/lib/integrations/registry'
import {
  encryptConfigFields,
  maskConfigFields,
} from '@/lib/crypto/integration-encryption'

// workspace_integrations table type (generated types 還沒含這張表、用 type cast workaround)
interface WorkspaceIntegrationRow {
  workspace_id: string
  integration_code: string
  config: Record<string, string>
  enabled: boolean
  updated_at?: string
  updated_by?: string | null
}

async function requireTenantAdmin(): Promise<
  { ok: true; workspaceId: string; employeeId: string | null } | { ok: false; response: NextResponse }
> {
  const ctx = await getApiContext({ capabilityCode: 'workspaces.write' })
  if (!ctx.ok) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: ctx.status === 401 ? '請先登入' : '無權限管理 API 整合' },
        { status: ctx.status },
      ),
    }
  }
  return { ok: true, workspaceId: ctx.workspace_id, employeeId: ctx.employee_id ?? null }
}

/**
 * GET /api/workspace-integrations
 * Query: workspace_id (可選、不傳 = 自己)
 *
 * 回傳：所有 INTEGRATIONS 註冊的 integration_code、+ DB 該 workspace 對應 row 的 enabled / config 狀態
 *      sensitive 欄位用 '••••••••' 遮罩、不曝光明文
 */
export async function GET(request: NextRequest) {
  // 兩種 caller：
  // 1. 員工 UI conditional render（每個進 /orders 的人都會打、判斷 OCR 入口顯不顯示）→ 只要登入
  // 2. 漫途 admin 跨 workspace 查 / 漫途設 integration → 守 workspaces.write
  // response 已遮罩 sensitive（'••••••••'）、回的是 metadata + enabled bool、員工讀自家不敏感
  const auth = await getServerAuth()
  if (!auth.success) {
    return NextResponse.json({ error: '請先登入' }, { status: 401 })
  }
  const queried = request.nextUrl.searchParams.get('workspace_id')
  const isCrossWorkspace = queried && queried !== auth.data.workspaceId
  if (isCrossWorkspace) {
    const adminGate = await requireTenantAdmin()
    if (!adminGate.ok) return adminGate.response
  }
  const targetWorkspaceId = queried ?? auth.data.workspaceId

  const admin = getSupabaseAdminClient()
  // type cast：generated types regen 後可拿掉
  const { data, error } = await (admin.from as unknown as (t: string) => {
    select: (c: string) => {
      eq: (col: string, val: string) => Promise<{
        data: WorkspaceIntegrationRow[] | null
        error: { message: string } | null
      }>
    }
  })('workspace_integrations')
    .select('integration_code, config, enabled, updated_at')
    .eq('workspace_id', targetWorkspaceId)

  if (error) {
    return dbErrorResponse(error)
  }

  // 把 DB row 轉成 map：integration_code → { config, enabled }
  const rowMap = new Map<string, { config: Record<string, unknown>; enabled: boolean }>()
  for (const row of data ?? []) {
    rowMap.set(row.integration_code, {
      config: (row.config as Record<string, unknown>) ?? {},
      enabled: row.enabled,
    })
  }

  // registry 所有 integration 都列出、有 DB row 就帶值、沒就回 empty + enabled=false
  const result = INTEGRATIONS.map(def => {
    const row = rowMap.get(def.code)
    const sensitiveKeys = def.fields.filter(f => f.sensitive).map(f => f.key)
    return {
      code: def.code,
      name: def.name,
      description: def.description,
      affects: def.affects,
      fields: def.fields,
      enabled: row?.enabled ?? false,
      config: row ? maskConfigFields(row.config, sensitiveKeys) : {},
      configured: !!row && Object.keys(row.config).length > 0,
    }
  })

  return NextResponse.json(result)
}

/**
 * PUT /api/workspace-integrations
 * Body: { workspace_id?, integration_code, config, enabled }
 *
 * sensitive 欄位若是 '••••••••' 表示前端沒改、保留 DB 原值（不重新加密）
 * 其餘值 (空字串 / 明文) 視為使用者輸入、空字串 = 清除、明文 = 加密後存
 */
export async function PUT(request: NextRequest) {
  try {
    return await handlePut(request)
  } catch (err) {
    // 加密 throw / DB throw / 任何上面沒接到的 → 統一回 JSON、不噴空 body 讓前端 res.json() 炸 SyntaxError
    logger.error('[workspace-integrations] PUT error:', err)
    return NextResponse.json({ error: '儲存失敗，請稍後再試' }, { status: 500 })
  }
}

async function handlePut(request: NextRequest) {
  const gate = await requireTenantAdmin()
  if (!gate.ok) return gate.response

  const body = await request.json()
  const { workspace_id, integration_code, config, enabled } = body as {
    workspace_id?: string
    integration_code?: string
    config?: Record<string, string>
    enabled?: boolean
  }

  if (!integration_code) {
    return NextResponse.json({ error: '缺少 integration_code' }, { status: 400 })
  }

  const def = getIntegrationByCode(integration_code)
  if (!def) {
    return NextResponse.json(
      { error: `未知的 integration_code: ${integration_code}` },
      { status: 400 },
    )
  }

  const targetWorkspaceId = workspace_id ?? gate.workspaceId
  const sensitiveKeys = getSensitiveFieldKeys(integration_code)

  // 撈現有 row 拿原始 config（保留遮罩欄位用）
  const admin = getSupabaseAdminClient()
  const { data: existing } = await (admin.from as unknown as (t: string) => {
    select: (c: string) => {
      eq: (c1: string, v1: string) => {
        eq: (c2: string, v2: string) => {
          maybeSingle: () => Promise<{ data: WorkspaceIntegrationRow | null; error: unknown }>
        }
      }
    }
  })('workspace_integrations')
    .select('config')
    .eq('workspace_id', targetWorkspaceId)
    .eq('integration_code', integration_code)
    .maybeSingle()

  const existingConfig = (existing?.config as Record<string, string> | null) ?? {}

  // merge config：sensitive 欄位若是遮罩 '••••••••' 表示前端沒動、保留 DB 原值
  const newConfig: Record<string, string> = {}
  const plainConfig = config ?? {}
  for (const field of def.fields) {
    const incoming = plainConfig[field.key]
    if (incoming === undefined) {
      // 前端沒傳這個欄位、保留原值
      if (existingConfig[field.key] !== undefined) {
        newConfig[field.key] = existingConfig[field.key]
      }
      continue
    }
    if (field.sensitive && incoming === '••••••••') {
      // 遮罩 = 沒改、保留 DB 原值
      if (existingConfig[field.key] !== undefined) {
        newConfig[field.key] = existingConfig[field.key]
      }
      continue
    }
    // 真實值（明文或空字串、空字串 = 清除）
    if (typeof incoming === 'string') {
      newConfig[field.key] = incoming
    }
  }

  // 加密 sensitive 欄位（只對「明文新值」加密、保留原值的不重複加密）
  // 判斷哪些欄位需要重新加密：本次有從前端拿到非遮罩值的 sensitive 欄位
  const fieldsToEncrypt: string[] = []
  for (const key of sensitiveKeys) {
    const incoming = plainConfig[key]
    if (incoming !== undefined && incoming !== '••••••••' && typeof incoming === 'string' && incoming.length > 0) {
      fieldsToEncrypt.push(key)
    }
  }
  const encryptedConfig = encryptConfigFields(newConfig, fieldsToEncrypt)

  // 必填驗證
  for (const field of def.fields) {
    if (field.required && !encryptedConfig[field.key]) {
      return NextResponse.json(
        { error: `${def.name}：${field.label} 為必填欄位` },
        { status: 400 },
      )
    }
  }

  // audit log
  const audit = await createApiClient()
  await recordApiAuditContext(audit, {
    actorId: gate.employeeId ?? '',
    reason: `更新 API 整合設定（${def.name}）`,
  })

  // upsert
  const { error } = await (admin.from as unknown as (t: string) => {
    upsert: (
      row: WorkspaceIntegrationRow,
      opts: { onConflict: string },
    ) => Promise<{ error: { message: string } | null }>
  })('workspace_integrations').upsert(
    {
      workspace_id: targetWorkspaceId,
      integration_code,
      config: encryptedConfig,
      enabled: enabled ?? false,
      updated_at: new Date().toISOString(),
      updated_by: gate.employeeId ?? null,
    },
    { onConflict: 'workspace_id,integration_code' },
  )

  if (error) {
    const t = translateDbError(error)
    return NextResponse.json({ error: t.message, code: t.code, field: t.field }, { status: t.httpStatus })
  }

  return NextResponse.json({ success: true })
}
