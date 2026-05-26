import { defineModule } from './_define'

/**
 * 資料管理 — 客戶 / 供應商 / 資源
 *
 * 對應：
 * - 路由：/library（及 3 個 sub-route）
 * - capability：database.{customers,attractions,suppliers,archive}.{read,write}
 * - tabs：4 個
 */
export const DatabaseModule = defineModule({
  code: 'database',
  name: '資料管理',
  description: '客戶、供應商、資源',
  category: 'basic',
  routes: [
    '/library',
    '/library/customers',
    '/library/attractions',
    '/library/suppliers',
    '/library/archive-management',
  ],
  exposedToHr: true,
  defaultRoles: ['admin', 'sales', 'manager'],
  tabs: [
    { code: 'customers', name: '顧客管理', description: '個人客戶' },
    { code: 'attractions', name: '旅遊資料庫', description: '景點、餐廳、飯店' },
    { code: 'suppliers', name: '供應商管理', description: '合作供應商' },
    { code: 'archive', name: '封存管理', description: '封存資料查閱' },
  ],
})
