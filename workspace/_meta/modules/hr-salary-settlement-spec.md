---
title: 薪資結算（hr_salary_settlement）— Spec
module: hr_salary_settlement
status: active
owner: Logan
created: 2026-05-15
related: [[hr-spec]] [[leave-severance-spec]]
---

# HR Salary Settlement Spec

## Business Intent

按月 batch 結算員工薪資、auto-pull 員工 → 計算（含勞健保 / 勞退 / 自願提撥）→ 產 SAL 請款單。

## Schema

- `salary_settlements`（header、status: draft / submitted / cancelled）
- `salary_settlement_items`（按員工、含 breakdown）

## 不變式

- I1：同 period 同 workspace 唯一（uniq constraint）
- I2：status='submitted' 不可砍、要 cancel
- I3：每員工計算用 SSOT lib/hr/leave-severance-calculator + 勞健保級距表

## Acceptance Criteria

- 建 batch → auto-pull employees → 計算 → save draft
- submit → 產 1 張 PR-SAL 請款單 + items（每員工一筆）
- race 防護：submit 用 WHERE status='draft' atomic update

## Capability

`hr_salary_settlement.read|write`

## 變更

| 日期 | 變更 |
|------|------|
| 2026-05-15 | 初版（QDF R18） |
