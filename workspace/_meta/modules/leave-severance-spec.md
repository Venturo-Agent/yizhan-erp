---
title: 特休 / 資遣費計算（leave-severance）— Spec
module: hr (sub-spec)
status: active
owner: Logan
created: 2026-05-15
related: [[hr-spec]] [[hr-salary-settlement-spec]]
---

# Leave-Severance Calculation Spec

> hr module 內的計算 service、涵蓋特休（勞基法第 38 條）+ 資遣費（勞退條例第 12 條 / 勞基法第 17 條 / 跨制）。

## Source files

- `src/lib/hr/leave-severance-calculator.ts`（service、純函式）
- `src/lib/hr/__tests__/leave-severance-calculator.test.ts`（31 unit tests）

## Exports

| Function                                     | Purpose                           |
| -------------------------------------------- | --------------------------------- |
| `annualLeaveDaysByTenure(years)`             | 年資 → 特休天數（勞基法第 38 條） |
| `calcYearsOfService(hire, asOf)`             | 算年資                            |
| `calcAnnualLeave(hire, asOf, policy)`        | 算本期應發特休                    |
| `calcSeverance(hire, term, avgWage, system)` | 算資遣費                          |
| `calcAvgMonthlyWage(last6Months)`            | 平均工資（離職前 6 月）           |
| `estimateAvgWageFromSalaryInfo(salaryInfo)`  | 沒實際薪資資料時估算              |

## 不變式

- I1：annualLeaveDaysByTenure 上限 30 天（10 年起每年 +1）
- I2：calcSeverance 新制上限 6 月（每年 0.5 月）
- I3：calcSeverance mixed 用 2005-07-01 切（勞退新制施行日）
- I4：所有 calc 用 calendar days（不算工作天）
- I5：estimateAvgWageFromSalaryInfo NaN / undefined / null 容錯為 0（2026-05-16 QDF R56 加）
- I6：calcSeverance 0 年資 / 0 avgWage 結果 = 0（不會 throw）

## Public API

```ts
import {
  annualLeaveDaysByTenure,
  calcAnnualLeave,
  calcSeverance,
  calcAvgMonthlyWage,
  estimateAvgWageFromSalaryInfo,
  type LeavePolicy,
  type PensionSystem,
} from '@/lib/hr/leave-severance-calculator'
```

## 公司設定對應

workspaces 表：

- `leave_policy`: `'calendar_year' | 'hire_anniversary'`
- `pension_system`: `'old' | 'new' | 'mixed'`

UI：`/workspaces/[id]` OVERVIEW tab HR 政策卡片設定。

## UI 整合

`/hr` 員工列表 row action：

- 「資遣試算」按鈕（Calculator icon）
- 開 `SeveranceCalculatorDialog`
- 自動從 workspace 抓 leave_policy + pension_system
- 自動從 salary settlements 抓最近 6 月工資、fallback estimate

## Test coverage

31 unit tests 涵蓋：

- annualLeaveDaysByTenure：未滿 6 月 / 6 月 / 1 / 2 / 3 / 5 / 10 / 30+ 邊界
- calcYearsOfService：0 / 0.5 / 1 / 5
- calcAnnualLeave：週年制 / 年度制（含半年比例計）
- calcSeverance：new / old / mixed（含 hire 1999 → 2026 跨制 case）
- calcAvgMonthlyWage / estimate：完整 6 月 / 部分月 / 空 / null 容錯

## 變更

| 日期       | 變更                                   |
| ---------- | -------------------------------------- |
| 2026-05-15 | 初版 service + 31 unit tests（QDF R3） |
| 2026-05-15 | spec 文檔（QDF R32）                   |
