import { defineModule } from './_define'

/**
 * 財務系統 — 收款 / 請款 / 出納 / 報表
 *
 * 對應：
 * - 路由：/finance（及 5 個 sub-route）
 * - capability：finance.{payments,requests,disbursement,...}.{read,write} + finance.advance_payment.write
 * - tabs：9 個功能 tab + 1 個下拉資格 tab
 *
 * 2026-05-24：移除「金庫總覽」(treasury overview) — William 確認該頁無人使用、
 * 側邊選單直接連到撥款頁(/finance/treasury/disbursement)、總覽僅 finance hub 卡片連得到。
 * 撥款(disbursement)是獨立 tab/capability、不受影響。
 */
export const FinanceModule = defineModule({
  code: 'finance',
  name: '財務系統',
  description: '收款、請款、出納',
  category: 'basic',
  routes: [
    '/finance',
    '/finance/payments',
    '/finance/requests',
    '/finance/treasury/disbursement',
    '/finance/reports',
    '/finance/settings',
  ],
  exposedToHr: true,
  defaultRoles: ['admin', 'manager'],
  tabs: [
    { code: 'payments', name: '收款管理', description: '客戶收款記錄' },
    { code: 'payments-company', name: '公司收款', description: '非團體的公司收款' },
    { code: 'payments-confirm', name: '確認核帳', description: '收款確認與核帳' },
    { code: 'requests', name: '請款管理', description: '團體請款' },
    { code: 'requests-company', name: '公司請款', description: '非團體的公司支出' },
    {
      code: 'requests-salary',
      name: '薪資請款',
      description: '員工薪資請款（與公司請款權限隔離）',
    },
    { code: 'disbursement', name: '出納管理', description: '撥款作業' },
    { code: 'reports', name: '報表管理', description: '財務報表' },
    { code: 'settings', name: '財務設定', description: '付款方式、科目設定' },
    // 可代墊款：職務權限開關（5/24 純角色 SSOT、原 eligibility 旗標改為正規能力）。
    // 勾此能力的職務 → 其員工出現在請款頁「代墊款人」下拉。只需 write（純授權開關）。
    {
      code: 'advance_payment',
      name: '可代墊款',
      description: '有此能力的人出現在請款頁「代墊款人」下拉',
      capabilities: ['write'],
    },
  ],
})
