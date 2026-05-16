/**
 * /api/hr/salary-settlements
 *
 * GET — 列當前 workspace 所有薪資結算 batch
 * POST — 新增 batch（指定 period、auto-pull active employees 計算薪資）
 *
 * Capability：hr_salary_settlement.read / write
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireCapability } from '@/lib/auth/require-capability'
import { CAPABILITIES } from '@/lib/permissions/capabilities'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { recordApiAuditContext } from '@/lib/audit/audit-helper'
import { translateDbError } from '@/lib/db-error-translate'
import { logger } from '@/lib/utils/logger'
import { apiHandler } from '@/lib/api/api-handler'
import type { SupabaseClient } from '@supabase/supabase-js'

interface SalaryInfo {
  base_salary?: number
  insured_salary?: number | null
  attendance_bonus?: number
  other_allowances?: number
  allowances?: Array<{ amount?: number }>
  // 2026-05-15 William 拍板：薪資結算用
  pension_voluntary_rate?: number  // 員工自願提撥率 0-0.06
  dependents_count?: number  // 健保眷屬數（之後算健保用、此 phase 不算）
  labor_insured_here?: boolean  // 勞保是否在本公司（含勞退）
  health_insured_here?: boolean  // 健保是否在本公司
}

/**
 * GET /api/hr/salary-settlements
 * 列出 workspace 內所有 salary settlement batch、按 period desc 排序
 */
export const GET = apiHandler(async () => {
  const guard = await requireCapability(CAPABILITIES.HR_SALARY_SETTLEMENT_READ)
  if (!guard.ok) return guard.response

  // salary_settlements 尚未納入生成類型，用 unknown 中轉
  const supabase = getSupabaseAdminClient() as unknown as SupabaseClient
  const { data, error } = await supabase
    .from('salary_settlements')
    .select(
      'id, period, status, total_amount, employee_count, payment_request_id, notes, submitted_at, created_at, updated_at'
    )
    .eq('workspace_id', guard.workspaceId)
    .order('period', { ascending: false })

  if (error) {
    const t = translateDbError(error)
    return NextResponse.json({ error: t.message }, { status: t.httpStatus })
  }

  return NextResponse.json({ data: data ?? [] })
})

/**
 * POST /api/hr/salary-settlements
 * 新增一個薪資結算 batch
 *
 * Body: { period: 'YYYY-MM', notes?: string }
 *
 * 流程：
 *   1. 驗證 period 格式
 *   2. transaction：建 salary_settlements + auto-pull 該 workspace 所有 active employees
 *   3. 每員工算 base_salary + attendance_bonus + other_allowances → 一筆 settlement_items
 *   4. 回傳新 settlement id（caller 跳轉到 detail 頁）
 */
