'use client'

import React, { useState } from 'react'
import { ResponsiveHeader, type HeaderActionConfig } from './responsive-header'
import { EnhancedTable, TableColumn, RowData } from '../ui/enhanced-table'
import { useDataFiltering } from '@/hooks'
import type { LucideIcon } from 'lucide-react'
import { COMP_LAYOUT_LABELS } from './constants/labels'

import type { BreadcrumbItem } from '@/hooks/useBreadcrumb'
export type { BreadcrumbItem }

/**
 * Tab 項目
 */
export interface TabItem {
  value: string
  label: string
  icon?: LucideIcon
}

/**
 * ListPageLayout 屬性
 */
interface ListPageLayoutProps<T extends object> {
  // ========== 頁面配置 ==========
  /** 頁面標題 */
  title: string
  /** 頁面圖示 */
  icon?: LucideIcon
  /** 麵包屑導航 */
  breadcrumb?: BreadcrumbItem[]

  // ========== 數據管理 ==========
  /** 數據陣列 */
  data: T[]
  /** 載入狀態 */
  loading?: boolean

  // ========== 表格配置 ==========
  /** 表格列定義 */
  columns: TableColumn<T>[]
  /** 行點擊事件 */
  onRowClick?: (item: T) => void
  /** 操作按鈕渲染函數 */
  renderActions?: (item: T) => React.ReactNode
  /** 展開行渲染函數 */
  renderExpanded?: (item: T) => React.ReactNode
  /** 表格邊框 */
  bordered?: boolean

  // ========== 搜尋與過濾 ==========
  /** 是否顯示搜尋框 */
  searchable?: boolean
  /** 搜尋框佔位符 */
  searchPlaceholder?: string
  /** 搜尋欄位（用於過濾） */
  searchFields?: (keyof T)[]

  // ========== 伺服器分頁模式（2026-05-24、additive、不影響現有頁面）==========
  /**
   * 提供時 = 「伺服器主導」模式：
   * - data 已是「當前頁」資料 → 不再前端篩選 / 切片（直接顯示）
   * - 分頁控制走 onPageChange、總筆數走 totalCount
   * - 搭配 onSearchChange 把搜尋關鍵字送伺服器
   * 不提供時 = 維持原本「前端分頁」模式（向後相容、現有頁面完全不受影響）。
   */
  serverPagination?: {
    currentPage: number
    pageSize: number
    totalCount: number
    onPageChange: (page: number) => void
  }
  /** 受控搜尋值（伺服器模式用、配合 onSearchChange）。 */
  searchValue?: string
  /** 搜尋變更回調：提供時取代內部前端搜尋、把關鍵字送伺服器查。 */
  onSearchChange?: (value: string) => void

  /** 狀態 Tab 配置 */
  statusTabs?: TabItem[]
  /** 狀態欄位名稱 */
  statusField?: keyof T
  /** 預設狀態 Tab */
  defaultStatusTab?: string
  /** 外部控制的 Tab 狀態 */
  activeStatusTab?: string
  /** Tab 切換回調 */
  onStatusTabChange?: (tab: string) => void

  // ========== Header 結構化按鈕（SSOT） ==========
  /** 主操作按鈕（header-outline 樣式） */
  primaryAction?: HeaderActionConfig

  // ========== 自訂擴展 ==========
  /** Header 右側 escape hatch：給「不是按鈕」的元件用（date input / filter / select）。不准放 Button。 */
  headerActions?: React.ReactNode
  /** 操作欄位寬度（例如 "200px"），給有 renderActions 的列表用 */
  actionsWidth?: string
  /** 表格前的自訂內容 */
  beforeTable?: React.ReactNode
  /** 表格後的自訂內容 */
  afterTable?: React.ReactNode

  // ========== 展開控制 ==========
  /** 外部控制的展開行 */
  expandedRows?: string[]
  /** 展開/收合切換事件 */
  onToggleExpand?: (id: string) => void

  // ========== 排序控制 ==========
  /** 排序變更事件 */
  onSort?: (field: string, order: 'asc' | 'desc') => void

  // ========== 表格額外配置 ==========
  /** 預設排序 */
  defaultSort?: { key: string; direction: 'asc' | 'desc' }
  /** 空資料訊息 */
  emptyMessage?: string
  /** 每頁顯示筆數 */
  initialPageSize?: number

  // ========== Header 額外配置 ==========
  /** 標題旁徽章 */
  badge?: React.ReactNode
  /** Header 下方子內容（如統計資訊） */
  headerChildren?: React.ReactNode

  // ========== 樣式 ==========
  /** 容器 className */
  className?: string
}

