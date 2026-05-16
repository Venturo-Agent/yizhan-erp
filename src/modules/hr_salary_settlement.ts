import { defineModule } from './_define'

/**
 * 薪資結算 — HR 月度薪資批次結算
 *
 * 2026-05-15 William 拍板：HR 加「薪資結算」按鈕、按月 batch 結算、產出請款單。
 *
 * 對應：
 * - 路由：/hr/salary-settlement, /hr/salary-settlement/[id]
 * - capability：hr_salary_settlement.read / write
 * - tabs：無（單一頁面 + detail）
 *
 * 流程：
 *   1. HR 主管「新增 X 月薪資」→ 建 salary_settlements(status=draft) + auto-pull active employees
 *   2. detail 頁可看員工薪資、不可改（要改改員工本身的 salary_info）
 *   3. 「確認」→ transaction：建 payment_request + items、update settlement.status=submitted
 *
 * DB：
 *   - salary_settlements (batch 級)
 *   - salary_settlement_items (員工層 snapshot)
 *
 * 防撞擊：UNIQUE(workspace_id, period) + SELECT FOR UPDATE
 */
export const HrSalarySettlementModule = defineModule({
  code: 'hr_salary_settlement',
  name: '薪資結算',
  description: 'HR 月度薪資批次結算、產出請款單',
  category: 'basic',
  routes: [
    '/hr/salary-settlement',
    '/hr/salary-settlement/[id]',
  ],
  exposedToHr: true,
  defaultRoles: ['admin'],
  tabs: [],
})
