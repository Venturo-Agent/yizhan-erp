/**
 * GET /api/roles/[roleId]/eligibility-defaults
 *
 * 給 role_id、回該 role 在 role_capabilities 中啟用的「執行型資格」對應 eligibility codes。
 *
 * 用途：新增員工選 role 時、預設帶這些 eligibility checkbox（HR 可手動取消）。
 *
 * 邏輯：
 *   role_capabilities 中 capability_code 形如 'tours.as_sales.write' / 'finance.advance_payment.write'、
 *   去掉 '.write' 後 → 'tours.as_sales' / 'finance.advance_payment'、
 *   intersect ELIGIBILITY_CODES 白名單。
 *
 * 5/13 William 拍板：role 是預設模板、員工 eligibility 是真相。
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireCapability } from '@/lib/auth/require-capability'
import { CAPABILITIES } from '@/lib/permissions/capabilities'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { dbErrorResponse } from '@/lib/db-error-translate'
import { ELIGIBILITY_CODE_SET } from '@/lib/eligibilities'
import { logger } from '@/lib/utils/logger'

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ roleId: string }> },
) {
  try {
    const { roleId } = await ctx.params
    const guard = await requireCapability(CAPABILITIES.HR_READ_ROLES)
    if (!guard.ok) return guard.response

    const client = getSupabaseAdminClient()

    // 先確認 role 屬於當前 workspace（防越界）
    const { data: role, error: roleErr } = await client
      .from('workspace_roles')
      .select('workspace_id')
      .eq('id', roleId)
      .single()

    if (roleErr) return dbErrorResponse(roleErr)
    if (!role || role.workspace_id !== guard.workspaceId) {
      return NextResponse.json({ data: [] })
    }

    const { data, error } = await client
      .from('role_capabilities')
      .select('capability_code')
      .eq('role_id', roleId)
      .eq('enabled', true)
      .like('capability_code', '%.write')

    if (error) return dbErrorResponse(error)

    const eligibilityCodes = (data || [])
      .map((row) => row.capability_code.replace(/\.write$/, ''))
      .filter((code) => ELIGIBILITY_CODE_SET.has(code))

    return NextResponse.json({ data: Array.from(new Set(eligibilityCodes)) })
  } catch (error) {
    logger.error('API Error', { path: _req.nextUrl.pathname, error })
    return NextResponse.json({ success: false, error: '系統錯誤，請稍後再試' }, { status: 500 })
  }
}
