import React from 'react'

// 基礎行資料型別 - 允許任何物件類型
export type RowData = { [key: string]: unknown } | object

export interface TableColumn<T extends RowData = RowData> {
  key: keyof T | string
  label: string | React.ReactNode
  sortable?: boolean
  filterable?: boolean
  filterType?: 'text' | 'number' | 'date' | 'select'
  filterOptions?: Array<{ value: string; label: string }>
  render?: (value: unknown, row: T) => React.ReactNode
  /** 最少寬度（也接受 width 形式、表示 column 不會比這個窄） */
  width?: string
  /** 最少寬度別名（語意更清楚） */
  minWidth?: string
  /** 最多寬度（content 超過會 truncate / wrap、避免單欄無限長） */
  maxWidth?: string
  align?: 'left' | 'center' | 'right'
  className?: string
}

// 向下相容別名
type Column<T extends RowData = RowData> = TableColumn<T>

export interface SelectionConfig<T extends RowData = RowData> {
  selected: string[]
  onChange: (selected: string[]) => void
  disabled?: (row: T) => boolean
  getRowId?: (row: T, index: number) => string
}

export interface ExpandableConfig<T extends RowData = RowData> {
  expanded: string[]
  onExpand: (id: string) => void
  renderExpanded: (row: T) => React.ReactNode
  expandIcon?: (expanded: boolean) => React.ReactNode
  getRowId?: (row: T, index: number) => string
}

export interface EnhancedTableProps<T extends RowData = RowData> {
  columns: TableColumn<T>[]
  data: T[]
  loading?: boolean
  error?: string | null
  onSort?: (column: string, direction: 'asc' | 'desc') => void
  onFilter?: (filters: Record<string, string>) => void
  onRowClick?: (row: T, rowIndex?: number) => void
  onRowDoubleClick?: (row: T, rowIndex: number) => void
  className?: string
  showFilters?: boolean
  searchableFields?: readonly string[]
  initialPageSize?: number
  searchTerm?: string
  emptyState?: React.ReactNode
  emptyMessage?: string
  defaultSort?: { key: string; direction: 'asc' | 'desc' }
  searchable?: boolean
  searchPlaceholder?: string
  selection?: SelectionConfig<T>
  expandable?: ExpandableConfig<T>
  actions?: (row: T, index: number) => React.ReactNode
  actionsHeader?: React.ReactNode
  actionsWidth?: string
  rowClassName?: (row: T) => string
  _bordered?: boolean
  bordered?: boolean
  striped?: boolean
  hoverable?: boolean
  isLoading?: boolean
  /**
   * Server-side 分頁模式（controlled）
   * 給時：data 視為「當前頁的 15 筆」、不在 component 內 slice
   * 不給：保持原 client-side 行為（接全部 data、內部 slice）
   *
   * 用於降低讀取量：列表頁改用 useXxxPaginated() 後傳 server 端分頁狀態進來
   * 規範見 docs/LIST_PAGE_PERFORMANCE.md
   */
  serverPagination?: {
    currentPage: number
    pageSize: number
    totalCount: number
    onPageChange: (page: number) => void
  }
}
