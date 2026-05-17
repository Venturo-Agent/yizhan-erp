/**
 * PATCH  /api/line/postback-templates/[id]  — 更新
 * DELETE /api/line/postback-templates/[id]  — 刪除
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireCapability } from '@/lib/auth/require-capability'
import { requireWorkspaceFeature } from '@/lib/auth/require-feature'
import { validateBody } from '@/lib/api/validation'
import { ApiError } from '@/lib/api/response'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { CAPABILITIES } from '@/lib/permissions/capabilities'
import type { SupabaseClient } from '@supabase/supabase-js'
import { logger } from '@/lib/utils/logger'

const patchSchema = z.object({
  label: z.string().min(1).max(50).optional(),
  postback_data: z.string().min(1).max(200).optional(),
  response_text: z.string().min(1).max(2000).optional(),
  sort_order: z.number().int().min(0).max(999).optional(),
  is_active: z.boolean().optional(),
})

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const guard = await requireCapability(CAPABILITIES.LINE_BOT_CONFIG)
    if (!guard.ok) return guard.response

    const feature = await requireWorkspaceFeature(guard.workspaceId, 'line_bot', 'LINE Bot')
    if (!feature.ok) return feature.response

    const { id } = await params
    const validation = await validateBody(request, patchSchema)
    if (!validation.success) return validation.error

    const supabase = getSupabaseAdminClient() as unknown as SupabaseClient
    const { data, error } = await supabase
      .from('line_postback_templates')
      .update({ ...validation.data, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('workspace_id', guard.workspaceId)
      .select('id, label, postback_data, response_text, sort_order, is_active')
      .maybeSingle()

    if (error) {
      logger.error('PATCH postback-template failed', error)
      return ApiError.internal('更新失敗')
    }
    if (!data) return ApiError.notFound('模板不存在')

    return NextResponse.json({ data })
  } catch (err) {
    logger.error('PATCH postback-template error', { err })
    return ApiError.internal('系統錯誤')
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const guard = await requireCapability(CAPABILITIES.LINE_BOT_CONFIG)
    if (!guard.ok) return guard.response

    const feature = await requireWorkspaceFeature(guard.workspaceId, 'line_bot', 'LINE Bot')
    if (!feature.ok) return feature.response

    const { id } = await params
    const supabase = getSupabaseAdminClient() as unknown as SupabaseClient
    const { error } = await supabase
      .from('line_postback_templates')
      .delete()
      .eq('id', id)
      .eq('workspace_id', guard.workspaceId)

    if (error) {
      logger.error('DELETE postback-template failed', error)
      return ApiError.internal('刪除失敗')
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    logger.error('DELETE postback-template error', { err })
    return ApiError.internal('系統錯誤')
  }
}
