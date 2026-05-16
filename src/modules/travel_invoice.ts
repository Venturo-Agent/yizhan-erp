import { defineModule } from './_define'

/**
 * 電子收據（Travel Invoice）— 開立、作廢、折讓、查詢、重寄
 *
 * 對應：
 * - 路由：/travel-invoice（及 sub-routes）
 * - capability：travel_invoice.{issue,void,allowance,query,resend,settings}.{read,write}
 * - tabs：6 個功能 tab
 *
 * 台灣電子發票整合（B2C / B2B）、與財務系統收款單串接。
 */
export const TravelInvoiceModule = defineModule({
  code: 'travel_invoice',
  name: '電子收據',
  description: '台灣電子發票開立、作廢、折讓、查詢與重寄',
  category: 'premium',
  routes: [
    '/travel-invoice',
    '/travel-invoice/issue',
    '/travel-invoice/void',
    '/travel-invoice/allowance',
    '/travel-invoice/query',
    '/travel-invoice/resend',
    '/travel-invoice/settings',
  ],
  exposedToHr: true,
  tabs: [
    { code: 'issue', name: '開立發票', description: '開立電子收據 / B2B 統編發票' },
    { code: 'void', name: '作廢發票', description: '發票作廢作業' },
    { code: 'allowance', name: '折讓管理', description: '折讓單開立與查詢' },
    { code: 'query', name: '發票查詢', description: '發票狀態查詢與歷史紀錄' },
    { code: 'resend', name: '重寄發票', description: '重寄電子收據至客戶信箱' },
    { code: 'settings', name: '發票設定', description: '串接設定（財政部 / 雲端發票）' },
  ],
})
