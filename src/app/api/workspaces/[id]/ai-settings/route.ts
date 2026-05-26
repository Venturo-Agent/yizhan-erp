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
import { encryptIntegrationSecret } from '@/lib/crypto/integration-encryption'
import type { SupabaseClient } from '@supabase/supabase-js'

const ALLOWED_RESPONSE_MODES = ['formal', 'friendly', 'minimal'] as const
type ResponseMode = (typeof ALLOWED_RESPONSE_MODES)[number]

const ALLOWED_PROVIDERS = ['minimax', 'anthropic', 'openrouter'] as const
type Provider = (typeof ALLOWED_PROVIDERS)[number]

// 大顆粒模組級資料來源（William 2026-05-19 拍板：先做模組勾選、之後 RAG 開動再接細節）
// 注意：tours / suppliers / customers 跟舊版同名但語意從「子表」改成「模組級」
// CORNER workspace 的 data_sources 已驗證為空 []、無 migration 風險
const ALLOWED_DATA_SOURCES = new Set([
  'tours', // 旅遊團模組（行程 / 團員 / 行程編輯）
  'finance', // 財務模組（收付款 / 出納 / 傳票 / 會計報表）
  'customers', // 客戶 / CRM 模組（客戶 / 訂單 / 業績）
  'hr', // HR 人資模組（員工 / 特休 / 薪資 / 組織）
  'suppliers', // 供應商模組（供應商 / 合約 / 應付）
  'shared_data', // 共用資料（景點 / 飯店 / 餐廳）
])

interface AiSettingsBody {
  prompt_template?: string | null
  data_sources?: string[]
  response_mode?: ResponseMode
  // 新增：LLM 連線設定（每個都 optional、UI 可以只更新部分）
  provider?: Provider | null
  model?: string | null
  /** 明文 token、進來才加密。空字串 / undefined = 不變更既有值 */
  api_token?: string
  is_active?: boolean
}

/**
 * GET /api/workspaces/[id]/ai-settings
 */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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

  // ─── LLM 連線設定（provider / model / token / is_active）─────────────────
  // 三件套規則：is_active=true 必須有 token + provider + model（DB CHECK 也守、雙保險）
  const payload: Record<string, unknown> = {
    workspace_id: workspaceId,
    prompt_template: promptTemplate,
    data_sources: dataSources,
    response_mode: responseMode,
    updated_by: auth.data.employeeId,
    updated_at: new Date().toISOString(),
  }

  // provider
  if (body.provider !== undefined) {
    if (body.provider !== null && !ALLOWED_PROVIDERS.includes(body.provider)) {
      return NextResponse.json(
        { error: `provider 必須是 ${ALLOWED_PROVIDERS.join(' / ')}` },
        { status: 400 }
      )
    }
    payload.provider = body.provider
  }

  // model
  if (body.model !== undefined) {
    payload.model = body.model
  }

  // api_token：明文進來、加密後存 _encrypted 欄位、空字串視為「不變更」
  if (typeof body.api_token === 'string' && body.api_token.trim().length > 0) {
    try {
      payload.api_token_encrypted = encryptIntegrationSecret(body.api_token.trim())
    } catch (cryptoErr) {
      logger.error('ai settings encrypt failed', { error: cryptoErr, workspaceId })
      return NextResponse.json({ error: '加密失敗、請聯繫系統管理' }, { status: 500 })
    }
  }

  // is_active
  if (typeof body.is_active === 'boolean') {
    payload.is_active = body.is_active
  }

  // 第一次寫入時設 created_by（用 onConflict 處理已存在）
  payload.created_by = auth.data.employeeId

  const supabase = getSupabaseAdminClient()
  // workspace_ai_settings 新欄位尚未進 generated types、用 unknown 中轉
  const supabaseAny = supabase as unknown as SupabaseClient
  const { data, error } = await supabaseAny
    .from('workspace_ai_settings')
    .upsert(payload, { onConflict: 'workspace_id' })
    .select(
      'workspace_id, prompt_template, data_sources, response_mode, provider, model, is_active, last_used_at, created_at, updated_at'
    )
    .single()

  if (error) {
    logger.error('workspace ai settings upsert error', { error, workspaceId })
    const t = translateDbError(error)
    return NextResponse.json(
      { error: t.message, code: t.code, field: t.field },
      { status: t.httpStatus }
    )
  }

  // 回應遮罩 token 狀態（永遠不送明文）
  const responseData = data as Record<string, unknown>
  return NextResponse.json({
    ...responseData,
    has_token: Boolean(responseData.api_token_encrypted),
    api_token_encrypted: undefined,
  })
}

/**
 * DELETE /api/workspaces/[id]/ai-settings
 *
 * 移除 LLM 連線設定（清 provider / model / token、停用）。
 * 行為設定（prompt_template / data_sources / response_mode）保留。
 *
 * 守門：必須 workspaces.write capability
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: workspaceId } = await params

  const auth = await getServerAuth()
  if (!auth.success) {
    return NextResponse.json({ error: '請先登入' }, { status: 401 })
  }

  const { hasCapabilityByCode } = await import('@/app/api/lib/check-capability')
  const allowed = await hasCapabilityByCode(auth.data.employeeId, CAPABILITIES.WORKSPACES_WRITE)
  if (!allowed) {
    return NextResponse.json({ error: '需租戶管理權限' }, { status: 403 })
  }

  const auditClient = await createApiClient()
  await recordApiAuditContext(auditClient, {
    actorId: auth.data.employeeId,
    reason: '移除租戶 LLM 連線設定',
    requestId: workspaceId,
  })

  const supabase = getSupabaseAdminClient()
  const supabaseAny = supabase as unknown as SupabaseClient
  const { error } = await supabaseAny
    .from('workspace_ai_settings')
    .update({
      provider: null,
      model: null,
      api_token_encrypted: null,
      is_active: false,
      updated_by: auth.data.employeeId,
    })
    .eq('workspace_id', workspaceId)

  if (error) {
    logger.error('ai settings delete error', { error, workspaceId })
    const t = translateDbError(error)
    return NextResponse.json(
      { error: t.message, code: t.code, field: t.field },
      { status: t.httpStatus }
    )
  }

  return NextResponse.json({ ok: true })
}
