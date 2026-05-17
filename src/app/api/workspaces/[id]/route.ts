import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { getServerAuth } from '@/lib/auth/server-auth'
import { checkRateLimit } from '@/lib/rate-limit'
import { logger } from '@/lib/utils/logger'
import { translateDbError } from '@/lib/db-error-translate'
import { createApiClient } from '@/lib/supabase/api-client'
import { recordApiAuditContext } from '@/lib/audit/audit-helper'

// Corner 是主 workspace、刪除它會滅整個 SaaS 平台
// 2026-05-16 QDF R40：移到 env、fallback 保留歷史值（避免 ship 漏設）
// 對齊鐵律 #9（不該 hardcode workspace 判斷）+ 鐵律 #11（secret 走 SSOT）
const CORNER_WORKSPACE_ID =
  process.env.PLATFORM_WORKSPACE_ID || '8ef05a74-1f87-48ab-afd3-9bfeb423935d'

/**
 * GET /api/workspaces/[workspaceId]
 * 取得租戶詳情（含員工人數、系統主管資訊）
 *
 * 存取規則：
 * - 自己 workspace：任何登入用戶都可讀（UI 需要拿自己公司的 premium_enabled 等）
 * - 別的 workspace：必須有「租戶管理」權限（role_tab_permissions.settings.tenants.can_write）
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: workspaceId } = await params

    // 🔒 守門
    const auth = await getServerAuth()
    if (!auth.success) {
      return NextResponse.json({ error: '請先登入' }, { status: 401 })
    }

    if (workspaceId !== auth.data.workspaceId) {
      // 跨租戶讀：要租戶管理權限
      const { hasCapabilityByCode } = await import('@/app/api/lib/check-capability')
      const canManageTenants = await hasCapabilityByCode(
        auth.data.employeeId,
        'workspaces.write'
      )
      if (!canManageTenants) {
        return NextResponse.json({ error: '不能讀取其他公司的租戶詳情' }, { status: 403 })
      }
    }

    const supabase = getSupabaseAdminClient()

    // leave_policy / pension_system 是 2026-05-15 加的欄位
    // subscription_plan 是 2026-05-18 加的欄位、typegen 還沒 regen、cast 繞過
    const { data, error } = (await supabase
      .from('workspaces')
      .select('id, name, code, is_active, premium_enabled, leave_policy, pension_system, subscription_plan')
      .eq('id', workspaceId)
      .single()) as { data: Record<string, unknown> | null; error: unknown }

    if (error || !data) {
      return NextResponse.json({ error: '找不到租戶' }, { status: 404 })
    }

    // 取得這個 workspace 中擁有管理員資格的職務 id
    const { data: adminRoles } = await supabase
      .from('workspace_roles')
      .select('id')
      .eq('workspace_id', workspaceId)
      .eq('is_admin', true)
    const adminRoleIds = new Set((adminRoles || []).map(r => r.id))

    // 查所有員工
    const { data: employees } = await supabase
      .from('employees')
      .select(
        'id, employee_number, chinese_name, display_name, english_name, role_id, created_at'
      )
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: true })

    const realEmployees = (employees || []) as Array<{
      id: string
      employee_number: string | null
      chinese_name: string | null
      display_name: string | null
      english_name: string | null
      role_id: string | null
      created_at: string
    }>

    // 找第一個擁有管理員資格的員工（SSOT：workspace_roles.is_admin）
    const adminEmployee =
      realEmployees.find(e => e.role_id && adminRoleIds.has(e.role_id)) || realEmployees[0] // fallback：沒人擁有管理員資格就取第一個員工

    const adminName = adminEmployee
      ? adminEmployee.display_name ||
        adminEmployee.chinese_name ||
        adminEmployee.english_name ||
        '未知'
      : null

    return NextResponse.json({
      ...data,
      employee_count: realEmployees.length,
      admin_name: adminName,
      admin_id: adminEmployee?.id || null,
      admin_employee_number: adminEmployee?.employee_number || null,
    })
  } catch (error) {
    logger.error('API Error', { path: request.nextUrl.pathname, error })
    return NextResponse.json({ success: false, error: '系統錯誤，請稍後再試' }, { status: 500 })
  }
}

/**
 * DELETE /api/workspaces/[id]
 * 刪除租戶
 *
 * 存取規則：
 * - 必須登入（middleware + getServerAuth）
 * - 必須有「租戶管理」權限（role_tab_permissions.settings.tenants.can_write）
 * - Corner 主租戶硬擋（不能刪）
 * - self-delete 禁（不能刪自己登入的那家）
 * - 員工數 > 0 → 409 防呆
 * - rate limit 10/分鐘（防暴力）
 * - audit log 敏感操作留痕
 *
 * DB policy 端只允許 service_role、client-side supabase.from('workspaces').delete() 會被擋。
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: workspaceId } = await params

    // Rate limit（10/分鐘）
    const rateLimited = await checkRateLimit(request, 'workspaces-delete', 10, 60_000)
    if (rateLimited) return rateLimited as unknown as NextResponse

    // 必須登入
    const auth = await getServerAuth()
    if (!auth.success) {
      return NextResponse.json({ error: '請先登入' }, { status: 401 })
    }

    // 必須有租戶管理權限
    const { hasCapabilityByCode } = await import('@/app/api/lib/check-capability')
    const canManageTenants = await hasCapabilityByCode(
      auth.data.employeeId,
      'workspaces.write'
    )
    if (!canManageTenants) {
      return NextResponse.json({ error: '需租戶管理權限' }, { status: 403 })
    }

    // Guard 1：Corner 硬擋
    if (workspaceId === CORNER_WORKSPACE_ID) {
      return NextResponse.json({ error: '不能刪除主租戶' }, { status: 403 })
    }

    // Guard 2：self-delete 禁
    if (workspaceId === auth.data.workspaceId) {
      return NextResponse.json({ error: '不能刪除自己登入的租戶' }, { status: 403 })
    }

    const adminClient = (await import('@/lib/supabase/admin')).getSupabaseAdminClient()

    // 找目標租戶
    const { data: targetWs } = await adminClient
      .from('workspaces')
      .select('id, name, code')
      .eq('id', workspaceId)
      .single()

    if (!targetWs) {
      return NextResponse.json({ error: '找不到租戶' }, { status: 404 })
    }

    // Guard 3：員工數 > 0 防呆
    const { count: employeeCount } = await adminClient
      .from('employees')
      .select('id', { count: 'exact', head: true })
      .eq('workspace_id', workspaceId)

    if (employeeCount && employeeCount > 0) {
      return NextResponse.json(
        { error: `此租戶還有 ${employeeCount} 位員工、不能刪除` },
        { status: 409 }
      )
    }

    // 寫入 DB audit context（每 connection 一個 record）
    const auditClient = await createApiClient()
    await recordApiAuditContext(auditClient, {
      actorId: auth.data.employeeId,
      reason: '刪除租戶',
      requestId: workspaceId,
    })

    // Audit log（敏感操作留痕）
    logger.warn('[AUDIT] workspace deletion', {
      target_workspace_id: workspaceId,
      target_workspace_name: targetWs.name,
      target_workspace_code: targetWs.code,
      deleted_by_employee_id: auth.data.employeeId,
      deleted_by_workspace_id: auth.data.workspaceId,
      timestamp: new Date().toISOString(),
    })

    // 真刪（service_role 繞 RLS）
    const serviceSupabase = getSupabaseAdminClient()
    const { error } = await serviceSupabase.from('workspaces').delete().eq('id', workspaceId)

    if (error) {
      logger.error('[AUDIT] workspace deletion failed', {
        target_workspace_id: workspaceId,
        error: error.message,
      })
      const t = translateDbError(error)
      return NextResponse.json({ error: t.message, code: t.code, field: t.field }, { status: t.httpStatus })
    }

    return NextResponse.json({
      success: true,
      deleted: { id: workspaceId, name: targetWs.name },
    })
  } catch (error) {
    logger.error('API Error', { path: request.nextUrl.pathname, error })
    return NextResponse.json({ success: false, error: '系統錯誤，請稍後再試' }, { status: 500 })
  }
}

/**
 * PATCH /api/workspaces/[id]
 * 更新租戶訂閱方案
 *
 * 存取規則：
 * - 必須有 workspaces.write capability
 * - 接受 { subscription_plan: PlanId }
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: workspaceId } = await params

    const auth = await getServerAuth()
    if (!auth.success) {
      return NextResponse.json({ error: '請先登入' }, { status: 401 })
    }

    // 必須有租戶管理寫入權限
    const { hasCapabilityByCode } = await import('@/app/api/lib/check-capability')
    const canWrite = await hasCapabilityByCode(auth.data.employeeId, 'workspaces.write')
    if (!canWrite) {
      return NextResponse.json({ error: '需租戶管理權限' }, { status: 403 })
    }

    const body = (await request.json()) as { subscription_plan?: string }
    const { subscription_plan } = body

    const VALID_PLANS = ['lite', 'standard', 'advance', 'premium', 'custom'] as const
    if (!subscription_plan || !(VALID_PLANS as readonly string[]).includes(subscription_plan)) {
      return NextResponse.json(
        { error: '無效的訂閱方案，必須是 lite / standard / advance / premium / custom' },
        { status: 400 }
      )
    }

    const supabase = getSupabaseAdminClient()

    // subscription_plan 是新欄位、typegen 尚未 regen，用 cast 繞過
    const { error } = await (supabase
      .from('workspaces')
      .update({ subscription_plan } as Record<string, unknown>)
      .eq('id', workspaceId) as unknown as Promise<{ error: unknown }>)

    if (error) {
      const t = translateDbError(error as Parameters<typeof translateDbError>[0])
      return NextResponse.json(
        { error: t.message, code: t.code, field: t.field },
        { status: t.httpStatus }
      )
    }

    return NextResponse.json({ success: true, subscription_plan })
  } catch (error) {
    logger.error('API Error', { path: request.nextUrl.pathname, error })
    return NextResponse.json({ success: false, error: '系統錯誤，請稍後再試' }, { status: 500 })
  }
}
