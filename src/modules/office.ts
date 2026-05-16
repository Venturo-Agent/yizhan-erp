import { defineModule } from './_define'

/**
 * 文件管理 — 文件編輯與儲存
 *
 * 對應：
 * - 路由：無（features.ts 未列出 routes、UI 入口尚未開放）
 * - capability：office.{read,write}
 * - tabs：無
 *
 * 註：features.ts 沒有此 feature、但 module-tabs.ts 有列出、先寫進來保持一致、
 *     Phase 2 codegen 時再決定要不要補進 features.ts
 */
export const OfficeModule = defineModule({
  code: 'office',
  name: '文件管理',
  description: '文件編輯與儲存',
  category: 'basic',
  routes: [],
  exposedToHr: true,
  defaultRoles: ['admin'],
  tabs: [],
})
