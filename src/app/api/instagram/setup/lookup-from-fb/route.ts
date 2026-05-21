/**
 * GET /api/instagram/setup/lookup-from-fb
 *
 * 從已開通的 FB Page 設定反查連結的 IG Business Account。
 * IG Business Account 必須先在 IG App / FB Page 設定中連到該 FB Page、Meta Graph API
 * 才能透過 Page Token 反查。
 *
 * 用途：IG setup wizard 提供「從 FB 自動偵測」按鈕、避免使用者手動跑 Graph API Explorer
 * 找 IG Business Account ID（Meta 介面太難用）。
 *
 * 守門：登入 + AI Hub capability + workspace 已開通 ai_hub feature + 已開通 FB
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerAuth } from '@/lib/auth/server-auth'
import { requireCapability } from '@/lib/auth/require-capability'
import { CAPABILITIES } from '@/lib/permissions/capabilities'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { ApiError } from '@/lib/api/response'
import { decryptIntegrationSecret } from '@/lib/crypto/integration-encryption'
import { logger } from '@/lib/utils/logger'

const META_GRAPH_VERSION = 'v21.0'
const META_GRAPH_BASE = `https://graph.facebook.com/${META_GRAPH_VERSION}`

interface FbSettingsRow {
  page_id: string
  page_access_token_encrypted: string
}

export async function GET(_request: NextRequest) {
  try {
    const auth = await getServerAuth()
    if (!auth.success) return ApiError.unauthorized('請先登入')

    const guard = await requireCapability(CAPABILITIES.AI_HUB_WRITE)
    if (!guard.ok) return guard.response

    const supabase = getSupabaseAdminClient()

    // workspace 必須開 ai_hub
    const { data: feature } = await supabase
      .from('workspace_features')
      .select('enabled')
      .eq('workspace_id', auth.data.workspaceId)
      .eq('feature_code', 'ai_hub')
      .maybeSingle()

    if (!feature?.enabled) {
      return ApiError.forbidden('此 workspace 尚未開通 AI Hub')
    }

    // 必須先開通 FB Messenger（才有 page token 能用）
    const fbTable = supabase.from.bind(supabase) as unknown as (
      table: string
    ) => {
      select: (cols: string) => {
        eq: (col: string, value: string) => {
          maybeSingle: () => Promise<{
            data: FbSettingsRow | null
            error: { message: string } | null
          }>
        }
      }
    }
    const { data: fbSettings, error: fbError } = await fbTable('workspace_facebook_settings')
      .select('page_id, page_access_token_encrypted')
      .eq('workspace_id', auth.data.workspaceId)
      .maybeSingle()

    if (fbError || !fbSettings) {
      return NextResponse.json(
        {
          success: false,
          error: '尚未開通 Facebook Messenger、請先到 AI Hub Setup 接 FB Page 再回來接 IG',
        },
        { status: 200 }
      )
    }

    // 解密 page token
    let pageToken: string
    try {
      pageToken = decryptIntegrationSecret(fbSettings.page_access_token_encrypted)
    } catch (cryptoErr) {
      logger.error('lookup-from-fb decrypt page_access_token failed', { cryptoErr })
      return ApiError.internal('內部錯誤、page token 解密失敗')
    }

    // Graph API: GET /{page-id}?fields=instagram_business_account{id,username,name,profile_picture_url}
    const url = `${META_GRAPH_BASE}/${fbSettings.page_id}?fields=instagram_business_account{id,username,name,profile_picture_url}&access_token=${encodeURIComponent(pageToken)}`
    const res = await fetch(url, { method: 'GET' })

    if (!res.ok) {
      const body = await res.text().catch(() => '')
      logger.warn('lookup-from-fb Meta API failed', { status: res.status, body: body.slice(0, 300) })
      let parsed: { error?: { code?: number; message?: string } } | null = null
      try {
        parsed = JSON.parse(body)
      } catch {
        // body not JSON
      }
      const metaMsg = parsed?.error?.message
      return NextResponse.json(
        {
          success: false,
          error: metaMsg ? `Meta API 錯誤：${metaMsg}` : `Meta API 錯誤（HTTP ${res.status}）`,
        },
        { status: 200 }
      )
    }

    const data = (await res.json()) as {
      id: string
      instagram_business_account?: {
        id: string
        username?: string
        name?: string
        profile_picture_url?: string
      }
    }

    if (!data.instagram_business_account) {
      return NextResponse.json(
        {
          success: false,
          error: 'FB Page 尚未連結 Instagram Business 帳號。請先在 IG App 設定 → 帳號 → 切換為「專業帳號」+ 連結到此 FB Page。',
        },
        { status: 200 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        fbPageId: data.id,
        igBusinessAccountId: data.instagram_business_account.id,
        igUsername: data.instagram_business_account.username || null,
        igName: data.instagram_business_account.name || null,
        igProfilePictureUrl: data.instagram_business_account.profile_picture_url || null,
        // 重用 FB Page Token、wizard 可自動填、不需 user 再貼一次
        canReuseFbToken: true,
      },
    })
  } catch (error) {
    logger.error('lookup-from-fb error', { error })
    return ApiError.internal('系統錯誤')
  }
}
