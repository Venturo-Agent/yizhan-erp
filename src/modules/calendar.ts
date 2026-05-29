import { defineModule } from './_define'

/**
 * 行事曆 — 出團日曆 / 排程管理
 *
 * 對應：
 * - 路由：/calendar
 * - capability：calendar.{read,write}
 * - tabs：無（module-level 權限）
 */
export const CalendarModule = defineModule({
  code: 'calendar',
  name: '行事曆',
  description: '出團日曆',
  category: 'basic',
  routes: ['/calendar'],
  // 5/13 William 拍板：個人空間標配、HR 不該配置、強制給所有員工
  // 2026-05-29：改 featureOnly、只看公司 feature、不卡角色 capability（免再因漏 cap 看不到）
  exposedToHr: false,
  featureOnly: true,
  defaultRoles: ['admin', 'sales', 'manager'],
  tabs: [],
})
