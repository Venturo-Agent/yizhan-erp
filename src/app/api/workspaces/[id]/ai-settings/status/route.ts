/**
 * GET /api/workspaces/[id]/ai-settings/status
 *
 * 回該 workspace 的 LLM 連線狀態（不含 token 明文）。
 * 給 UI 顯示「目前 provider / model / 是否啟用 / 最後使用時間 / 是否已設 token」用。
 *
 * 守門：
 *   - 自己 workspace：登入即可
 *   - 別人 workspace：要 workspaces.write
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerAuth } from '@/lib/auth/server-auth'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { logger } from '@/lib/utils/logger'
import { CAPABILITIES } from '@/lib/permissions/capabilities'
import type { SupabaseClient } from '@supabase/supabase-js'

interface AiSettingsRow {
  provider: string | null
  model: string | null
  api_token_encrypted: string | null
  is_active: boolean | null
  last_used_at: string | null
}

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: workspaceId } = await params

  const auth = await getServerAuth()
  if (!auth.success) {
    return NextResponse.json({ error: '請先登入' }, { status: 401 })
  }

  // 自己 workspace：可讀；別人：要 workspaces.write
  if (workspaceId !== auth.data.workspaceId) {
    const { hasCapabilityByCode } = await import('@/app/api/lib/check-capability')
    const allowed = await hasCapabilityByCode(auth.data.employeeId, CAPABILITIES.WORKSPACES_WRITE)
    if (!allowed) {
      return NextResponse.json({ error: '不能讀取其他公司的 AI 設定' }, { status: 403 })
    }
  }

  const supabase = getSupabaseAdminClient()
  const supabaseAny = supabase as unknown as SupabaseClient
  const { data, error } = await supabaseAny
    .from('workspace_ai_settings')
    .select('provider, model, api_token_encrypted, is_active, last_used_at')
    .eq('workspace_id', workspaceId)
    .maybeSingle<AiSettingsRow>()

  if (error) {
    logger.error('ai settings status fetch error', { error, workspaceId })
    return NextResponse.json({ error: '系統錯誤' }, { status: 500 })
  }

  if (!data) {
    return NextResponse.json({
      workspace_id: workspaceId,
      provider: null,
      model: null,
      has_token: false,
      is_active: false,
      last_used_at: null,
    })
  }

  return NextResponse.json({
    workspace_id: workspaceId,
    provider: data.provider,
    model: data.model,
    has_token: Boolean(data.api_token_encrypted),
    is_active: Boolean(data.is_active),
    last_used_at: data.last_used_at,
  })
}