export const POST = apiHandler(async (request: NextRequest) => {
  const guard = await requireCapability(CAPABILITIES.HR_SALARY_SETTLEMENT_WRITE)
  if (!guard.ok) return guard.response

  const body = await request.json().catch(() => ({}))
  const { period, notes } = body as { period?: string; notes?: string }

  // 驗證 period 格式：YYYY-MM
  if (!period || !/^\d{4}-\d{2}$/.test(period)) {
    return NextResponse.json(
      { error: '期間格式錯誤、應為 YYYY-MM（譬如 2026-05）' },
      { status: 400 }
    )
  }

  // salary_settlements 尚未納入生成類型，用 unknown 中轉
  const supabase = getSupabaseAdminClient() as unknown as SupabaseClient
  await recordApiAuditContext(supabase, {
    actorId: guard.employeeId,
    reason: `建立薪資結算 batch（${period}）`,
  })

  // 1. 建 settlement (status=draft)
  const { data: settlement, error: settlementError } = await supabase
    .from('salary_settlements')
    .insert({
      workspace_id: guard.workspaceId,
      period,
      status: 'draft',
      total_amount: 0,
      employee_count: 0,
      notes: notes ?? null,
      created_by: guard.employeeId,
      updated_by: guard.employeeId,
    })
    .select('id')
    .single()

  if (settlementError) {
    if (settlementError.code === '23505') {
      return NextResponse.json(
        { error: `期間 ${period} 已存在結算 batch、不可重複建` },
        { status: 409 }
      )
    }
    const t = translateDbError(settlementError)
    return NextResponse.json({ error: t.message }, { status: t.httpStatus })
  }

  // 2. Auto-pull active employees
  const { data: employees, error: empError } = await supabase
    .from('employees')
    .select('id, display_name, employee_number, monthly_salary, salary_info')
    .eq('workspace_id', guard.workspaceId)
    .eq('status', 'active')

  if (empError) {
    logger.error('Salary settlement: failed to pull employees', empError)
    // 回滾：砍剛建的 settlement
    await supabase.from('salary_settlements').delete().eq('id', settlement.id)
    return NextResponse.json({ error: '載入員工失敗' }, { status: 500 })
  }

  if (!employees || employees.length === 0) {
    return NextResponse.json({
      data: { id: settlement.id, period, employee_count: 0, total_amount: 0 },
      warning: 'workspace 沒有 active 員工、batch 已建但無項目',
    })
  }

  // 3. 計算每員工薪資（從 salary_info JSONB 取）
  // 2026-05-15 William 拍板：算勞退（雇主 6%）+ 員工自願提撥、健保暫不算
  type EmpRow = {
    id: string
    display_name: string | null
    employee_number: string | null
    monthly_salary: number | null
    salary_info: SalaryInfo | null
  }
  const items = (employees as EmpRow[]).map((emp: EmpRow) => {
    const info = (emp.salary_info ?? {}) as SalaryInfo
    const base = Number(info.base_salary ?? emp.monthly_salary ?? 0)
    const attendance = Number(info.attendance_bonus ?? 0)
    const other = Number(info.other_allowances ?? 0)
    const allowancesArr = Array.isArray(info.allowances) ? info.allowances : []
    const allowancesSum = allowancesArr.reduce(
      (sum: number, a) => sum + Number(a?.amount ?? 0),
      0
    )

    // 投保薪資（勞退月提繳工資）— 用 salary_info.insured_salary、若無則 fallback base_salary
    const insuredSalary = Number(info.insured_salary ?? base)
    // 勞保是否在本公司（含勞退）— 預設 true
    const laborHere = info.labor_insured_here !== false
    // 自願提撥率（0-0.06）
    const voluntaryRate = Number(info.pension_voluntary_rate ?? 0)

    // 勞退（雇主強制 6%、員工自願 0-6%）— 勞保不在本公司則 skip
    const pensionEmployer = laborHere ? Math.round(insuredSalary * 0.06) : 0
    const pensionVoluntary = laborHere ? Math.round(insuredSalary * voluntaryRate) : 0

    // 員工負擔合計（暫只算自願提撥、勞健保員工負擔 phase 4 之後做）
    const employeeDeductions = pensionVoluntary

    // 員工應發（gross） = 本薪 + 津貼 + 勤獎 + 其他
    const grossPay = base + attendance + other + allowancesSum
    // 員工實領 = gross - 員工負擔
    const netPay = grossPay - employeeDeductions

    return {
      settlement_id: settlement.id,
      workspace_id: guard.workspaceId,
      employee_id: emp.id,
      employee_name: emp.display_name ?? '(未填名稱)',
      employee_number: emp.employee_number ?? null,
      base_salary: base,
      allowances: allowancesSum,
      attendance_bonus: attendance,
      other_allowances: other,
      deductions: employeeDeductions,
      // total_amount 沿用既有：表示「員工實領」（之後可改 gross / net 兩個欄位）
      total_amount: netPay,
      breakdown: {
        source: 'employees.salary_info',
        snapshot: info,
        // 2026-05-15 加：勞退 / 自願提撥計算明細
        calc: {
          insured_salary: insuredSalary,
          labor_insured_here: laborHere,
          pension_employer: pensionEmployer,       // 雇主強制 6%
          pension_voluntary: pensionVoluntary,     // 員工自願
          pension_voluntary_rate: voluntaryRate,
          gross_pay: grossPay,                     // 應發
          net_pay: netPay,                         // 實領
          // 公司支出 = 應發 + 雇主負擔（之後加勞健保雇主負擔）
          company_total_cost: grossPay + pensionEmployer,
        },
      },
    }
  })

  const { error: itemsError } = await supabase.from('salary_settlement_items').insert(items)

  if (itemsError) {
    logger.error('Salary settlement: failed to insert items', itemsError)
    await supabase.from('salary_settlements').delete().eq('id', settlement.id)
    const t = translateDbError(itemsError)
    return NextResponse.json({ error: t.message }, { status: t.httpStatus })
  }

  // 4. 更新 batch 的聚合數據
  const totalAmount = items.reduce((sum, it) => sum + it.total_amount, 0)
  await supabase
    .from('salary_settlements')
    .update({
      total_amount: totalAmount,
      employee_count: items.length,
    })
    .eq('id', settlement.id)

  return NextResponse.json({
    data: {
      id: settlement.id,
      period,
      status: 'draft',
      employee_count: items.length,
      total_amount: totalAmount,
    },
  })
})
