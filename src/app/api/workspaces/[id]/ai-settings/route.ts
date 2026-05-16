/**
 * /api/workspaces/[id]/ai-settings
 *
 * per-workspace AI 設定（prompt template / data sources / response mode）。
 *
 * 守門：
 *   - GET：自己 workspace 任何登入用戶可讀；別的 workspace 要 workspaces.write
 *   - PUT：必須有 workspaces.write capability（跟 workspace 詳情頁一致）
 *
 * 設計：
 *   - workspace_id 是 PK、一筆 / 一個 workspace、用 upsert
 *   - 找不到回 default 物件、不 404（UI 直接顯示空表單）
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerAuth } from '@/lib/auth/server-auth'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { logger } from '@/lib/utils/logger'
import { translateDbError } from '@/lib/db-error-translate'
import { createApiClient } from '@/lib/supabase/api-client'
import { recordApiAuditContext } from '@/lib/audit/audit-helper'
import { CAPABILITIES } from '@/lib/permissions/capabilities'

const ALLOWED_RESPONSE_MODES = ['formal', 'friendly', 'minimal'] as const
type ResponseMode = (typeof ALLOWED_RESPONSE_MODES)[number]

const ALLOWED_DATA_SOURCES = new Set([
  'tours',
  'attractions',
  'suppliers',
  'orders',
  'customers',
])

interface AiSettingsBody {
  prompt_template?: string | null
  data_sources?: string[]
  response_mode?: ResponseMode
}

/**
 * GET /api/workspaces/[id]/ai-settings
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: workspaceId } = await params

  const auth = await getServerAuth()
  if (!auth.success) {
    return NextResponse.json({ error: '請先登入' }, { status: 401 })
  }

  // 自己的 workspace：讀過；別人的：要 workspaces.write
  if (workspaceId !== auth.data.workspaceId) {
    const { hasCapabilityByCode } = await import('@/app/api/lib/check-capability')
    const allowed = await hasCapabilityByCode(auth.data.employeeId, CAPABILITIES.WORKSPACES_WRITE)
    if (!allowed) {
      return NextResponse.json({ error: '不能讀取其他公司的 AI 設定' }, { status: 403 })
    }
  }

  const supabase = getSupabaseAdminClient()
  const { data, error } = await supabase
    .from('workspace_ai_settings')
    .select('workspace_id, prompt_template, data_sources, response_mode, created_at, updated_at')
    .eq('workspace_id', workspaceId)
    .maybeSingle()

  if (error) {
    logger.error('workspace ai settings fetch error', { error, workspaceId })
    return NextResponse.json({ error: '系統錯誤' }, { status: 500 })
  }

  // 找不到回 default、UI 直接拿來顯示空表單
  if (!data) {
    return NextResponse.json({
      workspace_id: workspaceId,
      prompt_template: '',
      data_sources: [],
      response_mode: 'friendly',
      created_at: null,
      updated_at: null,
    })
  }

  return NextResponse.json(data)
}

/**
 * PUT /api/workspaces/[id]/ai-settings
 *
 * upsert 整筆。要 workspaces.write capability。
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: workspaceId } = await params

  const auth = await getServerAuth()
  if (!auth.success) {
    return NextResponse.json({ error: '請先登入' }, { status: 401 })
  }

  // 寫入：必須有 workspaces.write、不論自己還是別家
  const { hasCapabilityByCode } = await import('@/app/api/lib/check-capability')
  const allowed = await hasCapabilityByCode(auth.data.employeeId, CAPABILITIES.WORKSPACES_WRITE)
  if (!allowed) {
    return NextResponse.json({ error: '需租戶管理權限' }, { status: 403 })
  }

  const auditClient = await createApiClient()
  await recordApiAuditContext(auditClient, {
    actorId: auth.data.employeeId,
    reason: '更新租戶 AI 設定',
    requestId: workspaceId,
  })

  let body: AiSettingsBody
  try {
    body = (await request.json()) as AiSettingsBody
  } catch {
    return NextResponse.json({ error: '請求格式錯誤' }, { status: 400 })
  }

  // 驗證 response_mode
  const responseMode: ResponseMode = body.response_mode ?? 'friendly'
  if (!ALLOWED_RESPONSE_MODES.includes(responseMode)) {
    return NextResponse.json(
      { error: `response_mode 必須是 ${ALLOWED_RESPONSE_MODES.join(' / ')}` },
      { status: 400 }
    )
  }

  // 驗證 data_sources：必須是字串陣列、且每個都在白名單
  const rawSources = Array.isArray(body.data_sources) ? body.data_sources : []
  const dataSources = rawSources.filter(
    (s): s is string => typeof s === 'string' && ALLOWED_DATA_SOURCES.has(s)
  )
  if (dataSources.length !== rawSources.length) {
    const invalid = rawSources.filter(s => !ALLOWED_DATA_SOURCES.has(s))
    return NextResponse.json(
      { error: `data_sources 含未知代號：${invalid.join(', ')}` },
      { status: 400 }
    )
  }

  // prompt_template：null / 字串都接受、其他擋掉
  const promptTemplate =
    body.prompt_template === null || body.prompt_template === undefined
      ? null
      : typeof body.prompt_template === 'string'
        ? body.prompt_template
        : null

  const supabase = getSupabaseAdminClient()
  const { data, error } = await supabase
    .from('workspace_ai_settings')
    .upsert(
      {
        workspace_id: workspaceId,
        prompt_template: promptTemplate,
        data_sources: dataSources,
        response_mode: responseMode,
      },
      { onConflict: 'workspace_id' }
    )
    .select('workspace_id, prompt_template, data_sources, response_mode, created_at, updated_at')
    .single()

  if (error) {
    logger.error('workspace ai settings upsert error', { error, workspaceId })
    const t = translateDbError(error)
    return NextResponse.json({ error: t.message, code: t.code, field: t.field }, { status: t.httpStatus })
  }

  return NextResponse.json(data)
}
