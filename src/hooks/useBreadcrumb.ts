'use client'

import { useMemo } from 'react'
import { usePathname } from 'next/navigation'
import {
  getBreadcrumbConfig,
  resolvePath,
} from '@/lib/navigation/breadcrumb-config'

/**
 * Breadcrumb 項目
 */
export interface BreadcrumbItem {
  /** 顯示標籤 */
  label: string
  /** 連結路徑 */
  href: string
}

/**
 * useBreadcrumb Hook 選項
 */
interface UseBreadcrumbOptions {
  /**
   * 自訂項目（用於覆蓋或擴展自動生成的 breadcrumb）
   * 如果提供，這些項目會替換自動生成的項目
   */
  customItems?: BreadcrumbItem[]

  /**
   * 覆蓋最後一項的標籤（用於詳細頁顯示實際名稱）
   * 例如：在報價詳情頁顯示 "Q000001" 而不是 "報價詳情"
   */
  lastItemLabel?: string

  /**
   * 額外附加的項目（加在自動生成的 breadcrumb 後面）
   */
  appendItems?: BreadcrumbItem[]

  /**
   * 動態路由參數（用於生成正確的連結）
   * 例如：{ id: 'abc123' } 會將 /quotes/[id] 轉換為 /quotes/abc123
   */
  params?: Record<string, string>

  /**
   * 是否包含首頁
   * @default true
   */
  includeHome?: boolean
}

/**
 * useBreadcrumb Hook
 *
 * 自動根據當前路由生成 breadcrumb 導航
 *
 * @example
 * ```tsx
 * // 基本用法 - 自動生成
 * const breadcrumb = useBreadcrumb()
 *
 * // 覆蓋最後一項標籤（用於詳細頁）
 * const breadcrumb = useBreadcrumb({
 *   lastItemLabel: quote.code, // 顯示實際報價單編號
 * })
 *
 * // 完全自訂
 * const breadcrumb = useBreadcrumb({
 *   customItems: [
 *     { label: '首頁', href: '/dashboard' },
 *     { label: '報價單', href: '/quotes' },
 *   ],
 * })
 *
 * // 附加額外項目
 * const breadcrumb = useBreadcrumb({
 *   appendItems: [
 *     { label: '編輯', href: '/quotes/abc/edit' },
 *   ],
 * })
 * ```
 */
export function useBreadcrumb(options: UseBreadcrumbOptions = {}): BreadcrumbItem[] {
  const pathname = usePathname()
  const { customItems, lastItemLabel, appendItems, params = {}, includeHome = true } = options

  const breadcrumb = useMemo(() => {
    // 如果提供了自訂項目，直接使用
    if (customItems && customItems.length > 0) {
      return customItems
    }

    // 自動生成 breadcrumb
    const items = generateBreadcrumb(pathname, params, includeHome)

    // 覆蓋最後一項的標籤
    if (lastItemLabel && items.length > 0) {
      const lastItem = items[items.length - 1]
      items[items.length - 1] = {
        ...lastItem,
        label: lastItemLabel,
      }
    }

    // 附加額外項目
    if (appendItems && appendItems.length > 0) {
      items.push(...appendItems)
    }

    return items
  }, [pathname, customItems, lastItemLabel, appendItems, params, includeHome])

  return breadcrumb
}

/**
 * 根據路由自動生成 breadcrumb 項目陣列
 */
function generateBreadcrumb(
  pathname: string,
  params: Record<string, string>,
  includeHome: boolean
): BreadcrumbItem[] {
  const items: BreadcrumbItem[] = []
  const visited = new Set<string>()

  // 遞迴建立 breadcrumb（從當前頁面往上追溯）
  function buildPath(currentPath: string): void {
    // 防止無限迴圈
    if (visited.has(currentPath)) {
      return
    }
    visited.add(currentPath)

    const config = getBreadcrumbConfig(currentPath)
    if (!config) {
      // 如果沒有配置，嘗試使用路徑名稱作為標籤
      if (currentPath !== '/' && currentPath !== '') {
        const segments = currentPath.split('/').filter(Boolean)
        const label = segments[segments.length - 1]
        items.unshift({
          label: label,
          href: currentPath,
        })
      }
      return
    }

    // 先處理父路由
    if (config.parent) {
      buildPath(config.parent)
    }

    // 如果不隱藏，加入當前項目
    if (!config.hidden) {
      // 解析動態路由參數
      const href = resolvePath(currentPath, params)

      items.push({
        label: config.label,
        href: href,
      })
    }
  }

  // 從當前路徑開始建立
  buildPath(pathname)

  // 如果不包含首頁，移除首頁項目
  if (!includeHome && items.length > 0 && items[0].href === '/') {
    items.shift()
  }

  return items
}

/**
 * 根據路由配置取得頁面標題
 *
 * @param pathname - 路由路徑
 * @returns 頁面標題或 undefined
 */
function _getPageTitle(pathname: string): string | undefined {
  const config = getBreadcrumbConfig(pathname)
  return config?.label
}

/**
 * 取得當前頁面的父路由
 *
 * @param pathname - 路由路徑
 * @returns 父路由路徑或 undefined
 */
function _getParentPath(pathname: string): string | undefined {
  const config = getBreadcrumbConfig(pathname)
  return config?.parent
}

// 匯出類型

