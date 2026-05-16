'use client'

import React from 'react'
import { ResponsiveHeader, type HeaderActionConfig } from './responsive-header'
import type { LucideIcon } from 'lucide-react'
import type { BreadcrumbItem, TabItem } from './list-page-layout'

/**
 * ContentPageLayout 屬性
 */
interface ContentPageLayoutProps {
  // ========== 頁面配置 ==========
  /** 頁面標題 */
  title: string
  /** 頁面圖示 */
  icon?: LucideIcon
  /** 麵包屑導航 */
  breadcrumb?: BreadcrumbItem[]

  // ========== Breadcrumb 自動模式 ==========
  /** 是否啟用自動 breadcrumb */
  autoBreadcrumb?: boolean
  /** 自動 breadcrumb 最後一項標籤覆蓋 */
  breadcrumbLastLabel?: string

  // ========== Tab 配置 ==========
  /** Tab 項目 */
  tabs?: TabItem[]
  /** 目前活動的 Tab */
  activeTab?: string
  /** Tab 切換事件 */
  onTabChange?: (value: string) => void

  // ========== 搜尋功能 ==========
  /** 是否顯示搜尋框 */
  showSearch?: boolean
  /** 搜尋關鍵字 */
  searchTerm?: string
  /** 搜尋變更事件 */
  onSearchChange?: (term: string) => void
  /** 搜尋框佔位符 */
  searchPlaceholder?: string

  // ========== Header 結構化按鈕（SSOT） ==========
  /** 主操作按鈕（header-outline 樣式） */
  primaryAction?: HeaderActionConfig

  // ========== 返回按鈕 ==========
  /** 是否顯示返回按鈕 */
  showBackButton?: boolean
  /** 返回按鈕點擊事件 */
  onBack?: () => void

  // ========== 自訂擴展 ==========
  /** Header 右側 escape hatch：給「不是按鈕」的元件用（date input / filter / select）。不准放 Button。 */
  headerActions?: React.ReactNode
  /** Header children（功能區域） */
  headerChildren?: React.ReactNode
  /** 徽章 */
  badge?: React.ReactNode

  // ========== 篩選功能 ==========
  /** 是否顯示篩選 */
  showFilter?: boolean
  /** 篩選選項 */
  filterOptions?: { value: string; label: string }[]
  /** 篩選值 */
  filterValue?: string
  /** 篩選變更事件 */
  onFilterChange?: (value: string) => void
  /** 篩選標籤 */
  filterLabel?: string
  /** 多個篩選器 */
  filters?: React.ReactNode
  /** 清除篩選按鈕 */
  showClearFilters?: boolean
  /** 清除篩選事件 */
  onClearFilters?: () => void

  // ========== 內容 ==========
  /** 頁面內容 */
  children: React.ReactNode

  // ========== 樣式 ==========
  /** 容器 className */
  className?: string
  /** 內容區域 className */
  contentClassName?: string
}

/**
 * ContentPageLayout - 統一的內容頁面佈局組件
 *
 * 提供標準化的內容頁面結構，包含：
 * - ResponsiveHeader（標題、breadcrumb、搜尋、Tab、按鈕）
 * - 可滾動的內容區域（children）
 *
 * 適用於非列表頁面，例如：報表、設定、儀表板、行事曆等。
 *
 * @example
 * ```tsx
 * <ContentPageLayout
 *   title="財務報表"
 *   breadcrumb={[
 *     { label: '首頁', href: '/dashboard' },
 *     { label: '財務報表', href: '/finance/reports' },
 *   ]}
 * >
 *   <div>報表內容</div>
 * </ContentPageLayout>
 * ```
 */
export function ContentPageLayout({
  title,
  icon,
  breadcrumb,
  autoBreadcrumb,
  breadcrumbLastLabel,
  tabs,
  activeTab,
  onTabChange,
  showSearch,
  searchTerm,
  onSearchChange,
  searchPlaceholder,
  primaryAction,
  showBackButton,
  onBack,
  headerActions,
  headerChildren,
  badge,
  showFilter,
  filterOptions,
  filterValue,
  onFilterChange,
  filterLabel,
  filters,
  showClearFilters,
  onClearFilters,
  children,
  className,
  contentClassName,
}: ContentPageLayoutProps) {
  return (
    <div className={className || 'flex-1 min-h-0 flex flex-col'}>
      {/* Header 區域 */}
      <ResponsiveHeader
        title={title}
        icon={icon}
        breadcrumb={breadcrumb?.filter(item => item.label !== '首頁')}
        autoBreadcrumb={autoBreadcrumb}
        breadcrumbLastLabel={breadcrumbLastLabel}
        showSearch={showSearch}
        searchTerm={searchTerm}
        onSearchChange={onSearchChange}
        searchPlaceholder={searchPlaceholder}
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={onTabChange}
        primaryAction={primaryAction}
        showBackButton={showBackButton}
        onBack={onBack}
        actions={headerActions}
        badge={badge}
        showFilter={showFilter}
        filterOptions={filterOptions}
        filterValue={filterValue}
        onFilterChange={onFilterChange}
        filterLabel={filterLabel}
        filters={filters}
        showClearFilters={showClearFilters}
        onClearFilters={onClearFilters}
      >
        {headerChildren}
      </ResponsiveHeader>

      {/* 內容區域 — 預設 flex col 讓子元件可用 flex-1 填滿高度 */}
      <div className={contentClassName || 'flex-1 overflow-auto flex flex-col min-h-0'}>
        {children}
      </div>
    </div>
  )
}
