import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { getServerAuth } from '@/lib/auth/server-auth'
import { createApiClient } from '@/lib/supabase/api-client'
import { recordApiAuditContext } from '@/lib/audit/audit-helper'
import { dbErrorResponse } from '@/lib/db-error-translate'
import { logger } from '@/lib/utils/logger'

/**
 * PATCH /api/workspaces/[id]/hr-policy
 * 更新公司 HR 政策（特休制度 + 資遣費制度）
 *
 * 存取規則：
 *   - 自己 workspace：登入即可（公司負責人改自己的）
 *   - 別的 workspace：要 workspaces.write capability
 *
 * 2026-05-15 William 拍板：HR 政策是公司級設定、不分員工。
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: workspaceId } = await params

  const auth = await getServerAuth()
  if (!auth.success) {
    return NextResponse.json({ error: '請先登入' }, { status: 401 })
  }

  if (workspaceId !== auth.data.workspaceId) {
    const { hasCapabilityByCode } = await import('@/app/api/lib/check-capability')
    const canManage = await hasCapabilityByCode(auth.data.employeeId, 'workspaces.write')
    if (!canManage) {
      return NextResponse.json({ error: '需租戶管理權限' }, { status: 403 })
    }
  }

  let body: { leave_policy?: string; pension_system?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: '請傳入 JSON body' }, { status: 400 })
  }

  const update: Record<string, string> = {}
  if (body.leave_policy !== undefined) {
    if (!['calendar_year', 'hire_anniversary'].includes(body.leave_policy)) {
      return NextResponse.json({ error: 'leave_policy 必須是 calendar_year / hire_anniversary' }, { status: 400 })
    }
    update.leave_policy = body.leave_policy
  }
  if (body.pension_system !== undefined) {
    if (!['old', 'new', 'mixed'].includes(body.pension_system)) {
      return NextResponse.json({ error: 'pension_system 必須是 old / new / mixed' }, { status: 400 })
    }
    update.pension_system = body.pension_system
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: '沒有可更新的欄位' }, { status: 400 })
  }

  const auditClient = await createApiClient()
  await recordApiAuditContext(auditClient, {
    actorId: auth.data.employeeId,
    reason: '更新 HR 政策設定',
  })

  const supabase = getSupabaseAdminClient()
  const { data, error } = await supabase
    .from('workspaces')
    .update(update)
    .eq('id', workspaceId)
    .select('id, leave_policy, pension_system')
    .single()

  if (error) {
    logger.error('PATCH workspace hr-policy 失敗', error)
    return dbErrorResponse(error)
  }

  return NextResponse.json({ workspace: data })
}
