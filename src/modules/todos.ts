import { defineModule } from './_define'

/**
 * 待辦事項 — 個人任務管理 / 提醒
 *
 * 對應：
 * - 路由：/todos
 * - capability：todos.{read,write}
 * - tabs：無（module-level 權限）
 */
export const TodosModule = defineModule({
  code: 'todos',
  name: '待辦事項',
  description: '任務管理',
  category: 'basic',
  routes: ['/todos'],
  // 5/13 William 拍板：個人空間標配、HR 不該配置、強制給所有員工
  // 2026-05-29：改 featureOnly、只看公司 feature、不卡角色 capability（免再因漏 cap 看不到）
  exposedToHr: false,
  featureOnly: true,
  defaultRoles: ['admin', 'sales', 'manager'],
  tabs: [],
})
