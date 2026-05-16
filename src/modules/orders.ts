import { defineModule } from './_define'

/**
 * 訂單管理 — 客戶訂單與報名
 *
 * 對應：
 * - 路由：/orders
 * - capability：orders.{list,create,edit,payments,travelers}.{read,write}
 * - tabs：5 個（list / create / edit / payments / travelers）
 */
export const OrdersModule = defineModule({
  code: 'orders',
  name: '訂單管理',
  description: '客戶訂單與報名',
  category: 'basic',
  routes: ['/orders'],
  exposedToHr: true,
  defaultRoles: ['admin', 'sales', 'manager'],
  // module-level：orders.read / orders.write（總開關、跟 tab-level 平行）
  moduleLevelCapabilities: ['read', 'write'],
  tabs: [
    { code: 'list', name: '訂單列表', description: '所有訂單總覽' },
    { code: 'create', name: '新增訂單', description: '建立新訂單' },
    { code: 'edit', name: '編輯訂單', description: '修改訂單內容' },
    { code: 'payments', name: '付款記錄', description: '訂單收款狀態' },
    { code: 'travelers', name: '旅客資料', description: '旅客護照、聯絡資訊' },
  ],
})
