import { defineModule } from './_define'

/**
 * ⚠️ 2026-05-26 DEPRECATED（凍住、保留檔案不 rm·鐵律 #8）
 *
 * 客戶已收回 DatabaseModule（database > 顧客管理 tab、capability database.customers.{read,write}）。
 * 本獨立 module 的 customers.{read,write} capability 全死、無任何 caller 檢查（route guard 走 database）。
 * 已從 _registry.ts 的 ALL_MODULES 移除、不再進 codegen。檔案保留供歷史參考。
 *
 * 顧客管理 — 客戶資料（歷史定義）
 *
 * 對應：
 * - 路由：/library/customers（現由 DatabaseModule 涵蓋）
 * - capability：customers.{read,write}（已廢）
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
