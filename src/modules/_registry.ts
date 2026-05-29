/**
 * Module Registry — 匯入所有 module、export 給 audit / codegen / runtime 用
 *
 * 鐵則：新 module 一個檔（src/modules/<code>.ts）+ 在這裡加一行 import + export
 *      audit:rls 會自動 parse 這裡的 ALL_MODULES、不需另動其他檔
 */

import { CalendarModule } from './calendar'
import { TodosModule } from './todos'
import { ChannelsModule } from './channels'
import { ToursModule } from './tours'
import { OrdersModule } from './orders'
import { FinanceModule } from './finance'
import { AccountingModule } from './accounting'
import { HrModule } from './hr'
import { DatabaseModule } from './database'
// 2026-05-29 William 拍板砍掉 bot / messaging / office 描述子
// line_bot / facebook_bot / instagram_bot / messaging_inbox 全部整合進 AiHubModule、走一個 AI Hub SKU。
// office 從未上線、實體路由不存在。
// 鐵律 #8 凍住 pattern 不再適用：這些 module 描述子 + 實體 (main) 路由皆已物理移除、走 git history 取回。
import { AiHubModule } from './ai_hub'
import { SettingsModule } from './settings'
import { DashboardModule } from './dashboard'
// 2026-05-26 deprecated（凍住、保留檔案 / 不 rm·鐵律 #8）：customers
// 客戶收回 database module（database > 顧客管理 tab）、舊獨立 customers module/capability 全死、無 caller。
// import { CustomersModule } from './customers'
import { TourAttributesModule } from './tour_attributes'
import { WorkspacesModule } from './workspaces'
import { SharedDataManagementModule } from './shared_data_management'
import { PlatformIntegrationsModule } from './platform_integrations'
// 2026-05-15 HR 子功能
import { HrSalarySettlementModule } from './hr_salary_settlement'
import { HrBonusSettlementModule } from './hr_bonus_settlement'
// 2026-05-17 文件中心
import { DocumentsModule } from './documents'
// 2026-05-17 電子收據 + eSIM
// 2026-05-20 deprecated（凍住、保留檔案 / DB / entity、未來 Phase 2 重啟）：travel_invoice
// 理由：6/1 第一付費客戶 deadline、補完要 37 人天（含財政部 API 串接）、來不及。
//      DB Phase 1 已蓋好、Phase 2（8 月後）補 UI / API / 財政部串接。
// import { TravelInvoiceModule } from './travel_invoice'
import { EsimModule } from './esim'
// 2026-05-20 簽證代辦（5/7 砍 visas 表後重啟、改成「客戶證件抽屜 + 申辦事件 + 代辦商價目」三層架構）
import { VisasModule } from './visas'
// 2026-05-20 行銷管理（Corner 官網行程上架）
import { MarketingModule } from './marketing'
// 2026-05-23 客戶官網系統（addon、多客戶通用 / 子網域 / Canvas 編輯器）
import { WebsitesModule } from './websites'

/**
 * 所有 module 集中匯出（順序：side bar / module-tabs.ts 順序、再接 features-only）
 */
export const ALL_MODULES = [
  // ===== 暴露給 HR 管權限的 module（順序：module-tabs.ts）=====
  CalendarModule,
  TodosModule,
  ChannelsModule,
  ToursModule,
  OrdersModule,
  FinanceModule,
  AccountingModule,
  HrModule,
  DatabaseModule,
  AiHubModule,
  SettingsModule,
  // ===== 不暴露給 HR / 漫途專用 / 個人空間 =====
  DashboardModule,
  // 2026-05-26 deprecated（凍住）：CustomersModule — 客戶收回 database module
  TourAttributesModule,
  WorkspacesModule,
  SharedDataManagementModule,
  PlatformIntegrationsModule,
  // ===== HR 子功能 =====
  HrSalarySettlementModule,
  HrBonusSettlementModule,
  // ===== 文件中心 =====
  DocumentsModule,
  // ===== 電子收據（premium）— 2026-05-20 凍住、Phase 2 (8月後) 重啟 =====
  // TravelInvoiceModule,
  // ===== eSIM 管理（basic）=====
  EsimModule,
  // ===== 簽證代辦（basic）=====
  VisasModule,
  // ===== 行銷管理（basic、Corner 官網行程上架）=====
  MarketingModule,
  // ===== 客戶官網系統（addon、加購 / 多客戶通用 / Canvas 編輯器）=====
  WebsitesModule,
] as const

export type AllModulesType = typeof ALL_MODULES

/**
 * 取 module by code
 */
export function getModule(code: string) {
  return ALL_MODULES.find(m => m.code === code)
}

/**
 * 取暴露給 HR /hr/roles UI 的 module（exposedToHr !== false）
 */
export function getHrExposedModules() {
  return ALL_MODULES.filter(m => m.exposedToHr !== false)
}

/**
 * 全開 / 個人標配 module 的 code（featureOnly: true）
 * sidebar + ModuleGuard 對這些只過 workspace_features、跳過 role_capabilities。
 */
export const FEATURE_ONLY_MODULE_CODES = new Set<string>(
  ALL_MODULES.filter(m => (m as { featureOnly?: boolean }).featureOnly === true).map(m => m.code)
)
