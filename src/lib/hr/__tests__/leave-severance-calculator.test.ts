/**
 * leave-severance-calculator unit tests
 *
 * QDF Round 3 — 測試覆蓋第一輪、純函式優先測。
 * 覆蓋勞基法第 38 條（特休）+ 勞退條例第 12 條（資遣費）核心邏輯。
 */

import { describe, it, expect } from 'vitest'
import {
  annualLeaveDaysByTenure,
  calcYearsOfService,
  calcAnnualLeave,
  calcSeverance,
  calcAvgMonthlyWage,
  estimateAvgWageFromSalaryInfo,
} from '../leave-severance-calculator'

describe('annualLeaveDaysByTenure (勞基法第 38 條)', () => {
  it('未滿 6 個月：0 天', () => {
    expect(annualLeaveDaysByTenure(0)).toBe(0)
    expect(annualLeaveDaysByTenure(0.4)).toBe(0)
  })

  it('滿 6 個月未滿 1 年：3 天', () => {
    expect(annualLeaveDaysByTenure(0.5)).toBe(3)
    expect(annualLeaveDaysByTenure(0.99)).toBe(3)
  })

  it('滿 1 年未滿 2 年：7 天', () => {
    expect(annualLeaveDaysByTenure(1)).toBe(7)
    expect(annualLeaveDaysByTenure(1.99)).toBe(7)
  })

  it('滿 2 年未滿 3 年：10 天', () => {
    expect(annualLeaveDaysByTenure(2)).toBe(10)
  })

  it('滿 3 年未滿 5 年：14 天', () => {
    expect(annualLeaveDaysByTenure(3)).toBe(14)
    expect(annualLeaveDaysByTenure(4.5)).toBe(14)
  })

  it('滿 5 年未滿 10 年：15 天', () => {
    expect(annualLeaveDaysByTenure(5)).toBe(15)
    expect(annualLeaveDaysByTenure(9.99)).toBe(15)
  })

  it('滿 10 年起每年 +1 天', () => {
    expect(annualLeaveDaysByTenure(10)).toBe(16) // 15 + 1
    expect(annualLeaveDaysByTenure(11)).toBe(17)
    expect(annualLeaveDaysByTenure(15)).toBe(21)
  })

  it('上限 30 天', () => {
    expect(annualLeaveDaysByTenure(24)).toBe(30)
    expect(annualLeaveDaysByTenure(30)).toBe(30)
    expect(annualLeaveDaysByTenure(50)).toBe(30)
  })
})

describe('calcYearsOfService', () => {
  it('剛到職：~0', () => {
    const today = new Date('2026-05-15')
    const hire = new Date('2026-05-14')
    expect(calcYearsOfService(hire, today)).toBeCloseTo(0, 2)
  })

  it('整 1 年', () => {
    const hire = new Date('2025-05-15')
    const today = new Date('2026-05-15')
    expect(calcYearsOfService(hire, today)).toBeCloseTo(1, 1)
  })

  it('整 5 年', () => {
    const hire = new Date('2021-05-15')
    const today = new Date('2026-05-15')
    expect(calcYearsOfService(hire, today)).toBeCloseTo(5, 1)
  })

  it('半年（0.5）', () => {
    const hire = new Date('2025-11-15')
    const today = new Date('2026-05-15')
    expect(calcYearsOfService(hire, today)).toBeCloseTo(0.5, 1)
  })
})

describe('calcAnnualLeave (週年制)', () => {
  it('滿 1 年的員工、本週年期應發 7 天', () => {
    const hire = new Date('2025-01-15')
    const today = new Date('2026-03-15') // 已過 1 週年
    const result = calcAnnualLeave(hire, today, 'hire_anniversary')
    expect(result.daysEarned).toBe(7)
    expect(result.proRatedDays).toBe(7)
  })

  it('滿 3 年的員工、本週年期應發 14 天', () => {
    const hire = new Date('2023-01-15')
    const today = new Date('2026-03-15')
    const result = calcAnnualLeave(hire, today, 'hire_anniversary')
    expect(result.daysEarned).toBe(14)
  })
})

describe('calcAnnualLeave (年度制)', () => {
  it('滿半年的員工、年度制依比例', () => {
    const hire = new Date('2025-07-15')
    const today = new Date('2026-06-15')
    const result = calcAnnualLeave(hire, today, 'calendar_year')
    expect(result.proRatedDays).toBeGreaterThan(0)
    expect(result.proRatedDays).toBeLessThanOrEqual(7) // 滿 1 年 7 天、比例給
  })
})

describe('calcSeverance (新制、勞退條例第 12 條)', () => {
  it('新制 1 年 = 0.5 月平均工資', () => {
    const hire = new Date('2025-05-15')
    const termination = new Date('2026-05-15') // 1 年
    const avgWage = 40000
    const result = calcSeverance(hire, termination, avgWage, 'new')
    expect(result.newSeverance).toBe(20000) // 1 年 × 0.5 月 × 40000
    expect(result.oldSeverance).toBe(0)
    expect(result.totalSeverance).toBe(20000)
  })

  it('新制 10 年 = 5 月平均工資', () => {
    const hire = new Date('2016-05-15')
    const termination = new Date('2026-05-15')
    const avgWage = 40000
    const result = calcSeverance(hire, termination, avgWage, 'new')
    // 10 年 × 0.5 月 = 5 月、上限 6 月 OK
    expect(result.newSeverance).toBe(200000)
  })

  it('新制 15 年：上限 6 月（不再增加）', () => {
    const hire = new Date('2011-05-15')
    const termination = new Date('2026-05-15') // 15 年
    const avgWage = 40000
    const result = calcSeverance(hire, termination, avgWage, 'new')
    // 15 × 0.5 = 7.5 月、被上限到 6 月
    expect(result.newSeverance).toBe(6 * 40000) // 240000
  })
})

