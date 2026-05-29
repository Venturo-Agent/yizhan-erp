// 權限系統：role_capabilities + has_capability RPC
export * from './features'
export * from './hooks'
export * from './module-tabs'
export * from './capabilities'
export { useCapabilities } from './useCapabilities'
export {
  useMyCapabilities,
  hasCapabilitySync,
  invalidateCapabilityCache,
} from './useMyCapabilities'

import { getFeatureByRoute } from './features'

/**
 * 職務的分頁權限（role_tab_permissions 表的 row shape）
 */
export interface TabPermission {
  module_code: string
  tab_code: string | null
  can_read: boolean
  can_write: boolean
}

/**
 * 從路由取得模組代碼
 *
 * 2026-05-29 William 拍板：路由 ↔ module 對應關係統一吃 features.ts 的 routes[]
 * （由 src/modules/<code>.ts 為 SOURCE、codegen 衍生）。
 * 之前手寫的 ROUTE_TO_MODULE 已砍、避免雙真相漂移。
 *
 * feature.code 即 module.code（同一套命名空間、見 codegen-permissions.ts genFeaturesTs）。
 * sub-feature（如 channels.happy）的 code 含 '.'、回 '.' 之前的 module code 部分。
 */
export function getModuleFromRoute(route: string): string | null {
  const cleanRoute = route.startsWith('/') ? route : `/${route}`
  const feature = getFeatureByRoute(cleanRoute)
  if (!feature) return null
  // sub-feature 拆出 module code（'channels.happy' → 'channels'）
  const dotIdx = feature.code.indexOf('.')
  return dotIdx === -1 ? feature.code : feature.code.slice(0, dotIdx)
}
