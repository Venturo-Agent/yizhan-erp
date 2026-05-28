'use client'

import { useState, memo } from 'react'
import Link from 'next/link'
import { useAuthStore } from '@/stores/auth-store'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useBreadcrumb, type BreadcrumbItem } from '@/hooks/useBreadcrumb'
import { ChevronRight } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { COMP_LAYOUT_LABELS } from './constants/labels'

/**
 * Header 結構化按鈕設定
 *
 * SSOT 規則：頁面右上角主操作走這個結構、樣式由 ResponsiveHeader 統一畫成 header-outline
 * （漸層 + shadow，配方來源 dashboard 「小工具設定」）。頁面端只給意圖（label / icon / onClick）。
 *
 * 同頁有第二顆輔助按鈕（匯入 / 群組 / 設定 等）時、走 actions / headerActions escape hatch、
 * 視覺上仍套 <Button variant="header-outline">、保持全站按鈕視覺一致。
 */
export interface HeaderActionConfig {
  label: string
  icon?: LucideIcon
  onClick: () => void
  disabled?: boolean
}

interface ResponsiveHeaderProps {
  title: string
  icon?: unknown
  /**
   * 手動傳入的 breadcrumb 項目（向後兼容）
   * 如果提供，將使用這些項目而不是自動生成
   */
  breadcrumb?: BreadcrumbItem[]
  /**
   * 是否啟用自動 breadcrumb 模式
   * @default false（保持向後兼容）
   */
  autoBreadcrumb?: boolean
  /**
   * 自動 breadcrumb 時覆蓋最後一項的標籤
   * 用於詳細頁顯示實際名稱（例如顯示報價單編號而非 "報價詳情"）
   */
  breadcrumbLastLabel?: string
  tabs?: {
    value: string
    label: string
    icon?: unknown
    count?: number
  }[]
  activeTab?: string
  onTabChange?: (value: string) => void
  /** 主操作按鈕（header-outline 樣式） */
  primaryAction?: HeaderActionConfig
  children?: React.ReactNode
  /** Escape hatch：給「不是按鈕」的元件用（date input / filter / select）。不准放 Button。 */
  actions?: React.ReactNode
  showBackButton?: boolean
  onBack?: () => void
  // 搜尋功能
  showSearch?: boolean
  searchTerm?: string
  onSearchChange?: (term: string) => void
  searchPlaceholder?: string
  // 徽章（用於標記功能狀態）
  badge?: React.ReactNode
  // 篩選功能（例如：作者篩選）
  showFilter?: boolean
  filterOptions?: { value: string; label: string }[]
  filterValue?: string
  onFilterChange?: (value: string) => void
  filterLabel?: string
  // 多個篩選器支援
  filters?: React.ReactNode
  // 清除篩選按鈕
  showClearFilters?: boolean
  onClearFilters?: () => void
  /** 在最外層 fixed 容器加 data-tutorial 屬性（給導覽錨點用、可選） */
  rootDataTutorial?: string
}

