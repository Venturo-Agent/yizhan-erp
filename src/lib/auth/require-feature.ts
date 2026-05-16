/**
 * requireWorkspaceFeature — API route L1 租戶 feature gate 統一守門
 *
 * 用法（搭配 requireCapability）：
 *   const cap = await requireCapability(CAPABILITIES.AI_HUB_READ)
 *   if (!cap.ok) return cap.response
 *   const feature = await requireWorkspaceFeature(cap.workspaceId, 'line_bot', 'LINE Bot')
 *   if (!feature.ok) return feature.response
 *
 * 跟 requireCapability 分工：
 *   - requireCapability 守 L2「員工有沒有這權限」
 *   - requireWorkspaceFeature 守 L1「租戶有沒有買這 feature」
 *
 * 兩個都過才算合法、漏一個就有「沒買 premium 也能用」或「買了但沒授權員工」破口。
 *
 * 設計：2026-05-14 Robin 拍板（對齊 CLAUDE.md「6 層架構」L1）
 */

import { NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'

type RequireFeatureResult =
  | { ok: true }
  | { ok: false; response: NextResponse }

export async function requireWorkspaceFeature(
  workspaceId: string,
  featureCode: string,
  featureName?: string,
): Promise<RequireFeatureResult> {
  const admin = getSupabaseAdminClient()
  const { data } = await admin
    .from('workspace_features')
    .select('enabled')
    .eq('workspace_id', workspaceId)
    .eq('feature_code', featureCode)
    .maybeSingle()

  if (!data?.enabled) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: `此 workspace 尚未開通 ${featureName ?? featureCode} 功能（請聯絡平台管理員）` },
        { status: 403 },
      ),
    }
  }
  return { ok: true }
}
