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

export interface PermissionConfig {
  id: string
  label: string
  category: string
  routes: string[]
  description?: string
}

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
 * 功能權限配置（給設定頁顯示用）
 * 權限決策不靠這個、統一從 role_tab_permissions 拿資格清單
 */
export const FEATURE_PERMISSIONS: PermissionConfig[] = [
  { id: 'calendar', label: '行事曆', category: '全部', routes: ['/calendar'] },
  { id: 'workspace', label: '工作空間', category: '全部', routes: ['/workspace'] },
  { id: 'todos', label: '待辦事項', category: '全部', routes: ['/todos'] },
  { id: 'tours', label: '旅遊團', category: '核心', routes: ['/tours'] },
  { id: 'orders', label: '訂單', category: '核心', routes: ['/orders'] },
  { id: 'finance', label: '財務', category: '核心', routes: ['/finance', '/accounting'] },
  { id: 'database', label: '資料管理', category: '核心', routes: ['/library'] },
  { id: 'hr', label: '人資', category: '管理', routes: ['/hr'] },
  { id: 'settings', label: '設定', category: '管理', routes: ['/settings'] },
  { id: 'customers', label: '顧客管理', category: '付費', routes: ['/library/customers'] },
  { id: 'fleet', label: '車隊管理', category: '企業', routes: ['/fleet', '/supplier/trips'] },
]

/**
 * 路由到模組的對應表
 * 用於將 URL 路由轉換成 module_code
 */
const ROUTE_TO_MODULE: Record<string, string> = {
  '/tours': 'tours',
  '/orders': 'orders',
  '/finance': 'finance',
  '/accounting': 'accounting',
  '/hr': 'hr',
  '/library': 'database',
  '/data-management': 'database',
  '/settings': 'settings',
  '/calendar': 'calendar',
  '/todos': 'todos',
  '/dashboard': 'dashboard',
  '/itinerary': 'itinerary',
  '/office': 'office',
  '/library/customers': 'database', // 顧客在資料管理
  '/library/attractions': 'database',
  '/library/suppliers': 'database',
  '/library/archive-management': 'database',
  '/bot': 'line_bot',
  '/workspaces': 'workspaces',
  '/platform': 'platform_integrations',
}

/**
 * 從路由取得模組代碼
 */
export function getModuleFromRoute(route: string): string | null {
  // 移除開頭的 /
  const cleanRoute = route.startsWith('/') ? route : `/${route}`

  // 找最長匹配的路由
  for (const [routePrefix, moduleCode] of Object.entries(ROUTE_TO_MODULE)) {
    if (cleanRoute === routePrefix || cleanRoute.startsWith(`${routePrefix}/`)) {
      return moduleCode
    }
  }
  return null
}

export function getPermissionCategories(): string[] {
  return Array.from(new Set(FEATURE_PERMISSIONS.map(p => p.category)))
}

export function getPermissionsByCategory(category: string): PermissionConfig[] {
  return FEATURE_PERMISSIONS.filter(p => p.category === category)
}