export const ResponsiveHeader = memo(function ResponsiveHeader(props: ResponsiveHeaderProps) {
  const { sidebarCollapsed } = useAuthStore()
  const [_isSearchOpen, setIsSearchOpen] = useState(false)

  // 自動生成的 breadcrumb（當 autoBreadcrumb 為 true 時使用）
  const autoBreadcrumbItems = useBreadcrumb({
    customItems: props.breadcrumb, // 如果有手動傳入，優先使用
    lastItemLabel: props.breadcrumbLastLabel,
  })

  // 決定要顯示的 breadcrumb
  // 優先級：手動傳入 > 自動生成（需啟用 autoBreadcrumb）
  const breadcrumbItems = props.breadcrumb || (props.autoBreadcrumb ? autoBreadcrumbItems : [])
  const showBreadcrumb = breadcrumbItems.length > 0

  return (
    <div
      data-tutorial={props.rootDataTutorial}
      className={cn(
        'fixed top-0 right-0 h-[4.5rem] bg-transparent z-[200] flex items-center justify-between px-6 print:hidden',
        'left-0',
        sidebarCollapsed ? 'md:left-[4rem]' : 'md:left-[11.25rem]'
      )}
      style={{ transition: 'left 300ms ease-in-out' }}
    >
      {/* 分割線 */}
      <div className="absolute bottom-0 left-0 right-0 pointer-events-none mx-6 border-t border-[var(--border)] h-px"></div>
      {/* 左側 - 返回按鈕、Breadcrumb 和主標題 */}
      <div className="flex items-center gap-3 relative z-[300]">
        {props.showBackButton && (
          <button
            onClick={e => {
              e.preventDefault()
              e.stopPropagation()
              props.onBack?.()
            }}
            className="text-morandi-secondary hover:text-morandi-primary transition-colors p-2 hover:bg-morandi-container/50 rounded-md cursor-pointer"
            type="button"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>
        )}

        {/* Breadcrumb 導航 */}
        {showBreadcrumb ? (
          <nav className="flex items-center" aria-label="Breadcrumb">
            <ol className="flex items-center gap-1">
              {breadcrumbItems.map((item, index) => {
                const isLast = index === breadcrumbItems.length - 1
                return (
                  <li key={item.href} className="flex items-center">
                    {index > 0 && (
                      <ChevronRight
                        size="0.875em"
                        className="mx-1 text-morandi-secondary/60 flex-shrink-0"
                      />
                    )}
                    {isLast ? (
                      <span className="text-lg font-bold text-morandi-primary flex items-center">
                        {item.label}
                        {props.badge}
                      </span>
                    ) : (
                      <Link
                        href={item.href}
                        className="text-sm text-morandi-secondary hover:text-morandi-primary transition-colors"
                      >
                        {item.label}
                      </Link>
                    )}
                  </li>
                )
              })}
            </ol>
          </nav>
        ) : (
          <h1 className="text-lg font-bold text-morandi-primary flex items-center">
            {props.title}
            {props.badge}
          </h1>
        )}
      </div>

      {/* 右側區域 - 功能、標籤頁和操作按鈕 - 統一無空白設計 */}
      <div className="flex items-center flex-shrink-0 pointer-events-auto gap-2">
        {/* 搜尋功能 - 最左邊 - 手機模式隱藏 */}
        {props.showSearch && (
          <div className="flex items-center mr-4">
            <div className="relative">
              <input
                type="text"
                value={props.searchTerm || ''}
                onChange={e => props.onSearchChange?.(e.target.value)}
                placeholder={props.searchPlaceholder || COMP_LAYOUT_LABELS.搜尋_2}
                className="block w-full text-sm h-10 px-4 pr-10 text-morandi-primary bg-gradient-to-br from-card to-morandi-container/20 rounded-lg border border-morandi-gold/30 appearance-none shadow-md hover:shadow-lg focus:border-morandi-gold/50 focus:outline-none focus:ring-1 focus:ring-morandi-gold/40 focus:shadow-lg transition-all placeholder:text-morandi-secondary placeholder:font-medium"
              />
              <div className="absolute top-1/2 -translate-y-1/2 right-3">
                {props.searchTerm ? (
                  <button
                    onClick={() => props.onSearchChange?.('')}
                    title={COMP_LAYOUT_LABELS.清除搜尋}
                  >
                    <svg
                      width="1.25em"
                      height="1.25em"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="text-morandi-secondary hover:text-morandi-primary transition-colors"
                    >
                      <path d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                ) : (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    height="1.25em"
                    width="1.25em"
                    className="text-morandi-secondary"
                  >
                    <path
                      fill="currentColor"
                      d="M10.979 16.8991C11.0591 17.4633 10.6657 17.9926 10.0959 17.9994C8.52021 18.0183 6.96549 17.5712 5.63246 16.7026C4.00976 15.6452 2.82575 14.035 2.30018 12.1709C1.77461 10.3068 1.94315 8.31525 2.77453 6.56596C3.60592 4.81667 5.04368 3.42838 6.82101 2.65875C8.59833 1.88911 10.5945 1.79039 12.4391 2.3809C14.2837 2.97141 15.8514 4.21105 16.8514 5.86977C17.8513 7.52849 18.2155 9.49365 17.8764 11.4005C17.5979 12.967 16.8603 14.4068 15.7684 15.543C15.3736 15.9539 14.7184 15.8787 14.3617 15.4343C14.0051 14.9899 14.0846 14.3455 14.4606 13.9173C15.1719 13.1073 15.6538 12.1134 15.8448 11.0393C16.0964 9.62426 15.8261 8.166 15.0841 6.93513C14.3421 5.70426 13.1788 4.78438 11.81 4.34618C10.4412 3.90799 8.95988 3.98125 7.641 4.55236C6.32213 5.12348 5.25522 6.15367 4.63828 7.45174C4.02135 8.74982 3.89628 10.2276 4.28629 11.6109C4.67629 12.9942 5.55489 14.1891 6.75903 14.9737C7.67308 15.5693 8.72759 15.8979 9.80504 15.9333C10.3746 15.952 10.8989 16.3349 10.979 16.8991Z"
                    />
                    <rect
                      transform="rotate(-49.6812 12.2469 14.8859)"
                      rx="1"
                      height="10.1881"
                      width="2"
                      y="14.8859"
                      x="12.2469"
                      fill="currentColor"
                    />
                  </svg>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 篩選功能 */}
        {props.showFilter && props.filterOptions && (
          <div className="flex items-center mr-4">
            <Select
              value={props.filterValue || 'all'}
              onValueChange={value => props.onFilterChange?.(value)}
            >
              <SelectTrigger className="h-8 text-sm min-w-[7.5rem]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  全部{props.filterLabel || COMP_LAYOUT_LABELS.篩選}
                </SelectItem>
                {props.filterOptions.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* 多個篩選器 */}
        {props.filters && <div className="flex items-center gap-2 mr-4">{props.filters}</div>}

        {/* 清除篩選按鈕 */}
        {props.showClearFilters && (
          <button
            onClick={props.onClearFilters}
            className="px-3 py-1 text-sm text-morandi-secondary hover:text-morandi-primary border border-border rounded-md hover:bg-morandi-container/50 transition-colors mr-4"
          >
            {COMP_LAYOUT_LABELS.FILTER_4998}
          </button>
        )}

        {/* 功能區域 */}
        {props.children && <div className="flex items-center">{props.children}</div>}

        {/* 標籤頁 - 手機模式隱藏（在 actions 之前、新增按鈕推到最右）*/}
        {props.tabs && props.tabs.length > 0 && (
          <div className="hidden md:flex items-center space-x-1 pointer-events-auto">
            {props.tabs.map(tab => (
              <button
                key={tab.value}
                onClick={() => props.onTabChange?.(tab.value)}
                className={cn(
                  'relative px-3 py-2 text-sm font-medium transition-colors pointer-events-auto flex items-center gap-1.5',
                  'text-morandi-secondary hover:text-morandi-primary',
                  props.activeTab === tab.value
                    ? 'text-morandi-primary after:absolute after:left-0 after:right-0 after:bottom-[-1px] after:h-[2px] after:bg-morandi-gold after:z-10'
                    : ''
                )}
              >
                {tab.label}
                {tab.count !== undefined && (
                  <span
                    className={cn(
                      'px-1.5 py-0.5 rounded text-xs',
                      props.activeTab === tab.value
                        ? 'bg-morandi-gold/20 text-morandi-gold'
                        : 'bg-morandi-container text-morandi-secondary'
                    )}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}

        {/* 彈性空間：把 actions / primaryAction 推到最右 */}
        <div className="flex-1" />

        {/* 操作區（日期選擇等功能） */}
        {props.actions && <div className="flex items-center">{props.actions}</div>}

        {/* Header 主操作按鈕：結構化、由 ResponsiveHeader 統一畫成 header-outline */}
        {props.primaryAction && (
          <Button
            variant="header-outline"
            size="sm"
            onClick={props.primaryAction.onClick}
            disabled={props.primaryAction.disabled}
            data-create-box
          >
            {props.primaryAction.icon && <props.primaryAction.icon />}
            {props.primaryAction.label}
          </Button>
        )}
      </div>
    </div>
  )
})
