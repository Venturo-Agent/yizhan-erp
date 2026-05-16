import { defineModule } from './_define'

/**
 * 系統設定 — 公司與系統配置
 *
 * 對應：
 * - 路由：/settings, /settings/company, /settings/personal
 * - capability：settings.{personal,company}.{read,write}
 * - tabs：2 個（personal / company）
 */
export const SettingsModule = defineModule({
  code: 'settings',
  name: '系統設定',
  description: '公司與系統配置',
  category: 'basic',
  routes: ['/settings', '/settings/company', '/settings/personal'],
  // 5/13 William 拍板 v2：
  // - personal tab = 個人空間標配、HR UI 隱藏、強制給所有員工
  // - company tab = 公司業務功能、HR UI 顯示、admin 可配置（不強制）
  // - 紅線 #0：沒有 admin only、所有訪問控制走 workspace_features + role_capabilities
  exposedToHr: true,
  defaultRoles: ['admin', 'sales', 'manager'],
  tabs: [
    {
      code: 'personal',
      name: '個人設定',
      description: '密碼、頭像、個人資料',
      hiddenInHr: true, // 個人空間、HR 不該配置（強制給所有員工）
    },
    {
      code: 'company',
      name: '公司設定',
      description: '公司名稱、Logo、聯絡方式、環境變數',
    },
  ],
})
