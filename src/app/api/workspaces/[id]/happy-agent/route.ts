/**
 * GET/PUT /api/workspaces/[id]/happy-agent
 *
 * 取得 / 更新 workspace 的 HAPPY agent 設定（capabilities JSONB）
 *
 * 守門：
 *   GET：workspaces.write（漫途管理員在租戶管理頁看其他 workspace 的 HAPPY 設定）
 *   PUT：workspaces.write（同上）
 *   workspace_id 從 URL params 取、不信任 body 的值
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireCapability } from '@/lib/auth/require-capability'
import { requireWorkspaceFeature } from '@/lib/auth/require-feature'
import { CAPABILITIES } from '@/lib/permissions/capabilities'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { dbErrorResponse } from '@/lib/db-error-translate'
import { createApiClient } from '@/lib/supabase/api-client'
import { recordApiAuditContext } from '@/lib/audit/audit-helper'
import { logger } from '@/lib/utils/logger'
import { errorResponse, ErrorCode } from '@/lib/api/response'
import type { Json } from '@/lib/supabase/types'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const guard = await requireCapability(CAPABILITIES.WORKSPACES_WRITE)
    if (!guard.ok) return guard.response

    const { id: workspaceId } = await params

    const featureGate = await requireWorkspaceFeature(workspaceId, 'channels.happy', 'HAPPY 機器人')
    if (!featureGate.ok) return featureGate.response

    const admin = getSupabaseAdminClient()
    const { data, error } = await admin
      .from('ai_agents')
      .select('id, code, name, status, capabilities, avatar_url, description')
      .eq('workspace_id', workspaceId)
      .eq('code', 'HAPPY')
      .maybeSingle()

    if (error) return dbErrorResponse(error)

    return NextResponse.json(data ?? null)
  } catch (error) {
    logger.error('API Error', { error })
    return errorResponse('系統錯誤，請稍後再試', 500, ErrorCode.INTERNAL_ERROR)
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const guard = await requireCapability(CAPABILITIES.WORKSPACES_WRITE)
    if (!guard.ok) return guard.response

    const { id: workspaceId } = await params

    const featureGate = await requireWorkspaceFeature(workspaceId, 'channels.happy', 'HAPPY 機器人')
    if (!featureGate.ok) return featureGate.response

    const auditClient = await createApiClient()
    await recordApiAuditContext(auditClient, {
      actorId: guard.employeeId,
      reason: '更新 HAPPY agent 設定',
    })

    const body = await req.json().catch(() => ({}))
    const { capabilities } = body as { capabilities?: unknown }

    if (!capabilities || typeof capabilities !== 'object' || Array.isArray(capabilities)) {
      return NextResponse.json({ error: 'capabilities 必須為物件' }, { status: 400 })
    }

    const admin = getSupabaseAdminClient()

    // upsert：若 HAPPY agent 尚不存在（舊 workspace）則建立
    const { data, error } = await admin
      .from('ai_agents')
      .upsert(
        {
          workspace_id: workspaceId,
          code: 'HAPPY',
          name: 'HAPPY',
          scope: 'internal',
          status: 'active',
          capabilities: capabilities as Json,
        },
        { onConflict: 'workspace_id,code', ignoreDuplicates: false },
      )
      .select('id, capabilities, updated_at')
      .single()

    if (error) return dbErrorResponse(error)

    return NextResponse.json(data)
  } catch (error) {
    logger.error('API Error', { error })
    return errorResponse('系統錯誤，請稍後再試', 500, ErrorCode.INTERNAL_ERROR)
  }
}
