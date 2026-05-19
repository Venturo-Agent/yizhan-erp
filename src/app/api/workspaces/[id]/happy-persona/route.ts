/**
 * GET/PUT /api/workspaces/[id]/happy-persona
 *
 * HAPPY 機器人人格設定（漫途專用 / 客戶不能改）。
 *
 * 守門：workspaces.write capability（一般客戶 admin 沒此 cap）
 *
 * 寫入 workspace_ai_agents 表（channel_type='happy'）的 brand_description /
 * system_prompt_override / is_active 欄位。
 *
 * 設計：HAPPY 是漫途提供的內部 AI 服務、客戶不能客製化、漫途 staff 在租戶管理頁
 * 可微調每個客戶 workspace 的 HAPPY 人格（譬如 CORNER 客戶用「親切」、給比較
 * 嚴肅的客戶用「正式」）。
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireCapability } from '@/lib/auth/require-capability'
import { CAPABILITIES } from '@/lib/permissions/capabilities'
import { ApiError } from '@/lib/api/response'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { logger } from '@/lib/utils/logger'
import type { SupabaseClient } from '@supabase/supabase-js'

interface HappyPersonaRow {
  brand_description: string | null
  system_prompt_override: string | null
  is_active: boolean
  updated_at: string
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const guard = await requireCapability(CAPABILITIES.WORKSPACES_WRITE)
    if (!guard.ok) return guard.response

    const { id: workspaceId } = await params

    const supabase = getSupabaseAdminClient() as unknown as SupabaseClient
    const { data, error } = await supabase
      .from('workspace_ai_agents')
      .select('brand_description, system_prompt_override, is_active, updated_at')
      .eq('workspace_id', workspaceId)
      .eq('channel_type', 'happy')
      .maybeSingle<HappyPersonaRow>()

    if (error) {
      logger.error('GET happy-persona error', { error })
      return ApiError.internal('讀取 HAPPY 人格失敗')
    }

    return NextResponse.json({
      data: data ?? {
        brand_description: null,
        system_prompt_override: null,
        is_active: false,
        updated_at: null,
      },
    })
  } catch (error) {
    logger.error('GET happy-persona exception', { error })
    return ApiError.internal('系統錯誤')
  }
}

const putSchema = z.object({
  brand_description: z.string().max(2000).optional().nullable(),
  system_prompt_override: z.string().max(8000).optional().nullable(),
  is_active: z.boolean().optional(),
})

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const guard = await requireCapability(CAPABILITIES.WORKSPACES_WRITE)
    if (!guard.ok) return guard.response

    const { id: workspaceId } = await params

    const body = await req.json().catch(() => ({}))
    const parsed = putSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: '輸入格式錯誤' }, { status: 400 })
    }

    const supabase = getSupabaseAdminClient() as unknown as SupabaseClient

    // upsert by (workspace_id, channel_type='happy')
    const { error } = await supabase
      .from('workspace_ai_agents')
      .upsert(
        {
          workspace_id: workspaceId,
          channel_type: 'happy',
          brand_description: parsed.data.brand_description ?? null,
          system_prompt_override: parsed.data.system_prompt_override ?? null,
          is_active: parsed.data.is_active ?? true,
          data_sources: {},
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'workspace_id,channel_type' }
      )

    if (error) {
      logger.error('PUT happy-persona error', { error })
      return ApiError.internal('儲存 HAPPY 人格失敗')
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    logger.error('PUT happy-persona exception', { error })
    return ApiError.internal('系統錯誤')
  }
}