/**
 * ListPageLayout - 統一的列表頁面佈局組件
 *
 * 提供標準化的列表頁面結構，包含：
 * - ResponsiveHeader（標題、搜尋、Tab、新增按鈕）
 * - EnhancedTable（表格、排序、過濾、展開）
 * - 統一的狀態管理（搜尋、過濾）
 *
 * @example
 * ```tsx
 * <ListPageLayout
 *   title="旅遊團管理"
 *   icon={MapPin}
 *   data={tours}
 *   columns={columns}
 *   searchFields={['name', 'code', 'location']}
 *   statusField="status"
 *   statusTabs={[
 *     { value: 'all', label: '全部' },
 *     { value: 'active', label: '待出發' },
 *   ]}
 *   primaryAction={{ label: '新增旅遊團', icon: Plus, onClick: () => openDialog('create') }}
 * />
 * ```
 */
export function ListPageLayout<T extends object>({
  title,
  icon,
  breadcrumb,
  data = [],
  loading = false,
  columns,
  onRowClick,
  renderActions,
  renderExpanded,
  bordered = true,
  searchable = true,
  searchPlaceholder = COMP_LAYOUT_LABELS.搜尋_2,
  searchFields = [],
  serverPagination,
  searchValue,
  onSearchChange,
  statusTabs,
  statusField,
  defaultStatusTab = 'all',
  activeStatusTab: externalActiveTab,
  onStatusTabChange,
  primaryAction,
  headerActions,
  actionsWidth,
  beforeTable,
  afterTable,
  expandedRows,
  onToggleExpand,
  onSort,
  defaultSort,
  emptyMessage,
  initialPageSize,
  badge,
  headerChildren,
  className,
}: ListPageLayoutProps<T>) {
  // ========== 內部狀態管理 ==========
  const [searchQuery, setSearchQuery] = useState('')
  const [internalActiveTab, setInternalActiveTab] = useState(defaultStatusTab)

  // 支援外部控制或內部控制
  const activeStatusTab = externalActiveTab ?? internalActiveTab

  // ========== 數據過濾 ==========
  // T extends object 比 Record<string, unknown> 寬鬆、cast 給 useDataFiltering 的 Record 約束
  const filteredData = useDataFiltering(
    data as unknown as Record<string, unknown>[],
    activeStatusTab,
    searchQuery,
    {
      statusField: statusField as string | undefined,
      searchFields: searchFields as string[],
    }
  ) as unknown as T[]

  // ========== 伺服器分頁模式（2026-05-24）==========
  // 伺服器模式：data 已是「當前頁」+ 已篩選 → 直接顯示、跳過前端 useDataFiltering 結果；
  //            搜尋走受控 onSearchChange（送伺服器）。向後相容：兩者皆未提供 = 原前端行為。
  const isServerMode = !!serverPagination
  const displayData = isServerMode ? data : filteredData
  const searchTermValue = onSearchChange ? (searchValue ?? '') : searchQuery
  const handleSearchChange = onSearchChange ?? setSearchQuery

  // ========== 處理 Tab 切換 ==========
  const handleTabChange = (tab: string) => {
    if (onStatusTabChange) {
      onStatusTabChange(tab)
    } else {
      setInternalActiveTab(tab)
    }
  }

  return (
    <div className={className || 'flex-1 min-h-0 flex flex-col'}>
      {/* Header 區域 */}
      <ResponsiveHeader
        title={title}
        icon={icon}
        breadcrumb={breadcrumb?.filter(item => item.label !== '首頁')}
        showSearch={searchable}
        searchTerm={searchTermValue}
        onSearchChange={handleSearchChange}
        searchPlaceholder={searchPlaceholder}
        tabs={statusTabs}
        activeTab={activeStatusTab}
        onTabChange={handleTabChange}
        primaryAction={primaryAction}
        actions={headerActions}
        badge={badge}
      >
        {headerChildren}
      </ResponsiveHeader>

      {/* 表格前自訂內容 */}
      {beforeTable}

      {/* 表格區域 */}
      <div className="flex-1 overflow-hidden">
        <div className="h-full">
          <EnhancedTable
            columns={columns as TableColumn[]}
            data={displayData}
            serverPagination={serverPagination}
            loading={loading}
            onRowClick={onRowClick as ((row: RowData, rowIndex?: number) => void) | undefined}
            actions={renderActions as ((row: RowData) => React.ReactNode) | undefined}
            actionsWidth={actionsWidth}
            expandable={
              renderExpanded && expandedRows && onToggleExpand
                ? {
                    expanded: expandedRows,
                    onExpand: onToggleExpand,
                    renderExpanded: renderExpanded as (row: RowData) => React.ReactNode,
                  }
                : undefined
            }
            onSort={onSort}
            bordered={bordered}
            defaultSort={defaultSort}
            emptyMessage={emptyMessage}
            initialPageSize={initialPageSize}
          />
        </div>
      </div>

      {/* 表格後自訂內容 */}
      {afterTable}
    </div>
  )
}
