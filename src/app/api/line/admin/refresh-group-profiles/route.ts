/**
 * POST /api/line/admin/refresh-group-profiles
 *
 * Backfill / 修復 LINE 群組 conversation 的 picture_url（群組大頭照）。
 *
 * 為什麼需要：
 *   - 過去 webhook bug：每則訊息把 picture_url 強制覆蓋成 null、現有 3 個群組 picture_url 全 null
 *   - bug 已修（commit 待 push）、但只對新訊息生效、舊群組要手動 trigger
 *
 * 邏輯：
 *   - 抓 workspace 所有 channel_type='line' + external_user_id 開頭 'group:' 的 conversation
 *   - 對每個 group、call LINE getGroupSummary API
 *   - 拿到 pictureUrl 就 UPDATE
 *
 * 守門：登入 + AI Hub capability + workspace 有 line bot
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerAuth } from '@/lib/auth/server-auth'
import { requireCapability } from '@/lib/auth/require-capability'
import { CAPABILITIES } from '@/lib/permissions/capabilities'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { ApiError } from '@/lib/api/response'
import { decryptIntegrationSecret } from '@/lib/crypto/integration-encryption'
import { fetchLineGroupSummary } from '@/lib/line/profile-client'
import { logger } from '@/lib/utils/logger'

export async function POST(_request: NextRequest) {
  try {
    const auth = await getServerAuth()
    if (!auth.success) return ApiError.unauthorized('請先登入')

    const guard = await requireCapability(CAPABILITIES.AI_HUB_WRITE)
    if (!guard.ok) return guard.response

    const workspaceId = auth.data.workspaceId
    const supabase = getSupabaseAdminClient()

    // 拿 LINE channel token
    const settingsTable = supabase.from.bind(supabase) as unknown as (table: string) => {
      select: (cols: string) => {
        eq: (
          col: string,
          value: string
        ) => {
          maybeSingle: () => Promise<{
            data: { channel_access_token_encrypted: string } | null
            error: { message: string } | null
          }>
        }
      }
    }
    const { data: lineSettings } = await settingsTable('workspace_line_settings')
      .select('channel_access_token_encrypted')
      .eq('workspace_id', workspaceId)
      .maybeSingle()

    if (!lineSettings?.channel_access_token_encrypted) {
      return ApiError.forbidden('此 workspace 尚未開通 LINE Bot、無 channel token')
    }

    let channelAccessToken: string
    try {
      channelAccessToken = decryptIntegrationSecret(lineSettings.channel_access_token_encrypted)
    } catch (cryptoError) {
      logger.error('refresh-group-profiles: decrypt failed', { cryptoError })
      return ApiError.internal('內部錯誤、channel token 解密失敗')
    }

    // 找所有 line 群組對話（external_user_id 開頭 'group:'）
    const convTable = supabase.from.bind(supabase) as unknown as (table: string) => {
      select: (cols: string) => {
        eq: (
          col: string,
          value: string
        ) => {
          like: (
            col: string,
            pattern: string
          ) => Promise<{
            data: Array<{
              id: string
              external_user_id: string
              display_name: string | null
              picture_url: string | null
            }> | null
            error: { message: string } | null
          }>
        }
      }
    }
    const { data: groups, error: groupsError } = await convTable('inbox_conversations')
      .select('id, external_user_id, display_name, picture_url')
      .eq('workspace_id', workspaceId)
      .like('external_user_id', 'group:%')

    if (groupsError) {
      logger.error('refresh-group-profiles: fetch groups failed', { groupsError })
      return ApiError.internal('讀群組對話列表失敗')
    }

    if (!groups || groups.length === 0) {
      return NextResponse.json({
        success: true,
        data: { totalGroups: 0, updated: 0, results: [] },
      })
    }

    // 對每個 group call LINE API + 更新 picture_url
    const updateTable = supabase.from.bind(supabase) as unknown as (table: string) => {
      update: (values: { picture_url?: string | null; display_name?: string | null }) => {
        eq: (col: string, value: string) => Promise<{ error: { message: string } | null }>
      }
    }

    const results: Array<{
      conversationId: string
      groupId: string
      ok: boolean
      pictureUrlSet: boolean
      groupName: string | null
      error?: string
    }> = []
    let updated = 0

    for (const conv of groups) {
      const groupId = conv.external_user_id.replace(/^group:/, '')
      try {
        const summary = await fetchLineGroupSummary({ groupId, channelAccessToken })
        if (!summary) {
          results.push({
            conversationId: conv.id,
            groupId,
            ok: false,
            pictureUrlSet: false,
            groupName: null,
            error: 'LINE API 沒回 group summary',
          })
          continue
        }

        const patch: { picture_url?: string | null; display_name?: string | null } = {}
        if (summary.pictureUrl) patch.picture_url = summary.pictureUrl
        if (summary.groupName) patch.display_name = summary.groupName

        if (Object.keys(patch).length > 0) {
          const { error: updateError } = await updateTable('inbox_conversations')
            .update(patch)
            .eq('id', conv.id)

          if (updateError) {
            results.push({
              conversationId: conv.id,
              groupId,
              ok: false,
              pictureUrlSet: false,
              groupName: summary.groupName ?? null,
              error: `update DB failed: ${updateError.message}`,
            })
            continue
          }
          updated += 1
        }

        results.push({
          conversationId: conv.id,
          groupId,
          ok: true,
          pictureUrlSet: Boolean(summary.pictureUrl),
          groupName: summary.groupName ?? null,
        })
      } catch (e) {
        results.push({
          conversationId: conv.id,
          groupId,
          ok: false,
          pictureUrlSet: false,
          groupName: null,
          error: e instanceof Error ? e.message : 'unknown error',
        })
      }
    }

    return NextResponse.json({
      success: true,
      data: { totalGroups: groups.length, updated, results },
    })
  } catch (error) {
    logger.error('refresh-group-profiles unexpected error', { error })
    return ApiError.internal('系統錯誤')
  }
}
