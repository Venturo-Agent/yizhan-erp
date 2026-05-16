/**
 * Breadcrumb 路由配置
 *
 * 定義所有路由到 breadcrumb 的映射關係
 * 支援階層式導航自動生成
 */

export interface BreadcrumbConfig {
  /** 顯示標籤 */
  label: string
  /** 父路由（用於生成階層式 breadcrumb） */
  parent?: string
  /** 是否隱藏此層（用於中間層路由） */
  hidden?: boolean
}

/**
 * 路由到 Breadcrumb 的映射配置
 *
 * 規則：
 * 1. 每個路由都需要定義 label
 * 2. 使用 parent 指向上層路由來建立階層關係
 * 3. 動態路由使用 [param] 格式，實際使用時會被替換
 */
export const BREADCRUMB_CONFIG: Record<string, BreadcrumbConfig> = {
  // ========== 首頁 ==========
  '/': { label: '首頁', hidden: true },

  // ========== 業務管理 ==========
  '/tours': { label: '團管理', parent: '/' },
  '/orders': { label: '訂單管理', parent: '/' },

  // ========== 客戶管理 ==========
  '/library/customers': { label: '客戶管理', parent: '/library' },

  // ========== 財務管理 ==========
  '/finance': { label: '財務管理', parent: '/' },
  '/finance/requests': { label: '請款單', parent: '/finance' },
  '/finance/payments': { label: '收款管理', parent: '/finance' },
  '/finance/reports': { label: '財務報表', parent: '/finance' },
  '/finance/treasury': { label: '出納管理', parent: '/finance' },
  '/finance/treasury/disbursement': { label: '出帳單', parent: '/finance/treasury' },

  // ========== 會計系統 ==========
  '/accounting': { label: '會計', parent: '/' },

  // ========== 資料庫管理 ==========
  '/library': { label: '資料庫', parent: '/' },
  '/library/attractions': { label: '景點資料庫', parent: '/library' },
  '/library/suppliers': { label: '供應商', parent: '/library' },
  '/library/archive-management': { label: '檔案管理', parent: '/library' },

  // ========== 其他功能 ==========
  '/calendar': { label: '行事曆', parent: '/' },
  '/todos': { label: '待辦事項', parent: '/' },
  '/hr': { label: '人資管理', parent: '/' },

  // ========== 設定 ==========
  '/settings': { label: '設定', parent: '/' },
}

/**
 * 取得路由的 breadcrumb 配置
 *
 * @param pathname - 當前路由路徑
 * @returns BreadcrumbConfig 或 undefined
 */
export function getBreadcrumbConfig(pathname: string): BreadcrumbConfig | undefined {
  // 先嘗試直接匹配
  if (BREADCRUMB_CONFIG[pathname]) {
    return BREADCRUMB_CONFIG[pathname]
  }

  // 嘗試匹配動態路由
  // 將實際路徑轉換為模式（例如 /quotes/abc123 -> /quotes/[id]）
  const segments = pathname.split('/').filter(Boolean)
  const patterns = generatePatterns(segments)

  for (const pattern of patterns) {
    if (BREADCRUMB_CONFIG[pattern]) {
      return BREADCRUMB_CONFIG[pattern]
    }
  }

  return undefined
}

/**
 * 生成可能的路由模式
 * 例如：/quotes/abc123 可能匹配 /quotes/[id]
 */
function generatePatterns(segments: string[]): string[] {
  const patterns: string[] = []
  const path = '/' + segments.join('/')
  patterns.push(path)

  // 嘗試將最後一個 segment 替換為 [id]
  if (segments.length > 0) {
    const withIdPattern = '/' + [...segments.slice(0, -1), '[id]'].join('/')
    patterns.push(withIdPattern)
  }

  // 嘗試將最後一個 segment 替換為 [param] 格式
  if (segments.length > 1) {
    const lastSegment = segments[segments.length - 1]
    // 如果最後一個 segment 看起來像是動態 ID（UUID、數字等）
    if (isLikelyDynamicSegment(lastSegment)) {
      patterns.push('/' + [...segments.slice(0, -1), '[id]'].join('/'))
    }
  }

  return patterns
}

/**
 * 判斷 segment 是否可能是動態參數
 */
function isLikelyDynamicSegment(segment: string): boolean {
  // UUID 格式
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(segment)) {
    return true
  }
  // 純數字
  if (/^\d+$/.test(segment)) {
    return true
  }
  // 混合英數字且長度 > 8（可能是短 ID）
  if (/^[a-zA-Z0-9]{8,}$/.test(segment)) {
    return true
  }
  return false
}

/**
 * 將動態路由模式轉換為實際路徑
 *
 * @param pattern - 路由模式（例如 /quotes/[id]）
 * @param params - 參數對象（例如 { id: 'abc123' }）
 * @returns 實際路徑
 */
export function resolvePath(pattern: string, params: Record<string, string>): string {
  let path = pattern
  for (const [key, value] of Object.entries(params)) {
    path = path.replace(`[${key}]`, value)
  }
  return path
}
