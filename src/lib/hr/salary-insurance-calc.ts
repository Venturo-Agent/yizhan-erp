/**
 * salary-insurance-calc.ts
 *
 * 薪資結算的勞健保 / 勞退計算 SSOT。
 *
 * 2026-05-22 William 拍板：
 *   - 用 monthly_salary 從 ref_insurance_salary_grades 自動配對「投保薪資」級距
 *   - 算勞保員工自付（20%）+ 雇主負擔（70%）+ 政府（10%）
 *   - 算健保員工自付（30%）+ 雇主負擔（60%）+ 政府（10%）、含眷屬倍數
 *   - 算勞退雇主強制 6% + 員工自願 0-6%
 *   - 若 period 沒對應級距（譬如 2027/01 沒更新）→ throw、強制 user 先更新
 *
 * 費率寫在這（每年若費率變、改這檔）：
 *   - 勞保：12.5%、員工 20% / 雇主 70% / 政府 10%
 *   - 健保：5.17%、員工 30% / 雇主 60% / 政府 10%
 *   - 勞退：雇主強制 6%、員工自願 0-6%
 */

// 費率（每年費率變動時改這）
export const RATES = {
  labor: { total: 0.125, employee: 0.2, employer: 0.7, government: 0.1 },
  health: { total: 0.0517, employee: 0.3, employer: 0.6, government: 0.1 },
  pension: { employer: 0.06 }, // 員工自願從 salary_info.pension_voluntary_rate 取
} as const

export interface GradeRow {
  kind: 'labor' | 'health' | 'pension'
  monthly_amount: number
  effective_from: string
  effective_until: string | null
}

/**
 * 配對級距：給薪資 X、找「monthly_amount >= X」的最小級距
 * 超過最高級距 → 用最高（譬如月薪 50 萬、勞保最高 45,800）
 *
 * @param grades 該 kind 在 period 有效的級距（已 sort asc by monthly_amount）
 * @param salary 員工月薪
 * @returns 投保薪資（級距 monthly_amount）
 */
export function findGradeAmount(grades: GradeRow[], salary: number): number {
  if (grades.length === 0) return salary // 沒級距 → fallback 用本薪
  const sorted = [...grades].sort((a, b) => a.monthly_amount - b.monthly_amount)
  // 找第一個 >= salary 的級距
  for (const g of sorted) {
    if (g.monthly_amount >= salary) return g.monthly_amount
  }
  // 超過最高級距 → 用最高
  return sorted[sorted.length - 1].monthly_amount
}

/**
 * 檢查某 period（YYYY-MM）三 kind 的級距是否都有覆蓋
 * 用於 settlement 建立前、防止用過期級距算錯數字
 *
 * @param allGrades 全部級距 row（不分 kind / effective）
 * @param period YYYY-MM
 * @returns { ok: true } 或 { ok: false, missing: kind[] }
 */
export function checkGradeCoverage(
  allGrades: GradeRow[],
  period: string
): { ok: true } | { ok: false; missing: Array<'labor' | 'health' | 'pension'> } {
  // period 第一日（譬如 '2026-05' → '2026-05-01'）
  const periodFirstDay = `${period}-01`
  const kinds: Array<'labor' | 'health' | 'pension'> = ['labor', 'health', 'pension']
  const missing: Array<'labor' | 'health' | 'pension'> = []
  for (const kind of kinds) {
    const hasCoverage = allGrades.some(
      (g) =>
        g.kind === kind &&
        g.effective_from <= periodFirstDay &&
        (g.effective_until === null || g.effective_until >= periodFirstDay)
    )
    if (!hasCoverage) missing.push(kind)
  }
  return missing.length === 0 ? { ok: true } : { ok: false, missing }
}

export interface CalcInput {
  base_salary: number // 月薪本薪（gross mode）或實給薪資（net mode）
  insured_salary_override?: number | null // 若 user 自己填、優先用（少數高薪員工往上加保的場景）
  dependents_count?: number // 健保眷屬總數（給 HR 看、不算錢）
  chargeable_dependents_count?: number // 計費眷屬數（健保自付按此算、免費眷屬不算）2026-05-22
  pension_voluntary_rate?: number // 0-0.06 員工自願提撥率
  labor_insured_here?: boolean // 預設 true、不在本公司則 skip
  health_insured_here?: boolean // 預設 true
  /**
   * 薪資模式（2026-05-22 William 拍板）：
   * - 'gross'（預設）：base_salary = 總薪資（含勞健保自付）、員工實領 = base - 自付
   * - 'net'：base_salary = 實給薪資（員工拿到手）、應發 = base + 自付（公司多承擔員工那份）
   */
  salary_mode?: 'gross' | 'net'
}

