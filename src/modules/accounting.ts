import { defineModule } from './_define'

/**
 * 會計系統 — 傳票 / 帳務 / 結算
 *
 * 對應：
 * - 路由：/accounting（及 5 個 sub-route）
 * - capability：accounting.{vouchers,accounts,...}.{read,write}
 * - tabs：6 個
 * - category：premium（付費功能）
 */
export const AccountingModule = defineModule({
  code: 'accounting',
  name: '會計系統',
  description: '傳票、帳務、結算',
  category: 'premium',
  routes: [
    '/accounting',
    '/accounting/vouchers',
    '/accounting/accounts',
    '/accounting/reports',
    '/accounting/checks',
    '/accounting/period-closing',
  ],
  exposedToHr: true,
  defaultRoles: ['admin', 'manager'],
  tabs: [
    { code: 'vouchers', name: '傳票管理', description: '記帳傳票' },
    { code: 'accounts', name: '科目管理', description: '會計科目設定' },
    { code: 'period-closing', name: '期末結轉', description: '月結、年結' },
    { code: 'opening-balances', name: '期初餘額', description: '期初設定' },
    { code: 'checks', name: '票據管理', description: '支票、本票' },
    { code: 'reports', name: '會計報表', description: '損益表、資產負債表' },
  ],
})