describe('calcSeverance (舊制、勞基法第 17 條)', () => {
  it('舊制 1 年 = 1 月平均工資', () => {
    const hire = new Date('2025-05-15')
    const termination = new Date('2026-05-15')
    const avgWage = 40000
    const result = calcSeverance(hire, termination, avgWage, 'old')
    expect(result.oldSeverance).toBe(40000)
    expect(result.newSeverance).toBe(0)
  })

  it('舊制無上限、20 年 = 20 月', () => {
    const hire = new Date('2006-05-15')
    const termination = new Date('2026-05-15')
    const avgWage = 40000
    const result = calcSeverance(hire, termination, avgWage, 'old')
    expect(result.oldSeverance).toBe(20 * 40000) // 800000
  })
})

describe('calcSeverance (跨制：2005-07-01 前舊制、之後新制)', () => {
  it('純新制段（hire 在 2005-07-01 後）', () => {
    const hire = new Date('2020-01-01')
    const termination = new Date('2026-01-01')
    const avgWage = 40000
    const result = calcSeverance(hire, termination, avgWage, 'mixed')
    expect(result.oldYears).toBe(0)
    expect(result.newYears).toBeCloseTo(6, 1)
    expect(result.newSeverance).toBe(3 * 40000) // 6 × 0.5
  })

  it('純舊制段（terminate 在 2005-07-01 前）', () => {
    const hire = new Date('2000-01-01')
    const termination = new Date('2005-06-30')
    const avgWage = 40000
    const result = calcSeverance(hire, termination, avgWage, 'mixed')
    expect(result.newYears).toBe(0)
    expect(result.oldYears).toBeGreaterThan(5)
  })

  it('跨制：hire 1999、terminate 2026', () => {
    const hire = new Date('1999-01-01')
    const termination = new Date('2026-01-01')
    const avgWage = 40000
    const result = calcSeverance(hire, termination, avgWage, 'mixed')
    // 舊制段：1999/1/1 ~ 2005/7/1 ≈ 6.5 年
    // 新制段：2005/7/1 ~ 2026/1/1 ≈ 20.5 年
    expect(result.oldYears).toBeGreaterThan(5)
    expect(result.oldYears).toBeLessThan(7)
    expect(result.newYears).toBeGreaterThan(20)
    expect(result.oldSeverance).toBeGreaterThan(0)
    expect(result.newSeverance).toBe(6 * 40000) // 新制段超 6 月、上限
  })
})

describe('calcAvgMonthlyWage', () => {
  it('完整 6 個月平均', () => {
    expect(calcAvgMonthlyWage([40000, 40000, 40000, 40000, 40000, 40000])).toBe(40000)
  })

  it('部分月份不同', () => {
    expect(calcAvgMonthlyWage([42000, 38000, 40000])).toBe(40000)
  })

  it('空 array：0', () => {
    expect(calcAvgMonthlyWage([])).toBe(0)
  })

  it('含 null / undefined → 視為 0', () => {
    // 測試 null 容錯（故意傳髒資料、用 unknown 繞過 type check）
    const dirty = [40000, null, 40000] as unknown as number[]
    expect(calcAvgMonthlyWage(dirty)).toBe(Math.round(80000 / 3))
  })
})

describe('estimateAvgWageFromSalaryInfo', () => {
  it('只 base_salary', () => {
    expect(estimateAvgWageFromSalaryInfo({ base_salary: 30000 })).toBe(30000)
  })

  it('base + 全勤 + 其他津貼', () => {
    expect(
      estimateAvgWageFromSalaryInfo({
        base_salary: 30000,
        attendance_bonus: 1000,
        other_allowances: 2000,
      })
    ).toBe(33000)
  })

  it('含 allowances array', () => {
    expect(
      estimateAvgWageFromSalaryInfo({
        base_salary: 30000,
        allowances: [{ amount: 500 }, { amount: 1500 }],
      })
    ).toBe(32000)
  })

  it('空輸入：0', () => {
    expect(estimateAvgWageFromSalaryInfo({})).toBe(0)
  })

  it('含 NaN base_salary：視為 0', () => {
    expect(
      estimateAvgWageFromSalaryInfo({
        base_salary: NaN as unknown as number,
        attendance_bonus: 1000,
      })
    ).toBe(1000)
  })

  it('allowances 含 amount=undefined：忽略', () => {
    expect(
      estimateAvgWageFromSalaryInfo({
        base_salary: 30000,
        allowances: [{ amount: undefined }, { amount: 500 }],
      })
    ).toBe(30500)
  })
})

describe('calcSeverance edge cases', () => {
  it('0 年資（同日離職）：總額 0', () => {
    const sameDay = new Date('2026-05-15')
    const result = calcSeverance(sameDay, sameDay, 40000, 'new')
    expect(result.totalSeverance).toBe(0)
  })

  it('avgWage = 0：不管多少年資、總額 0', () => {
    const hire = new Date('2020-01-01')
    const term = new Date('2026-01-01')
    const result = calcSeverance(hire, term, 0, 'new')
    expect(result.totalSeverance).toBe(0)
  })
})
