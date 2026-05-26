import { NextResponse } from 'next/server'
import { getServerAuth } from '@/lib/auth/server-auth'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { computeSetupStatus } from '@/lib/setup/check-status'
import { dbErrorResponse } from '@/lib/db-error-translate'
import { logger } from '@/lib/utils/logger'
import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * GET /api/setup/status
 *
 * 回傳當前 workspace 的 setup 狀態 + todos。
 * UI 用此判斷要不要顯示 setup banner。
 */
export async function GET() {
  const auth = await getServerAuth()
  if (!auth.success) {
    return NextResponse.json({ error: '請先登入' }, { status: 401 })
  }

  const workspaceId = auth.data.workspaceId
  // workspaces 有 setup_completed_at / setup_banner_dismissed_at 等欄位尚未納入生成類型
  const supabase = getSupabaseAdminClient() as unknown as SupabaseClient

  try {
    const [workspaceRes, banksRes, methodsRes, employeesRes] = await Promise.all([
      supabase
        .from('workspaces')
        .select(
          'id, name, tax_id, transfer_fee_mode, leave_policy, pension_system, default_billing_day_of_week, setup_completed_at, setup_banner_dismissed_at, logo_url, company_seal_url, contract_seal_image_url'
        )
        .eq('id', workspaceId)
        .maybeSingle(),
      supabase
        .from('bank_accounts')
        .select('id', { count: 'exact', head: true })
        .eq('workspace_id', workspaceId)
        .eq('is_active', true)
        .eq('is_disbursement_eligible', true),
      supabase
        .from('payment_methods')
        .select('id', { count: 'exact', head: true })
        .eq('workspace_id', workspaceId)
        .eq('is_active', true),
      supabase
        .from('employees')
        .select('id', { count: 'exact', head: true })
        .eq('workspace_id', workspaceId)
        .neq('status', 'terminated'),
    ])

    if (!workspaceRes.data) {
      return NextResponse.json({ error: '找不到 workspace' }, { status: 404 })
    }

    const status = computeSetupStatus({
      workspace: workspaceRes.data,
      bank_accounts_count: banksRes.count ?? 0,
      payment_methods_count: methodsRes.count ?? 0,
      employees_count: employeesRes.count ?? 0,
    })

    return NextResponse.json(status)
  } catch (err) {
    logger.error('GET /api/setup/status failed', err)
    return NextResponse.json({ error: '查詢 setup 狀態失敗' }, { status: 500 })
  }
}

/**
 * POST /api/setup/status
 *
 * 動作：
 *   - action='mark_complete'：把 setup_completed_at 設 now()
 *   - action='dismiss_banner'：把 setup_banner_dismissed_at 設 now()（讓 banner 不再顯示）
 */
export async function POST(request: Request) {
  const auth = await getServerAuth()
  if (!auth.success) {
    return NextResponse.json({ error: '請先登入' }, { status: 401 })
  }

  const body = (await request.json().catch(() => ({}))) as { action?: string }
  if (!body.action || !['mark_complete', 'dismiss_banner'].includes(body.action)) {
    return NextResponse.json(
      { error: 'action 必填、必須是 mark_complete / dismiss_banner' },
      { status: 400 }
    )
  }

  const workspaceId = auth.data.workspaceId
  // workspaces 有 setup_completed_at / setup_banner_dismissed_at 等欄位尚未納入生成類型
  const supabase = getSupabaseAdminClient() as unknown as SupabaseClient

  const update =
    body.action === 'mark_complete'
      ? { setup_completed_at: new Date().toISOString() }
      : { setup_banner_dismissed_at: new Date().toISOString() }

  const { error } = await supabase.from('workspaces').update(update).eq('id', workspaceId)

  if (error) {
    logger.error('POST /api/setup/status failed', error)
    return dbErrorResponse(error)
  }

  return NextResponse.json({ success: true })
}
