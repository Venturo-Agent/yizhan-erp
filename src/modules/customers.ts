import { defineModule } from './_define'

/**
 * 顧客管理 — 客戶資料
 *
 * 對應：
 * - 路由：/library/customers
 * - capability：customers.{read,write}
 * - tabs：無
 * - category：premium（付費功能）
 */
export const CustomersModule = defineModule({
  code: 'customers',
  name: '顧客管理',
  description: '客戶資料',
  category: 'premium',
  routes: ['/library/customers'],
  exposedToHr: true,
  defaultRoles: ['admin', 'sales', 'manager'],
  tabs: [],
})
