/**
 * GET  /api/line/postback-templates  — 列出 workspace 的 postback templates
 * POST /api/line/postback-templates  — 新增一筆
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

const createSchema = z.object({
  label: z.string().min(1).max(50),
  postback_data: z.string().min(1).max(200),
  response_text: z.string().min(1).max(2000),
  sort_order: z.number().int().min(0).max(999).optional().default(0),
})

export async function GET(request: NextRequest) {
  try {
    const guard = await requireCapability(CAPABILITIES.LINE_BOT_READ)
    if (!guard.ok) return guard.response

    const feature = await requireWorkspaceFeature(guard.workspaceId, 'line_bot', 'LINE Bot')
    if (!feature.ok) return feature.response

    const supabase = getSupabaseAdminClient() as unknown as SupabaseClient
    const { data, error } = await supabase
      .from('line_postback_templates')
      .select('id, label, postback_data, response_text, sort_order, is_active, created_at')
      .eq('workspace_id', guard.workspaceId)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true })

    if (error) {
      logger.error('GET postback-templates failed', error)
      return ApiError.internal('查詢失敗')
    }

    return NextResponse.json({ data })
  } catch (err) {
    logger.error('GET postback-templates error', { err })
    return ApiError.internal('系統錯誤')
  }
}

export async function POST(request: NextRequest) {
  try {
    const guard = await requireCapability(CAPABILITIES.LINE_BOT_CONFIG)
    if (!guard.ok) return guard.response

    const feature = await requireWorkspaceFeature(guard.workspaceId, 'line_bot', 'LINE Bot')
    if (!feature.ok) return feature.response

    const validation = await validateBody(request, createSchema)
    if (!validation.success) return validation.error

    const supabase = getSupabaseAdminClient() as unknown as SupabaseClient
    const { data, error } = await supabase
      .from('line_postback_templates')
      .insert({
        workspace_id: guard.workspaceId,
        ...validation.data,
      })
      .select('id, label, postback_data, response_text, sort_order, is_active')
      .single()

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: '此 postback_data 已存在' }, { status: 409 })
      }
      logger.error('POST postback-templates failed', error)
      return ApiError.internal('建立失敗')
    }

    return NextResponse.json({ data }, { status: 201 })
  } catch (err) {
    logger.error('POST postback-templates error', { err })
    return ApiError.internal('系統錯誤')
  }
}