export interface CalcResult {
  insured_salary_labor: number
  insured_salary_health: number
  insured_salary_pension: number
  // 員工負擔
  labor_employee: number
  health_employee: number
  pension_voluntary: number
  employee_deductions_total: number
  // 雇主負擔
  labor_employer: number
  health_employer: number
  pension_employer: number
  employer_burden_total: number
  // 2026-05-22 加：gross / net 模式下的實際應發 / 實領
  gross_pay_calc: number // 應發（給薪資請款用）
  net_pay_calc: number // 實領（員工拿到手）
  salary_mode_used: 'gross' | 'net'
}

/**
 * 算一個員工的勞健保 / 勞退（員工負擔 + 雇主負擔）
 *
 * @param input 員工 salary_info 相關資料
 * @param grades 該 period 有效的級距（按 kind 分組）
 */
export function calcInsuranceForEmployee(
  input: CalcInput,
  grades: { labor: GradeRow[]; health: GradeRow[]; pension: GradeRow[] }
): CalcResult {
  const base = Number(input.base_salary || 0)
  // 2026-05-22：計費眷屬優先用 chargeable_dependents_count、fallback dependents_count
  const dependentsTotal = Math.max(0, Number(input.dependents_count || 0))
  const chargeable = Math.max(0, Number(input.chargeable_dependents_count ?? dependentsTotal))
  const voluntaryRate = Math.min(0.06, Math.max(0, Number(input.pension_voluntary_rate || 0)))
  const laborHere = input.labor_insured_here !== false
  const healthHere = input.health_insured_here !== false
  const mode = input.salary_mode ?? 'gross'

  // 投保薪資（級距配對、user 可 override）
  const overrideAmt = input.insured_salary_override
  const insuredLabor = overrideAmt && overrideAmt > 0 ? overrideAmt : findGradeAmount(grades.labor, base)
  const insuredHealth = overrideAmt && overrideAmt > 0 ? overrideAmt : findGradeAmount(grades.health, base)
  const insuredPension = overrideAmt && overrideAmt > 0 ? overrideAmt : findGradeAmount(grades.pension, base)

  // 勞保（laborHere=true 才算）
  const laborTotal = laborHere ? insuredLabor * RATES.labor.total : 0
  const laborEmployee = Math.round(laborTotal * RATES.labor.employee)
  const laborEmployer = Math.round(laborTotal * RATES.labor.employer)

  // 健保（healthHere=true 才算、員工負擔含計費眷屬倍數）
  const healthTotal = healthHere ? insuredHealth * RATES.health.total : 0
  const healthEmployee = Math.round(healthTotal * RATES.health.employee * (1 + chargeable))
  const healthEmployer = Math.round(healthTotal * RATES.health.employer)

  // 勞退（laborHere=true 才算）
  const pensionEmployer = laborHere ? Math.round(insuredPension * RATES.pension.employer) : 0
  const pensionVoluntary = laborHere ? Math.round(insuredPension * voluntaryRate) : 0

  const employeeDeductionsTotal = laborEmployee + healthEmployee + pensionVoluntary
  const employerBurdenTotal = laborEmployer + healthEmployer + pensionEmployer

  // 2026-05-22 William 拍板：gross / net 模式
  // gross: 應發 = base、實領 = base - 自付（員工自付從本薪扣）
  // net:   應發 = base + 自付、實領 = base（員工拿到 base、公司多承擔員工那份）
  let grossPayCalc: number
  let netPayCalc: number
  if (mode === 'net') {
    grossPayCalc = base + employeeDeductionsTotal
    netPayCalc = base
  } else {
    grossPayCalc = base
    netPayCalc = base - employeeDeductionsTotal
  }

  return {
    insured_salary_labor: laborHere ? insuredLabor : 0,
    insured_salary_health: healthHere ? insuredHealth : 0,
    insured_salary_pension: laborHere ? insuredPension : 0,
    labor_employee: laborEmployee,
    health_employee: healthEmployee,
    pension_voluntary: pensionVoluntary,
    employee_deductions_total: employeeDeductionsTotal,
    labor_employer: laborEmployer,
    health_employer: healthEmployer,
    pension_employer: pensionEmployer,
    employer_burden_total: employerBurdenTotal,
    gross_pay_calc: grossPayCalc,
    net_pay_calc: netPayCalc,
    salary_mode_used: mode,
  }
}
