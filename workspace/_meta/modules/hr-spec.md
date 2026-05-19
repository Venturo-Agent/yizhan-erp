---
title: 人資（hr）— Spec
module: hr
status: active
owner: Logan
created: 2026-05-15
related: [[hr_bonus_settlement-spec]] [[hr_salary_settlement-spec]] [[leave-severance-spec]]
---

# HR Module Spec

> 員工資料 + HR 政策（特休 / 資遣 / 勞健保）總管。薪資 / 獎金結算另有 sub-spec。

## 1. Business Intent

- 員工基本資料 / 職務 / 薪資設定
- 公司 HR 政策（leave_policy / pension_system）
- 角色（roles）+ 職務 capability 設定

## 2. 核心 entity

主要表：
- `public.employees`（員工 + 巢狀 jsonb：personal_info / job_info / salary_info）
- `public.workspace_roles`（職務）
- `public.role_capabilities`（職務 → cap mapping）
- `public.bonus_pending`（結團衍生）

公司級設定（在 workspaces 表）：
- `leave_policy`: calendar_year / hire_anniversary
- `pension_system`: old / new / mixed
- `transfer_fee_mode`: average / unified（影響獎金 / 薪資結算的出納分攤）

## 3. 不變式

- I1：員工 employee_number unique
- I2：員工 status 'terminated' 後不可進新薪資結算
- I3：sub-cap（hr.employees.write 等）必須屬於 role 才有效
- I4：勞保不在公司（labor_insured_here=false）→ salary 不計勞保

## 4. Acceptance Criteria

- [ ] 加員工必填 employee_number / name / hire_date
- [ ] 特休 / 資遣費計算走 SSOT lib/hr/leave-severance-calculator.ts
- [ ] 角色 capability 設定走 /api/permissions/features（受 workspaces.write 守）

## 5. 反例

- ❌ 不准 hardcode admin（鐵律 #9）
- ❌ 不准跨 workspace 看別家員工

## 6. 跨 module 依賴

| 依賴 | 關係 |
|------|------|
| hr_salary_settlement | 員工列表 → 月度薪資 batch |
| hr_bonus_settlement | bonus_pending → 結算產 PR |
| accounting | settle 後自動產傳票 |

## 7. UI / Route

| Route | Layout |
|-------|--------|
| /hr | ListPageLayout（員工列表） |
| /hr/organization | ContentPageLayout |
| /hr/salary-settlement | ListPageLayout |
| /hr/bonus-settlement | ListPageLayout |

## 8. Capability

- `hr.employees.read|write` / `hr.roles.read|write` / `hr.organization.read|write`
- 結算 sub-modules 各自 capability

## 10. 變更

| 日期 | 變更 |
|------|------|
| 2026-05-15 | 初版（QDF Round 13） |
