/**
 * /api/integrations/usage
 *
 * 查詢某 workspace 某 integration 的本月用量。
 * IntegrationsTab 用、顯示「本月已用 X 次」+ 最近呼叫紀錄。
 *
 * 設計：2026-05-14 Logan + William 拍板
 */

import { NextRequest, NextResponse } from 'next/server'
import { getApiContext } from '@/lib/auth/get-api-context'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { getMonthlyUsage } from '@/lib/integrations/usage-logger'
import { recordAudit } from '@/lib/audit/record-audit'
import { logger } from '@/lib/utils/logger'
import { apiHandler } from '@/lib/api/api-handler'

interface RecentLog {
  called_at: string
  success: boolean
  error_message: string | null
  metadata: Record<string, unknown> | null
}

export const GET = apiHandler(async (request: NextRequest) => {
  const ctx = await getApiContext({ capabilityCode: 'workspaces.read' })
  if (!ctx.ok) {
    return NextResponse.json(
      { error: ctx.status === 401 ? '請先登入' : '無權限查詢' },
      { status: ctx.status },
    )
  }

  const workspaceId = request.nextUrl.searchParams.get('workspace_id') ?? ctx.workspace_id
  const integrationCode = request.nextUrl.searchParams.get('integration_code')

  if (!integrationCode) {
    return NextResponse.json({ error: '缺少 integration_code' }, { status: 400 })
  }

  // 跨 workspace 查（如漫途客服查客戶資料）→ 寫 audit log 留紀錄
  // 2026-05-14 William 拍板：客戶有權知道漫途何時查了他們的 usage log
  const isCrossWorkspaceRead = workspaceId !== ctx.workspace_id
  if (isCrossWorkspaceRead && ctx.employee_id) {
    const adminForAudit = getSupabaseAdminClient()
    const { ok, error: auditError } = await recordAudit(
      adminForAudit as unknown as Parameters<typeof recordAudit>[0],
      {
        workspaceId: ctx.workspace_id,
        actorId: ctx.employee_id,
      },
      {
        action: 'cross_workspace_read',
        entityType: 'integration_usage_log',
        entityId: workspaceId,
        reason: `查詢 workspace ${workspaceId} 的 ${integrationCode} usage log`,
      },
    )
    if (!ok) {
      logger.warn('跨 workspace 查 audit 寫入失敗:', auditError)
      // fail-soft：audit 失敗不擋查詢
    }
  }

  const monthly = await getMonthlyUsage(workspaceId, integrationCode)

  // 最近 10 筆呼叫紀錄
  const admin = getSupabaseAdminClient()
  type SelectChain = {
    select: (c: string) => {
      eq: (k: string, v: string) => {
        eq: (k: string, v: string) => {
          order: (
            c: string,
            opts: { ascending: boolean },
          ) => { limit: (n: number) => Promise<{ data: RecentLog[] | null }> }
        }
      }
    }
  }

  const { data: recent } = await (
    admin.from as unknown as (t: string) => SelectChain
  )('integration_usage_log')
    .select('called_at, success, error_message, metadata')
    .eq('workspace_id', workspaceId)
    .eq('integration_code', integrationCode)
    .order('called_at', { ascending: false })
    .limit(10)

  return NextResponse.json({
    monthly,
    recent: recent ?? [],
  })
})
