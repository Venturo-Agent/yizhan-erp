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
import {
  calcInsuranceForEmployee,
  checkGradeCoverage,
  type GradeRow,
} from '@/lib/hr/salary-insurance-calc'

interface SalaryInfo {
  base_salary?: number
  insured_salary?: number | null
  attendance_bonus?: number
  other_allowances?: number
  allowances?: Array<{ amount?: number }>
  // 2026-05-15 William 拍板：薪資結算用
  pension_voluntary_rate?: number // 員工自願提撥率 0-0.06
  dependents_count?: number // 健保眷屬總數
  chargeable_dependents_count?: number // 計費眷屬（免費眷屬不算、2026-05-22 加）
  salary_mode?: 'gross' | 'net' // gross 含勞健保（預設）/ net 實給（公司多承擔）
  labor_insured_here?: boolean // 勞保是否在本公司（含勞退）
  health_insured_here?: boolean // 健保是否在本公司
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
  const { period, notes, excluded_employee_ids } = body as {
    period?: string
    notes?: string
    excluded_employee_ids?: string[]
  }

  // 驗證 period 格式：YYYY-MM
  if (!period || !/^\d{4}-\d{2}$/.test(period)) {
    return NextResponse.json(
      { error: '期間格式錯誤、應為 YYYY-MM（譬如 2026-05）' },
      { status: 400 }
    )
  }

  // 2026-05-22 William 拍板：支援排除員工（譬如離職、那期不出薪）
  const excludedIds = Array.isArray(excluded_employee_ids) ? excluded_employee_ids : []

  // 2026-05-22 Phase 4 William 拍板：勞健保 / 勞退級距覆蓋檢查
  // 強制：period 對應的三 kind 級距都必須存在、否則 reject
  const supabaseForGrades = getSupabaseAdminClient() as unknown as SupabaseClient
  const { data: gradesData, error: gradesErr } = await supabaseForGrades
    .from('ref_insurance_salary_grades')
    .select('kind, monthly_amount, effective_from, effective_until')
  if (gradesErr) {
    return NextResponse.json({ error: '載入級距表失敗、無法結算' }, { status: 500 })
  }
  const allGrades: GradeRow[] = (gradesData || []) as GradeRow[]
  const coverage = checkGradeCoverage(allGrades, period)
  if (!coverage.ok) {
    const kindMap = { labor: '勞保', health: '健保', pension: '勞退' } as const
    const missing = coverage.missing.map(k => kindMap[k]).join(' / ')
    return NextResponse.json(
      {
        error: `${period} 沒對應的「${missing}」級距、無法結算。請先到「共用資料管理 → 勞健保級距」更新今年的級距表`,
      },
      { status: 400 }
    )
  }
  // 按 period 篩出有效級距、再按 kind 分組
  const periodFirstDay = `${period}-01`
  const gradesByKind = {
    labor: allGrades.filter(
      g =>
        g.kind === 'labor' &&
        g.effective_from <= periodFirstDay &&
        (g.effective_until === null || g.effective_until >= periodFirstDay)
    ),
    health: allGrades.filter(
      g =>
        g.kind === 'health' &&
        g.effective_from <= periodFirstDay &&
        (g.effective_until === null || g.effective_until >= periodFirstDay)
    ),
    pension: allGrades.filter(
      g =>
        g.kind === 'pension' &&
        g.effective_from <= periodFirstDay &&
        (g.effective_until === null || g.effective_until >= periodFirstDay)
    ),
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

  // 2. Auto-pull active employees（過濾掉 user 排除的員工）
  let employeeQuery = supabase
    .from('employees')
    .select('id, display_name, employee_number, monthly_salary, salary_info')
    .eq('workspace_id', guard.workspaceId)
    .eq('status', 'active')

  if (excludedIds.length > 0) {
    // PostgREST .not('id','in', ...) 需要 (id1,id2,id3) 字串格式
    employeeQuery = employeeQuery.not('id', 'in', `(${excludedIds.map(id => `"${id}"`).join(',')})`)
  }

  const { data: employees, error: empError } = await employeeQuery

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
    const allowancesSum = allowancesArr.reduce((sum: number, a) => sum + Number(a?.amount ?? 0), 0)

    // 2026-05-22 Phase 4：用 salary-insurance-calc SSOT 算勞健保 / 勞退
    // 級距自動配對（base_salary lookup ref_insurance_salary_grades）
    // 員工自付 = 勞保(20%) + 健保(30% × 1+眷屬) + 勞退自願
    // 雇主負擔 = 勞保(70%) + 健保(60%) + 勞退(6%)
    const calc = calcInsuranceForEmployee(
      {
        base_salary: base,
        insured_salary_override: info.insured_salary,
        dependents_count: info.dependents_count,
        chargeable_dependents_count: info.chargeable_dependents_count,
        pension_voluntary_rate: info.pension_voluntary_rate,
        labor_insured_here: info.labor_insured_here,
        health_insured_here: info.health_insured_here,
        salary_mode: info.salary_mode,
      },
      gradesByKind
    )

    // 2026-05-22 William 拍板：依 salary_mode 算應發 / 實領（gross=從 base 扣 / net=base+自付）
    const grossPay = calc.gross_pay_calc + attendance + other + allowancesSum
    const netPay = grossPay - calc.employee_deductions_total

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
      deductions: calc.employee_deductions_total,
      total_amount: netPay,
      breakdown: {
        source: 'employees.salary_info + ref_insurance_salary_grades',
        snapshot: info,
        calc: {
          // 投保薪資（級距自動配對）
          insured_salary_labor: calc.insured_salary_labor,
          insured_salary_health: calc.insured_salary_health,
          insured_salary_pension: calc.insured_salary_pension,
          // 員工自付
          labor_employee: calc.labor_employee,
          health_employee: calc.health_employee,
          pension_voluntary: calc.pension_voluntary,
          employee_deductions_total: calc.employee_deductions_total,
          // 雇主負擔
          labor_employer: calc.labor_employer,
          health_employer: calc.health_employer,
          pension_employer: calc.pension_employer,
          employer_burden_total: calc.employer_burden_total,
          // 應發 / 實領 / 公司支出
          gross_pay: grossPay,
          net_pay: netPay,
          company_total_cost: grossPay + calc.employer_burden_total,
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
