import { defineModule } from './_define'

/**
 * 人資管理 — 員工 + 職務管理
 *
 * 對應：
 * - 路由：/hr, /hr/roles, /hr/organization
 * - capability：hr.{employees,roles}.{read,write}
 * - tabs：2 個（employees / roles）
 *
 * /hr/organization 共用 settings.company.* capability、不另開新 capability（複用既有）
 */
export const HrModule = defineModule({
  code: 'hr',
  name: '人資管理',
  description: '員工 + 職務管理',
  category: 'basic',
  routes: ['/hr', '/hr/roles', '/hr/organization'],
  exposedToHr: true,
  defaultRoles: ['admin'],
  tabs: [
    { code: 'employees', name: '員工管理', description: '員工資料、到職離職' },
    { code: 'roles', name: '職務管理', description: '職務角色與權限' },
  ],
})
