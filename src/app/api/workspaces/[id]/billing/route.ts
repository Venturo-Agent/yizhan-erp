/**
 * /api/workspaces/[id]/billing
 *
 * 租戶費用紀錄：訂閱方案資訊 + 歷史付款紀錄。
 *
 * 守門：
 *   - GET：自己 workspace 任何登入用戶可讀；別的 workspace 要 workspaces.write
 *   - POST：必須有 workspaces.write capability（新增付款紀錄）
 *
 * 設計：
 *   - GET 同時回 subscription（訂閱方案 + 下次到期）+ records（歷史付款）
 *   - POST 只新增 records、不動 subscription（subscription 改 phase 2 或另開 PUT）
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerAuth } from '@/lib/auth/server-auth'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { logger } from '@/lib/utils/logger'
import { translateDbError } from '@/lib/db-error-translate'
import { createApiClient } from '@/lib/supabase/api-client'
import { recordApiAuditContext } from '@/lib/audit/audit-helper'
import { CAPABILITIES } from '@/lib/permissions/capabilities'

const ALLOWED_STATUS = ['pending', 'paid', 'overdue'] as const
type BillingStatus = (typeof ALLOWED_STATUS)[number]

interface BillingRecordCreateBody {
  amount: number
  period_start: string
  period_end: string
  status?: BillingStatus
  paid_at?: string | null
  notes?: string | null
}

/**
 * GET /api/workspaces/[id]/billing
 *
 * 回傳：
 * {
 *   subscription: { plan: 'monthly' | 'quarterly' | 'annual' | null, period_end: string | null },
 *   records: [...]
 * }
 */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: workspaceId } = await params

  const auth = await getServerAuth()
  if (!auth.success) {
    return NextResponse.json({ error: '請先登入' }, { status: 401 })
  }

  if (workspaceId !== auth.data.workspaceId) {
    const { hasCapabilityByCode } = await import('@/app/api/lib/check-capability')
    const allowed = await hasCapabilityByCode(auth.data.employeeId, CAPABILITIES.WORKSPACES_WRITE)
    if (!allowed) {
      return NextResponse.json({ error: '不能讀取其他公司的費用紀錄' }, { status: 403 })
    }
  }

  const supabase = getSupabaseAdminClient()

  // 訂閱方案資訊（從 workspaces 表取）
  const { data: ws, error: wsError } = await supabase
    .from('workspaces')
    .select('subscription_plan, subscription_period_end')
    .eq('id', workspaceId)
    .single()

  if (wsError || !ws) {
    return NextResponse.json({ error: '找不到租戶' }, { status: 404 })
  }

  // 歷史付款紀錄
  const { data: records, error: recordsError } = await supabase
    .from('workspace_billing_records')
    .select('id, amount, period_start, period_end, status, paid_at, notes, created_at, updated_at')
    .eq('workspace_id', workspaceId)
    .order('period_start', { ascending: false })
    .limit(100)

  if (recordsError) {
    logger.error('workspace billing records fetch error', { error: recordsError, workspaceId })
    return NextResponse.json({ error: '系統錯誤' }, { status: 500 })
  }

  return NextResponse.json({
    subscription: {
      plan: ws.subscription_plan ?? null,
      period_end: ws.subscription_period_end ?? null,
    },
    records: records ?? [],
  })
}

/**
 * POST /api/workspaces/[id]/billing
 *
 * 新增一筆付款紀錄。要 workspaces.write capability。
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: workspaceId } = await params

  const auth = await getServerAuth()
  if (!auth.success) {
    return NextResponse.json({ error: '請先登入' }, { status: 401 })
  }

  const { hasCapabilityByCode } = await import('@/app/api/lib/check-capability')
  const allowed = await hasCapabilityByCode(auth.data.employeeId, CAPABILITIES.WORKSPACES_WRITE)
  if (!allowed) {
    return NextResponse.json({ error: '需租戶管理權限' }, { status: 403 })
  }

  const auditClient = await createApiClient()
  await recordApiAuditContext(auditClient, {
    actorId: auth.data.employeeId,
    reason: '新增租戶費用紀錄',
    requestId: workspaceId,
  })

  let body: BillingRecordCreateBody
  try {
    body = (await request.json()) as BillingRecordCreateBody
  } catch {
    return NextResponse.json({ error: '請求格式錯誤' }, { status: 400 })
  }

  // amount：必填、>= 0
  if (typeof body.amount !== 'number' || !isFinite(body.amount) || body.amount < 0) {
    return NextResponse.json({ error: 'amount 必須為非負數' }, { status: 400 })
  }

  // period_start / period_end：必填、合法日期、start <= end
  if (!body.period_start || !body.period_end) {
    return NextResponse.json({ error: 'period_start / period_end 必填' }, { status: 400 })
  }
  const start = new Date(body.period_start)
  const end = new Date(body.period_end)
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return NextResponse.json({ error: 'period 日期格式錯誤' }, { status: 400 })
  }
  if (start > end) {
    return NextResponse.json({ error: 'period_start 不能晚於 period_end' }, { status: 400 })
  }

  const status: BillingStatus = body.status ?? 'pending'
  if (!ALLOWED_STATUS.includes(status)) {
    return NextResponse.json(
      { error: `status 必須是 ${ALLOWED_STATUS.join(' / ')}` },
      { status: 400 }
    )
  }

  // paid_at：status = paid 時必填、其他狀態忽略
  let paidAt: string | null = null
  if (status === 'paid') {
    if (body.paid_at) {
      const paidDate = new Date(body.paid_at)
      if (isNaN(paidDate.getTime())) {
        return NextResponse.json({ error: 'paid_at 日期格式錯誤' }, { status: 400 })
      }
      paidAt = paidDate.toISOString()
    } else {
      paidAt = new Date().toISOString()
    }
  }

  const notes = typeof body.notes === 'string' ? body.notes : null

  const supabase = getSupabaseAdminClient()
  const { data, error } = await supabase
    .from('workspace_billing_records')
    .insert({
      workspace_id: workspaceId,
      amount: body.amount,
      period_start: body.period_start,
      period_end: body.period_end,
      status,
      paid_at: paidAt,
      notes,
    })
    .select('id, amount, period_start, period_end, status, paid_at, notes, created_at, updated_at')
    .single()

  if (error) {
    logger.error('workspace billing record insert error', { error, workspaceId })
    const t = translateDbError(error)
    return NextResponse.json(
      { error: t.message, code: t.code, field: t.field },
      { status: t.httpStatus }
    )
  }

  return NextResponse.json(data, { status: 201 })
}
