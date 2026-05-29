/**
 * GET  /api/workspaces/[id]/employee-quota — 查詢員工配額變更紀錄
 * PATCH /api/workspaces/[id]/employee-quota — 更新員工帳號上限（同步寫入變更紀錄）
 *
 * 守門：workspaces.write capability（跟其他租戶管理 API 對齊）
 *
 * 注意：workspace_employee_quota_logs 是新表、typegen 尚未 regen。
 * 所有對新表的讀寫都 cast 成 Record<string, unknown> 繞過型別。
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { getServerAuth } from '@/lib/auth/server-auth'
import { logger } from '@/lib/utils/logger'
import { translateDbError } from '@/lib/db-error-translate'

type QuotaLogRow = {
  id: string
  old_quota: number | null
  new_quota: number | null
  reason: string | null
  created_at: string
  changed_by: string | null
}

type EmployeeRow = {
  id: string
  display_name: string | null
  chinese_name: string | null
  english_name: string | null
  employee_number: string | null
}

// ─── GET ──────────────────────────────────────────────────────────────────────

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: workspaceId } = await params

    const auth = await getServerAuth()
    if (!auth.success) {
      return NextResponse.json({ error: '請先登入' }, { status: 401 })
    }

    const { hasCapabilityByCode } = await import('@/app/api/lib/check-capability')
    const canWrite = await hasCapabilityByCode(auth.data.employeeId, 'workspaces.write')
    if (!canWrite) {
      return NextResponse.json({ error: '需租戶管理權限' }, { status: 403 })
    }

    const supabase = getSupabaseAdminClient()

    // 查配額紀錄（新表 cast 繞過 typegen）
    const { data: rawLogs, error } = await (
      supabase as unknown as {
        from: (t: string) => {
          select: (s: string) => {
            eq: (
              col: string,
              val: string
            ) => {
              order: (
                col: string,
                opts: { ascending: boolean }
              ) => Promise<{ data: QuotaLogRow[] | null; error: { message: string } | null }>
            }
          }
        }
      }
    )
      .from('workspace_employee_quota_logs')
      .select('id, old_quota, new_quota, reason, created_at, changed_by')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false })

    if (error) {
      const t = translateDbError(error as Parameters<typeof translateDbError>[0])
      return NextResponse.json({ error: t.message }, { status: t.httpStatus })
    }

    const logs = rawLogs ?? []

    // 批次查詢操作人姓名
    const employeeIds = [...new Set(logs.map(l => l.changed_by).filter(Boolean) as string[])]
    let employeeMap: Map<string, EmployeeRow> = new Map()

    if (employeeIds.length > 0) {
      const { data: employees } = await supabase
        .from('employees')
        .select('id, display_name, chinese_name, english_name, employee_number')
        .in('id', employeeIds)

      for (const emp of employees ?? []) {
        employeeMap.set(emp.id, emp as EmployeeRow)
      }
    }

    const result = logs.map(log => ({
      id: log.id,
      old_quota: log.old_quota,
      new_quota: log.new_quota,
      reason: log.reason,
      created_at: log.created_at,
      changed_by_employee: log.changed_by ? (employeeMap.get(log.changed_by) ?? null) : null,
    }))

    // 目前配額 + 在職員工數（給編輯器顯示「目前 X / 上限 Y」）
    const { data: ws } = await supabase
      .from('workspaces')
      .select('max_employees')
      .eq('id', workspaceId)
      .single()
    const { count: employeeCount } = await supabase
      .from('employees')
      .select('id', { count: 'exact', head: true })
      .eq('workspace_id', workspaceId)
      .eq('is_active', true)

    return NextResponse.json({
      max_employees: (ws as { max_employees: number | null } | null)?.max_employees ?? null,
      employee_count: employeeCount ?? 0,
      logs: result,
    })
  } catch (error) {
    logger.error('[employee-quota GET]', error)
    return NextResponse.json({ error: '系統錯誤' }, { status: 500 })
  }
}

// ─── PATCH ────────────────────────────────────────────────────────────────────

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: workspaceId } = await params

    const auth = await getServerAuth()
    if (!auth.success) {
      return NextResponse.json({ error: '請先登入' }, { status: 401 })
    }

    const { hasCapabilityByCode } = await import('@/app/api/lib/check-capability')
    const canWrite = await hasCapabilityByCode(auth.data.employeeId, 'workspaces.write')
    if (!canWrite) {
      return NextResponse.json({ error: '需租戶管理權限' }, { status: 403 })
    }

    const body = (await request.json()) as { max_employees?: number | null; reason?: string }
    const newQuota = body.max_employees ?? null

    const supabase = getSupabaseAdminClient()

    // 讀取目前配額（比較用）
    const { data: current, error: fetchError } = await supabase
      .from('workspaces')
      .select('max_employees')
      .eq('id', workspaceId)
      .single()

    if (fetchError || !current) {
      return NextResponse.json({ error: '找不到租戶' }, { status: 404 })
    }

    const oldQuota: number | null =
      (current as { max_employees: number | null }).max_employees ?? null

    // 更新 workspaces.max_employees
    const { error: updateError } = await (supabase
      .from('workspaces')
      .update({ max_employees: newQuota } as Record<string, unknown>)
      .eq('id', workspaceId) as unknown as Promise<{ error: { message: string } | null }>)

    if (updateError) {
      const t = translateDbError(updateError as Parameters<typeof translateDbError>[0])
      return NextResponse.json({ error: t.message }, { status: t.httpStatus })
    }

    // 有變動才寫 log
    if (oldQuota !== newQuota) {
      const { error: logError } = await (
        supabase as unknown as {
          from: (t: string) => {
            insert: (row: Record<string, unknown>) => Promise<{ error: { message: string } | null }>
          }
        }
      )
        .from('workspace_employee_quota_logs')
        .insert({
          workspace_id: workspaceId,
          changed_by: auth.data.employeeId,
          old_quota: oldQuota,
          new_quota: newQuota,
          reason: body.reason ?? null,
        })

      if (logError) {
        // soft fail：配額已更新成功、log 失敗不整體 rollback
        logger.warn('[employee-quota PATCH] log insert failed:', logError.message)
      }
    }

    return NextResponse.json({ success: true, old_quota: oldQuota, new_quota: newQuota })
  } catch (error) {
    logger.error('[employee-quota PATCH]', error)
    return NextResponse.json({ error: '系統錯誤' }, { status: 500 })
  }
}
