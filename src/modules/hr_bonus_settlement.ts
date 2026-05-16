import { defineModule } from './_define'

/**
 * 獎金結算 — HR 按團勾選結算
 *
 * 2026-05-15 William 拍板：
 *   - tour 結團時 bonus 寫進 bonus_pending（status=pending）、不再自動產請款
 *   - HR /hr/bonus-settlement 列「待結算團」、勾選團 → 每團一張請款單
 *
 * 對應：
 * - 路由：/hr/bonus-settlement, /hr/bonus-settlement/[tourId]
 * - capability：hr_bonus_settlement.read / write
 */
export const HrBonusSettlementModule = defineModule({
  code: 'hr_bonus_settlement',
  name: '獎金結算',
  description: 'HR 按團勾選結算獎金、產出請款單',
  category: 'basic',
  routes: [
    '/hr/bonus-settlement',
    '/hr/bonus-settlement/[tourId]',
  ],
  exposedToHr: true,
  defaultRoles: ['admin'],
  tabs: [],
})
