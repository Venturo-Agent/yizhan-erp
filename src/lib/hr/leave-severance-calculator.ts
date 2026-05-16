/**
 * HR 計算 service：特休天數 + 資遣費 + 平均工資
 *
 * 2026-05-15 William 拍板：
 *   - 特休依勞基法第 38 條
 *   - 資遣費依勞工退休金條例第 12 條（新制 0.5 月/年上限 6 月）+ 勞基法第 17 條（舊制 1 月/年）
 *
 * 來源：勞動部
 */

export type LeavePolicy = 'calendar_year' | 'hire_anniversary'
export type PensionSystem = 'old' | 'new' | 'mixed'

// 勞退新制施行日：2005-07-01
const NEW_PENSION_START = new Date('2005-07-01')

// ─────────────────────────────────────────────────────────────────────────────
// 特休天數計算（勞基法第 38 條）

/**
 * 給定年資（以年為單位、小數）、回傳「該年資對應的法定特休天數」
 *
 * 法規：
 *   6m-1y → 3、1-2y → 7、2-3y → 10、3-5y → 14、5-10y → 15
 *   10y 以上每年 +1、上限 30
 */
export function annualLeaveDaysByTenure(yearsOfService: number): number {
  if (yearsOfService < 0.5) return 0
  if (yearsOfService < 1) return 3
  if (yearsOfService < 2) return 7
  if (yearsOfService < 3) return 10
  if (yearsOfService < 5) return 14
  if (yearsOfService < 10) return 15
  // 10 年以上：15 + (年資 - 10) 取整、上限 30
  const extra = Math.floor(yearsOfService - 10) + 1
  return Math.min(30, 15 + extra)
}

/**
 * 算員工在指定日期當下的「年資」（年、小數兩位）
 */
export function calcYearsOfService(hireDate: Date, asOf: Date): number {
  const ms = asOf.getTime() - hireDate.getTime()
  const days = ms / (1000 * 60 * 60 * 24)
  return Math.round((days / 365.25) * 100) / 100
}

interface AnnualLeaveResult {
  yearsOfService: number
  daysEarned: number
  policy: LeavePolicy
  periodStart: Date
  periodEnd: Date
  /** 該期間應發、若是年度制依比例 */
  proRatedDays: number
  notes: string
}

/**
 * 計算特休應發天數（按指定日期當下）
 *
 * @param hireDate 到職日
 * @param asOf 計算基準日（譬如今天）
 * @param policy 公司制度
 */
