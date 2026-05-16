/**
 * /api/integrations/audit-trail
 *
 * 客戶查「漫途有沒有查過我的 usage log、何時、誰查」。
 * 給客戶權力知道漫途的查閱紀錄、合規透明。
 *
 * 設計：2026-05-14 Logan + William 拍板（telegram 1073）
 */

import { NextRequest, NextResponse } from 'next/server'
import { getApiContext } from '@/lib/auth/get-api-context'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { apiHandler } from '@/lib/api/api-handler'

interface AuditTrailRow {
  id: string
  workspace_id: string // 查詢者所在 workspace（通常是漫途）
  actor_id: string // 查詢者 employee id
  action: string
  entity_type: string
  reason: string | null
  created_at: string
}

export const GET = apiHandler(async (request: NextRequest) => {
  const ctx = await getApiContext({ capabilityCode: 'workspaces.read' })
  if (!ctx.ok) {
    return NextResponse.json(
      { error: ctx.status === 401 ? '請先登入' : '無權限查詢' },
      { status: ctx.status },
    )
  }

  // 客戶查的是「我這 workspace 被誰查過」、所以 entity_id = ctx.workspace_id
  const targetWorkspaceId = ctx.workspace_id

  const admin = getSupabaseAdminClient()
  type SelectChain = {
    select: (c: string) => {
      eq: (k: string, v: string) => {
        eq: (k: string, v: string) => {
          order: (c: string, opts: { ascending: boolean }) => {
            limit: (n: number) => Promise<{ data: AuditTrailRow[] | null }>
          }
        }
      }
    }
  }

  const { data } = await (admin.from as unknown as (t: string) => SelectChain)(
    'audit_logs',
  )
    .select('id, workspace_id, actor_id, action, entity_type, reason, created_at')
    .eq('entity_id', targetWorkspaceId)
    .eq('action', 'cross_workspace_read')
    .order('created_at', { ascending: false })
    .limit(request.nextUrl.searchParams.get('limit')
      ? parseInt(request.nextUrl.searchParams.get('limit') as string, 10)
      : 50)

  // 拉 actor 名字（不暴露真實 ID、顯示 employee 名字）
  const actorIds = Array.from(new Set((data ?? []).map(r => r.actor_id)))
  let actorNames: Record<string, string> = {}
  if (actorIds.length > 0) {
    type EmployeesChain = {
      select: (c: string) => {
        in: (
          k: string,
          v: string[],
        ) => Promise<{ data: Array<{ id: string; display_name: string | null; chinese_name: string | null }> | null }>
      }
    }
    const { data: employees } = await (admin.from as unknown as (t: string) => EmployeesChain)('employees')
      .select('id, display_name, chinese_name')
      .in('id', actorIds)
    actorNames = Object.fromEntries(
      (employees ?? []).map(e => [e.id, e.display_name || e.chinese_name || '漫途員工']),
    )
  }

  return NextResponse.json({
    workspace_id: targetWorkspaceId,
    entries: (data ?? []).map(r => ({
      id: r.id,
      actor_name: actorNames[r.actor_id] ?? '漫途員工',
      action: r.action,
      reason: r.reason,
      created_at: r.created_at,
    })),
    total: (data ?? []).length,
  })
})
