/**
 * GET  /api/messaging/conversations/[id]/notes  — 列出業務紀錄
 * POST /api/messaging/conversations/[id]/notes  — 新增業務紀錄
 *
 * 守 ai_hub.write capability（讀也用 write、業務紀錄不對外）。
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createApiClient, getCurrentWorkspaceId } from '@/lib/supabase/api-client'
import { requireCapability } from '@/lib/auth/require-capability'
import { requireWorkspaceFeature } from '@/lib/auth/require-feature'
import { CAPABILITIES } from '@/lib/permissions/capabilities'
import { validateBody } from '@/lib/api/validation'
import { ApiError } from '@/lib/api/response'
import { logger } from '@/lib/utils/logger'
import type { SupabaseTableName } from '@/lib/supabase/typed-client'

const schema = z.object({
  content: z.string().min(1).max(2000),
})

interface NoteRow {
  id: number
  content: string
  created_at: string
  employee_id: string
  employees: { display_name: string | null } | null
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const guard = await requireCapability(CAPABILITIES.AI_HUB_READ)
    if (!guard.ok) return guard.response

    const feature = await requireWorkspaceFeature(guard.workspaceId, 'ai_hub', 'AI Hub')
    if (!feature.ok) return feature.response

    const workspaceId = await getCurrentWorkspaceId()
    if (!workspaceId) return ApiError.unauthorized('未登入')

    const { id: conversationId } = await params

    const supabase = await createApiClient()
    const { data, error } = await supabase
      .from('inbox_conversation_notes' as unknown as SupabaseTableName)
      .select('id, content, created_at, employee_id, employees(display_name)')
      .eq('conversation_id', conversationId)
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) {
      logger.error('GET notes error', { error })
      return ApiError.internal('系統錯誤')
    }

    return NextResponse.json({ data: (data ?? []) as unknown as NoteRow[] })
  } catch (error) {
    logger.error('GET notes exception', { error })
    return ApiError.internal('系統錯誤')
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const guard = await requireCapability(CAPABILITIES.AI_HUB_WRITE)
    if (!guard.ok) return guard.response

    const feature = await requireWorkspaceFeature(guard.workspaceId, 'ai_hub', 'AI Hub')
    if (!feature.ok) return feature.response

    const workspaceId = await getCurrentWorkspaceId()
    if (!workspaceId) return ApiError.unauthorized('未登入')

    const { id: conversationId } = await params

    const validation = await validateBody(request, schema)
    if (!validation.success) return validation.error

    const supabase = await createApiClient()
    const { error } = await supabase
      .from('inbox_conversation_notes' as unknown as SupabaseTableName)
      .insert({
        workspace_id: workspaceId,
        conversation_id: conversationId,
        employee_id: guard.employeeId,
        content: validation.data.content,
      } as never)

    if (error) {
      logger.error('POST note error', { error })
      return ApiError.internal('系統錯誤')
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    logger.error('POST note exception', { error })
    return ApiError.internal('系統錯誤')
  }
}