export function calcAnnualLeave(
  hireDate: Date,
  asOf: Date,
  policy: LeavePolicy
): AnnualLeaveResult {
  const yearsOfService = calcYearsOfService(hireDate, asOf)
  const daysEarned = annualLeaveDaysByTenure(yearsOfService)

  if (policy === 'hire_anniversary') {
    // 週年制：以到職日週年為一年、本週年期內全給
    // 期間：上次週年日 → 下次週年日
    const year = asOf.getFullYear()
    const anniv = new Date(year, hireDate.getMonth(), hireDate.getDate())
    let periodStart: Date
    let periodEnd: Date
    if (asOf >= anniv) {
      periodStart = anniv
      periodEnd = new Date(year + 1, hireDate.getMonth(), hireDate.getDate())
    } else {
      periodStart = new Date(year - 1, hireDate.getMonth(), hireDate.getDate())
      periodEnd = anniv
    }
    return {
      yearsOfService,
      daysEarned,
      policy,
      periodStart,
      periodEnd,
      proRatedDays: daysEarned,
      notes: '週年制、本週年期間應發天數',
    }
  }

  // 年度制（calendar_year）：依比例給當年度
  const year = asOf.getFullYear()
  const periodStart = new Date(year, 0, 1)
  const periodEnd = new Date(year, 11, 31)

  // 起算日 = max(到職日 6 個月後, 1 月 1 日)
  const eligibleStart = new Date(hireDate)
  eligibleStart.setMonth(eligibleStart.getMonth() + 6)
  const effectiveStart = eligibleStart > periodStart ? eligibleStart : periodStart

  if (effectiveStart > periodEnd) {
    // 今年還沒滿 6 個月、不發
    return {
      yearsOfService,
      daysEarned,
      policy,
      periodStart,
      periodEnd,
      proRatedDays: 0,
      notes: '年度制、今年尚未滿 6 個月在職、不發',
    }
  }

  const daysInPeriod = Math.ceil(
    (periodEnd.getTime() - effectiveStart.getTime()) / (1000 * 60 * 60 * 24)
  )
  const daysInYear = year % 4 === 0 ? 366 : 365
  const proRatedDays = Math.round((daysEarned * daysInPeriod) / daysInYear)

  return {
    yearsOfService,
    daysEarned,
    policy,
    periodStart,
    periodEnd,
    proRatedDays,
    notes: `年度制、依在職比例 ${daysInPeriod}/${daysInYear} 折算`,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 資遣費計算

interface SeveranceResult {
  hireDate: Date
  terminationDate: Date
  yearsOfService: number
  system: PensionSystem
  /** 平均工資（離職前 6 個月） */
  avgMonthlyWage: number
  /** 舊制段年資 */
  oldYears: number
  /** 新制段年資 */
  newYears: number
  /** 舊制資遣費 */
  oldSeverance: number
  /** 新制資遣費 */
  newSeverance: number
  /** 總計 */
  totalSeverance: number
  notes: string
}

/**
 * 計算資遣費
 *
 * 法規：
 *   - 舊制（勞基法第 17 條）：每滿 1 年 1 月平均工資、未滿 1 年比例計、無上限
 *   - 新制（勞退條例第 12 條）：每滿 1 年 0.5 月平均工資、未滿 1 年比例計、上限 6 月
 *   - 跨制：舊制段（2005/7/1 前）算舊制、之後算新制
 */
export function calcSeverance(
  hireDate: Date,
  terminationDate: Date,
  avgMonthlyWage: number,
  system: PensionSystem
): SeveranceResult {
  const totalYears = calcYearsOfService(hireDate, terminationDate)
  let oldYears = 0
  let newYears = 0

  if (system === 'old') {
    oldYears = totalYears
  } else if (system === 'new') {
    newYears = totalYears
  } else {
    // mixed：以 2005-07-01 切
    if (hireDate >= NEW_PENSION_START) {
      newYears = totalYears
    } else if (terminationDate <= NEW_PENSION_START) {
      oldYears = totalYears
    } else {
      oldYears = calcYearsOfService(hireDate, NEW_PENSION_START)
      newYears = calcYearsOfService(NEW_PENSION_START, terminationDate)
    }
  }

  const oldSeverance = Math.round(oldYears * avgMonthlyWage)
  // 新制：1 年 0.5 月、上限 6 月
  const newRawMonths = newYears * 0.5
  const newMonths = Math.min(6, newRawMonths)
  const newSeverance = Math.round(newMonths * avgMonthlyWage)

  return {
    hireDate,
    terminationDate,
    yearsOfService: totalYears,
    system,
    avgMonthlyWage,
    oldYears: Math.round(oldYears * 100) / 100,
    newYears: Math.round(newYears * 100) / 100,
    oldSeverance,
    newSeverance,
    totalSeverance: oldSeverance + newSeverance,
    notes:
      system === 'mixed'
        ? `舊制 ${oldYears.toFixed(2)} 年 × 1 月 + 新制 ${newYears.toFixed(2)} 年 × 0.5 月（上限 6 月）`
        : system === 'old'
          ? `舊制 ${totalYears.toFixed(2)} 年 × 1 月`
          : `新制 ${totalYears.toFixed(2)} 年 × 0.5 月（上限 6 月）`,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 平均工資

/**
 * 平均工資 = 離職前 6 個月薪資總和 / 6
 *
 * @param last6MonthsSalary 過去 6 個月薪資 array（最近 → 最早）
 *   - 若不足 6 個月、用實際月數平均
 */
export function calcAvgMonthlyWage(last6MonthsSalary: number[]): number {
  if (last6MonthsSalary.length === 0) return 0
  const sum = last6MonthsSalary.reduce((s, x) => s + Number(x ?? 0), 0)
  return Math.round(sum / last6MonthsSalary.length)
}

/**
 * 從員工 salary_info 估算平均工資（沒實際 payslip 資料時用）
 *
 * 估算：base_salary + attendance_bonus + other_allowances + allowances_sum
 */
export function estimateAvgWageFromSalaryInfo(salaryInfo: {
  base_salary?: number
  attendance_bonus?: number
  other_allowances?: number
  allowances?: Array<{ amount?: number }>
}): number {
  // 2026-05-16 QDF R56：NaN / undefined / null 都視為 0、避免 NaN 污染下游計算
  const safe = (v: unknown): number => {
    const n = Number(v ?? 0)
    return Number.isFinite(n) ? n : 0
  }
  const base = safe(salaryInfo.base_salary)
  const att = safe(salaryInfo.attendance_bonus)
  const other = safe(salaryInfo.other_allowances)
  const allowances = Array.isArray(salaryInfo.allowances) ? salaryInfo.allowances : []
  const allowancesSum = allowances.reduce((s, a) => s + safe(a?.amount), 0)
  return base + att + other + allowancesSum
}
