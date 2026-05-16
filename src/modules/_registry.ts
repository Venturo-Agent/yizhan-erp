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
import { OfficeModule } from './office'
import { HrModule } from './hr'
import { DatabaseModule } from './database'
// 5/14 deprecated（保留檔案、不 rm／鐵律 #8）：line_bot / facebook_bot / instagram_bot / messaging_inbox
// 全部整合進 AiHubModule、商業上賣一個 AI Hub 套餐、不再分通路 SKU。
// 既有 capability caller 已批次改寫成 CAPABILITIES.AI_HUB_*。
import { AiHubModule } from './ai_hub'
import { SettingsModule } from './settings'
import { CisModule } from './cis'
import { DashboardModule } from './dashboard'
import { CustomersModule } from './customers'
import { TourAttributesModule } from './tour_attributes'
import { WorkspacesModule } from './workspaces'
import { SharedDataManagementModule } from './shared_data_management'
import { PlatformIntegrationsModule } from './platform_integrations'
// 2026-05-15 附加服務（addon category）— 客戶單獨購買的加值包、跟月費 module 分開
import { AddonDataAttractionsModule } from './addon_data_attractions'
import { AddonDataHotelsModule } from './addon_data_hotels'
import { AddonDataRestaurantsModule } from './addon_data_restaurants'
// 2026-05-15 HR 子功能
import { HrSalarySettlementModule } from './hr_salary_settlement'
import { HrBonusSettlementModule } from './hr_bonus_settlement'

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
  OfficeModule,
  HrModule,
  DatabaseModule,
  AiHubModule,
  SettingsModule,
  CisModule,
  // ===== 不暴露給 HR / 漫途專用 / 個人空間 =====
  DashboardModule,
  CustomersModule,
  TourAttributesModule,
  WorkspacesModule,
  SharedDataManagementModule,
  PlatformIntegrationsModule,
  // ===== Addon（附加服務、可單獨販售、不暴露 HR / sidebar）=====
  AddonDataAttractionsModule,
  AddonDataHotelsModule,
  AddonDataRestaurantsModule,
  // ===== HR 子功能 =====
  HrSalarySettlementModule,
  HrBonusSettlementModule,
] as const

export type AllModulesType = typeof ALL_MODULES

/**
 * 取 module by code
 */
export function getModule(code: string) {
  return ALL_MODULES.find((m) => m.code === code)
}

/**
 * 取暴露給 HR /hr/roles UI 的 module（exposedToHr !== false）
 */
export function getHrExposedModules() {
  return ALL_MODULES.filter((m) => m.exposedToHr !== false)
}
