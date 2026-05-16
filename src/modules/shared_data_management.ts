import { defineModule } from './_define'

/**
 * 共用資料管理 — 維護全平台共用資料（漫途專用）
 *
 * 對應：
 * - 路由：無（UI 入口未開放）
 * - capability：shared_data_management.{read,write}
 * - tabs：無
 * - category：enterprise（跨 workspace 能力、限漫途使用）
 *
 * 註：維護 ref_* 表（金融機構代號、機場代號等）、跨 workspace 共用
 *     UI 入口尚未開放、僅後台 API 使用
 *     不暴露給租戶 HR
 */
export const SharedDataManagementModule = defineModule({
  code: 'shared_data_management',
  name: '共用資料管理',
  description:
    '維護全平台共用資料（金融機構代號、機場代號等 ref_* 表）— 跨 workspace 能力、限漫途使用、UI 入口未開放',
  category: 'enterprise',
  routes: [],
  exposedToHr: true,
  tabs: [],
})
